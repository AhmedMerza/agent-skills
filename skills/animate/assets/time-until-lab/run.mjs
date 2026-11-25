// Time-until + one-object-across-sizes lab. Every query param is a variant; defaults = measured winners.
// node run.mjs '<json array of configs>' [--only T_min,M_seq] [--throttle 6] [--reduced] [--video dir]
// e.g. node run.mjs '[{"mode":"time","num":"tween","enter":"count","bar":"stagger","marker":"fixed"},{"mode":"time"}]' --only T_min,T_jump,T_enter
//      node run.mjs '[{"mode":"morph","v":"A"},{"mode":"morph","v":"C"}]' --only M_seq,M_rev,M_int
import { chromium } from 'playwright'
import { pathToFileURL } from 'node:url'
const here = new URL('.', import.meta.url).pathname
const args = process.argv.slice(2), configs = JSON.parse(args[0])
const opt = k => { const i = args.indexOf(k); return i > 0 ? args[i + 1] : null }
const videoDir = opt('--video'), throttle = +(opt('--throttle') || 0), only = opt('--only')?.split(','), reduced = args.includes('--reduced')
const wait = ms => new Promise(r => setTimeout(r, ms))
const browser = await chromium.launch()
async function open(cfg) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: reduced ? 'reduce' : 'no-preference',
    ...(videoDir ? { recordVideo: { dir: videoDir, size: { width: 390, height: 844 } } } : {}) })
  const page = await ctx.newPage()
  if (throttle) { const c = await ctx.newCDPSession(page); await c.send('Emulation.setCPUThrottlingRate', { rate: throttle }) }
  await page.goto(pathToFileURL(here + 'index.html').href + '?' + new URLSearchParams(cfg))
  await wait(1400)
  return { ctx, page }
}
// in-page script: timing is driven inside the page (Playwright input is too slow to hit a 120 ms interrupt)
const inPage = (p, steps, pre = []) => p.evaluate(async ([steps, pre]) => { const w = ms => new Promise(r => setTimeout(r, ms));
  for (const [fn, a, ms] of pre) { window[fn](...a); await w(ms) }
  window.__mark('A'); for (const [fn, a, ms] of steps) { if (fn) window[fn](...a); await w(ms) } }, [steps, pre])
const m = (h, mi, s = 0) => h * 60 + mi + s / 60

// ---------- oracle: what the label must say (independent of the page) ----------
function truth(t, checked) {
  const S = 660, E = 705, u = S - t
  if (u > 1) return `in ${Math.ceil(u)} min`
  if (!checked && u > -1) return 'Now'
  if (checked && t < S) return 'Now'
  if (checked && t < E) return `${Math.ceil(E - t)} min left`
  if (!checked && t < E) return `Late by ${Math.floor(-u)} min`
  return checked ? 'Ended' : 'Missed'
}
const SCEN = {
  // ---- topic 1
  T_min:   p => inPage(p, [['__clock', [m(10, 18, 59.85), 1 / 60], 1000]]),             // 42 → 41 at the minute
  T_jump:  p => inPage(p, [['__clock', [m(10, 18)], 300], ['__clock', [m(10, 23)], 1200]]), // back from background: 42 → 37
  T_10to9: p => inPage(p, [['__clock', [m(10, 50, 59.85), 1 / 60], 1000]], [['__clock', [m(10, 50, 59)], 1000]]),              // digit count changes: "10" → "9"
  T_enter: p => inPage(p, [['__enter', [], 1700]]),
  T_live:  p => inPage(p, [['__clock', [m(10, 18), 1], 6000]]),                          // 1 clock-minute per second
  T_sweep: p => inPage(p, [['__clock', [m(10, 58), 12], 4300]], [['__clock', [m(10, 58)], 600]]),       // through start, late, end — not checked in
  T_sweepIn: p => inPage(p, [['__clock', [m(10, 58), 12], 400], ['__checkin', [true], 3900]], [['__clock', [m(10, 58)], 600]]), // checks in at ≈11:03
}
const PROBES = [m(10, 58, 59.9), m(10, 59), m(10, 59, 30), m(10, 59, 59.9), m(11, 0), m(11, 0, 30), m(11, 0, 59.9), m(11, 1), m(11, 44, 30), m(11, 44, 59.9), m(11, 45), m(11, 46)]
Object.assign(SCEN, {
  // ---- topic 2
  M_seq: p => inPage(p, [['__go', ['pill'], 900], ['__go', ['wide'], 900], ['__go', ['large'], 900], ['__go', ['small'], 1000]]),
  M_rev: p => inPage(p, [['__go', ['large'], 1000], ['__mark', ['B'], 0], ['__go', ['wide'], 900], ['__go', ['pill'], 900], ['__go', ['small'], 1000]]),
  M_int: p => inPage(p, [['__go', ['pill'], 120], ['__go', ['wide'], 120], ['__go', ['large'], 1000], ['__go', ['small'], 150], ['__go', ['large'], 1100]]),
})

// ---------- scoring ----------
function scoreTime(log, scen) {
  const a = log.findIndex(e => e.mark === 'A'), L = log.slice(a).filter(e => !e.mark), M = log.slice(a).filter(e => e.mark)
  if (L[0] && !('read' in L[0])) {      // lite (throttled) run: frame pacing only
    const d = L.slice(1).map((e, i) => e.t - L[i].t).sort((x, y) => x - y)
    return { frames: L.length, p95ms: +d[Math.floor(d.length * .95)]?.toFixed(1), maxMs: +d.at(-1)?.toFixed(1), over50: d.filter(x => x > 50).length }
  }
  // number: frames reading a value that is neither the old nor the new one
  const wants = [...new Set(log.filter(e => e.want).map(e => e.want))]
  let neither = 0, sup = 0, ill = 0, stale = 0, order = 0; const seenNeither = new Set()
  let prevWant = L[0]?.want, changeT = null; const ok = new Set(wants)   // any value that was true at some point
  for (const e of L) {
    if (e.want !== prevWant) { changeT = e.t; prevWant = e.want }
    if (e.read && !ok.has(e.read)) { neither++; seenNeither.add(e.read) }
    sup += e.sup; ill += e.ill; if (e.vis !== e.read) order++
    if (changeT && e.t - changeT > 260 && e.read !== e.want && /\d/.test(e.want)) stale++
  }
  const frameMs = (L.at(-1).t - L[0].t) / L.length
  const out = { neither, neitherVals: seenNeither.size, superimposed: sup, illegibleMs: Math.round(ill * frameMs), staleFrames: stale, digitOrderWrong: order, charsMoving: Math.max(...L.map(e => e.mvc || 0)) }
  // unit label jump (layout): biggest per-frame move of the unit
  if (L[0].ux != null) { let j = 0; for (let i = 1; i < L.length; i++) j = Math.max(j, Math.abs(L[i].ux - L[i - 1].ux)); out.unitJumpPx = +j.toFixed(1) }
  // bar: marker vs fill frontier
  const dis = L.filter(e => e.mk < e.fr - 2 || e.mk > e.fr + e.pitch + 2).length
  out.markerDisagree = dis; out.markerGapPx = +Math.max(0, ...L.map(e => Math.max(e.fr - 2 - e.mk, e.mk - e.fr - e.pitch - 2))).toFixed(1); out.tickScaleMin = Math.min(...L.map(e => e.tickSX ?? 1))
  out.firstTickAtStart = L.every(e => e.first)
  const en = M.find(e => e.mark === 'enter'), ed = M.find(e => e.mark === 'entered'); if (en && ed) out.enterMs = Math.round(ed.t - en.t)
  if (scen.startsWith('T_sweep')) { let wrong = 0; const bad = new Set(); for (const e of L) { const want = truth(e.now, e.chk); if (e.line !== want) { wrong++; bad.add(e.line) } } out.labelWrong = wrong; out.badLabels = [...bad].slice(0, 6).join(' | ') }
  if (scen === 'T_live') { let ch = 0; for (let i = 1; i < L.length; i++) if (L[i].lit !== L[i - 1].lit) ch++; out.barChanges = ch; out.minutes = Math.round(L.at(-1).now - L[0].now) }
  return out
}
const CONTAIN = new Set(['card|icon', 'card|title', 'card|time', 'card|num', 'card|room', 'bar|card', 'icon|title', 'room|time', 'hdr|num'].map(x => x.split('|').sort().join('|')))
function dom(cs) { return cs?.reduce((a, b) => (b.op * (b.inside ?? 1) > a.op * (a.inside ?? 1) ? b : a)) }
function scoreMorph(log, G, KEYS, vtMode) {
  const a = log.findIndex(e => e.mark === 'A'), rest = log.slice(a)
  if (!rest.some(e => e.k)) {
    const L = rest.filter(e => !e.mark), d = L.slice(1).map((e, i) => e.t - L[i].t).sort((x, y) => x - y)
    return { frames: L.length, p95ms: +d[Math.floor(d.length * .95)]?.toFixed(1), maxMs: +d.at(-1)?.toFixed(1), over50: d.filter(x => x > 50).length }
  }
  const o = { missing: 0, missingId: 0, doubled: 0, titleJump: 0, numJump: 0, distort: 0, sizeExcursion: 0, reflow: 0, clipped: 0, overlap: 0, settleMs: 0, jerkShape: 0, jerkTitle: 0, vtTapBlocked: 0 }
  let from = null, to = null, tGo = null, prevTitle = null, prevNum = null, lastMove = 0, L = [], P = [], last = null
  const intAt = [], why = {}; const W = (k, n = 1) => { why[k] = (why[k] || 0) + n }
  const vel = { title: [], sh: [] }
  for (const e of rest) {
    if (e.mark?.startsWith('go:')) { [from, to] = e.mark.slice(3).split('>'); tGo = e.t; if (L.length > 2) intAt.push(L.length)
      // persistent = on screen when the move starts AND in the destination
      P = KEYS[to].filter(k => last && (last.k[k] || []).some(c => c.op * (c.inside ?? 1) >= .25))
      if (!P.includes('title')) prevTitle = null; if (!P.includes('num')) prevNum = null; continue }
    if (e.mark || !e.k) continue
    L.push(e); last = e
    if (!from) continue
    for (const k of P) {
      const cs = (e.k[k] || []).filter(c => c.op * (c.inside ?? 1) >= .25)
      if (!cs.length) { o.missing++; W('miss:' + k); if (['card', 'title', 'num'].includes(k)) o.missingId++ }
      if (cs.length > 1) { o.doubled++; W('dbl:' + k) }
      for (const c of cs) {
        if (c.inside != null && c.inside < .98) { o.clipped++; W('clip:' + k) }
        if (c.sx && c.sy) o.distort = Math.max(o.distort, Math.abs(c.sx / c.sy - 1))
        const fsA = G[from][k]?.fs, fsB = G[to][k]?.fs
        let fs = c.fs; if (c.vtw && fsA) fs = Math.max(fsA * c.vtw / G[from][k].w, fsB * c.vtw / G[to][k].w)
        if (fs && fsA && fsB && ['title', 'num', 'time'].includes(k)) { const lo = Math.min(fsA, fsB), hi = Math.max(fsA, fsB); if (fs > hi * 1.06 || fs < lo * .94) o.sizeExcursion++ }
        if (c.lines > 1 || (k === 'num' && c.trunc)) { o.reflow++; W('reflow:' + k) }
      }
    }
    // overlap between distinct visible things that aren't parent/child
    const vis = Object.entries(e.k).map(([k, cs]) => [k, dom(cs)]).filter(([k, c]) => c && c.op * (c.inside ?? 1) >= .25)
    let ov = 0
    for (let i = 0; i < vis.length; i++) for (let j = i + 1; j < vis.length; j++) {
      const [ka, A] = vis[i], [kb, B] = vis[j]
      const ga = G[to]?.[ka], gb = G[to]?.[kb], inn = (a, b) => a && b && a.u >= b.u - 1 && a.y >= b.y - 1 && a.u + a.w <= b.u + b.w + 1 && a.y + a.h <= b.y + b.h + 1
      const fa = G[from]?.[ka], fb = G[from]?.[kb]
      if (inn(ga, gb) || inn(gb, ga) || inn(fa, fb) || inn(fb, fa) || CONTAIN.has([ka, kb].sort().join('|'))) continue   // parent/child at either end
      const ix = Math.min(A.x + A.w / 2, B.x + B.w / 2) - Math.max(A.x - A.w / 2, B.x - B.w / 2), iy = Math.min(A.y + A.h / 2, B.y + B.h / 2) - Math.max(A.y - A.h / 2, B.y - B.h / 2)
      if (ix > 0 && iy > 0 && ix * iy > .15 * Math.min(A.w * A.h, B.w * B.h)) { ov = 1; W('ov:' + ka + '/' + kb) }
    }
    o.overlap += ov
    const t = dom(e.k.title), n = dom(e.k.num)
    if (t && t.op >= .25 && P.includes('title')) { if (prevTitle) o.titleJump = Math.max(o.titleJump, Math.hypot(t.x - prevTitle.x, t.y - prevTitle.y)); prevTitle = t; vel.title.push([t.x, t.y]) } else vel.title.push(null)
    if (n && n.op >= .25 && P.includes('num')) { if (prevNum) o.numJump = Math.max(o.numJump, Math.hypot(n.x - prevNum.x, n.y - prevNum.y)); prevNum = n }
    vel.sh.push(isNaN(e.sw) ? null : [e.sw, e.sh])
    if (e.hit === 'html') o.vtTapBlocked++
  }
  const jerk = arr => { let j = 0; for (let i = 2; i < arr.length; i++) { const [p2, p1, p0] = [arr[i], arr[i - 1], arr[i - 2]]; if (!p2 || !p1 || !p0) continue
    j = Math.max(j, Math.hypot((p2[0] - p1[0]) - (p1[0] - p0[0]), (p2[1] - p1[1]) - (p1[1] - p0[1]))) } return +j.toFixed(1) }
  o.jerkShape = jerk(vel.sh); o.jerkTitle = jerk(vel.title)
  // jerk where a go lands on something already moving (an interrupt): Δv over the 3 frames after it
  const mov = a => a && a.length > 1, at = (arr, i) => arr[i], sp = (arr, i) => arr[i] && arr[i - 1] ? Math.hypot(arr[i][0] - arr[i - 1][0], arr[i][1] - arr[i - 1][1]) : 0
  let ij = 0, ijs = 0
  for (const i of intAt) { if (sp(vel.sh, i - 1) < .5 && sp(vel.title, i - 1) < .5) continue
    ij = Math.max(ij, jerk(vel.title.slice(i - 2, i + 3))); ijs = Math.max(ijs, jerk(vel.sh.slice(i - 2, i + 3))) }
  o.intJerkTitle = ij; o.intJerkShape = ijs
  // settle after the last go: last frame where anything still moves or fades
  for (let i = 1; i < L.length; i++) { const e = L[i], p = L[i - 1]; if (e.t < tGo) continue
    let mv = Math.abs(e.sw - p.sw) > .3 || Math.abs(e.sh - p.sh) > .3
    for (const k in e.k) { const c = dom(e.k[k]), d = dom(p.k[k]); if (!c || !d) { mv ||= !!(c || d); continue } if (Math.abs(c.x - d.x) > .3 || Math.abs(c.y - d.y) > .3 || Math.abs(c.op - d.op) > .02) mv = true }
    if (mv) lastMove = e.t }
  o.settleMs = Math.round(Math.max(0, lastMove - tGo)); o.distort = +o.distort.toFixed(3); o.titleJump = +o.titleJump.toFixed(1); o.numJump = +o.numJump.toFixed(1)
  if (process.env.WHY) o.why = Object.entries(why).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => k + ':' + v).join(' ')
  return o
}

const out = []
for (const cfg of configs) for (const [name, fn] of Object.entries(SCEN)) {
  if (only ? !only.includes(name) : (cfg.mode === 'morph') !== name.startsWith('M_')) continue
  if (only && (cfg.mode === 'morph') !== name.startsWith('M_')) continue
  const { ctx, page } = await open(cfg)
  const t0 = Date.now(); await fn(page)
  const log = await page.evaluate(() => window.__log)
  const row = { cfg: Object.entries(cfg).filter(([k]) => k !== 'mode' && k !== 'cap').map(([k, v]) => k + '=' + v).join(' ') || 'default', scen: name }
  if (cfg.mode === 'morph') Object.assign(row, scoreMorph(log, await page.evaluate(() => __G), await page.evaluate(() => __KEYS)))
  else Object.assign(row, scoreTime(log, name))
  if (name === 'T_sweep' && !(cfg.lite)) {            // exact boundary probes with a frozen clock
    const res = []
    for (const chk of [false, true]) for (const t of PROBES) {
      const line = await page.evaluate(async ([t, chk]) => { __checkin(chk); __clock(t, 0); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return __log.filter(e => !e.mark).at(-1).line }, [t, chk])
      if (line !== truth(t, chk)) res.push(`${chk ? 'in' : 'out'}@${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}:${((t % 1) * 60).toFixed(1).padStart(4, '0')}="${line}"`)
    }
    row.probeWrong = res.length; row.probeBad = res.slice(0, 5).join(' ')
  }
  out.push(row); await ctx.close()
}
await browser.close()
console.log(JSON.stringify(out))

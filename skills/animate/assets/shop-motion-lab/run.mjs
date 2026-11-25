// Shop motion lab runner. Every variant is a query param of index.html; every scenario runs in-page (exact timing).
// node run.mjs <moment> '<json array of configs>' [--only scen1,scen2] [--throttle 6] [--reduced] [--video dir]
//   moment: entrance | search | item | cart | pay      config: {"v":"A"} | {"v":"W","rtl":"1"} | {"v":"W","probe":"0"}
// Prints one JSON row per config × scenario. Perf (long frames) is only meaningful with probe:"0" (the probe itself costs).
import { chromium } from 'playwright'
import { pathToFileURL } from 'node:url'
const here = new URL('.', import.meta.url).pathname
const args = process.argv.slice(2), moment = args[0], configs = JSON.parse(args[1])
const opt = k => { const i = args.indexOf(k); return i > 0 ? args[i + 1] : null }
const videoDir = opt('--video'), throttle = +(opt('--throttle') || 0), only = opt('--only')?.split(','), reduced = args.includes('--reduced')
const SCN = { entrance: ['load'], search: ['open', 'cancelMid', 'type', 'typeFast', 'typeReal', 'submit'], item: ['tapItem', 'backMid', 'doubleTap', 'back'],
  cart: ['add', 'addTwice', 'toCart'], pay: ['payFast', 'paySlow', 'payFail', 'payFailFast'] }[moment]

const browser = await chromium.launch()
const r2 = n => Math.round(n * 10) / 10
const ctr = q => q && [q[0] + q[2] / 2, q[1] + q[3] / 2]
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])

function generic(log, from) {
  const F = log.filter(e => !e.mark && e.t >= from)
  let long = 0, maxF = 0; for (let i = 1; i < F.length; i++) { const d = F[i].t - F[i - 1].t; if (d > 25) long++; maxF = Math.max(maxF, d) }
  let settle = 0                                  // last frame where any probed box moved > .5 px or faded > .01
  for (let i = 1; i < F.length; i++) { const a = F[i - 1].p || {}, b = F[i].p || {}
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const x = a[k], y = b[k]
      if (!x || !y) { if ((x?.[4] ?? 0) > .01 || (y?.[4] ?? 0) > .01) settle = F[i].t - from; continue }
      if (Math.abs(x[0] - y[0]) > .5 || Math.abs(x[1] - y[1]) > .5 || Math.abs(x[2] - y[2]) > .5 || Math.abs(x[4] - y[4]) > .01) { settle = F[i].t - from; break } } }
  return { F, out: { settleMs: Math.round(settle), longFrames: long, maxFrameMs: Math.round(maxF), frames: F.length } }
}
const markT = (log, m) => log.find(e => e.mark === m)?.t
const marks = (log, pre) => log.filter(e => e.mark?.startsWith(pre))

function score(log, scen, ctx) {
  const t0 = markT(log, 'go') ?? markT(log, 'B') ?? markT(log, 'A')
  const { F, out } = generic(log, t0); const last = F.at(-1)?.p || {}
  if (!F[0]?.p) return out                                           // probe=0 run: perf only
  if (moment === 'entrance') {
    const cards = Object.keys(last).filter(k => /^card\d$/.test(k) && (last['shoeC' + k.slice(4)]?.[4] ?? 0) > .5).map(k => +k.slice(4))
    let firstReady = Infinity, allReady = 0, emptyMax = 0; const t50 = {}
    for (const i of cards) { const yEnd = last['card' + i][1]; let ready = null, empty = 0
      for (let f = 0; f < F.length; f++) { const c = F[f].p['card' + i], s = F[f].p['shoeC' + i]; const co = c?.[4] ?? 0, so = s?.[4] ?? 0
        const ok = co >= .98 && Math.abs(c[1] - yEnd) < .5 && so >= .98; if (ok && ready == null) ready = F[f].t - t0; if (!ok) ready = null
        if (co > .5 && so < .2 && f) empty += F[f].t - F[f - 1].t
        if (t50[i] == null && co >= .5) t50[i] = F[f].t - t0 }
      firstReady = Math.min(firstReady, ready ?? 9e9); allReady = Math.max(allReady, ready ?? 9e9); emptyMax = Math.max(emptyMax, empty) }
    let inv = 0; for (const i of cards) for (const j of cards) if (i < j && t50[i] > t50[j] + 8) inv++
    const fieldReady = F.find(f => (f.p.hField?.[4] ?? 0) >= .98)?.t - t0
    Object.assign(out, { firstCardReadyMs: Math.round(firstReady), allCardsReadyMs: Math.round(allReady), emptyBoxMaxMs: Math.round(emptyMax), orderInversions: inv,
      fieldReadyMs: Math.round(fieldReady), cls: r2(ctx.cls * 1000) / 1000, endOK: cards.every(i => last['card' + i][4] > .99 && last['shoeC' + i][4] > .99) })
  }
  if (moment === 'search' && (scen === 'open' || scen === 'cancelMid')) {
    let gap = 0, jump = 0, jerk = 0, prev = null, pv = null, squeeze = 0
    const endField = scen === 'open' ? last.sField : last.hField
    for (const f of F) { const vis = ['sField', 'hField'].map(k => f.p[k]).filter(q => q && q[4] > .5).sort((a, b) => b[4] - a[4])[0]
      if (!vis) { gap++; prev = null; continue } const c = [ctx.rtl ? vis[0] + vis[2] : vis[0], vis[1]]   // inline-start edge: the two fields differ in width
      if (prev) { const v = [c[0] - prev[0], c[1] - prev[1]]; jump = Math.max(jump, Math.hypot(...v)); if (pv) jerk = Math.max(jerk, Math.hypot(v[0] - pv[0], v[1] - pv[1])); pv = v }
      prev = c
      const q = f.p.sQ; if (q && q[4] > .05 && last.sQ) squeeze = Math.max(squeeze, Math.abs((q[2] / q[3]) / (last.sQ[2] / last.sQ[3]) - 1)) }
    const kb = F.find(f => f.p.kb && last.kb && Math.abs(f.p.kb[1] - last.kb[1]) < .5)?.t - t0
    const fk = scen === 'open' ? 'sField' : 'hField', fieldAt = endField ? F.find((f, i) => F.slice(i).every(g => g.p[fk] && g.p[fk][4] > .5 && Math.abs(ctr(g.p[fk])[1] - ctr(endField)[1]) < .5))?.t - t0 : null
    const pre = marks(log, 'pre:')[0]?.mark.slice(4).split(',').map(Number), f1 = F.find(f => f.p.sField && f.p.sField[4] > .5)?.p.sField
    if (pre && f1) out.handoffJumpPx = r2(dist(pre, [ctx.rtl ? f1[0] + f1[2] : f1[0], f1[1]]))
    Object.assign(out, { fieldGapFrames: gap, fieldMaxStepPx: r2(jump), fieldJerkPx: r2(jerk), textSqueezePct: r2(squeeze * 100), fieldLandedMs: Math.round(fieldAt), kbUpMs: Math.round(kb) })
  }
  if (moment === 'search' && scen.startsWith('type')) {
    const keys = marks(log, 'key:'); const lat = []; let unsettled = 0, staleMs = 0, rowJump = 0, flick = 0
    keys.forEach((k, n) => { const q = k.mark.slice(4), want = ctx.sug[q], tEnd = keys[n + 1]?.t ?? 9e15
      const fr = F.filter(f => f.t >= k.t && f.t < tEnd)
      const ok = f => want.every(w => (f.p['row:' + w]?.[4] ?? 0) >= .9) && Object.entries(f.p).every(([nm, q2]) => !(nm.startsWith('row:') || nm.startsWith('gone:')) || want.includes(nm.slice(4)) || q2[4] <= .1)
      const hit = fr.find(ok); if (hit) lat.push(hit.t - k.t); else unsettled++
      for (let i = 1; i < fr.length; i++) for (const [nm, q2] of Object.entries(fr[i].p)) if ((nm.startsWith('row:') || nm.startsWith('gone:')) && q2[4] > .1 && !want.includes(nm.replace(/^(row|gone):/, ''))) { staleMs += fr[i].t - fr[i - 1].t; break } })
    for (let i = 1; i < F.length; i++) for (const [nm, q2] of Object.entries(F[i].p)) if (nm.startsWith('row:')) { const p0 = F[i - 1].p[nm]; if (p0) rowJump = Math.max(rowJump, Math.abs(q2[1] - p0[1])) }
    const seen = {}; for (const f of F) for (const [nm, q2] of Object.entries(f.p)) if (nm.startsWith('row:') || nm.startsWith('gone:')) { const id = nm.replace(/^gone:[rs]:/, 'row:').replace(/@.*/, ''); const s = seen[id] ||= { hi: false, dip: false }
      if (q2[4] > .9) { if (s.dip) { flick++; s.dip = false } s.hi = true } else if (s.hi && q2[4] < .5) s.dip = true }
    lat.sort((a, b) => a - b)
    Object.assign(out, { keys: keys.length, keyToCorrectP50: Math.round(lat[lat.length >> 1] ?? -1), keyToCorrectMax: Math.round(lat.at(-1) ?? -1), keysNeverCorrect: unsettled,
      staleRowMs: Math.round(staleMs), rowStepMaxPx: r2(rowJump), rowFlickers: flick, mountsPerKey: r2((ctx.counters.mounts) / keys.length), unmountsPerKey: r2(ctx.counters.unmounts / keys.length),
      endCorrect: ctx.sug[keys.at(-1)?.mark.slice(4)]?.every(w => (last['row:' + w]?.[4] ?? 0) > .99) })
  }
  if (moment === 'item') {
    let dbl = 0, gap = 0, jump = 0, jerk = 0, prev = null, pv = null, distort = 0, sawFlight = false
    for (const f of F) { const vis = ['shoeX', 'shoeH', 'shoeC1'].map(k => f.p[k] && [k, f.p[k]]).filter(x => x && x[1][4] > .3)
      if (vis.length >= 2 && dist(ctr(vis[0][1]), ctr(vis[1][1])) > 10) dbl++
      if (!vis.length) { gap++; continue }
      const s = vis.sort((a, b) => b[1][4] - a[1][4] || b[1][2] - a[1][2])[0][1], c = ctr(s)
      if (prev) { const v = [c[0] - prev[0], c[1] - prev[1]]; jump = Math.max(jump, Math.hypot(...v)); if (pv) jerk = Math.max(jerk, Math.hypot(v[0] - pv[0], v[1] - pv[1])); pv = v }
      prev = c; if (f.p.shoeX) sawFlight = true
      const t = f.p.dTitle; if (t && t[4] > .05 && last.dTitle) distort = Math.max(distort, Math.abs((t[2] / t[3]) / (last.dTitle[2] / last.dTitle[3]) - 1)) }
    const hero = last.shoeH, heroAt = hero && F.find((f, i) => F.slice(i).every(g => g.p.shoeH && g.p.shoeH[4] > .99 && dist(ctr(g.p.shoeH), ctr(hero)) < 1))?.t - t0
    const contentAt = last.dR1 && F.find((f, i) => F.slice(i).every(g => (g.p.dR1?.[4] ?? 0) > .99 && Math.abs(g.p.dR1[1] - last.dR1[1]) < .5))?.t - t0
    Object.assign(out, { opens: ctx.counters.opens, shoeDoubleFrames: dbl, shoeGapFrames: gap, shoeMaxStepPx: r2(jump), shoeJerkPx: r2(jerk), titleDistortPct: r2(distort * 100),
      heroLandedMs: heroAt != null ? Math.round(heroAt) : null, contentReadyMs: contentAt != null ? Math.round(contentAt) : null })
  }
  if (moment === 'cart') {
    const fly = F.filter(f => f.p.fly1).map(f => [f.t, f.p.fly1]), icon = last.dCart
    let kink = 0, step = 0, off = 0
    for (let i = 1; i < fly.length; i++) { const a = ctr(fly[i - 1][1]), b = ctr(fly[i][1]); step = Math.max(step, dist(a, b)); const q = fly[i][1]
      if (q[0] < -1 || q[1] < -1 || q[0] + q[2] > 391 || q[1] + q[3] > 845) off++
      if (i > 1) { const z = ctr(fly[i - 2][1]), v0 = [a[0] - z[0], a[1] - z[1]], v1 = [b[0] - a[0], b[1] - a[1]]
        if (Math.hypot(...v0) > 1.5 && Math.hypot(...v1) > 1.5) { let d = Math.abs(Math.atan2(v1[1], v1[0]) - Math.atan2(v0[1], v0[0])) * 180 / Math.PI; if (d > 180) d = 360 - d; kink = Math.max(kink, d) } } }
    const lastFly = fly.at(-1)?.[1], landT = markT(log, 'land'), badgeT = marks(log, 'badge:')[0]?.t
    let bJump = 0; const bw = F.filter(f => f.p.badge).map(f => f.p.badge[2]); for (let i = 1; i < bw.length; i++) bJump = Math.max(bJump, Math.abs(bw[i] - bw[i - 1]) / (last.badge?.[2] || 18))
    Object.assign(out, { flights: ctx.counters.flights, lands: marks(log, 'land').length, badge: ctx.badge,
      landErrPx: lastFly && icon ? r2(dist(ctr(lastFly), ctr(icon))) : null, landSizeRatio: lastFly && icon ? r2(lastFly[2] / icon[2]) : null, endOpacity: lastFly?.[4],
      pathKinkDeg: r2(kink), flyMaxStepPx: r2(step), offscreenFrames: off, badgeBeforeLandMs: landT && badgeT ? Math.round(landT - badgeT) : null, badgeScaleStepPct: r2(bJump * 100) })
    if (scen === 'toCart') { const cp = F.find(f => f.p.cartp); Object.assign(out, { cartStartX: cp ? Math.round(cp.p.cartp[0]) : null }) }
    const clipped = Object.entries(last).filter(([k, q]) => q[4] > .5 && (q[0] < -1 || q[0] + q[2] > 391) && !k.startsWith('cartp') ).map(([k]) => k)
    if (clipped.length) out.clipped = clipped.join(',')
  }
  if (moment === 'pay') {
    let spinMs = 0, crush = 0, bgOver = 0
    for (let i = 1; i < F.length; i++) { const f = F[i]; if ((f.p.spin?.[4] ?? 0) > .5) spinMs += f.t - F[i - 1].t
      const t = f.p.payTxt, b = f.p.payBg; if (t && b && t[4] > .05 && b[2] < t[2] + 8) crush++ }
    const failT = markT(log, 'fail'); if (failT) { const bws = F.filter(f => f.t > failT && f.p.payBg).map(f => f.p.payBg[2]); const end = bws.at(-1); bgOver = Math.max(0, ...bws.map(w => w - end)) }
    let dips = 0, was = 1, low = false; for (const f of F) { const o = f.p.payTxt?.[4] ?? 0; if (o < .5 && was >= .5) low = true; if (low && o >= .9) { dips++; low = false } was = o }
    out.labelOutAndBack = dips
    const okAt = F.find(f => (f.p.chk?.[4] ?? 0) > .9)?.t
    Object.assign(out, { spinnerVisibleMs: Math.round(spinMs), spinnerFlash: spinMs > 0 && spinMs < 300, labelCrushedFrames: crush, checkVisibleMs: okAt ? Math.round(okAt - t0) : null,
      celebrated: ctx.counters.celebrate, confettiPeak: Math.max(0, ...F.map(f => f.conf || 0)),
      errorShown: (last.err?.[4] ?? 0) > .9, payButtonBackOvershootPx: r2(bgOver), labelBack: (last.payTxt?.[4] ?? 0) > .9,
      endOK: scen.includes('Fail') ? true : (last.placed?.[4] ?? 0) > .99 && (last.trackBtn?.[4] ?? 0) > .99 })
  }
  return out
}

const out = []
for (const cfg of configs) for (const scen of SCN) {
  if (only && !only.includes(scen)) continue
  const t0 = Date.now()
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: reduced ? 'reduce' : 'no-preference',
    ...(videoDir ? { recordVideo: { dir: videoDir, size: { width: 390, height: 844 } } } : {}) })
  const page = await ctx.newPage()
  page.on('pageerror', e => console.error('PAGEERR', scen, e.message))
  if (throttle) { const c = await ctx.newCDPSession(page); await c.send('Emulation.setCPUThrottlingRate', { rate: throttle }) }
  await page.goto(pathToFileURL(here + 'index.html').href + '?' + new URLSearchParams({ m: moment, ...cfg }))
  await page.waitForTimeout(400)
  const startMs = Date.now() - t0
  const counters = await page.evaluate(n => window.__run(n), scen)
  const log = await page.evaluate(() => window.__log), cls = await page.evaluate(() => window.__cls)
  const sug = moment === 'search' ? await page.evaluate(qs => Object.fromEntries(qs.map(q => [q, window.__sugFor(q)])), [...new Set(log.filter(e => e.mark?.startsWith('key:')).map(e => e.mark.slice(4)))]) : null
  const badge = await page.evaluate(() => document.getElementById('badge')?.textContent)
  const vid = videoDir ? page.video() : null
  await ctx.close()
  const row = { cfg: Object.entries(cfg).map(([k, v]) => k === 'v' ? v : `${k}=${v}`).join(' '), scen, ...score(log, scen, { cls, counters, sug, badge, rtl: cfg.rtl === '1' }) }
  if (vid) { row.video = await vid.path(); row.videoStartMs = startMs }
  out.push(row)
}
await browser.close()
console.log(JSON.stringify(out))

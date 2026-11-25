// Form motion lab runner. Every variant is a query param of index.html; every scenario runs in-page (exact timing).
// node run.mjs <moment> '<json array of configs>' [--only s1,s2] [--throttle 6] [--reduced] [--video dir]
//   moment: amount | pick | note      config: {"v":"A"} | {"v":"W","rtl":"1","digits":"ar"} | {"v":"W","probe":"0"}
// Prints one JSON row per config × scenario. Perf (long frames) is only meaningful with probe:"0".
import { chromium } from 'playwright'
import { pathToFileURL } from 'node:url'
const here = new URL('.', import.meta.url).pathname
const args = process.argv.slice(2), moment = args[0], configs = JSON.parse(args[1])
const opt = k => { const i = args.indexOf(k); return i > 0 ? args[i + 1] : null }
const videoDir = opt('--video'), throttle = +(opt('--throttle') || 0), only = opt('--only')?.split(','), reduced = args.includes('--reduced')
const SCN = { amount: ['type', 'fast', 'long', 'back'], pick: ['pick', 'repick', 'cancel'], note: ['reel', 'human', 'lunar', 'slow', 'rental', 'rentalSlow', 'arabic', 'clear', 'blurOut'] }[moment]
const browser = await chromium.launch()
const r1 = n => Math.round(n * 10) / 10, R = Math.round
const markT = (log, m) => log.find(e => e.mark === m)?.t
const marks = (log, pre) => log.filter(e => e.mark?.startsWith(pre))

function generic(log, from) {
  const F = log.filter(e => !e.mark && e.t >= from)
  let long = 0, maxF = 0; for (let i = 1; i < F.length; i++) { const d = F[i].t - F[i - 1].t; if (d > 25) long++; maxF = Math.max(maxF, d) }
  return { F, out: { longFrames: long, maxFrameMs: R(maxF), frames: F.length } }
}

function score(log, scen, ctx) {
  const t0 = markT(log, 'go') ?? markT(log, 'A'), { F, out } = generic(log, t0)
  if (!F[0]?.x) { if (moment === 'amount') out.fxPeak = Math.max(0, ...F.map(f => f.fxn || 0)); return out }
  if (moment === 'amount') {
    const keys = marks(log, 'key:').filter(k => k.t >= t0 && k.mark !== 'key:ignored'), seen = new Set(Object.values(ctx.fmt))
    const vis = f => f.x.gl.filter(g => g[4] > .5 && !g[7]).sort((a, b) => a[2] - b[2])
    const txt = f => vis(f).map(g => g[1]).join('')
    const lat = [], ent = []
    keys.forEach((k, n) => { const v = k.mark.split(':').slice(2).join(':'), want = ctx.fmt[v], tEnd = keys[n + 1]?.t ?? 9e15
      const fr = F.filter(f => f.t > k.t)
      const hit = fr.find(f => txt(f) === want); lat.push(hit && hit.t < tEnd + 2000 ? hit.t - k.t : 9999)
      const dk = k.mark.startsWith('key:del') || k.mark.startsWith('key:.') ? null : 'd' + (v.replace('.', '').length - 1)
      if (ctx.glyph && dk) { const s = fr.find(f => { const g = f.x.gl.find(q => q[0] === dk && !q[7]); return g && g[4] >= .98 && Math.abs(g[5] - 1) < .01 && g[6] < .05 }); ent.push(s ? s.t - k.t : 9999) }
      else if (!ctx.glyph) { const s = fr.find(f => { const g = f.x.gl[0]; return g && g[4] >= .98 && g[6] < .05 && g[1] === want }); ent.push(s ? s.t - k.t : 9999) } })
    let curStep = 0, gStep = 0, jumpFrames = 0, inter = 0, blank = 0, order = 0, clip = 0, overlap = 0, overlapFrames = 0, extraSep = 0, missSep = 0
    for (let i = 1; i < F.length; i++) { const a = F[i - 1].x.gl, b = F[i].x.gl
      for (const g of b) { if (g[7] || g[4] <= .5) continue; const p = a.find(q => q[0] === g[0] && !q[7] && q[4] > .5); if (!p) continue
        const d = Math.abs(g[2] - p[2]); gStep = Math.max(gStep, d); if (g[0] === 'cur' || g[0] === 'all') { curStep = Math.max(curStep, d); if (d > 8) jumpFrames++ } } }
    for (const f of F) { const t = txt(f); if (!t) blank++; else if (!seen.has(t)) inter++
      const dom = f.x.gl.filter(g => g[4] > .5 && !g[7]).map(g => g[0]), byX = vis(f).map(g => g[0]); if (dom.join() !== byX.join()) order++
      { const cur = keys.filter(k => k.t <= f.t).at(-1), v = cur ? cur.mark.split(':').slice(2).join(':') : '', want = (ctx.fmt[v] ?? '').replace(/[^,٬]/g, '').length
        const n = f.x.gl.filter(g => g[4] > .35 && /[,٬]/.test(g[1])).length; if (n > want) extraSep++; if (n < want) missSep++ }
      if (f.x.gl.some(g => g[4] > .3 && !g[7] && (g[2] < 15.5 || g[2] + g[3] > 374.5))) clip++
      const dv = f.x.gl.filter(g => g[4] > .3 && !g[7]); for (let j = 1; j < dv.length; j++) { const o = dv[j - 1][2] + dv[j - 1][3] - dv[j][2]; if (o > overlap) overlap = o; if (o > 3) overlapFrames++ } }
    const last = F.at(-1), lv = vis(last), ys = new Set(lv.map(g => R(g[8] / 10)))
    lat.sort((a, b) => a - b); ent.sort((a, b) => a - b)
    Object.assign(out, { keys: keys.length, keyToRightValueP50: R(lat[lat.length >> 1]), keyToRightValueMax: R(lat.at(-1)), digitSettleP50: R(ent[ent.length >> 1] ?? -1), digitSettleMax: R(ent.at(-1) ?? -1),
      curStepMaxPx: r1(curStep), curJumpFrames: jumpFrames, glyphStepMaxPx: r1(gStep), intermediateValueFrames: inter, blankFrames: blank, orderErrFrames: order, extraSepFrames: extraSep, missingSepFrames: missSep, overlapMaxPx: r1(overlap), overlapFrames, clipFrames: clip,
      endText: txt(last), endOK: txt(last) === ctx.fmt[ctx.val], endLines: ys.size, endScale: last.x.s, fxPeak: Math.max(0, ...F.map(f => f.x.fxn || 0)) })
  }
  if (moment === 'pick') {
    const rowId = ctx.kind === 'pay' ? 'payRow' : 'toRow', tap = markT(log, 'go'), gone = marks(log, 'sheetGone').find(m => m.t > tap)?.t, ms = marks(log, 'morph:').find(m => m.t >= tap)?.t
    const last = F.at(-1).x[rowId], finalId = last.L.at(-1)?.[0]
    const pre0 = log.filter(e => e.x && e.t < tap).at(-1)?.x[rowId].L.at(-1)?.[0]
    let dbl = 0, empty = 0, hJ = 0, hidden = 0, dimmed = 0, firstNew = null, flyStep = 0, flyDbl = 0, pf = null
    for (let i = 0; i < F.length; i++) { const f = F[i], r = f.x[rowId], covered = f.x.sheetY < r.y + r.h / 2
      const legible = r.L.filter(l => l[1] > .35), nw = r.L.find(l => l[0] === finalId && l === r.L.at(-1))
      if (!covered && legible.length >= 2 && new Set(legible.map(l => l[0])).size >= 2) dbl++
      if (!covered && Math.max(0, ...r.L.map(l => l[1])) < .15) empty++
      if (i) hJ = Math.max(hJ, Math.abs(r.h - F[i - 1].x[rowId].h))
      if (nw && nw[1] > .1 && firstNew == null && finalId !== pre0) firstNew = f.t
      if (nw && nw[1] > .02 && nw[1] < .98) { const dt = i ? f.t - F[i - 1].t : 0; if (covered) hidden += dt; else if (f.x.scrim > .15) dimmed += dt }
      if (f.x.fly) { const c = f.x.fly; if (pf) flyStep = Math.max(flyStep, Math.hypot(c[0] - pf[0], c[1] - pf[1])); pf = c
        if (nw && nw[5] > .3 && c[3] > .3 && Math.hypot(nw[6] - c[0], nw[7] - c[1]) > 10) flyDbl++ } }
    let settled = null
    for (let i = F.length - 1; i > 0; i--) { const a = F[i].x[rowId], b = F[i - 1].x[rowId]
      const same = a.L.length === b.L.length && a.L.length === 1 && Math.abs(a.L[0][1] - b.L[0][1]) < .01 && Math.abs(a.L[0][5] - b.L[0][5]) < .01 && Math.abs(a.L[0][3] - b.L[0][3]) < .3 && a.h === b.h && F[i].x.sheetY >= 843 && a.L[0][1] > .99
      if (!same) { settled = F[i].t - tap; break } }
    Object.assign(out, { tapToSheetGoneMs: gone ? R(gone - tap) : null, morphStartMs: ms ? R(ms - tap) : null, newVisibleMs: firstNew ? R(firstNew - tap) : null, settledMs: settled != null ? R(settled) : 0,
      doubleExposureFrames: dbl, emptyRowFrames: empty, rowHeightJumpPx: hJ, morphHiddenMs: R(hidden), morphDimmedMs: R(dimmed), finalId, layersAtEnd: last.L.length, ellipsized: last.L.at(-1)?.[9] ?? 0,
      morphs: ctx.counters.morphs, ...(F.some(f => f.x.fly) ? { flyMaxStepPx: r1(flyStep), flyDoubleFrames: flyDbl } : {}) })
  }
  if (moment === 'note') {
    const lastT = scen === 'blurOut' ? markT(log, 'blurred') : marks(log, 'nk:').at(-1)?.t, want = ctx.expect   // lastT: the last input event, not the scenario's 'last' mark (which follows one more keystroke gap)
    const shown = f => { const v = f.x.ic.filter(i => i[1] > .5).sort((a, b) => b[1] - a[1])[0]; return v ? v[0] : null }
    let changes = 0, typingChanges = 0, gaps = 0, dblIcon = 0, prev = shown(F[0]), seq = [prev]
    for (const f of F) if (f.x.ic.filter(i => i[1] > .35).length > 1) dblIcon++
    for (const f of F) { const s = shown(f); if (!s) { gaps++; continue } if (s !== prev) { changes++; if (f.t < lastT) typingChanges++; seq.push(s); prev = s } }
    const ok = f => { const i = f.x.ic.find(q => q[0] === want); return i && i[1] >= .98 && Math.abs(i[2] - 30) < .6 && Math.abs(i[3]) < 1 && f.x.ic.filter(q => q[1] > .02).length === 1 }
    let settle = null; for (let i = F.length - 1; i >= 0; i--) if (!ok(F[i])) { settle = i === F.length - 1 ? 9999 : F[i + 1].t - lastT; break }
    const vis = F.find(f => f.t >= lastT && shown(f) === want && F.slice(F.indexOf(f)).every(g => shown(g) === want))
    Object.assign(out, { iconChanges: changes, changesWhileTyping: typingChanges, seq: seq.join(''), gapFrames: gaps, dblIconFrames: dblIcon, visibleAfterLastMs: vis ? R(vis.t - lastT) : 9999,
      settledAfterLastMs: settle == null ? 0 : R(Math.max(0, settle)), endIcon: shown(F.at(-1)), endOK: shown(F.at(-1)) === want })
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
  const res = await page.evaluate(n => window.__run(n), scen)
  const log = await page.evaluate(() => window.__log)
  const vals = [...new Set(['', ...marks(log, 'key:').map(k => k.mark.split(':').slice(2).join(':'))])]
  const fmt = moment === 'amount' ? await page.evaluate(vs => Object.fromEntries(vs.map(v => [v, window.__fmt(v)])), vals) : null
  const expect = moment === 'note' ? await page.evaluate(t => window.__classify(t), res.note) : null
  const glyph = await page.evaluate(() => !!document.querySelector('#scaler .g:not(.num)'))
  const vid = videoDir ? page.video() : null
  await ctx.close()
  const row = { cfg: Object.entries(cfg).map(([k, v]) => k === 'v' ? v : `${k}=${v}`).join(' '), scen,
    ...score(log, scen, { counters: res.counters, fmt, val: res.val, expect: expect === '✏️' || !res.note ? '✏️' : expect, glyph, kind: cfg.kind }) }
  if (vid) { const a = markT(log, 'A'); row.video = await vid.path(); row.videoStartMs = startMs; row.goMs = R((markT(log, 'go') ?? a) - a); row.lastMs = R((markT(log, 'last') ?? markT(log, 'go') ?? a) - a) }
  out.push(row)
}
await browser.close()
console.log(JSON.stringify(out))

// Live-surface lab: every query param is a variant (engine, timing, spring, shrink, drag, release, fixw, at, rtl, glow).
// Defaults are the measured winners — see decision-map.md `liveSurface`. Needs playwright (+ its chromium).
// Example: node run.mjs '[{},{"engine":"ease","timing":"together"}]' --only S2_tapExpand,G1_realTinyFlick
// node run.mjs '<json array of config objects>' [--video dir] [--throttle 4] [--only S1,S2]
import { chromium } from 'playwright'
import { pathToFileURL } from 'node:url'
const here = new URL('.', import.meta.url).pathname
const args = process.argv.slice(2)
const configs = JSON.parse(args[0])
const opt = k => { const i = args.indexOf(k); return i > 0 ? args[i + 1] : null }
const videoDir = opt('--video'), throttle = +(opt('--throttle') || 0), only = opt('--only')?.split(',')
const reduced = args.includes('--reduced')
const wait = ms => new Promise(r => setTimeout(r, ms))

const browser = await chromium.launch()
async function open(cfg) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 600 }, deviceScaleFactor: 1, hasTouch: false,
    reducedMotion: reduced ? 'reduce' : 'no-preference',
    ...(videoDir ? { recordVideo: { dir: videoDir, size: { width: 390, height: 600 } } } : {}) })
  const page = await ctx.newPage()
  if (throttle) { const c = await ctx.newCDPSession(page); await c.send('Emulation.setCPUThrottlingRate', { rate: throttle }) }
  await page.goto(pathToFileURL(here + 'index.html').href + '?' + new URLSearchParams(cfg))
  await wait(300)
  return { ctx, page }
}
const mark = (p, m) => p.evaluate(m => window.__mark(m), m)
async function drag(page, dy, ms, steps) {
  const x = 195, y = 45
  await page.mouse.move(x, y); await page.mouse.down()
  for (let i = 1; i <= steps; i++) { await page.mouse.move(x, y + dy * i / steps); await wait(ms / steps) }
  await page.mouse.up()
}
async function dragEx(page, path, hold) {  // path: [[dy, ms, steps], ...] relative moves; hold = still before lifting
  const x = 195; let y = 45
  await page.mouse.move(x, y); await page.mouse.down()
  for (const [dy, ms, steps] of path) { const y0 = y; for (let i = 1; i <= steps; i++) { await page.mouse.move(x, y0 + dy * i / steps); await wait(ms / steps) } y = y0 + dy }
  if (hold) await wait(hold)
  await page.mouse.up()
}
async function toBanner(page) { await page.mouse.click(195, 28); await wait(700) }
async function toPanel(page) { await toBanner(page); await page.mouse.click(195, 45); await wait(800) }

async function flickIn(page, path) {  // real-time pointer events dispatched in-page: [[dy, ms, steps], ...]
  await page.evaluate(async path => {
    const el = document.getElementById('island'), w = ms => new Promise(r => setTimeout(r, ms)); let y = 45
    const ev = (type, y) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: 195, clientY: y, pointerId: 7, isPrimary: true }))
    ev('pointerdown', y)
    for (const [dy, ms, steps] of path) { const y0 = y; for (let i = 1; i <= steps; i++) { await w(ms / steps); ev('pointermove', y0 + dy * i / steps) } y = y0 + dy }
    ev('pointerup', y)
  }, path)
}
const SCEN = {
  J_journey: async p => { await wait(400); await mark(p, 'A'); await p.mouse.click(195, 28); await wait(900); await flickIn(p, [[150, 450, 28]]); await wait(900);
    await p.evaluate(() => car.scrollBy({ left: 220, behavior: 'smooth' })); await wait(900); await p.mouse.click(195, 115); await wait(1100); await p.mouse.click(195, 60); await wait(900) },
  G1_realTinyFlick: async p => { await toBanner(p); await mark(p, 'A'); await flickIn(p, [[22, 40, 5]]); await wait(900) },         // expect panel
  G2_realFlickUp:   async p => { await toBanner(p); await mark(p, 'A'); await flickIn(p, [[130, 500, 30], [-40, 40, 5]]); await wait(900) }, // expect banner
  G3_realStopThenLift: async p => { await toBanner(p); await mark(p, 'A'); await flickIn(p, [[130, 300, 20], [0, 120, 1]]); await wait(900) }, // expect panel (position wins)
  G4_realSlowShort: async p => { await toBanner(p); await mark(p, 'A'); await flickIn(p, [[45, 500, 30]]); await wait(900) },        // expect banner
  F1_tinyFlick:  async p => { await toBanner(p); await mark(p, 'A'); await dragEx(p, [[22, 40, 3]]); await wait(900) },          // expect panel
  F2_pastHalfHold: async p => { await toBanner(p); await mark(p, 'A'); await dragEx(p, [[100, 600, 20]], 250); await wait(900) }, // expect panel
  F3_downThenFlickUp: async p => { await toBanner(p); await mark(p, 'A'); await dragEx(p, [[120, 500, 15], [-45, 50, 3]]); await wait(900) }, // expect banner
  F4_shortHold:  async p => { await toBanner(p); await mark(p, 'A'); await dragEx(p, [[40, 300, 10]], 250); await wait(900) },   // expect banner
  S1_open:       async p => { await mark(p, 'A'); await p.mouse.click(195, 28); await wait(900) },
  S2_tapExpand:  async p => { await toBanner(p); await mark(p, 'A'); await p.mouse.click(195, 45); await wait(900) },
  S3_dragHalfSlow: async p => { await toBanner(p); await mark(p, 'A'); await drag(p, 60, 600, 20); await wait(900) },
  S4_fling:      async p => { await toBanner(p); await mark(p, 'A'); await drag(p, 55, 70, 5); await wait(900) },
  S5_overdrag:   async p => { await toBanner(p); await mark(p, 'A'); await drag(p, 300, 700, 25); await wait(900) },
  S6_pickPlay:   async p => { await toPanel(p); await p.evaluate(() => car.scrollBy({ left: 330, behavior: 'smooth' })); await wait(700);
                               await mark(p, 'A'); await p.mouse.click(195, 115); await wait(900) },
  S7_interrupt:  async p => { await toPanel(p); await mark(p, 'A'); await p.mouse.click(195, 115); await wait(110); await p.mouse.click(195, 60); await wait(900) },
}

function score(log, scen) {
  const a = log.findIndex(e => e.mark === 'A'); const L = log.slice(a).filter(e => !e.mark)
  const gos = log.slice(a).filter(e => e.mark?.startsWith('go:'))
  const lastGo = gos.at(-1); const tgo = lastGo?.t ?? L[0].t
  const end = L.at(-1), tgt = end.h
  const after = L.filter(e => e.t >= tgo)
  const start = after[0]?.h ?? tgt
  let settle = 0; for (const e of after) if (Math.abs(e.h - tgt) > .5 || Math.abs(e.w - end.w) > .5) settle = e.t - tgo
  const travel = Math.abs(tgt - start) || 1, dir = Math.sign(tgt - start)
  const over = Math.max(0, ...after.map(e => (e.h - tgt) * dir)) / travel * 100
  // content visible while the box is smaller than it (crushed/clipped), and text reflow while visible
  const crushed = L.filter(e => e.on > .05 && e.contentH > e.h + 2).length
  const titleHs = new Set(L.filter(e => e.on > .05 && e.state === 'banner').map(e => e.titleH)).size
  // jerk: biggest frame-to-frame change in velocity (px/frame) — a dead stop / reversal spike
  let jerk = 0; for (let i = 2; i < L.length; i++) { const v1 = L[i].h - L[i - 1].h, v0 = L[i - 1].h - L[i - 2].h; jerk = Math.max(jerk, Math.abs(v1 - v0)) }
  let long = 0; for (let i = 1; i < L.length; i++) if (L[i].t - L[i - 1].t > 25) long++
  const drags = L.filter(e => e.drag != null)
  const fadeAt = log.slice(a).filter(e => e.mark?.startsWith('fade:')).at(-1)
  return { end: end.state, h: Math.round(tgt), settleMs: Math.round(settle), overshootPct: +over.toFixed(1),
    contentAfterMs: fadeAt ? Math.round(fadeAt.t - tgo) : null, crushedFrames: crushed, titleReflows: Math.max(0, titleHs - 1),
    jerkPx: +jerk.toFixed(1), longFrames: long, frames: L.length, ...(drags.length ? { dragLagPx: +(drags.reduce((s,e)=>s+e.drag,0)/drags.length).toFixed(1) } : {}) }
}

const out = []
for (const cfg of configs) for (const [name, fn] of Object.entries(SCEN)) {
  if (only && !only.includes(name)) continue
  const { ctx, page } = await open(cfg)
  await fn(page)
  const log = await page.evaluate(() => window.__log)
  out.push({ cfg: Object.values(cfg).join('/'), scen: name, ...score(log, name) })
  await ctx.close()
}
await browser.close()
console.log(JSON.stringify(out))

#!/usr/bin/env node
/**
 * verify-motion.mjs — mechanical checks for a motion combo, against a running app.
 *
 *   node verify-motion.mjs --url <page> --selector <css> [--trigger <css>] [--pw <dir>]
 *
 * Checks the things a still frame CANNOT tell you but code+frames CAN. It does NOT
 * judge feel — that is always the user's call (see SKILL step 6).
 *
 * Each check maps to a line in the skill's own checklist:
 *   1. clean console                          — nothing throwing mid-motion
 *   2. motion actually fires                  — the combo is wired up at all
 *   3. starts within ~100ms                   — decision-map law 5 (Doherty)
 *   4. transform/opacity/filter only          — SKILL principle 9 (no layout thrash)
 *   5. settles and stops                      — no runaway rAF / infinite asymptote
 *   6. interruptible (no restart-from-zero)   — SKILL principle 6, for retargetable motion
 *   7. reduced-motion keeps the cue           — SKILL principle 7 / law 12
 *
 * TWO GOTCHAS this script already handles, both of which cost real time to find:
 *   - `waitUntil: 'networkidle'` NEVER fires against a Vite dev server: the HMR
 *     websocket keeps the connection open forever. Use 'domcontentloaded'.
 *   - `waitForSelector` defaults to state:'visible'; a zero-size marker element is
 *     attached but never "visible" and will time out. Use state:'attached'.
 */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'

// ---------------------------------------------------------------- args
const argv = process.argv.slice(2)
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d }
const url = arg('url')
const selector = arg('selector')
const trigger = arg('trigger')
const pwDir = arg('pw', process.env.BROWSE_PW_DIR || process.cwd())
const channel = arg('channel', 'chrome')

if (!url || !selector) {
  console.error('usage: verify-motion.mjs --url <page> --selector <css> [--trigger <css>] [--pw <dir>]')
  console.error('  --pw   dir to resolve `playwright` from (default cwd; this project: storage/playwright)')
  process.exit(2)
}

let chromium
for (const cand of [pwDir, join(pwDir, 'storage/playwright'), process.cwd()]) {
  try { ({ chromium } = createRequire(pathToFileURL(join(cand, 'package.json')).href)('playwright')); break } catch {}
}
if (!chromium) { console.error(`ERROR: could not resolve 'playwright' from ${pwDir}. Pass --pw <dir>.`); process.exit(3) }

// ---------------------------------------------------------------- harness
const results = []
const ok = (name, pass, detail) => {
  results.push({ name, pass })
  console.log(`${pass ? '  PASS' : '  FAIL'}  ${name}\n        ${detail}`)
}
const skip = (name, why) => { console.log(`  SKIP  ${name}\n        ${why}`) }

// Three property classes, and the distinction is the whole point of the reduced-motion check:
//   MOTION — compositor-only, cheap, and what reduced-motion is allowed to DROP
//   CUE    — colour/state signals, what reduced-motion must KEEP (principle 7: never
//            reduce a combo to "nothing happened")
//   LAYOUT — forces reflow every frame; must never be animated (principle 9)
const MOTION = ['transform', 'opacity', 'filter']
const CUE = ['backgroundColor', 'color', 'borderColor', 'outlineColor']
const LAYOUT = ['width', 'height', 'top', 'left', 'marginTop', 'marginLeft', 'paddingTop', 'fontSize']

/** Sample computed style of `sel` every frame for `frames`, return the series. */
const SAMPLER = (sel, props, frames) => new Promise(res => {
  const el = document.querySelector(sel)
  if (!el) return res(null)
  const out = []
  let n = 0
  const tick = () => {
    const cs = getComputedStyle(el)
    const row = {}
    for (const p of props) row[p] = cs[p]
    out.push({ t: performance.now(), ...row })
    if (++n < frames) requestAnimationFrame(tick)
    else res(out)
  }
  requestAnimationFrame(tick)
})

async function run(page, { reduced, normalMoved }) {
  const errors = []
  page.on('pageerror', e => errors.push(String(e)))
  page.on('console', m => m.type() === 'error' && errors.push(m.text()))

  await page.goto(url, { waitUntil: 'domcontentloaded' })       // NOT networkidle — see header
  await page.waitForSelector(selector, { state: 'attached', timeout: 15000 })  // NOT 'visible' — see header
  await page.waitForTimeout(400)                                 // let any entrance settle

  const label = reduced ? 'reduced-motion' : 'normal'
  console.log(`\n[${label}]`)

  // 1. clean console
  ok(`[${label}] no console/page errors`, errors.length === 0, errors.slice(0, 3).join(' | ') || 'clean')

  // fire the trigger (if any) and sample ~90 frames of computed style
  const series = await page.evaluate(async ({ sel, trg, props, S }) => {
    const sampler = new Function(`return (${S})`)()
    const p = sampler(sel, props, 90)
    if (trg) document.querySelector(trg)?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    return p
  }, { sel: selector, trg: trigger, props: [...MOTION, ...CUE, ...LAYOUT], S: SAMPLER.toString() })

  if (!series) { ok(`[${label}] element found`, false, `selector "${selector}" matched nothing`); return false }

  const changed = p => new Set(series.map(r => r[p])).size > 1
  const movedProps = MOTION.filter(changed)
  const cueProps = CUE.filter(changed)
  const layoutProps = LAYOUT.filter(changed)

  if (reduced) {
    // Only meaningful if the element animates at all in normal mode. If it never moved,
    // there is no motion to reduce and nothing to assert — say so instead of failing.
    if (!normalMoved) {
      skip('[reduced-motion] the state change is still communicated',
           'element does not animate in normal mode either — nothing to reduce')
    } else {
      // principle 7 / law 12: motion may go, but the CHANGE must still be legible.
      ok('[reduced-motion] the state change is still communicated',
         cueProps.length > 0 || movedProps.includes('opacity'),
         cueProps.length || movedProps.length
           ? `surviving cue: ${[...cueProps, ...movedProps.filter(p => p === 'opacity')].join(', ') || 'none'}`
           : 'NOTHING changed — reduced-motion must keep a colour/opacity/icon cue, not delete the feedback')
      ok('[reduced-motion] large positional travel is dropped',
         !movedProps.includes('transform'),
         movedProps.includes('transform') ? 'transform still animating — should be dropped or reduced to a fade' : 'no transform travel')
    }
  } else {
    ok('[normal] motion actually fires',
       movedProps.length > 0 || cueProps.length > 0,
       `motion: ${movedProps.join(', ') || 'none'} | cue: ${cueProps.join(', ') || 'none'}`)

    if (movedProps.length) {
      // starts within ~100ms (law 5, Doherty)
      const t0 = series[0].t
      const firstMove = series.find(r => MOTION.some(p => r[p] !== series[0][p]))
      ok('[normal] motion starts within ~100ms of the trigger',
         !!firstMove && (firstMove.t - t0) < 100,
         firstMove ? `first change at ${(firstMove.t - t0).toFixed(0)}ms` : 'never changed')

      // settles and stops
      const last = series[series.length - 1]
      const stable = series.slice(-12).every(r => MOTION.every(p => r[p] === last[p]))
      ok('[normal] motion settles (no runaway rAF / infinite asymptote)',
         stable,
         stable ? `stable for the last 12 frames (~${((last.t - t0) / 1000).toFixed(2)}s sampled)` : 'still changing at the end of the sample window')
    } else {
      skip('[normal] motion timing + settling', 'no transform/opacity/filter animation on this element')
    }
  }

  // cheap properties only (principle 9) — checked in both modes
  ok(`[${label}] no layout-triggering properties animate`,
     layoutProps.length === 0,
     layoutProps.length ? `REFLOW EVERY FRAME: ${layoutProps.join(', ')} — move these to transform` : 'transform/opacity/filter only')

  return movedProps.length > 0
}

// ---------------------------------------------------------------- interruptibility
async function runInterrupt(page) {
  if (!trigger) { skip('[normal] interruptible (no restart-from-zero)', 'needs --trigger'); return }
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector(selector, { state: 'attached', timeout: 15000 })
  await page.waitForTimeout(400)

  const r = await page.evaluate(async ({ sel, trg }) => {
    const el = document.querySelector(sel), btn = document.querySelector(trg)
    const val = () => getComputedStyle(el).transform
    const rest = val()
    btn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await new Promise(r2 => setTimeout(r2, 90))         // mid-flight
    const mid = val()
    btn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))  // re-trigger
    await new Promise(r2 => requestAnimationFrame(r2))
    await new Promise(r2 => requestAnimationFrame(r2))
    return { rest, mid, afterRetrigger: val() }
  }, { sel: selector, trg: trigger })

  // Vacuous if the element never transforms — don't claim a pass we didn't earn.
  if (r.mid === r.rest) {
    skip('[normal] interruptible (no restart-from-zero)', 'transform never left its resting value; nothing to interrupt')
    return
  }

  // A keyframe that restarts from zero snaps straight back to the resting value.
  ok('[normal] interruptible — retrigger does not restart from zero',
     r.afterRetrigger !== r.rest,
     `rest=${r.rest.slice(0, 40)} | mid=${r.mid.slice(0, 40)} | after-retrigger=${r.afterRetrigger.slice(0, 40)}`)
}

// ---------------------------------------------------------------- go
const browser = await chromium.launch({ channel })
try {
  const normal = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const normalMoved = await run(normal, { reduced: false })
  await runInterrupt(normal)
  await normal.close()

  const reduced = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await reduced.emulateMedia({ reducedMotion: 'reduce' })
  await run(reduced, { reduced: true, normalMoved })
  await reduced.close()
} finally {
  await browser.close()
}

const failed = results.filter(r => !r.pass)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
console.log('\nNOTE: this checks WIRING, not FEEL. Snappiness, jank on real hardware, and')
console.log('whether it is still pleasant on the Nth repeat are the user\'s call — hand those over.')
process.exit(failed.length ? 1 : 0)

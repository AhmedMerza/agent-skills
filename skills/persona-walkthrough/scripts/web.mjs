#!/usr/bin/env node
// Blind-persona driver for a website — the web twin of droid.sh, same verbs, same coordinate rule:
// coordinates are in the pixels of the screenshot `shot` prints (longest side <= WEB_SHOT_MAX, default 1280),
// so a persona never has to know the real viewport size.
//
// A persona's shell calls each start fresh, so one long-lived browser server per persona holds the page
// (form input, scroll, viewport, throttling all survive between calls). `start` launches it; it exits on
// `stop` or after IDLE_MIN (default 45) idle minutes.
//   web start URL [PROFILE]   launch the browser (if not running) and open URL; PROFILE as below, default desktop
//   web reset URL             fresh visitor: new browser context (no cookies/storage), open URL
//   web shot [name]           screenshot of the visible window -> $OUT/<name>.png, prints path + size
//                             (also saves what a screen reader hears as <name>.txt, for coverage.py)
//   web tap X Y               click (a touch tap on mobile/tablet profiles)
//   web hold X Y              press and hold ~0.9s
//   web swipe X1 Y1 X2 Y2     scroll like droid.sh: swipe up (high Y -> low Y) scrolls down
//   web scroll down|up        scroll most of one screen
//   web type "text"           type into the focused field (any language)
//   web key back|enter|tab|del|esc     back = the browser's Back button
//   web goto URL              type an address into the address bar
//   web url                   the address bar as a person sees it
//   web texts                 what a screen reader hears (accessibility tree)
//   web profile NAME|WxH      mobile 390x844 · tablet 820x1180 · laptop 1440x900 · desktop 1920x1080 ·
//                             ultrawide 3440x1440 · or any WxH (desktop-type). Switching between touch and
//                             desktop profiles reopens the page (login kept, unsaved form input lost)
//   web scheme dark|light     the visitor's OS colour scheme
//   web network full|fast3g|slow3g|offline
//   web stop                  close the browser
// Env: OUT (run dir, required by start), PW_DIR (dir whose node_modules has playwright; default: the cwd's
//      storage/playwright, then the cwd), LOCALE (default en-US), HEADED=1 to watch, WEB_SHOT_MAX, IDLE_MIN.
// Console errors and failed requests go to $OUT/console.log — for the orchestrator's triage, not the persona.
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, readdirSync, openSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import http from 'node:http'

const OUT = resolve(process.env.OUT || join(process.env.TMPDIR || '/tmp', 'persona-shots')) // never the cwd: usually the repo
const PORT_FILE = join(OUT, '.web-port')
const SHOT_MAX = Number(process.env.WEB_SHOT_MAX || 1280)
const [cmd, ...args] = process.argv.slice(2)

const PROFILES = {
  mobile: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
  tablet: { viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  laptop: { viewport: { width: 1440, height: 900 } },
  desktop: { viewport: { width: 1920, height: 1080 } },
  ultrawide: { viewport: { width: 3440, height: 1440 } },
}
function profileOf(name) {
  if (PROFILES[name]) return PROFILES[name]
  const m = /^(\d+)x(\d+)$/.exec(name || '')
  if (m) return { viewport: { width: +m[1], height: +m[2] } }
  throw new Error(`unknown profile '${name}' (mobile|tablet|laptop|desktop|ultrawide|WxH)`)
}

// ---------------------------------------------------------------- client: every verb talks to the server
async function send(body) {
  if (!existsSync(PORT_FILE)) throw new Error(`no browser running for OUT=${OUT}: run 'web start URL' first`)
  const port = readFileSync(PORT_FILE, 'utf8').trim()
  const res = await fetch(`http://127.0.0.1:${port}/`, { method: 'POST', body: JSON.stringify(body) }).catch(() => null)
  if (!res) throw new Error(`browser server on port ${port} is gone (idle timeout?): run 'web start URL' again`)
  const text = await res.text()
  if (!res.ok) throw new Error(text)
  return text
}

async function alive() {
  try { await send({ cmd: 'ping' }); return true } catch { return false }
}

async function client() {
  if (!cmd || cmd === 'help') {
    console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 30).join('\n'))
    process.exit(cmd ? 0 : 1)
  }
  mkdirSync(OUT, { recursive: true })
  if (cmd === 'start' && !(await alive())) {
    const log = openSync(join(OUT, 'console.log'), 'a')
    spawn(process.execPath, [fileURLToPath(import.meta.url), '__serve', args[1] || 'desktop'],
      { detached: true, stdio: ['ignore', log, log], env: { ...process.env, OUT, PW_CWD: process.cwd() } }).unref()
    for (let i = 0; i < 100 && !(await alive()); i++) await new Promise(r => setTimeout(r, 200))
    if (!(await alive())) throw new Error(`browser did not start; see ${join(OUT, 'console.log')}`)
  }
  if (cmd === 'stop' && !existsSync(PORT_FILE)) return console.log('not running')
  const out = await send({ cmd, args })
  if (out) console.log(out)
}

// ---------------------------------------------------------------- server: holds the browser and the page
async function serve(startProfile) {
  let chromium
  const base = process.env.PW_CWD || process.cwd()
  for (const dir of [process.env.PW_DIR, join(base, 'storage/playwright'), base].filter(Boolean)) {
    try { ({ chromium } = createRequire(pathToFileURL(join(dir, 'package.json')).href)('playwright')); break } catch {}
  }
  if (!chromium) throw new Error(`cannot resolve 'playwright' (set PW_DIR to a dir whose node_modules has it)`)

  const log = (line) => appendFileSync(join(OUT, 'console.log'), `${new Date().toISOString()} ${line}\n`)
  const browser = await chromium.launch({ headless: process.env.HEADED !== '1' })
  let profile = profileOf(startProfile), scheme = 'light', network = 'full', ctx, page, cdp

  async function open(url, storageState) {
    if (ctx) await ctx.close()
    ctx = await browser.newContext({ ...profile, locale: process.env.LOCALE || 'en-US', colorScheme: scheme, storageState })
    page = await ctx.newPage()
    page.on('console', m => m.type() === 'error' && log(`console.error ${m.text()}`))
    page.on('pageerror', e => log(`pageerror ${e.message}`))
    page.on('requestfailed', r => log(`requestfailed ${r.method()} ${r.url()} ${r.failure()?.errorText}`))
    page.on('response', r => r.status() >= 500 && log(`http ${r.status()} ${r.request().method()} ${r.url()}`))
    cdp = await ctx.newCDPSession(page)
    await setNetwork(network)
    if (url) await page.goto(url, { waitUntil: 'domcontentloaded' }).catch(e => log(`goto ${url}: ${e.message}`))
  }

  async function setNetwork(name) {
    const presets = {
      full: { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 },
      fast3g: { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 },
      slow3g: { offline: false, latency: 400, downloadThroughput: 400e3 / 8, uploadThroughput: 400e3 / 8 },
      offline: { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 },
    }
    if (!presets[name]) throw new Error(`unknown network '${name}' (full|fast3g|slow3g|offline)`)
    network = name
    await cdp.send('Network.emulateNetworkConditions', presets[name])
  }

  // screenshot coords -> CSS px, computed from the CURRENT viewport so a profile change can't leave a stale scale
  const scale = () => { const { width, height } = page.viewportSize(); return Math.max(1, Math.max(width, height) / SHOT_MAX) }
  const px = (v) => Number(v) * scale()
  const settle = () => page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {})
  const texts = async () => (await page.locator('body').ariaSnapshot({ timeout: 5000 }).catch(e => `(no accessibility tree: ${e.message})`))

  const verbs = {
    ping: async () => '',
    start: async ([url]) => { await open(url); return `opened ${page.url()}` },
    reset: async ([url]) => { await open(url); return `fresh visitor at ${page.url()}` },
    goto: async ([url]) => { await page.goto(url, { waitUntil: 'domcontentloaded' }); return page.url() },
    url: async () => page.url(),
    shot: async ([name]) => {
      // a person waits for the page to stop loading before reading it (capped: polling apps never go idle)
      await page.waitForLoadState('networkidle', { timeout: 4000 }).catch(() => {})
      const n = readdirSync(OUT).filter(f => f.endsWith('.png')).length
      name ||= `step-${String(n + 1).padStart(3, '0')}`
      const { width, height } = page.viewportSize(), s = scale()
      // CDP clips in document coordinates: offset by the scroll position or every shot shows the page top
      const { x, y } = await page.evaluate(() => ({ x: visualViewport.pageLeft, y: visualViewport.pageTop }))
      const { data } = await cdp.send('Page.captureScreenshot', {
        format: 'png', clip: { x, y, width, height, scale: 1 / s }, captureBeyondViewport: false,
      })
      writeFileSync(join(OUT, `${name}.png`), Buffer.from(data, 'base64'))
      writeFileSync(join(OUT, `${name}.txt`), await texts())
      return `${join(OUT, `${name}.png`)} (${Math.round(width / s)}x${Math.round(height / s)})`
    },
    tap: async ([x, y]) => {
      if (profile.hasTouch) await page.touchscreen.tap(px(x), px(y)); else await page.mouse.click(px(x), px(y))
      await settle(); return ''
    },
    hold: async ([x, y]) => {
      await page.mouse.move(px(x), px(y)); await page.mouse.down(); await page.waitForTimeout(900); await page.mouse.up(); return ''
    },
    swipe: async ([x1, y1, x2, y2]) => {
      await page.mouse.move(px(x1), px(y1)); await page.mouse.wheel(px(x1) - px(x2), px(y1) - px(y2)); await page.waitForTimeout(400); return ''
    },
    scroll: async ([dir]) => {
      const h = page.viewportSize().height * 0.8
      await page.mouse.wheel(0, dir === 'up' ? -h : h); await page.waitForTimeout(400); return ''
    },
    type: async ([text]) => { await page.keyboard.type(text, { delay: 30 }); return '' },
    key: async ([k]) => {
      if (k === 'back') {
        await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {})
        // a real Back button is greyed out on the first page; the fresh context's about:blank is a tool artefact
        if (page.url() === 'about:blank') { await page.goForward({ waitUntil: 'domcontentloaded' }); return '(Back is greyed out: nothing to go back to)' }
        return ''
      }
      const map = { enter: 'Enter', tab: 'Tab', del: 'Backspace', esc: 'Escape' }
      if (!map[k]) throw new Error(`unknown key '${k}' (back|enter|tab|del|esc)`)
      await page.keyboard.press(map[k]); await settle(); return ''
    },
    texts,
    profile: async ([name]) => {
      const next = profileOf(name)
      if (!!next.hasTouch === !!profile.hasTouch) { profile = next; await page.setViewportSize(next.viewport); return `viewport ${name}` }
      const url = page.url(), state = await ctx.storageState()
      profile = next; await open(url, state)
      return `reopened at ${name} (touch ${next.hasTouch ? 'on' : 'off'}); unsaved form input was lost`
    },
    scheme: async ([s]) => { scheme = s === 'dark' ? 'dark' : 'light'; await page.emulateMedia({ colorScheme: scheme }); return scheme },
    network: async ([n]) => { await setNetwork(n); return n },
    stop: async () => { setTimeout(() => process.exit(0), 50); return 'browser closed' },
  }

  let idle
  const touch = () => { clearTimeout(idle); idle = setTimeout(() => process.exit(0), Number(process.env.IDLE_MIN || 45) * 60e3) }
  const server = http.createServer((req, res) => {
    let body = ''
    req.on('data', c => (body += c))
    req.on('end', async () => {
      touch()
      try {
        const { cmd, args } = JSON.parse(body)
        if (!verbs[cmd]) throw new Error(`unknown command '${cmd}' (run 'web help')`)
        if (!page && !['ping', 'start', 'reset', 'stop'].includes(cmd)) throw new Error(`no page open: run 'web start URL'`)
        res.end(await verbs[cmd](args || []))
      } catch (e) { res.statusCode = 400; res.end(e.message) }
    })
  })
  process.on('exit', () => rmSync(PORT_FILE, { force: true }))
  server.listen(0, '127.0.0.1', () => { writeFileSync(PORT_FILE, String(server.address().port)); touch() })
}

if (cmd === '__serve') serve(args[0]).catch(e => { console.error(e); process.exit(1) })
else client().catch(e => { console.error(e.message); process.exit(1) })

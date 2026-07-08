#!/usr/bin/env node
// Global, project-agnostic Playwright browse helper.
// Drives a browser to take authenticated, scrolling screenshots of an app page.
//
// All app-specifics come from <repo>/.claude/browse-config.json (optional).
// Credentials NEVER come from config — pass them via PW_EMAIL / PW_PASS env.
//
// Usage (run with cwd = project root):
//   node ~/.claude/scripts/browse.mjs [--mobile] [--login] [--user EMAIL] <url-path>
//
// Resolves Playwright from the PROJECT's install (config.playwrightDir, else
// ./storage/playwright, else project root). Browse only works where Playwright
// is installed in the current repo.

import { createRequire } from 'node:module'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join, resolve, isAbsolute } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = process.cwd()

// ---- load optional per-project config -------------------------------------
const cfgPath = join(root, '.claude', 'browse-config.json')
const cfg = existsSync(cfgPath) ? JSON.parse(readFileSync(cfgPath, 'utf8')) : {}
const auth = cfg.auth || {}

// ---- parse args ------------------------------------------------------------
const argv = process.argv.slice(2)
let mobile = false, forceLogin = false, userArg = null
const rest = []
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a === '--mobile') mobile = true
  else if (a === '--login') forceLogin = true
  else if (a === '--user') userArg = argv[++i]
  else rest.push(a)
}
const path = rest[0] || '/'

// ---- resolve config values (with sensible defaults) ------------------------
const baseUrl = (cfg.baseUrl || 'http://localhost:8080').replace(/\/$/, '')
const loginPath = cfg.loginPath || '/login'
const email = userArg || process.env.PW_EMAIL || cfg.defaultUser || null
const pass = process.env.PW_PASS || null
const channel = cfg.channel || 'chrome'

const pwDir = cfg.playwrightDir
  ? resolve(root, cfg.playwrightDir)
  : existsSync(join(root, 'storage/playwright/node_modules')) ? join(root, 'storage/playwright') : root
const outDir = (() => {
  const d = cfg.outDir || (cfg.playwrightDir ? cfg.playwrightDir : 'storage/playwright')
  return isAbsolute(d) ? d : resolve(root, d) // absolute — avoids nested-output bug
})()
mkdirSync(outDir, { recursive: true })
const statePath = join(outDir, 'auth-state.json')

// ---- resolve Playwright from the PROJECT's node_modules --------------------
let chromium, devices
for (const cand of [process.env.BROWSE_PW_DIR, pwDir, root].filter(Boolean)) {
  try {
    const req = createRequire(pathToFileURL(join(cand, 'package.json')).href)
    ;({ chromium, devices } = req('playwright'))
    break
  } catch { /* try next */ }
}
if (!chromium) {
  console.error(`ERROR: could not resolve 'playwright' from ${pwDir} or ${root}.`)
  console.error(`Install it in the project, or set "playwrightDir" in .claude/browse-config.json, or BROWSE_PW_DIR env.`)
  process.exit(2)
}

// ---- login flow (config-driven, defaults match a Vuetify email/password UI)-
async function login (page) {
  if (!pass) { console.error('LOGIN REQUIRED but PW_PASS env is not set.'); process.exit(3) }
  if (!email) { console.error('LOGIN REQUIRED but no email (set PW_EMAIL / --user / config.defaultUser).'); process.exit(3) }
  await page.goto(`${baseUrl}${loginPath}`, { waitUntil: 'domcontentloaded', timeout: 20000 })
  if (auth.emailTabText) { try { await page.getByText(auth.emailTabText, { exact: false }).click({ timeout: 3000 }) } catch {} }
  await page.locator(auth.emailSelector || 'input[type="email"]').first().fill(email)
  await page.locator(auth.passwordSelector || 'input[type="password"]').first().fill(pass)
  await page.getByRole('button', { name: auth.submitButtonName || 'Login', exact: true }).click({ timeout: 5000 })
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  if (page.url().includes(loginPath)) { console.error('LOGIN FAILED — check credentials.'); process.exit(4) }
}

// ---- main ------------------------------------------------------------------
const browser = await chromium.launch({ channel })
const ctxOpts = mobile && devices['iPhone 14'] ? { ...devices['iPhone 14'] } : { viewport: { width: 1920, height: 1080 } }
if (!forceLogin && existsSync(statePath)) ctxOpts.storageState = statePath
const context = await browser.newContext(ctxOpts)
const page = await context.newPage()

if (forceLogin || !existsSync(statePath)) {
  await login(page)
  await context.storageState({ path: statePath })
}

const url = `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 })
// Session expired? (redirected back to login) -> re-login once.
if (page.url().includes(loginPath) && !forceLogin) {
  await login(page)
  await context.storageState({ path: statePath })
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 })
}
await page.waitForTimeout(1200)

// ---- scrolling screenshots -------------------------------------------------
const vh = page.viewportSize()?.height || 1080
const total = await page.evaluate(() => document.body.scrollHeight)
const pages = Math.max(1, Math.ceil(total / vh))
const shots = []
for (let i = 0; i < pages; i++) {
  await page.evaluate(y => window.scrollTo(0, y), i * vh)
  await page.waitForTimeout(400)
  const f = join(outDir, `page-${i + 1}.png`)
  await page.screenshot({ path: f })
  shots.push(f)
}
console.log(`OK ${url}`)
console.log(`viewport: ${mobile ? 'mobile' : 'desktop'}  shots: ${shots.length}`)
shots.forEach(s => console.log(s))
await browser.close()

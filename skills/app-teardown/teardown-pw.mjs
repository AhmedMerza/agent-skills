#!/usr/bin/env node
// app-teardown Playwright driver, for agents that have a shell but no browser tools.
//   login: node teardown-pw.mjs login <profileDir> <loginUrl>
//          Opens plain Chrome (no automation, so Google SSO works); the HUMAN signs in and closes it.
//   probe: node teardown-pw.mjs probe <profileDir> <url> [outFile]
//          Headless, reuses the signed-in profile, runs probes.js, adds live network calls.
// Playwright resolves from PLAYWRIGHT_DIR (a folder containing node_modules/playwright) or the cwd.
// Credentials are never read, stored or typed by this script.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [mode, profile, url, outFile] = process.argv.slice(2);
if (!['login', 'probe'].includes(mode) || !profile || !url) {
  console.error('usage: teardown-pw.mjs login|probe <profileDir> <url> [outFile]'); process.exit(2);
}
const req = createRequire(join(process.env.PLAYWRIGHT_DIR || process.cwd(), 'package.json'));
const { chromium } = req('playwright');
// The same real Chrome binary for login and probe, so the profile's cookies stay readable.
const CHROME = process.env.CHROME_PATH || '/opt/google/chrome/google-chrome';

if (mode === 'login') {
  // Plain Chrome, NOT driven by Playwright: Google and other SSO providers reject automated browsers
  // ("This browser or app may not be secure"). The human signs in, then closes the window.
  const { spawn } = await import('node:child_process');
  console.log('Sign in in the Chrome window that opens, then CLOSE that window.');
  const p = spawn(CHROME, ['--user-data-dir=' + profile, '--password-store=basic', '--no-first-run', '--no-default-browser-check', '--new-window', url], { stdio: 'ignore' });
  await new Promise(r => p.on('exit', r));
  console.log('Window closed; profile saved at', profile);
} else {
  const ctx = await chromium.launchPersistentContext(profile, { executablePath: CHROME, args: ['--password-store=basic'], headless: true, viewport: { width: 1440, height: 900 } });
  const page = ctx.pages()[0] || await ctx.newPage();
  const host = new URL(url).host;
  const calls = new Set();
  page.on('request', r => {
    if (!['fetch', 'xhr'].includes(r.resourceType())) return;
    const u = new URL(r.url());
    if (u.host !== host) return; // own API only; third-party chat/analytics dropped
    calls.add(r.method() + ' ' + u.pathname.replace(/[0-9a-f-]{8,}|\d+/g, ':id') + (u.search ? '?' + [...u.searchParams.keys()].join('&') : ''));
  });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(Number(process.env.SETTLE_MS || 6000)); // apps that poll or hold websockets never reach networkidle
  if (/login|sign_in|signin/i.test(page.url())) {
    console.error('Not signed in (landed on ' + page.url() + '). Run the login mode first.'); await ctx.close(); process.exit(3);
  }
  const probe = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'probes.js'), 'utf8');
  const result = JSON.parse(await page.evaluate(probe));
  result.network = [...calls].sort();
  const json = JSON.stringify(result, null, 1);
  if (outFile) writeFileSync(outFile, json); else console.log(json);
  console.log(`routes=${result.routes.length} keyframes=${Object.keys(result.motion.keyframes).length} api=${result.network.length} styles=${Object.keys(result.styles).length}`);
  await ctx.close();
}

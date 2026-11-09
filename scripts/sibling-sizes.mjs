#!/usr/bin/env node
// sibling-sizes.mjs — measure what eyes miss: repeated siblings (cards, tiles, buttons, tabs, list
// rows) that sit side by side but are not the same height, rows that are out of line, and a grid's
// last row left with a lone half-width item. Screenshots hide a 20px difference; a measurement doesn't.
// Calibrated on app !3895 (2026-11-09): five stat tiles rendered 106/106/126/106/106px because one
// label wrapped, and three personas, ui-audit and the orchestrator all looked and missed it.
//
// Web:     node sibling-sizes.mjs <url> [--widths 1440,1000,700,390] [--storage-state <file>]
//                                       [--wait-text <text>] [--json]
//          Playwright resolves like web.mjs: $PW_DIR, then ./storage/playwright, then the cwd.
// Android: node sibling-sizes.mjs --android [--serial <s>] [--xml <uiautomator dump.xml>] [--json]
//          Reads `uiautomator dump` bounds. Flutter apps show up only through their semantics
//          (accessibility) tree: widgets with no semantics node (a plain Container, a decorated box
//          with no label) are invisible to it, so a Flutter screen can be clean here and still ragged.
// Both:    --look prints only the persona-facing `LOOK:` lines; --json-out <file> also writes the JSON.
// Exit: 0 clean · 1 findings · 2 could not run.
// Library: measurePage(page) -> findings for the page's current viewport (web.mjs calls it on its
//          own open page), lookLines(findings), analyze(groups).
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'

const TOL = 2 // px: what counts as "the same"

// ------------------------------------------------------------------ shared analysis
// groups: [{ path, near, contentW, items: [{ x, y, w, h, ow, ox, text }] }]
//   x/y/w/h = the visual box (what the eye sees), ox/ow = the sibling's own column box (for widths)
const noun = (path) => {
  const p = path.toLowerCase()
  for (const [re, n] of [[/card/, 'card'], [/tile|stat/, 'tile'], [/btn|button/, 'button'], [/tab/, 'tab'],
    [/chip/, 'chip'], [/row|item|li\b|list/, 'item']]) if (re.test(p)) return n
  return 'box'
}
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] }
const q = (s) => (s ? ` near "${s}"` : '')

function bands(items) {
  const out = []
  for (const it of [...items].sort((a, b) => a.y - b.y || a.x - b.x)) {
    const band = out.find((b) => {
      const f = b[0], overlap = Math.min(f.y + f.h, it.y + it.h) - Math.max(f.y, it.y)
      return overlap >= 0.5 * Math.min(f.h, it.h)
    })
    band ? band.push(it) : out.push([it])
  }
  return out.map((b) => b.sort((a, c) => a.x - c.x))
}

export function analyze(groups, extra = {}) {
  const findings = [], seen = new Set()
  const add = (f) => { const k = f.kind + f.path + f.sentence; if (!seen.has(k)) { seen.add(k); findings.push({ ...extra, ...f }) } }
  for (const g of groups) {
    const rows = bands(g.items), n = noun(g.label || g.path), ns = n === 'box' ? 'boxes' : n + 's'
    for (const row of rows) {
      if (row.length < 2) continue
      const hs = row.map((i) => Math.round(i.h)), tops = row.map((i) => Math.round(i.y))
      const base = { path: g.path, near: g.near, inView: row.some((i) => i.inView !== false), count: row.length }
      if (Math.max(...hs) - Math.min(...hs) > TOL) {
        const m = median(hs), oi = hs.reduce((b, h, i) => (Math.abs(h - m) > Math.abs(hs[b] - m) ? i : b), 0)
        const odd = hs.filter((h) => Math.abs(h - m) > TOL).length
        const word = hs[oi] > m ? 'taller' : 'shorter'
        add({ ...base, kind: 'uneven-height', heights: hs, outlier: oi, outlierText: row[oi].text, ratio: +(Math.max(...hs) / Math.min(...hs)).toFixed(2),
          sentence: odd === 1
            ? `In the row of ${row.length} ${ns}${q(g.near)}, one ${n}${row[oi].text ? ` ("${row[oi].text}")` : ''} is ${word} than ${row.length === 2 ? 'the other' : 'the others'} (${hs[oi]}px vs ${hs.find((h) => Math.abs(h - hs[oi]) > TOL)}px, ${(Math.max(...hs) / Math.min(...hs)).toFixed(2)}x).`
            : `In the row of ${row.length} ${ns}${q(g.near)}, the ${ns} are not the same height (${hs.join('/')}px).`,
          look: odd === 1 ? `in the row of ${row.length} ${ns}${q(g.near)}, one ${n} is ${word} than ${row.length === 2 ? 'the other' : 'the others'}.`
            : `in the row of ${row.length} ${ns}${q(g.near)}, the ${ns} are all different heights.` })
      } else if (Math.max(...tops) - Math.min(...tops) > TOL) {
        const m = median(tops), oi = tops.reduce((b, t, i) => (Math.abs(t - m) > Math.abs(tops[b] - m) ? i : b), 0), d = tops[oi] - m
        add({ ...base, kind: 'misaligned', tops, outlier: oi, outlierText: row[oi].text,
          sentence: `In the row of ${row.length} ${ns}${q(g.near)}, one ${n} sits ${Math.abs(d)}px ${d > 0 ? 'lower' : 'higher'} than the others.`,
          look: `in the row of ${row.length} ${ns}${q(g.near)}, one ${n} sits ${d > 0 ? 'lower' : 'higher'} than the others.` })
      }
    }
    // part-empty: a grid (equal-width items) whose last row is short and leaves a gap
    if (rows.length >= 2 && g.contentW > 0) {
      const last = rows.at(-1), full = rows.slice(0, -1).reduce((a, b) => (b.length > a.length ? b : a))
      const ws = full.map((i) => i.ow)
      // a ragged last row of plain links reads as text flow; only boxed items (cards, tiles) look half-built
      if (last.length < full.length && full.length >= 2 && Math.max(...ws) - Math.min(...ws) <= 4 && last.every((i) => i.painted !== false)) {
        const sum = (r) => r.reduce((s, i) => s + i.ow, 0)
        const gap = (full.at(-1).ox + full.at(-1).ow - full[0].ox - sum(full)) / (full.length - 1)
        const used = sum(last) + (last.length - 1) * gap, pct = Math.round((100 * used) / g.contentW)
        if (used < 0.9 * g.contentW)
          add({ path: g.path, near: g.near, inView: last.some((i) => i.inView !== false), kind: 'part-empty', count: last.length, perRow: full.length,
            usedPx: Math.round(used), rowPx: Math.round(g.contentW), pct,
            sentence: `The last row of the ${ns}${q(g.near)} has ${last.length} ${n}${last.length > 1 ? 's' : ''} where the rows above have ${full.length}; it fills only ${pct}% of the width (${Math.round(used)} of ${Math.round(g.contentW)}px) and leaves an empty gap.`,
            look: `the last row of ${ns}${q(g.near)} has ${last.length === 1 ? `a lone ${n}` : `only ${last.length} ${ns}`} with empty space beside it.` })
      }
    }
  }
  return findings
}

export const lookLines = (findings) => findings.filter((f) => f.inView !== false).map((f) => `LOOK: ${f.look}`)

// ------------------------------------------------------------------ web: collect sibling groups in the page
function collectInPage() {
  const vis = (el) => {
    if (el instanceof SVGElement) return false
    const cs = getComputedStyle(el), r = el.getBoundingClientRect()
    return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0 && cs.display !== 'contents'
      && cs.position !== 'absolute' && cs.position !== 'fixed' && r.width >= 1 && r.height >= 1
  }
  const kids = (el) => [...el.children].filter((c) => !/^(SCRIPT|STYLE|TEMPLATE|NOSCRIPT|BR|INPUT|OPTION)$/.test(c.tagName) && vis(c))
  const STATE = /active|selected|-enter|-leave|focus|hover|disabled|checked|expanded|open|loading|^router-link|^v-theme--|^text-|^bg-|^elevation-|--variant-|^on-/
  // Grid-width classes say how wide a column is, not what it is: a grid whose last column spans the row
  // (v-col-12 beside v-col-6) is still one grid. Leave them out, or the spanning item forms its own group
  // and the item before it reads as a lone card (seen on app !3895's result tiles). They collapse to their family below.
  const SIZE = /^(v-col|col)-(xs|sm|md|lg|xl|xxl)$|^(v-col|col|offset|v-col-offset)(-(xs|sm|md|lg|xl|xxl))?-(\d+|auto)$|^(sm|md|lg|xl|2xl):|^(w|basis|col-span|flex-basis)-/
  // A sized class collapses to its family (v-col-sm-4 -> v-col), so columns that differ only in width share a
  // signature; Vuetify renders no bare v-col, so dropping them would leave the columns with no class at all.
  const fam = (c) => (SIZE.test(c) ? (c.match(/^(v-col|col)/) || [])[1] : c)
  const sig = (el) => el.tagName + '.' + [...new Set([...el.classList].filter((c) => !STATE.test(c)).map(fam).filter(Boolean))].sort().join('.')
  const painted = (el) => {
    const cs = getComputedStyle(el)
    return !/^(transparent|rgba\(0, 0, 0, 0\))$/.test(cs.backgroundColor) || cs.backgroundImage !== 'none' || cs.boxShadow !== 'none'
      || ['Top', 'Right', 'Bottom', 'Left'].some((s) => parseFloat(cs[`border${s}Width`]) > 0 && cs[`border${s}Style`] !== 'none')
  }
  // a transparent wrapper (grid column) around one painted box (card): measure the card
  const visual = (el, d = 0) => {
    if (painted(el) || d > 3) return el
    const k = kids(el)
    if (k.length !== 1) return el
    const v = visual(k[0], d + 1)
    return painted(v) ? v : el
  }
  const txt = (el) => { const t = (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' '); return t.length > 40 ? t.slice(0, 39) + '…' : t }
  const step = (el) => el.tagName.toLowerCase() + [...el.classList].filter((c) => !STATE.test(c)).slice(0, 2).map((c) => '.' + c).join('')
  const path = (el) => { const p = []; for (let e = el; e && e !== document.body && p.length < 3; e = e.parentElement) p.unshift(step(e)); return p.join(' > ') }
  const heads = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role=heading],legend,.v-card-title,.v-toolbar-title,[class*="text-h"],[class*="title"]')].filter(vis)
  const near = (parent, first) => {
    let best = ''
    for (const h of heads) {
      if (parent.contains(h) || first.contains(h)) continue
      if (h.compareDocumentPosition(parent) & Node.DOCUMENT_POSITION_FOLLOWING) { const t = txt(h); if (t) best = t }
    }
    return best || txt(first)
  }
  const vw = innerWidth, vh = innerHeight, sx = scrollX, sy = scrollY
  // Parents whose children are different-sized by nature: table cells/rows, form controls, inline text
  const SKIP_PARENT = /^(TR|TABLE|THEAD|TBODY|TFOOT|COLGROUP|SELECT|P|LABEL|SPAN|A|BUTTON|H[1-6])$/
  const groups = []
  for (const parent of document.body.querySelectorAll('*')) {
    if (SKIP_PARENT.test(parent.tagName) || parent instanceof SVGElement || parent.children.length < 2 || !vis(parent)) continue
    const pcs = getComputedStyle(parent)
    if (pcs.display.startsWith('inline') && pcs.display !== 'inline-flex' && pcs.display !== 'inline-grid') continue
    // only layouts that put siblings side by side; a block stack never forms a row
    if (!/flex|grid/.test(pcs.display) || (pcs.display.includes('flex') && pcs.flexDirection.startsWith('column'))) continue
    const bySig = new Map()
    for (const c of kids(parent)) { const s = sig(c); bySig.set(s, [...(bySig.get(s) || []), c]) }
    for (const [s, els] of bySig) {
      if (els.length < 2) continue
      if (s.endsWith('.') && !/^(LI|ARTICLE|SECTION)\.$/.test(s)) continue // classless divs: no evidence they are "the same thing"
      // unwrap only when every sibling unwraps alike, or an active (painted) button is compared with an idle one's icon
      const vs = els.map((el) => visual(el)), alike = vs.every((v, i) => (v === els[i]) === (vs[0] === els[0]) && sig(v) === sig(vs[0]))
      const items = els.map((el, i) => {
        const v = alike ? vs[i] : el, o = el.getBoundingClientRect(), r = v.getBoundingClientRect()
        return { painted: painted(v), x: r.left + sx, y: r.top + sy, w: r.width, h: r.height, ox: o.left + sx, ow: o.width, text: txt(el),
          inView: r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw }
      })
      const pr = parent.getBoundingClientRect()
      groups.push({ path: path(parent) + ' > ' + step(els[0]), label: step(alike ? vs[0] : els[0]), near: near(parent, els[0]),
        contentW: pr.width - parseFloat(pcs.paddingLeft) - parseFloat(pcs.paddingRight) - parseFloat(pcs.borderLeftWidth) - parseFloat(pcs.borderRightWidth), items })
    }
  }
  return groups
}

// Measured twice, settleMs apart: a finding counts only if it is still there (a loading skeleton or a
// card mid-transition is not what a person ends up looking at).
export async function measurePage(page, { settleMs = 1000 } = {}) {
  const width = page.viewportSize()?.width, key = (f) => f.kind + f.path + f.sentence
  const first = new Set(analyze(await page.evaluate(collectInPage), { width }).map(key))
  await page.waitForTimeout(settleMs)
  return analyze(await page.evaluate(collectInPage), { width }).filter((f) => first.has(key(f)))
}

// ------------------------------------------------------------------ android: uiautomator dump -> groups
const unent = (s) => s.replace(/&#10;/g, ' ').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
export function parseUiXml(xml) {
  const root = { attrs: {}, children: [] }, stack = [root]
  for (const m of xml.matchAll(/<(\/?)node\b((?:[^>"]|"[^"]*")*?)(\/?)>/g)) {
    if (m[1]) { if (stack.length > 1) stack.pop(); continue }
    const attrs = {}
    for (const a of m[2].matchAll(/([\w:-]+)="([^"]*)"/g)) attrs[a[1]] = unent(a[2])
    const b = /\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]/.exec(attrs.bounds || '') || [0, 0, 0, 0, 0]
    const node = { attrs, x: +b[1], y: +b[2], w: b[3] - b[1], h: b[4] - b[2], children: [] }
    stack.at(-1).children.push(node)
    if (!m[3]) stack.push(node)
  }
  return root
}
function androidGroups(root) {
  const flat = [], groups = []
  const walk = (n) => { flat.push(n); n.children.forEach(walk) }
  walk(root)
  const text = (n) => { const t = []; const w = (x) => { const s = x.attrs.text || x.attrs['content-desc']; if (s) t.push(s); x.children.forEach(w) }; w(n); return t.join(' ').replace(/\s+/g, ' ').slice(0, 40) }
  const short = (c = '') => c.split('.').pop()
  for (const parent of flat) {
    const kids = parent.children.filter((c) => c.w > 0 && c.h > 0)
    const used = new Set()
    for (const k of kids) {
      if (used.has(k)) continue
      const same = kids.filter((o) => !used.has(o) && o.attrs.class === k.attrs.class && Math.abs(o.w - k.w) <= 4)
      if (same.length < 2) continue
      same.forEach((o) => used.add(o))
      const idx = flat.indexOf(parent)
      const before = flat.slice(0, idx).reverse().find((n) => (n.attrs.text || n.attrs['content-desc']) && n.y + n.h <= same[0].y + 1)
      groups.push({ label: short(k.attrs.class) + ' ' + (k.attrs['resource-id'] || ''), path: `${short(parent.attrs.class) || 'root'}${parent.attrs['resource-id'] ? '#' + parent.attrs['resource-id'].split('/').pop() : ''} > ${short(k.attrs.class)}`,
        near: before ? (before.attrs.text || before.attrs['content-desc']).replace(/\s+/g, ' ').slice(0, 40) : text(same[0]),
        contentW: parent.w, items: same.map((n) => ({ x: n.x, y: n.y, w: n.w, h: n.h, ox: n.x, ow: n.w, text: text(n) })) })
    }
  }
  return groups
}

// ------------------------------------------------------------------ CLI
function report(findings, { json, look, jsonOut }) {
  if (jsonOut) writeFileSync(jsonOut, JSON.stringify(findings, null, 2))
  if (json) console.log(JSON.stringify(findings, null, 2))
  else if (look) lookLines(findings).forEach((l) => console.log(l))
  else if (!findings.length) console.log('sibling-sizes: clean')
  else for (const f of findings) console.log(`${f.width ? `@${f.width}px ` : ''}${f.kind}  ${f.path}\n  ${f.sentence}`)
  process.exit(findings.length ? 1 : 0)
}

async function main() {
  const argv = process.argv.slice(2), opt = (k) => { const i = argv.indexOf(k); return i > -1 ? argv[i + 1] : undefined }
  const flags = { json: argv.includes('--json'), look: argv.includes('--look'), jsonOut: opt('--json-out') }
  if (argv.includes('--android')) {
    let xml = opt('--xml') && readFileSync(opt('--xml'), 'utf8')
    if (!xml) {
      const adb = [process.env.ANDROID_HOME || join(process.env.HOME, 'Android/Sdk'), 'platform-tools/adb'].join('/')
      const bin = (() => { try { execFileSync('adb', ['version'], { stdio: 'ignore' }); return 'adb' } catch { return adb } })()
      const s = opt('--serial') ? ['-s', opt('--serial')] : []
      execFileSync(bin, [...s, 'shell', 'uiautomator', 'dump', '/sdcard/sib.xml'], { stdio: 'ignore', timeout: 20000 })
      xml = execFileSync(bin, [...s, 'exec-out', 'cat', '/sdcard/sib.xml'], { encoding: 'utf8', timeout: 20000 })
    }
    return report(analyze(androidGroups(parseUiXml(xml))), flags)
  }
  const url = argv.find((a, i) => !a.startsWith('--') && !argv[i - 1]?.match(/^--(widths|storage-state|wait-text|json-out|serial|xml)$/))
  if (!url) { console.error(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 22).join('\n')); process.exit(2) }
  let chromium
  for (const dir of [process.env.PW_DIR, join(process.cwd(), 'storage/playwright'), process.cwd()].filter(Boolean)) {
    try { ({ chromium } = createRequire(pathToFileURL(join(dir, 'package.json')).href)('playwright')); break } catch {}
  }
  if (!chromium) throw new Error("cannot resolve 'playwright' (set PW_DIR to a dir whose node_modules has it)")
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome' }).catch(() => chromium.launch())
  const ctx = await browser.newContext({ storageState: opt('--storage-state') })
  const page = await ctx.newPage(), all = []
  try {
    for (const width of (opt('--widths') || '1440,1000,700,390').split(',').map(Number)) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(url, { waitUntil: 'domcontentloaded' })
      if (opt('--wait-text')) await page.waitForFunction((t) => document.body?.innerText.includes(t), opt('--wait-text'), { timeout: 15000 }) // visible text only
      await page.waitForTimeout(1500)
      all.push(...await measurePage(page))
    }
  } finally { await browser.close() }
  report(all, flags)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
  main().catch((e) => { console.error(`sibling-sizes: ${e.message}`); process.exit(2) })

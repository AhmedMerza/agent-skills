// app-teardown motion probe. Records what actually MOVES — GSAP / Motion / anime (inline-style tweens),
// CSS animations and transitions, and WAAPI — frame by frame, plus jank, replays and stuck elements.
// probes.js (stylesheets + one getAnimations() at load) sees almost none of a JS-driven site: on Fitlo
// it found 1 running animation where 44 elements animated on first load (measured 2026-11-18).
//
// Load it as an INIT SCRIPT so the first-load entrance is recorded:
//   agent-browser --session <s> --init-script motion-probe.js open <url>
//   Playwright: page.addInitScript({ path }) before goto.   Late eval works too, but misses first load.
// Then, in the page:
//   __mp.out('load', 'table')     first-load choreography, readable (auto-recorded from document start until it settles;
//                                 one per document — open about:blank then the URL to record a fresh first load)
//   __mp.scan()                   libraries, every tween call parsed from the bundles, easing/duration histograms, CSS rules.
//                                 After it, out() attaches each group's matching declared call (`declared`).
//   __mp.targets()                what to test: selector + index per interaction class, and unsafe (write) buttons
//   __mp.rec('nav-orders')        arm a recording; it starts at the next REAL input (motion-pass.sh does this for you)
//   __mp.out('nav-orders', 'table'|'full')   waits until motion settles; out() never consumes a recording
//   __mp.samples('.sel')          raw per-frame values of one element, to check a summary
// Real input matters: JS-dispatched mouseover does not trigger :hover.
(() => {
  if (window.__mp) return;
  const W = window, D = document, now = () => performance.now();

  // 1. Headless Chrome reports no hover-capable pointer, and sites then switch their hover motion off.
  //    Force it on for JS (matchMedia) here, and for CSS @media (hover:hover) in forceHoverCss() below.
  const mm = W.matchMedia.bind(W);
  W.matchMedia = q => {
    const r = mm(q);
    if (!/\(\s*(hover\s*:\s*hover|pointer\s*:\s*fine|any-hover\s*:\s*hover|any-pointer\s*:\s*fine)\s*\)/.test(q)) return r;
    return new Proxy(r, { get: (t, p) => p === 'matches' ? true : (typeof t[p] === 'function' ? t[p].bind(t) : t[p]) });
  };
  let hoverSheets = -1;
  const forceHoverCss = () => {
    const mine = D.querySelectorAll('style[data-mp=hover]'); if (D.styleSheets.length - mine.length === hoverSheets) return 0; mine.forEach(x => x.remove()); hoverSheets = D.styleSheets.length;
    let n = 0; const css = [];
    for (const s of D.styleSheets) { try { for (const r of s.cssRules)
      if (r.type === CSSRule.MEDIA_RULE && /hover\s*:\s*hover|pointer\s*:\s*fine/.test(r.conditionText) && !/hover\s*:\s*none/.test(r.conditionText)) { for (const x of r.cssRules) css.push(x.cssText); n++; }
    } catch {} }
    if (css.length) { const st = D.createElement('style'); st.dataset.mp = 'hover'; st.textContent = css.join('\n'); D.head.append(st); }
    return n;
  };

  // 2. Perf observers (whole session; each recording slices its own window).
  const perf = { lt: [], cls: [], loaf: [] };
  try { new PerformanceObserver(l => l.getEntries().forEach(e => perf.loaf.push([e.startTime, e.duration, e.blockingDuration, (e.scripts || []).map(x => ({ d: Math.round(x.duration), src: (x.sourceURL || '').split('/').pop().split('?')[0] + (x.sourceFunctionName ? ' ' + x.sourceFunctionName : ''), inv: x.invoker }))]))).observe({ type: 'long-animation-frame', buffered: true }); } catch {}
  try { new PerformanceObserver(l => l.getEntries().forEach(e => perf.lt.push([e.startTime, e.duration]))).observe({ type: 'longtask', buffered: true }); } catch {}
  try { new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput) perf.cls.push([e.startTime, e.value]); })).observe({ type: 'layout-shift', buffered: true }); } catch {}

  // 3. Which elements are moving: anything whose style/class mutates (JS tweens write inline styles every frame),
  //    anything getAnimations() reports (CSS + WAAPI), and text that keeps changing (count-ups).
  // svgShape / svgTransform: GSAP and chart code animate SVG children through ATTRIBUTES (path morphs, icon pops)
  const PROPS = ['svgShape', 'svgTransform', 'opacity', 'transform', 'translate', 'scale', 'rotate', 'clipPath', 'filter', 'backgroundColor', 'color', 'boxShadow', 'strokeDashoffset', 'width', 'height'];
  const touched = new Set(), texts = new Map(), animMeta = new Map(), loopers = new WeakSet();
  const desc = el => {
    if (!el || !el.tagName) return '?';
    const cls = c => (typeof c === 'string' ? c : (c && c.baseVal) || '').trim().split(/\s+/).filter(x => x && !/^(is-|has-|v-|router-link|active)/.test(x)).slice(0, 2).join('.');
    const p = el.parentElement, a = cls(el.className), b = p ? cls(p.className).split('.')[0] : '';
    return el.tagName.toLowerCase() + (a ? '.' + a : '') + (b ? ' <' + b : '');
  };
  const addedAt = new WeakMap(), flashes = new Map(), hidden = new Set(); let lastFrame = 0, firstPaint = 0;
  try { new PerformanceObserver(l => l.getEntries().forEach(e => { if (!firstPaint) firstPaint = e.startTime; })).observe({ type: 'paint', buffered: true }); } catch {}
  const mo = new MutationObserver(list => { if (!recs.size || W.__mpPerfOnly) return; const t = now(); for (const m of list) {
    if (m.type === 'attributes') { const el = m.target; touched.add(el);
      if (m.attributeName === 'style' && el.style && el.style.opacity !== '' && +el.style.opacity < 0.05) {
        hidden.add(el);
        // the user saw it pop, vanish, then enter: the last frame sampled it visible and in view, AFTER the
        // browser's first paint (before first paint nothing is on screen, so an early hide is no flash)
        const tr = tracks.get(el), lastS = tr && tr.s[tr.s.length - 1];
        if (!firstPaint) firstPaint = performance.getEntriesByName('first-paint')[0]?.startTime || 0;
        if (lastS && firstPaint && lastFrame > firstPaint && touched.has(el) && +lastS[1].opacity > 0.9 && lastS[1].inView && t - (addedAt.get(el) ?? 0) < 2500 && !flashes.has(el)) flashes.set(el, { ms: Math.round(t - (addedAt.get(el) ?? 0)), at: t });
      } }
    else if (m.type === 'characterData' || m.type === 'childList') {
      const el = m.type === 'characterData' ? m.target.parentElement : m.target;
      if (el && el.childElementCount === 0 && /\d/.test(el.textContent)) { const t = texts.get(el) || { n: 0, first: now(), v0: el.textContent }; t.n++; t.last = now(); t.v = el.textContent; texts.set(el, t); }
      if (m.type === 'childList') m.addedNodes.forEach(n => { if (n.nodeType === 1) { touched.add(n); addedAt.set(n, t); n.querySelectorAll && n.querySelectorAll('*').forEach(c => addedAt.set(c, t)); } });
    } } });
  const startMo = () => mo.observe(D, { // the Document itself: init scripts can run before <html> exists
    subtree: true, attributes: true, attributeOldValue: true, attributeFilter: ['style', 'class', 'transform', 'd', 'points', 'x', 'y', 'cx', 'cy', 'r', 'width', 'height', 'stroke-dashoffset', 'opacity'], childList: true, characterData: true });
  startMo();

  // 4. Recordings: sample computed motion props of moving elements each frame; keep only changes.
  const recs = new Map(), tracks = new Map(); // el -> {d, samples:[[t, {prop:val}]]}
  let raf = 0, cost = 0;
  const NONE = { transform: 'matrix(1, 0, 0, 1, 0, 0)', translate: '0px 0px', scale: '1', rotate: '0deg', clipPath: 'inset(0px)' }; // filter: see filterId()
  const read = el => { const cs = getComputedStyle(el), o = {}; for (const p of PROPS) o[p] = cs[p] === 'none' && NONE[p] ? NONE[p] : cs[p];
    if (el instanceof SVGElement) { o.svgShape = el.getAttribute('d') || el.getAttribute('points') || ''; o.svgTransform = el.getAttribute('transform') || ''; }
    const r = el.getBoundingClientRect(); o.inView = r.bottom > 0 && r.top < innerHeight && r.width > 0; return o; };
  const liveSeen = new Map(); // tween -> descriptor, captured while it runs
  const tick = () => {
    const t0 = now(); lastFrame = t0;
    if (W.gsap && W.gsap.globalTimeline && !W.__mpPerfOnly) try { for (const t of W.gsap.globalTimeline.getChildren(true, true, false)) if (!liveSeen.has(t)) liveSeen.set(t, liveDesc(t)); } catch {}
    if (!W.__mpPerfOnly) for (const a of D.getAnimations()) { const el = a.effect && a.effect.target; if (!el) continue; touched.add(el); if (a.effect.getTiming().iterations === Infinity) loopers.add(el);
      if (!animMeta.has(a)) { const tm = a.effect.getTiming(); animMeta.set(a, { d: desc(el) + (a.effect.pseudoElement || ''), kind: a.constructor.name, name: a.animationName || a.transitionProperty || a.id || '', dur: Math.round(+tm.duration || 0), delay: Math.round(tm.delay || 0), ease: tm.easing, iter: tm.iterations, at: t0 }); } }
    if (W.__mpPerfOnly) touched.clear();
    for (const q of [':hover', ':active', ':focus-visible']) if (!W.__mpPerfOnly) D.querySelectorAll(q).forEach(el => touched.add(el));
    for (const el of touched) { if (!el.isConnected) { touched.delete(el); continue; }
      let tr = tracks.get(el); const v = read(el);
      if (!tr) { tracks.set(el, tr = { d: desc(el), s: [[t0, v]] }); } tr.loop = loopers.has(el); if (tr.s.length === 1 && tr.s[0][0] === t0) continue;
      const [lt, last] = tr.s[tr.s.length - 1]; if (PROPS.some(p => v[p] !== last[p])) { if (t0 - (tr.lc ?? -1e9) > 150) tr.run = t0; tr.lc = t0; tr.s.push([t0, v]); } else if (t0 - lt > 1500) touched.delete(el); }
    cost += now() - t0;
    for (const r of recs.values()) if (!r.done) { r.frames.push(t0 - r.lastF); r.lastF = t0;
      if (r.arm && !r.fired) { if (t0 - r.base > 15000) finish(r, t0, 'no input arrived within 15 s'); continue; }
      const quiet = t0 - Math.max(r.t0, ...[...tracks.values()].filter(x => x.lc && !isAmbient(x, r, t0)).map(x => x.lc)) > r.quiet;
      if (t0 - r.t0 > (W.__mpPerfOnly ? 3000 : r.ms) || (!W.__mpPerfOnly && t0 - r.t0 > 400 && quiet)) finish(r, t0, W.__mpPerfOnly ? 'perf-only: fixed 3 s window, recorder off' : undefined); }
    raf = [...recs.values()].some(r => !r.done) ? requestAnimationFrame(tick) : 0;
  };
  const isAmbient = (tr, r, t) => tr.loop || r.pre.has(tr) || (tr.lc > t - 200 && tr.lc - tr.run > 3000);
  // An interaction recording is ARMED: its clock starts at the first real input (pointer, key, wheel) — or only
  // at a named one, rec(name, { arm: 'pointerdown' }) for clicks — so
  // timings are measured from the user's action and driver latency between commands doesn't matter.
  ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(ev => addEventListener(ev, e => {
    if (!e.isTrusted) return; for (const r of recs.values()) if (r.arm && !r.fired && !r.done && (r.arm === true || r.arm === e.type)) { r.fired = e.type; r.t0 = now(); } }, { capture: true, passive: true }));
  // live GSAP descriptor (exact, no parsing): from() keeps its START values in vars, fromTo() in vars.startAt
  const liveDesc = t => { try { if (!t.targets || !t.targets().some(x => x && (x.nodeType === 1 || typeof x === 'string'))) return null; // delayedCall
    const keep = o => Object.entries(o || {}).filter(([k, x]) => !/^on|callbackScope|startAt|data$|runBackwards|immediateRender|lazy|stagger|parent|overwrite/.test(k) && !(k === 'delay' && !x) && x !== undefined && typeof x !== 'function' && typeof x !== 'object').map(([k, x]) => k + ':' + x).join(',');
    const from = !!t.vars.runBackwards, fromTo = !!t.vars.startAt && !from;
    const st = t.vars.stagger, stg = typeof st === 'number' ? ',stagger:' + st : st && st.each ? ',stagger:' + st.each : '';
    return { fn: from ? 'from' : fromTo ? 'fromTo' : 'to', target: t.targets().slice(0, 3).map(x => x && x.tagName ? desc(x) : String(x)).join(' '),
      vars: (fromTo ? `{${keep(t.vars.startAt)}} → {${keep(t.vars)}${stg}}` : `{${keep(t.vars)}${stg}}`) + ` [live ${t.duration()}s]` }; } catch { return null; } };
  const rec = (name, { ms = 4000, quiet = 700, arm = true } = {}) => {
    forceHoverCss();
    // fresh baseline: known elements + visible interactive ones, so a hover/press has a "before" value
    D.querySelectorAll('a,button,[role=button],[role=tab],[role=menuitem],[role=switch],input,select,tr,li,[class*=card],[class*=chip]').forEach((el, i) => { if (i < 600 && !tracks.has(el)) { const r = el.getBoundingClientRect(); if (r.bottom > 0 && r.top < innerHeight && r.width) tracks.set(el, { d: desc(el), s: [] }); } });
    const base = now(), pre = new Set();
    for (const [el, tr] of tracks) if (el.isConnected) { if (tr.lc > base - 150) pre.add(tr); tr.s = [[base, read(el)]]; }
    recs.set(name, { name, base, t0: base, arm, pre, lastF: base, ms, quiet, frames: [], done: false, cost0: cost });
    if (!raf) raf = requestAnimationFrame(tick); return 'recording ' + name;
  };

  // 5. Summaries: per element the props that changed, start/end, overshoot, fitted ease, and two defect flags:
  //    flashOrReplay = it reached its end state, dropped back to the start, then animated again (a flash of
  //    content before the entrance applies, or an entrance re-running on re-render); stuckHidden = in view but
  //    still opacity 0 when motion settled (content that never shows).
  const nums = s => { const n = (String(s).match(/-?\d*\.?\d+(e-?\d+)?/g) || []).map(Number); // inset(a [b [c [d]]]) -> 4 sides
    if (/^inset/.test(s) && n.length < 4 && n.length) { const [a, b = a, c = a, d = b] = n; return [a, b, c, d]; } return n; };
  const bez = (x1, y1, x2, y2) => x => { let lo = 0, hi = 1, t = x; for (let i = 0; i < 30; i++) { const cx = 3 * (1 - t) * (1 - t) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t; if (cx < x) lo = t; else hi = t; t = (lo + hi) / 2; } return 3 * (1 - t) * (1 - t) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t; };
  const EASES = { linear: x => x, 'power1.out': x => 1 - (1 - x) ** 2, 'power2.out': x => 1 - (1 - x) ** 3, 'power3.out': x => 1 - (1 - x) ** 4, 'power4.out': x => 1 - (1 - x) ** 5,
    'expo.out': x => x === 1 ? 1 : 1 - 2 ** (-10 * x), 'sine.out': x => Math.sin(x * Math.PI / 2), 'power2.in': x => x ** 3, 'power3.in': x => x ** 4,
    'power2.inOut': x => x < .5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2, 'power3.inOut': x => x < .5 ? 8 * x ** 4 : 1 - (-2 * x + 2) ** 4 / 2, 'expo.inOut': x => x === 0 || x === 1 ? x : x < .5 ? 2 ** (20 * x - 10) / 2 : (2 - 2 ** (-20 * x + 10)) / 2,
    'back.out(1.7)': x => 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2, 'css ease': bez(.25, .1, .25, 1), 'css ease-out': bez(0, 0, .58, 1), 'css ease-in-out': bez(.42, 0, .58, 1) };
  const FID = { blur: '0px', brightness: '1', contrast: '1', saturate: '1', opacity: '1', grayscale: '0', sepia: '0', invert: '0', 'hue-rotate': '0deg' };
  const filterId = ref => { const fns = [...String(ref).matchAll(/([a-z-]+)\(/g)].map(m => m[1]); return fns.length && fns.every(f => FID[f]) ? fns.map(f => f + '(' + FID[f] + ')').join(' ') : null; };
  // One prop's timeline split into PHASES: a phase ends where the value holds still (>150 ms) or reverses by more than
  // 30% of the phase's travel (smaller reversals are overshoot settling and stay in the phase). Press = down + up,
  // flash = instant hide + entrance, replay = a later phase that repeats an earlier one.
  const series = (s0, p) => { let s = s0;
    if (p === 'filter') { const ref = s0.find(([, v]) => v.filter !== 'none'); if (!ref) return null; const id = filterId(ref[1].filter); if (!id) return null;
      s = s0.map(([t, v]) => [t, v.filter === 'none' ? { ...v, filter: id } : v]); }
    const n = nums(s[s.length - 1][1][p]).length; if (!n) return null;
    const out = s.map(([t, v]) => [t, nums(v[p]), v[p]]).filter(x => x[1].length === n); return out.length > 1 ? out : null; };
  const dist = (a, b) => Math.sqrt(a.reduce((x, v, i) => x + (v - b[i]) ** 2, 0));
  const phases = (ser, p) => {
    const cuts = [[0]]; let cur = cuts[0], ext = 0, extV = 0;
    for (let i = 1; i < ser.length; i++) {
      if (ser[i][0] - ser[i - 1][0] > 150) { cur = [i - 1]; cuts.push(cur); ext = 0; extV = 0; } // a hold: new phase from the held value
      cur.push(i); const d = dist(ser[i][1], ser[cur[0]][1]);
      if (d >= extV) { extV = d; ext = cur.length - 1; } else if (extV > 1e-6 && extV - d > 0.3 * extV) { const keep = cur.splice(ext + 1); cur = [cur[cur.length - 1], ...keep]; cuts.push(cur); extV = dist(ser[cur[cur.length - 1]][1], ser[cur[0]][1]); ext = cur.length - 1; } }
    const short = x => String(x).length > 90 ? (p === 'svgShape' ? 'path(' + nums(x).length + ' numbers)' : String(x).slice(0, 87) + '…') : x;
    return cuts.map(c => { const pts = c.map(i => ser[i]); const v0 = pts[0][1], v1 = pts[pts.length - 1][1], dv = v1.map((x, k) => x - v0[k]), L2 = dv.reduce((a, x) => a + x * x, 0); if (L2 < 1e-6) return null;
      // samples are stored only on change: if the value sat still before this phase, motion began ~1 frame before its first change
      let t0 = pts[0][0]; if (pts[1] && pts[1][0] - pts[0][0] > 34) t0 = pts[1][0] - 16;
      const pr = pts.map(([t, v]) => [t === pts[0][0] ? t0 : t, v.reduce((a, x, k) => a + (x - v0[k]) * dv[k], 0) / L2]);
      let en = pr[0][0]; for (let k = 1; k < pr.length; k++) if (Math.abs(pr[k][1] - pr[k - 1][1]) > 1e-4) en = pr[k][0];
      const instant = pts.length <= 2 && en - t0 <= 20;
      return { t0, ms: instant ? 0 : Math.round(en - t0), from: short(pts[0][2]), to: short(pts[pts.length - 1][2]), v0, v1, over: +(Math.max(...pr.map(x => x[1])) - 1).toFixed(3), ease: instant ? null : fit(pr.filter(([t]) => t <= en)) }; }).filter(Boolean); };
  const fit = pr => { const T0 = pr[0][0], T = pr[pr.length - 1][0] - T0; if (T < 50 || pr.length < 5) return null;
    let best = null; for (const [k, f] of Object.entries(EASES)) { const e = Math.sqrt(pr.reduce((a, [t, y]) => a + (f((t - T0) / T) - y) ** 2, 0) / pr.length); if (!best || e < best[1]) best = [k, e]; }
    return best[1] < 0.08 ? best[0] : best[0] + '?'; };
  // in view, has content, still invisible: content that never showed. Closed tooltips/menus/popovers are meant to be hidden.
  const stuck = el => { if (!el.isConnected || !el.textContent.trim() || el.closest('[aria-hidden=true],[hidden],dialog:not([open]),[role=tooltip],[role=menu],[role=listbox]')) return false;
    const c = typeof el.className === 'string' ? el.className : (el.className && el.className.baseVal) || '', cs = getComputedStyle(el);
    if (/tip|tooltip|popover|dropdown|menu|toast|hint/i.test(c) || cs.pointerEvents === 'none') return false;
    const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.width > 0 && +cs.opacity < 0.05; };
  const summarize = r => {
    const t0 = r.t0, rows = [], layout = new Set();
    for (const [el, tr] of tracks) { const s = tr.s.filter(([t]) => t >= r.base - 1 && t <= r.tEnd + 1); if (s.length < 2) continue;
      const ch = {}; let start = Infinity, end = 0, replays = 0;
      for (const p of PROPS) { const ser = series(s, p); if (!ser) continue; const ph = phases(ser, p); if (!ph.length) continue;
        const moving = ph.filter(x => x.ms > 0), main = moving[0] || ph[0];
        // replay: a moving phase that repeats an earlier one (same from and to, within 10% of its travel) AND comes right
        // after an INSTANT jump back to the start, which is how a re-run entrance looks. A live ticker that pops on every
        // update repeats too, but eases back each time, so it is not a replay.
        ph.forEach((x, k) => { if (!x.ms || !k || ph[k - 1].ms) return; if (ph.slice(0, k - 1).some(y => { const tr = dist(y.v0, y.v1); return y.ms && dist(x.v0, y.v0) < 0.1 * tr && dist(x.v1, y.v1) < 0.1 * tr; })) replays++; });
        ch[p] = { from: main.from, to: main.to, ms: main.ms, over: main.over, ease: main.ease };
        if (ph.length > 1) ch[p].phases = ph.map(x => `${Math.max(0, Math.round(x.t0 - t0))}ms ${x.from}→${x.to} ${x.ms ? x.ms + 'ms ' + (x.ease || '') : 'instant'}`).slice(0, 6);
        start = Math.min(start, ph[0].t0); end = Math.max(end, ...ph.map(x => x.t0 + x.ms)); }
      if (!Object.keys(ch).length) continue;
      const lastV = s[s.length - 1][1];
      // width/height that jumps (ms 0) is content/layout growth, not motion
      const lay = Object.keys(ch).filter(p => (p === 'width' || p === 'height') && ch[p].ms === 0); lay.forEach(p => delete ch[p]);
      if (!Object.keys(ch).length) { layout.add(tr.d); continue; }
      const instant = Object.values(ch).every(v => v.ms === 0);
      const keys = [...(typeof el.className === 'string' ? el.className : (el.className && el.className.baseVal) || '').split(/\s+/).filter(x => x.length > 2), ...[...el.attributes].map(a => a.name).filter(n => n.startsWith('data-'))];
      const ambient = isAmbient(tr, r, r.tEnd); rows.push({ el, keys, instant, d: tr.d, ambient, start: Math.max(0, Math.round(start - t0)), dur: Math.round(end - start), ch, replays: ambient ? 0 : replays, stuckHidden: lastV.inView === false ? false : +lastV.opacity < 0.05 });
    }
    // group same-kind elements: that's where stagger shows
    const amb = rows.filter(x => x.ambient), inst = rows.filter(x => !x.ambient && x.instant), ev = rows.filter(x => !x.ambient && !x.instant);
    const g = {}; for (const x of ev) (g[x.d] = g[x.d] || []).push(x);
    const groups = Object.entries(g).map(([d, a]) => { a.sort((x, y) => x.start - y.start); const st = a.map(x => x.start), gaps = st.slice(1).map((x, i) => x - st[i]).sort((x, y) => x - y);
      const props = {}; a.forEach(x => Object.entries(x.ch).forEach(([p, v]) => { (props[p] = props[p] || []).push(v); }));
      return { d, keys: a[0].keys, n: a.length, start: st[0], stagger: gaps.length ? gaps[gaps.length >> 1] : 0, dur: a.map(x => x.dur).sort((x, y) => x - y)[a.length >> 1],
        props: Object.fromEntries(Object.entries(props).map(([p, v]) => [p, { from: v[0].from, to: v[0].to, ms: v.map(x => x.ms).sort((x, y) => x - y)[v.length >> 1], over: Math.max(...v.map(x => x.over)), ease: v[0].ease, ...(v[0].phases ? { phases: v[0].phases } : {}) }])),
        replays: a.reduce((s, x) => s + x.replays, 0), stuckHidden: a.filter(x => x.stuckHidden).length };
    }).sort((x, y) => x.start - y.start);
    const vt = [...animMeta.values()].filter(a => a.at >= t0 - 1 && a.at <= r.tEnd && /::view-transition/.test(a.d)).map(a => a.d.split('::')[1] + ' ' + a.dur + 'ms ' + a.ease);
    const f = r.frames.slice(1).map(x => Math.round(x)); const lt = perf.lt.filter(([s, d]) => s + d >= t0 && s <= r.tEnd);
    const counts = [...texts.values()].filter(t => t.last >= t0 && t.n > 4).length;
    return { name: r.name, trigger: r.arm ? r.fired || 'none' : 'page load', note: r.note, settledMs: Math.round(Math.max(0, ...ev.map(x => x.start + x.dur))), elements: ev.length, groups,
      ambient: amb.map(x => x.d + ' ' + Object.keys(x.ch).join('/')).slice(0, 12),
      // changed in one step (no transition): hover colour swaps, theme colour snaps under a View Transition
      instant: Object.entries(inst.reduce((o, x) => { const k = x.d + ' ' + Object.keys(x.ch).join('/'); o[k] = (o[k] || 0) + 1; return o; }, {})).map(([k, n]) => n > 1 ? k + ' ×' + n : k).slice(0, 20), instantCount: inst.length,
      layout: [...layout].length,
      css: [...animMeta.values()].filter(a => a.at >= t0 - 1 && a.at <= r.tEnd).map(({ at, ...a }) => a).slice(0, 40),
      viewTransition: vt.length ? vt : undefined,
      countUps: counts,
      health: { frames: f.length, maxFrameMs: Math.max(0, ...f), over34: f.filter(x => x > 34).length, over34pct: f.length ? Math.round(100 * f.filter(x => x > 34).length / f.length) : 0, over50: f.filter(x => x > 50).length,
        longTasks: lt.map(([, d]) => Math.round(d)),
        // long animation frames (>50 ms) and the scripts that ran in them: who caused the jank
        longFrames: perf.loaf.filter(([s0, d]) => s0 + d >= t0 && s0 <= r.tEnd).map(([, d, b, sc]) => `${Math.round(d)}ms` + (sc.length ? ' ← ' + sc.sort((a, c) => c.d - a.d).slice(0, 2).map(x => `${x.src || x.inv} ${x.d}ms`).join(', ') : ' (style/layout/paint)')).slice(0, 8), cls: +perf.cls.filter(([s]) => s >= t0 && s <= r.tEnd).reduce((a, [, v]) => a + v, 0).toFixed(4),
        probeCostMs: Math.round(r.cost1 - r.cost0),
        flashBeforeEntrance: [...flashes].filter(([el, f]) => tracks.has(el) && f.at >= r.base - 1 && f.at <= r.tEnd + 1).map(([el, f]) => desc(el) + ' (painted visible, then hidden after ' + f.ms + ' ms)').slice(0, 10), flashOrReplay: rows.filter(x => x.replays).map(x => x.d).slice(0, 10), stuckHidden: [...new Set([...rows.filter(x => x.stuckHidden).map(x => x.el), ...hidden])].filter(stuck).map(desc).slice(0, 10) } };
  };
  const finish = (r, t, note) => { r.done = true; r.tEnd = t; r.note = note; r.cost1 = cost; r.out = summarize(r); };
  let declared = []; // filled by scan()
  // A declared call is attached only when (a) its target names one of the group's classes / data-attributes,
  // (b) it animates the props that moved (x/y/scale/rotate -> transform, clipPath, opacity, strokeDashoffset…), and
  // (c) it goes the same way: an entrance (ends visible) is never matched to an exit (to opacity:0) or the reverse.
  const PMAP = { translate: /\b(x|y|xPercent|yPercent)\s*:/, scale: /\b(scale|scaleX|scaleY)\s*:/, rotate: /\b(rotate|rotation|skewX|skewY)\s*:/, opacity: /\b(opacity|autoAlpha)\s*:/, clipPath: /clipPath\s*:/,
    strokeDashoffset: /strokeDashoffset|drawSVG/, backgroundColor: /backgroundColor\s*:/, color: /\bcolor\s*:/, boxShadow: /boxShadow\s*:/, filter: /filter\s*:/, width: /\bwidth\s*:/, height: /\bheight\s*:/ };
  const REST = { opacity: v => +v > 0.95, transform: v => /^matrix\(1, 0, 0, 1, 0, 0\)$/.test(v), clipPath: v => /^inset\(0(px)?\)$/.test(v), strokeDashoffset: v => /^0(px)?$/.test(v) };
  // a transform change is split into what actually changed: translate (e,f), scale (a,d), rotate (b,c)
  const tparts = v => { const a = nums(v.from), b = nums(v.to); if (a.length !== 6 || b.length !== 6) return ['translate', 'scale', 'rotate'];
    const d = i => Math.abs(a[i] - b[i]) > 1e-3; return [d(4) || d(5) ? 'translate' : '', d(0) || d(3) ? 'scale' : '', d(1) || d(2) ? 'rotate' : ''].filter(Boolean); };
  const match = g => { const [moved, groupRest] = sig(g);
    return declared.map(c => fits(g, c, moved, groupRest) ? c : null).filter(Boolean).slice(0, 2).map(c => c.fn + ' ' + c.vars); }; // only full matches: a wrong call is worse than none
  // does call c fit recorded group g? anyTarget skips the class/data-attribute test (for minified targets)
  const fits = (g, c, moved, groupRest, anyTarget) => { if (!anyTarget && !g.keys.some(k => c.target.includes(k))) return false;
      const toPart = c.fn === 'from' ? '' : (c.vars.split(' → ')[1] || c.vars), fromPart = c.fn === 'from' ? c.vars : c.fn === 'fromTo' ? c.vars.split(' → ')[0] : '';
      // direction by REST state: does the call end at rest (y:0, scale:1, opacity:1, or a from() that returns to CSS)?
      const away = /\b(opacity|autoAlpha)\s*:\s*0\b(?!\.)|\b(x|y|xPercent|yPercent|rotation|rotate)\s*:\s*-?(\d*\.)?\d*[1-9]|\bscale[XY]?\s*:\s*(0?\.\d+|[2-9])/;
      const callEndsAway = c.fn !== 'from' && away.test(toPart);
      if (groupRest ? callEndsAway : (c.fn === 'from' || !callEndsAway)) return false;
      const hit = moved.filter(p => PMAP[p].test(c.vars)).length; if (moved.length && !hit) return false;
      return hit === moved.length; };
  const sig = g => { const moved = Object.entries(g.props).flatMap(([p, v]) => p === 'transform' ? tparts(v) : PMAP[p] ? [p] : []); return [moved, Object.entries(g.props).filter(([p]) => REST[p]).every(([p, v]) => REST[p](v.to))]; };
  const fmt = g => { const ps = Object.entries(g.props).map(([p, v]) => v.phases ? `${p} phases: ${v.phases.join(' / ')}` : `${p} ${v.from}→${v.to} ${v.ms ? v.ms + 'ms ' + (v.ease || '') : 'instant'}${v.over > 0.01 ? ' over+' + v.over : ''}`).join('; ');
    return `+${g.start}ms ${g.d}${g.n > 1 ? ' ×' + g.n + ' stagger ' + g.stagger + 'ms' + (g.stagger === 0 ? ' (all started in one visible frame: a long frame can hide a stagger, see long frames; read it from ⇐ / scan)' : '') : ''} | ${ps}${g.replays ? ' | REPLAY' : ''}`; };
  // out(name)            object: groups (top 40), instant, ambient, css, viewTransition, health
  // out(name, 'table')   readable lines, one per group, then health — the default way to look at a recording
  // out(name, 'full')    everything, all groups
  const out = (name, mode, limit = 25) => new Promise(res => { const w = () => { const r = recs.get(name); if (!r) return res('no recording ' + name + ' (have: ' + [...recs.keys()].join(', ') + ')'); if (!r.done) return setTimeout(w, 100);
    const o = r.out, groups = (mode === 'full' || mode === 'table' ? o.groups : o.groups.slice(0, 40)).map(g => { const { keys, ...x } = g; const dc = declared.length ? match(g) : []; return dc.length ? { ...x, declared: dc } : x; });
    if (mode !== 'table') return res({ ...o, groups });
    const h = o.health; res([`${o.name} [${o.trigger}] settled ${o.settledMs}ms, ${o.elements} moving elements in ${o.groups.length} groups${o.note ? ' — ' + o.note : ''}${o.groups.length > limit ? ` (first ${limit} groups shown; out(name,'table',999) for all)` : ''}`, ...groups.slice(0, limit).map(g => fmt(g) + (g.declared ? '  ⇐ ' + g.declared[0] : '')),
      ...(o.viewTransition ? ['view transition: ' + o.viewTransition.join(', ')] : []), ...(o.instant.length ? ['instant (no transition): ' + o.instant.join(', ')] : []),
      ...(o.ambient.length ? ['ambient: ' + o.ambient.join(', ')] : []), ...(o.css.length ? ['css/waapi: ' + Object.entries(o.css.reduce((m, c) => { const k = `${c.d} ${c.name} ${c.dur}ms ${c.ease}${c.iter === Infinity ? ' loop' : ''}`; m[k] = (m[k] || 0) + 1; return m; }, {})).map(([k, n]) => n > 1 ? k + ' ×' + n : k).join(', ')] : []),
      ...(h.longFrames.length ? ['long frames: ' + h.longFrames.join(' | ')] : []), `health: max frame ${h.maxFrameMs}ms, ${h.over34} frames >34ms (${h.over34pct}%), long tasks [${h.longTasks}], cls ${h.cls}, probe cost ${h.probeCostMs}ms`,
      `defects: flashBeforeEntrance [${h.flashBeforeEntrance.join('; ')}] flashOrReplay [${h.flashOrReplay}] stuckHidden [${h.stuckHidden}]`]); }; w(); });

  // 6. Static side: libraries and the tween calls themselves, read from the shipped bundles (exact args).
  const scan = async () => {
    const urls = [...new Set([...D.scripts].map(s => s.src).concat(performance.getEntriesByType('resource').filter(e => /\.m?js(\?|$)/.test(e.name)).map(e => e.name)).filter(Boolean))].slice(0, 60);
    const LIBS = { gsap: /GreenSock|gsap\.(to|from|timeline|registerPlugin)|_gsScope/, 'gsap Flip': /Flip\.(from|getState|fit)|getState\(/, ScrollTrigger: /ScrollTrigger/, SplitText: /SplitText/, Draggable: /Draggable/,
      'motion / framer-motion': /framer-motion|motion-dom|useAnimate|animate\(\s*["'`.#]/, 'anime.js': /anime\.(timeline|stagger)|animejs/, lenis: /[Ll]enis/, lottie: /lottie/, 'auto-animate': /autoAnimate|auto-animate/,
      '@vueuse/motion': /useMotion|v-motion/, 'View Transitions': /startViewTransition/, 'WAAPI .animate()': /\.animate\(\s*[\[{]/, three: /THREE\.|WebGLRenderer/,
      'chart.js': /Chart\.register|chartjs/, apexcharts: /ApexCharts/, echarts: /echarts/, d3: /d3-(selection|scale)|d3\.select/, recharts: /recharts/, highcharts: /Highcharts/ };
    const found = {}, calls = new Map(), eases = {}, durs = {}; let read = 0, blocked = 0, sites = 0;
    for (const u of urls) { let t; try { t = await (await fetch(u)).text(); read++; } catch { blocked++; continue; }
      for (const [k, re] of Object.entries(LIBS)) if (re.test(t)) found[k] = (found[k] || 0) + 1;
      const v = t.match(/version\s*:\s*["'](3\.\d+\.\d+)["'][^]{0,200}?GreenSock|GSAP[^]{0,40}?(3\.\d+\.\d+)/); if (v) found['gsap version'] = v[1] || v[2];
      if (/GreenSock|gsap|_gsScope/.test(t) || found.gsap) sites += (t.match(/(?:\b[\w$]{1,12}|\))\.(?:to|from|fromTo)\(/g) || []).length;
      // fromTo(target, {from}, {to}): the timing lives in the SECOND object
      for (const m of t.matchAll(/(?:\b[\w$]{1,12}|\))\.(to|from|fromTo|set)\(\s*((?:[^;{}]|\$\{[^}]{0,60}\}){0,140}?),\s*(\{[^{}]{0,260}\})(?:\s*,\s*(\{[^{}]{0,260}\}))?/g)) {
        const vars = (m[3] || '') + (m[4] || '');
        if (!/duration|ease|stagger/.test(vars)) continue; if (calls.size < 300 && !calls.has(m[0])) calls.set(m[0], { fn: m[1], target: m[2].trim().slice(0, 120), vars: (m[4] ? m[3].slice(0, 100) + ' → ' + m[4] : m[3]).slice(0, 240) });
        const e = vars.match(/ease\s*:\s*["'`]([^"'`]+)/); if (e) eases[e[1]] = (eases[e[1]] || 0) + 1;
        const d = vars.match(/duration\s*:\s*(?:[\w$]{1,3}\()?\s*(\d*\.?\d+)/); if (d) durs[d[1]] = (durs[d[1]] || 0) + 1; } }
    const cssMotion = []; let reduced = 0, hoverRules = 0;
    const walk = rules => { for (const r of rules) { if (r.type === CSSRule.MEDIA_RULE) { if (/reduced-motion/.test(r.conditionText)) reduced += r.cssRules.length; if (/hover\s*:\s*hover/.test(r.conditionText)) hoverRules += r.cssRules.length; walk(r.cssRules); }
      else if (r.style && ((r.style.transitionDuration && !/^0s?$/.test(r.style.transitionDuration)) || (r.style.transition && !/^(all\s*)?0s|^none$/.test(r.style.transition)) || r.style.animationName)) cssMotion.push(r.selectorText + ' → ' + (r.style.transition || r.style.animation || r.style.transitionDuration)); } };
    for (const s of D.styleSheets) { try { walk(s.cssRules); } catch {} }
    const top = o => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 15);
    // live GSAP (exact, no parsing) when the page exposes window.gsap: CDN builds, or our own dev build (set window.gsap = gsap)
    const live = W.gsap ? [...liveSeen.values()].filter(Boolean) : 'window.gsap not exposed (bundled build): values parsed from bundles';
    if (Array.isArray(live)) live.forEach(c => calls.set('live:' + c.target + c.vars, c));
    declared = [...calls.values()];
    // calls: every parsed tween (target is the bundle's own text: often a selector or data-attribute, sometimes a minified variable).
    // After scan(), out() attaches the calls whose target names one of a group's classes / data-attributes as `declared`.
    return { libs: found, liveGsap: Array.isArray(live) ? live.length + ' live tweens captured from window.gsap while recording' : live, bundlesRead: read, bundlesBlocked: blocked, tweenCallSites: sites, tweenCallsParsed: calls.size, note: 'lazy page chunks are only read once loaded: run scan() again after visiting every page', eases: top(eases), durations: top(durs),
      calls: declared, cssMotionRules: cssMotion.slice(0, 60), cssMotionRuleCount: cssMotion.length, reducedMotionRules: reduced, hoverOnlyRules: hoverRules };
  };

  // raw curve of one element, for checking a summary: __mp.samples('.snav__pill', 'transform,opacity')
  const samples = (sel, props = 'opacity,transform,clipPath') => { const el = D.querySelector(sel), tr = el && tracks.get(el); if (!tr) return 'not tracked';
    const ps = props.split(','); return tr.s.map(([t, v]) => [Math.round(t), ...ps.map(p => v[p])]); };
  // targets(): candidate elements per interaction class, as `selector` + index for motion-pass.sh. Buttons whose label
  // reads like a write (save, delete, send, pay…) are listed under `unsafe` — §2 of the skill: never press those.
  const targets = () => {
    const vis = el => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.left < innerWidth && r.right > 0 && cs.visibility !== 'hidden' && +cs.opacity > 0.05; };
    const lifts = el => el.matches('[data-lift],[data-magnetic],[data-hover]') || /transform|box-shadow|translate|scale|all/.test(getComputedStyle(el).transitionProperty) && getComputedStyle(el).transitionDuration !== '0s';
    const UNSAFE = /\b(save|delete|remove|send|pay|charge|book|submit|confirm|archive|approve|publish|cancel order|refund|invite|log ?out|sign ?out)\b/i;
    const KINDS = { nav: 'nav a, [role=navigation] a, aside a, nav button', tabs: '[role=tab], [class*=seg] button, [class*=tabs] button, [class*=toggle-group] button',
      theme: 'button[aria-label*=theme i], button[title*=theme i], button[class*=theme], button[aria-label*=dark i], button[aria-label*=light i], button[title*=dark i], button[title*=light i], button[aria-label*=mode i]', switches: '[role=switch], input[type=checkbox], [class*=switch]',
      buttons: 'main button, [role=main] button, header button', rows: 'tbody tr, [role=row], main li', cards: '[class*=card], [data-lift], article' };
    const o = { unsafe: [] };
    // indexes are into document.querySelectorAll(selector), i.e. what motion-pass.sh uses — hidden/off-screen ones are skipped in the list
    for (const [k, sel] of Object.entries(KINDS)) { const all = [...D.querySelectorAll(sel)], els = all.filter(vis);
      const label = el => (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30);
      const safe = els.map(el => [el, all.indexOf(el)]).filter(([el, i]) => { if (/^(buttons|rows|cards)$/.test(k) && UNSAFE.test(label(el))) { o.unsafe.push(`${sel} [${i}] "${label(el)}"`); return false; } return true; });
      if (safe.length) o[k] = { selector: sel, inView: els.length, first: safe.slice(0, 6).map(([el, i]) => `[${i}] ${label(el) || desc(el)}${lifts(el) ? '  (hover motion declared)' : ''}`) }; }
    return o; };
  // defects(name): every flagged moment with WHEN (ms since navigation start) and WHERE (viewport rect), so
  // motion-pass.sh can cut a slowed video clip with a box around it. Long frames carry their window, no rect.
  const rectOf = el => { const r = el.getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(Math.round); };
  const defects = name => { const r = recs.get(name); if (!r || !r.done) return 'no finished recording ' + name; const o = [];
    for (const [el, f] of flashes) if (f.at >= r.base - 1 && f.at <= r.tEnd + 1 && el.isConnected) o.push({ kind: 'flash-before-entrance', d: desc(el), at: Math.round(f.at - Math.min(f.ms, 300)), until: Math.round(f.at + 500), rect: rectOf(el) }); // shown → vanishes → enters
    for (const g of r.out.groups) if (g.replays) { const el = [...tracks.keys()].find(e => desc(e) === g.d && e.isConnected); if (el) o.push({ kind: 'replay', d: g.d, at: Math.round(r.t0 + g.start), until: Math.round(r.t0 + g.start + g.dur), rect: rectOf(el) }); }
    for (const el of [...hidden].filter(stuck)) o.push({ kind: 'stuck-hidden', d: desc(el), at: Math.round(r.tEnd - 300), until: Math.round(r.tEnd), rect: rectOf(el) });
    perf.loaf.filter(([s0, d]) => s0 + d >= r.base && s0 <= r.tEnd && d >= 100).forEach(([s0, d, , sc]) => o.push({ kind: 'long-frame', d: Math.round(d) + 'ms' + (sc[0] ? ' ← ' + (sc[0].src || sc[0].inv) : ''), at: Math.round(s0), until: Math.round(s0 + d), rect: null }));
    const fp = Math.round(firstPaint || performance.getEntriesByName('first-paint')[0]?.startTime || 0);
    // anchor = the moment the video's first change corresponds to: first paint for a page load, the input for an interaction
    return { anchor: r.arm ? Math.round(r.t0) : fp, viewport: [innerWidth, innerHeight], defects: o }; };
  // coverage(): declared tweens (from scan) whose target is a real selector that NEVER moved in any recording on this
  // document. Each is a possibly MISSED animation: trigger it (hover/click/scroll/visit) or explain why it never ran.
  const coverage = () => { if (!declared.length) return 'run scan() first';
    const moved = new Set([...tracks].filter(([, tr]) => tr.lc).map(([el]) => el)), out = { checked: 0, seenMoving: 0, seenBySignature: 0, neverSeen: [], unresolvable: 0 };
    const groups = [...recs.values()].filter(r => r.done).flatMap(r => r.out.groups);
    for (const c of declared) { const sel = (c.target.match(/^[`'"]([^`'"]+)[`'"]$/) || [])[1];
      if (!sel || /\$\{/.test(sel) || (() => { try { D.querySelectorAll(sel); return false; } catch { return true; } })()) {
        // minified target: was anything recorded doing what this call does (same props, same direction)?
        if (groups.some(g => { const [m, rest] = sig(g); return m.length && fits(g, c, m, rest, true); })) out.seenBySignature++;
        else { out.unresolvable++; out.neverSeen.push(`[minified target] ${c.fn} ${c.vars.slice(0, 110)}`); } continue; }
      const els = [...D.querySelectorAll(sel)]; out.checked++;
      if (els.some(e => moved.has(e))) out.seenMoving++; else out.neverSeen.push(`${sel} (${els.length ? els.length + ' on page' : 'not on this page'}) ← ${c.fn} ${c.vars.slice(0, 90)}`); }
    out.neverSeen = [...new Set(out.neverSeen)].slice(0, 60);
    out.read = 'neverSeen = declared in the code but never seen moving: trigger each (hover, click, scroll, other pages, other states) or say why it cannot run. seenBySignature = a recorded group does the same thing; the call is probably that one.'; return out; };
  W.__mp = { rec, out, scan, samples, targets, defects, coverage, forceHoverCss };
  rec('load', { ms: 8000, quiet: 900, arm: false }); addEventListener('load', forceHoverCss); // first-load entrance, recorded from document start
})();

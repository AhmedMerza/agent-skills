// app-teardown probes. Driver-agnostic: paste into any page-evaluate
// (Chrome extension javascript_tool, Playwright page.evaluate, CDP Runtime.evaluate,
// chrome-devtools MCP evaluate_script, or the DevTools console by hand).
// The whole file is one expression returning a Promise of JSON (await it). Set PROBE_SELECTORS before it to measure more.
(async () => {
  const out = { url: location.href, title: document.title };

  // 1. Client routes (Backbone, Vue Router, React Router data routers, Angular-ish fallbacks)
  const routes = new Set();
  try { (window.Backbone?.history?.handlers || []).forEach(h => routes.add(h.route.source)); } catch {}
  try { (document.querySelector('#app')?.__vue_app__?.config.globalProperties.$router?.getRoutes() || []).forEach(r => routes.add(r.path)); } catch {}
  try { (window.__reactRouterDataRouter?.routes || []).forEach(function walk(r) { r.path && routes.add(r.path); (r.children || []).forEach(walk); }); } catch {}
  document.querySelectorAll('a[href]').forEach(a => { const h = a.getAttribute('href'); if (h && (h.startsWith('#') || h.startsWith('/'))) routes.add('link:' + h.replace(/\d+/g, ':id')); });
  // Fallback when no known router global: pull route-like strings out of the app's own JS bundles (REA-lite)
  if (![...routes].some(r => !r.startsWith('link:'))) {
    const srcs = [...document.scripts].map(s => s.src).filter(u => u && new URL(u).host === location.host).slice(0, 40);
    const re = /["'`](\/(?:[a-z0-9_-]+|:[a-zA-Z]+)(?:\/(?:[a-z0-9_-]+|:[a-zA-Z]+|\*))*)["'`]/g;
    for (const u of srcs) { try { const t = await (await fetch(u)).text();
      for (const m of t.matchAll(re)) if (!/^\/(api|static|assets|_next|fonts?|images?)\b/.test(m[1]) && m[1].length > 2) routes.add('bundle:' + m[1]);
    } catch {} }
  }
  out.routes = [...routes].sort();

  // 2. Motion and media rules from readable stylesheets
  const keyframes = {}, transitions = new Set(), animations = new Set();
  let print = 0, reducedMotion = 0, unreadable = 0;
  const walk = rules => { for (const r of rules) {
    if (r.type === CSSRule.KEYFRAMES_RULE) keyframes[r.name] = [...r.cssRules].map(k => k.keyText + '{' + k.style.cssText + '}').join(' ');
    else if (r.type === CSSRule.MEDIA_RULE) {
      if (/print/.test(r.conditionText)) print += r.cssRules.length;
      if (/prefers-reduced-motion/.test(r.conditionText)) reducedMotion += r.cssRules.length;
      walk(r.cssRules);
    } else if (r.style) {
      if (r.style.transition) transitions.add(r.selectorText + ' → ' + r.style.transition);
      if (r.style.animation) animations.add(r.selectorText + ' → ' + r.style.animation);
    }
  } };
  for (const s of document.styleSheets) { try { walk(s.cssRules); } catch { unreadable++; } }
  out.motion = { keyframes, transitions: [...transitions].slice(0, 150), animations: [...animations],
    printRules: print, reducedMotionRules: reducedMotion, unreadableSheets: unreadable,
    running: document.getAnimations().map(a => (a.animationName || a.transitionProperty) + ' ' + a.effect?.getTiming().duration + 'ms').slice(0, 50) };

  // 3. Computed styles of key elements (first match per selector)
  const sel = window.PROBE_SELECTORS || ['body', 'header, nav, .navbar', 'button, .btn', 'input[type=text], input:not([type])',
    'select', '.modal-dialog, [role=dialog]', '.toast, [role=alert], .flash', '.sticky, [style*=sticky]', 'table, [role=grid]'];
  const props = ['font-family', 'font-size', 'font-weight', 'color', 'background-color', 'border', 'border-radius',
    'box-shadow', 'padding', 'height', 'transition', 'animation', 'position', 'z-index'];
  out.styles = {};
  for (const q of sel) { const el = document.querySelector(q); if (!el) continue;
    const cs = getComputedStyle(el); out.styles[q] = Object.fromEntries(props.map(p => [p, cs.getPropertyValue(p)]).filter(([, v]) => v && v !== 'none' && v !== 'normal')); }

  // 4. Network resources so far (paths only; ids collapsed, query values dropped)
  out.api = [...new Set(performance.getEntriesByType('resource')
    .filter(e => ['fetch', 'xmlhttprequest'].includes(e.initiatorType))
    .map(e => { const u = new URL(e.name); return u.host + u.pathname.replace(/[0-9a-f-]{8,}|\d+/g, ':id') + (u.search ? '?' + [...u.searchParams.keys()].join('&') : ''); }))].sort();

  return JSON.stringify(out);
})()

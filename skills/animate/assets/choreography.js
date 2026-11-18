/* Shared entrance driver. Explicit groups own the sequence; semantic roles own the motion.
   No dependency, hidden CSS, page-level fade, or framework-specific selectors. */
(function () {
  const presets = {
    nav:     { x: -16, y: 0, scale: 1, duration: 550, ease: 'cubic-bezier(.16,1,.3,1)' },
    toolbar: { x: 0, y: -14, scale: 1, duration: 550, ease: 'cubic-bezier(.16,1,.3,1)' },
    title:   { x: 0, y: 28, scale: 1, duration: 850, ease: 'cubic-bezier(.165,.84,.44,1)' },
    surface: { x: 0, y: 26, scale: .985, duration: 800, ease: 'cubic-bezier(.16,1,.3,1)' },
    content: { x: 0, y: 12, scale: 1, duration: 550, ease: 'cubic-bezier(.22,.61,.36,1)' },
    row:     { x: 0, y: 18, scale: 1, duration: 600, ease: 'cubic-bezier(.16,1,.3,1)' },
    accent:  { x: 0, y: 16, scale: .94, duration: 650, ease: 'cubic-bezier(.2,1.35,.4,1)' }
  };
  window.createChoreography = function (root = document) {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const registered = new WeakSet(), seen = new WeakSet(), active = new Map();
    let stopped = false;
    const visible = el => { if (el.checkVisibility && !el.checkVisibility()) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
    function enter(el, role = el.dataset.motion || 'content', delay = 0) {
      if (stopped || !el.isConnected || !visible(el)) return;
      const previous = active.get(el);
      const current = previous ? { opacity: getComputedStyle(el).opacity, transform: getComputedStyle(el).transform } : null;
      previous?.cancel();
      if (reduced.matches || !el.animate) return;
      const p = presets[role] || presets.content;
      const style = getComputedStyle(el), base = style.transform === 'none' ? '' : style.transform;
      const x = p.x * (style.direction === 'rtl' ? -1 : 1);
      // Animate wrappers for images with independent hover/parallax transforms.
      const final = { opacity: style.opacity, transform: base || 'none' };
      const from = current || { opacity: 0, transform: `translate(${x}px,${p.y}px) scale(${p.scale}) ${base}` };
      const animation = el.animate([from, { opacity: style.opacity, offset: .35 }, final], {
        duration: p.duration, delay: Math.min(420, Math.max(0, delay)), easing: p.ease, fill: 'backwards'
      });
      active.set(el, animation);
      const release = () => { if (active.get(el) === animation) active.delete(el); };
      animation.onfinish = release; animation.oncancel = release;
    }
    function sequence(elements) {
      const groups = new Map();
      for (const el of elements) {
        const group = el.closest('[data-motion-group]') || root;
        if (!groups.has(group)) groups.set(group, []);
        groups.get(group).push(el);
      }
      for (const [group, items] of groups) {
        items.sort((a,b) => Number(a.dataset.motionOrder || 0) - Number(b.dataset.motionOrder || 0) || (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
        const step = Math.max(25, Math.min(60, 300 / Math.max(1,items.length)));
        const beat = Number(group.dataset?.motionBeat || 0);
        items.forEach((el,i) => enter(el, el.dataset.motion, beat + i * step));
      }
    }
    const observer = new IntersectionObserver(entries => {
      const items = [];
      for (const {target:el,isIntersecting} of entries) {
        if (!isIntersecting || !visible(el) || seen.has(el)) continue;
        seen.add(el); observer.unobserve(el); items.push(el);
      }
      sequence(items);
    }, {threshold:0});
    function refresh() {
      if (stopped) return;
      const now = [];
      root.querySelectorAll('[data-motion]').forEach(el => {
        if (registered.has(el)) return;
        registered.add(el);
        // Set the first view before paint rather than waiting for an observer callback.
        if (visible(el)) {seen.add(el);now.push(el);} else observer.observe(el);
      });
      sequence(now);
    }
    function cancel() { for (const a of active.values()) a.cancel(); active.clear(); }
    function preference() { if (reduced.matches) cancel(); }
    function focus(event) {
      for (let el=event.target; el && el!==root; el=el.parentElement) active.get(el)?.cancel();
    }
    reduced.addEventListener('change', preference);
    root.addEventListener('focusin', focus);
    return { enter, refresh, cancel, destroy() { stopped=true; cancel(); observer.disconnect(); reduced.removeEventListener('change', preference); root.removeEventListener('focusin',focus); } };
  };
})();

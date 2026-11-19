// House entrance: one directive for the whole app (values from animate's motion-system.md).
//   app.directive('enter', vEnter)
//   <h1 v-enter="'title'">  <article v-enter="'card'">  <p v-enter="'content'">  <tr v-enter="'row'">
// Siblings with the same role stagger by themselves; anything inside a v-enter card starts 140 ms
// after that card. Pass { role, i, n, delay } to override. From-states live in the tween, never in
// CSS: if this script fails, everything is simply visible. GSAP 3 (required on web, house rule);
// every tween lives in a gsap.context() that is reverted on unmount. Register Flip where the app
// uses it (reorders, card -> drawer); nothing here needs it, so it isn't imported.
import { gsap } from 'gsap'

const EASE = { surface: 'expo.out', content: 'power3.out', title: 'power4.out' }
const REGION = { title: 0, content: 110, card: 150, row: 260, data: 300 }   // reading order
const delays = new WeakMap()
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches   // the one switch
const clamp = (lo, v, hi) => Math.min(hi, Math.max(lo, v))

function timing(el, { role, i, n, delay }) {
  const sibs = [...el.parentElement.children].filter(c => c.dataset.enter === role)
  i ??= sibs.indexOf(el)
  n ??= sibs.length
  const step = role === 'row' ? 35 : clamp(35, 500 / n, 80)
  const parent = el.parentElement.closest('[data-enter]')
  // Vue mounts children before their parent, so the parent's delay may not be stored yet: compute it
  if (parent && !delays.has(parent)) delays.set(parent, timing(parent, parent._houseEnterOpts ?? { role: parent.dataset.enter }))
  const base = delay ?? (parent ? delays.get(parent) + 140 : REGION[role] ?? 0)
  return base + Math.min(i, 24) * step
}

function play(el, role, ms) {
  const delay = ms / 1000
  const base = { delay, overwrite: 'auto', clearProps: 'transform,opacity' }
  if (role === 'card') {   // opacity is done in ~250 ms; the long ease is on the travel
    gsap.from(el, { opacity: 0, duration: 0.25, ease: 'power1.out', delay, clearProps: 'opacity' })
    return gsap.from(el, { ...base, y: 24, scale: 0.98, duration: 0.85, ease: EASE.surface, clearProps: 'transform' })
  }
  if (role === 'title' && !/[֐-ࣿ]/.test(el.textContent) && el.children.length === 0)
    return title(el, delay)
  if (role === 'data') {   // bars and meters grow from the start edge
    const origin = getComputedStyle(el).direction === 'rtl' ? 'right center' : 'left center'
    return gsap.from(el, { ...base, scaleX: 0, transformOrigin: origin, duration: 0.85, ease: EASE.surface })
  }
  return gsap.from(el, { ...base, opacity: 0, y: role === 'title' ? 18 : 12, duration: 0.55, ease: EASE.content })
}

// Per-character rise for a Latin title. Arabic is never split (it would break letter joining).
// The letters live in a temporary aria-hidden overlay; the framework's own text node is never
// touched (only made transparent), so a later locale or data change still updates the title.
function title(el, delay) {
  const text = el.textContent
  const cs = getComputedStyle(el)
  const overlay = document.createElement('span')
  overlay.ariaHidden = 'true'
  overlay.style.cssText = `position:absolute;inset:0;padding:${cs.padding};color:${cs.color};pointer-events:none`
  const prev = { position: el.style.position, color: el.style.color }
  if (cs.position === 'static') el.style.position = 'relative'
  el.style.color = 'transparent'
  el.appendChild(overlay)
  const chars = [...text].map(ch => {
    const clip = document.createElement('span')
    clip.ariaHidden = 'true'
    clip.style.cssText = 'display:inline-block;overflow:hidden;vertical-align:bottom;padding-block:.08em;margin-block:-.08em'
    const s = clip.appendChild(document.createElement('span'))
    s.style.cssText = 'display:inline-block;white-space:pre'
    s.textContent = ch
    overlay.appendChild(clip)
    return s
  })
  const done = () => { overlay.remove(); el.style.position = prev.position; el.style.color = prev.color }
  el._houseTitleDone = done
  gsap.from(chars, { yPercent: 115, rotate: 6, duration: 0.85, ease: EASE.title, delay, stagger: 0.022, onComplete: done })
}

export const vEnter = {
  beforeMount(el, { value }) {
    el._houseEnterOpts = typeof value === 'string' ? { role: value } : { role: 'content', ...value }
    el.dataset.enter = el._houseEnterOpts.role
  },
  mounted(el) {
    const o = el._houseEnterOpts
    if (reduced()) {   // keep a cue, drop the travel: a short fade only
      el._houseEnter = gsap.context(() => gsap.from(el, { opacity: 0, duration: 0.2, clearProps: 'opacity' }))
      return
    }
    const delay = delays.get(el) ?? timing(el, o)
    delays.set(el, delay)
    el._houseEnter = gsap.context(() => {})
    const run = ms => el._houseEnter.add(() => play(el, o.role, ms))
    if (el.getBoundingClientRect().top < innerHeight) return void run(delay)
    el._houseIo = new IntersectionObserver(([e]) => {   // below the fold: once, on first entry
      if (!e.isIntersecting) return
      el._houseIo.disconnect()
      run(60)
    }, { rootMargin: '0px 0px -8% 0px' })
    el._houseIo.observe(el)
  },
  unmounted(el) {   // no pile-up on re-render, HMR or route revisit
    el._houseIo?.disconnect()
    el._houseEnter?.revert()
    el._houseTitleDone?.()
  },
}

/** One persistent selection layer that travels between nav items instead of re-rendering. */
export const vTravelNav = {
  mounted(root) {
    const layer = document.createElement('span')
    layer.className = 'house-nav-selection'
    layer.ariaHidden = 'true'
    root.prepend(layer)
    const move = () => requestAnimationFrame(() => {
      const active = root.querySelector('.is-active,[aria-current="page"],[aria-pressed="true"]')
      if (!active) return
      const rr = root.getBoundingClientRect()
      const ar = active.getBoundingClientRect()
      const to = { x: ar.left - rr.left + root.scrollLeft, y: ar.top - rr.top + root.scrollTop, width: ar.width, height: ar.height }
      if (layer._placed && !reduced()) {   // stretchy: position lands in 0.36 s, the size catches up in 0.55 s
        gsap.to(layer, { x: to.x, y: to.y, duration: 0.36, ease: 'power3.out', overwrite: 'auto' })
        gsap.to(layer, { width: to.width, height: to.height, duration: 0.55, ease: 'expo.out', overwrite: 'auto' })
      } else gsap.set(layer, { ...to, opacity: 1 })
      layer._placed = true
    })
    const mutation = new MutationObserver(move)
    mutation.observe(root, { subtree: true, attributes: true, attributeFilter: ['class', 'aria-current', 'aria-pressed'] })
    const resize = new ResizeObserver(move)
    resize.observe(root)
    root.addEventListener('click', move)
    root._houseTravelNav = { layer, move, mutation, resize }
    move()
  },
  unmounted(root) {
    const state = root._houseTravelNav
    if (!state) return
    state.mutation.disconnect()
    state.resize.disconnect()
    root.removeEventListener('click', state.move)
    gsap.killTweensOf(state.layer)
    state.layer.remove()
    delete root._houseTravelNav
  },
}

/** Light/dark or accent change: circular reveal from the control the user touched.
 *  WAAPI on purpose: GSAP cannot target the ::view-transition-new pseudo-element. */
export function switchTheme(apply, trigger) {
  if (!document.startViewTransition || reduced()) return apply()
  const r = trigger?.getBoundingClientRect()
  const x = r ? r.left + r.width / 2 : (document.dir === 'rtl' ? 40 : innerWidth - 40)
  const y = r ? r.top + r.height / 2 : 40
  const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
  document.startViewTransition(apply).ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
      { duration: 450, easing: 'cubic-bezier(.65,0,.35,1)', pseudoElement: '::view-transition-new(root)' })
  }).catch(() => {})
}

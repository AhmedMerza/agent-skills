// House entrance: one directive for the whole app (values from animate's motion-system.md).
//   app.directive('enter', vEnter)
//   <h1 v-enter="'title'">  <article v-enter="'card'">  <p v-enter="'content'">  <tr v-enter="'row'">
// Siblings with the same role stagger by themselves; anything inside a v-enter card starts 140 ms
// after that card. Pass { role, i, n, delay } to override. From-states live in the animation
// (fill: backwards), never in CSS: if this script fails, everything is simply visible.

const EASE = {
  surface: 'cubic-bezier(.16,1,.3,1)',
  content: 'cubic-bezier(.22,.61,.36,1)',
  title: 'cubic-bezier(.165,.84,.44,1)',
}
const REGION = { title: 0, content: 110, card: 150, row: 260, data: 300 }   // reading order
const delays = new WeakMap()
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const clamp = (lo, v, hi) => Math.min(hi, Math.max(lo, v))

function timing(el, { role, i, n, delay }) {
  const sibs = [...el.parentElement.children].filter(c => c.dataset.enter === role)
  i ??= sibs.indexOf(el)
  n ??= sibs.length
  const step = role === 'row' ? 35 : clamp(35, 500 / n, 80)
  const parent = el.parentElement.closest('[data-enter]')
  const base = delay ?? (parent ? (delays.get(parent) ?? 0) + 140 : REGION[role] ?? 0)
  return base + Math.min(i, 24) * step
}

function play(el, role, delay) {
  const opt = (duration, easing) => ({ duration, delay, easing, fill: 'backwards' })
  if (role === 'card') {   // opacity is done in ~250 ms; the long ease is on the travel
    el.animate([{ opacity: 0 }, { opacity: 1 }], opt(250, 'ease-out'))
    return el.animate([{ transform: 'translateY(24px) scale(.98)' }, { transform: 'none' }], opt(850, EASE.surface))
  }
  if (role === 'title' && !/[֐-ࣿ]/.test(el.textContent) && el.children.length === 0)
    return title(el, delay)
  if (role === 'data')   // bars and meters grow from the start edge
    return el.animate([{ transform: 'scaleX(0)', transformOrigin: 'inline-start' }, { transform: 'none', transformOrigin: 'inline-start' }], opt(850, EASE.surface))
  const y = role === 'title' ? 18 : 12
  return el.animate([{ opacity: 0, transform: `translateY(${y}px)` }, { opacity: 1, transform: 'none' }], opt(550, EASE.content))
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
  const anims = [...text].map((ch, i) => {
    const clip = document.createElement('span')
    clip.ariaHidden = 'true'
    clip.style.cssText = 'display:inline-block;overflow:hidden;vertical-align:bottom;padding-block:.08em;margin-block:-.08em'
    const s = clip.appendChild(document.createElement('span'))
    s.style.cssText = 'display:inline-block;white-space:pre'
    s.textContent = ch
    overlay.appendChild(clip)
    return s.animate([{ transform: 'translateY(115%) rotate(6deg)' }, { transform: 'none' }],
      { duration: 850, delay: delay + i * 22, easing: EASE.title, fill: 'backwards' })
  })
  const done = () => { overlay.remove(); el.style.position = prev.position; el.style.color = prev.color }
  Promise.all(anims.map(a => a.finished)).then(done, done)
}

export const vEnter = {
  beforeMount(el, { value }) {
    el.dataset.enter = typeof value === 'string' ? value : value?.role ?? 'content'
  },
  mounted(el, { value }) {
    if (reduced() || !el.animate) return
    const o = typeof value === 'string' ? { role: value } : { role: 'content', ...value }
    const delay = timing(el, o)
    delays.set(el, delay)
    if (el.getBoundingClientRect().top < innerHeight) return void play(el, o.role, delay)
    const io = new IntersectionObserver(([e]) => {      // below the fold: once, on first entry
      if (!e.isIntersecting) return
      io.disconnect()
      play(el, o.role, 60)
    }, { rootMargin: '0px 0px -8% 0px' })
    io.observe(el)
  },
}

/** Light/dark or accent change: circular reveal from the control the user touched. */
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

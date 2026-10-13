/**
 * "Jugo" imperativo: partículas, texto flotante, sacudida y toasts.
 * Todo vive en overlays position:fixed con pointer-events:none y se limpia solo.
 */
import { prefersReducedMotion } from './pixel'

const DEFAULT_COLORS = ['var(--pac)', 'var(--ghost-pink)', 'var(--ghost-cyan)', 'var(--ok)', 'var(--ghost-orange)', 'var(--pellet)']

let layer: HTMLDivElement | null = null
function fxLayer(): HTMLDivElement | null {
  if (typeof document === 'undefined') return null
  if (layer && layer.isConnected) return layer
  layer = document.createElement('div')
  layer.className = 'ui-fx-layer'
  layer.setAttribute('aria-hidden', 'true')
  document.body.appendChild(layer)
  return layer
}

function canAnimate(el: Element): boolean {
  return typeof (el as HTMLElement).animate === 'function'
}

/** Explosión de partículas pixel en coordenadas de pantalla (overlay fijo, imperativo) */
export function burst(x: number, y: number, opts?: { color?: string; count?: number }) {
  const root = fxLayer()
  if (!root) return
  const reduced = prefersReducedMotion()
  let count = Math.max(1, Math.min(60, Math.floor(opts?.count ?? 18)))
  if (reduced) count = Math.min(count, 6)
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span')
    p.className = 'ui-particle'
    const s = [6, 8, 8, 10][Math.floor(Math.random() * 4)]
    p.style.width = `${s}px`
    p.style.height = `${s}px`
    p.style.left = `${x - s / 2}px`
    p.style.top = `${y - s / 2}px`
    p.style.background = opts?.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]
    root.appendChild(p)
    if (!canAnimate(p)) {
      setTimeout(() => p.remove(), 50)
      continue
    }
    const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6
    const speed = reduced ? 40 : 90 + Math.random() * 110
    const vx = Math.cos(ang) * speed
    const vy = Math.sin(ang) * speed - (reduced ? 0 : 140)
    const g = reduced ? 0 : 520
    const dur = reduced ? 400 : 750 + Math.random() * 300
    const frames: Keyframe[] = []
    const N = 8
    for (let k = 0; k <= N; k++) {
      const t = (k / N) * (dur / 1000)
      const dx = vx * t
      const dy = vy * t + 0.5 * g * t * t
      frames.push({
        transform: `translate(${Math.round(dx)}px, ${Math.round(dy)}px)`,
        opacity: k < N * 0.6 ? 1 : 1 - (k - N * 0.6) / (N * 0.4),
      })
    }
    const a = p.animate(frames, { duration: dur, easing: 'steps(14, end)', fill: 'forwards' })
    a.onfinish = () => p.remove()
    setTimeout(() => p.remove(), dur + 200)
  }
}

/** Texto flotante tipo "+150" que sube y se desvanece */
export function floatText(x: number, y: number, text: string, opts?: { color?: string }) {
  const root = fxLayer()
  if (!root) return
  const el = document.createElement('span')
  el.className = 'ui-floattext'
  el.textContent = text
  el.style.left = `${x}px`
  el.style.top = `${y}px`
  if (opts?.color) el.style.color = opts.color
  root.appendChild(el)
  const dur = 950
  if (canAnimate(el)) {
    const a = el.animate(
      [
        { transform: 'translate(-50%, -50%) scale(.6)', opacity: 1 },
        { transform: 'translate(-50%, -80%) scale(1.15)', opacity: 1, offset: 0.15 },
        { transform: 'translate(-50%, -150%) scale(1)', opacity: 1, offset: 0.6 },
        { transform: 'translate(-50%, -260%) scale(1)', opacity: 0 },
      ],
      { duration: dur, easing: 'steps(12, end)', fill: 'forwards' },
    )
    a.onfinish = () => el.remove()
  }
  setTimeout(() => el.remove(), dur + 200)
}

/** Sacudida de pantalla (o del elemento dado) */
export function shake(el?: HTMLElement | null) {
  if (typeof document === 'undefined') return
  const target = el ?? document.getElementById('root') ?? document.body
  if (!target || !canAnimate(target)) return
  const amp = prefersReducedMotion() ? 2 : 7
  const frames: Keyframe[] = [0, -1, 1, -0.8, 0.8, -0.5, 0.5, 0].map((k, i) => ({
    transform: `translate(${Math.round(k * amp)}px, ${i % 2 ? Math.round(amp / 3) : 0}px)`,
  }))
  try {
    target.animate(frames, { duration: 360, easing: 'steps(8, end)', composite: 'add' })
  } catch {
    target.animate(frames, { duration: 360, easing: 'steps(8, end)' })
  }
}

// ───────────── Toasts ─────────────
let toastBox: HTMLDivElement | null = null
function toastContainer(): HTMLDivElement | null {
  if (typeof document === 'undefined') return null
  if (toastBox && toastBox.isConnected) return toastBox
  toastBox = document.createElement('div')
  toastBox.className = 'ui-toasts'
  toastBox.setAttribute('role', 'status')
  toastBox.setAttribute('aria-live', 'polite')
  document.body.appendChild(toastBox)
  return toastBox
}

/** Toast de logro: "🏆 ¡LOGRO!" (imperativo) */
export function toast(text: string, opts?: { icon?: string }) {
  const box = toastContainer()
  if (!box) return
  // máximo 3 a la vez: quita el más viejo
  while (box.children.length >= 3) box.firstElementChild?.remove()
  const t = document.createElement('div')
  t.className = 'ui-toast'
  const ic = document.createElement('span')
  ic.className = 'ui-toast__icon'
  ic.textContent = opts?.icon ?? '★'
  const tx = document.createElement('span')
  tx.className = 'ui-toast__text'
  tx.textContent = text
  t.append(ic, tx)
  box.appendChild(t)
  const life = 2600
  setTimeout(() => {
    t.classList.add('is-leaving')
    setTimeout(() => t.remove(), 320)
  }, life)
}

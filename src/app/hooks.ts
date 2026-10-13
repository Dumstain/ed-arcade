import { useEffect, useRef, useState } from 'react'

export function prefersReducedMotion(): boolean {
  try {
    return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/** Valor resuelto de una variable CSS (para APIs imperativas que pintan en canvas). */
export function cssVar(name: string, fallback = ''): string {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    return v || fallback
  } catch {
    return fallback
  }
}

/** Número que "cuenta" hacia el objetivo (animación arcade de puntaje). */
export function useCountUp(target: number, ms = 700, start?: number): number {
  const [value, setValue] = useState(start ?? target)
  const valueRef = useRef(start ?? target)
  valueRef.current = value

  useEffect(() => {
    if (prefersReducedMotion() || ms <= 0) {
      setValue(target)
      return
    }
    const from = valueRef.current
    if (from === target) return
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / ms)
      // pasos discretos para sensación 8-bit
      const stepped = Math.floor(k * 20) / 20
      setValue(Math.round(from + (target - from) * (k >= 1 ? 1 : stepped)))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    // respaldo: si la pestaña está oculta (rAF en pausa) igual llega al valor final
    const done = window.setTimeout(() => setValue(target), ms + 120)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(done)
    }
  }, [target, ms])

  return value
}

/** Puntaje con ceros a la izquierda estilo arcade: 001250 */
export function padScore(n: number, len = 6): string {
  const s = String(Math.max(0, Math.round(n)))
  return s.length >= len ? s : '0'.repeat(len - s.length) + s
}

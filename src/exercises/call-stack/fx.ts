import { burst, floatText } from '../../ui'

/** Lee una variable CSS del tema actual (los efectos de partículas necesitan color real). */
export function cssVar(name: string, fallback: string): string {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    return v || fallback
  } catch {
    return fallback
  }
}

const FALLBACKS: Record<string, string> = {
  '--pac': '#ffe600',
  '--ok': '#3cff6e',
  '--bad': '#ff3b3b',
  '--info': '#00e5ff',
}

/** Explosión + texto flotante en el centro de un elemento (si existe). */
export function fxAt(el: Element | null | undefined, text?: string, colorVar = '--pac'): void {
  if (!el) return
  try {
    const r = el.getBoundingClientRect()
    const x = r.left + r.width / 2
    const y = r.top + r.height / 2
    const color = cssVar(colorVar, FALLBACKS[colorVar] ?? '#ffe600')
    burst(x, y, { color, count: 10 })
    if (text) floatText(x, y - 12, text, { color })
  } catch {
    /* los efectos nunca deben romper el ejercicio */
  }
}

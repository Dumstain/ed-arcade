/** Helpers de DOM para efectos locales (burst / floatText trabajan en coordenadas de pantalla). */

/** Valor ya resuelto de una variable CSS del tema (p.ej. '--ok' → '#3cff6e'), con respaldo. */
export function cssVar(name: string, fallback = '#ffe600'): string {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    return v || fallback
  } catch {
    return fallback
  }
}

/** Centro en coordenadas de pantalla (viewport) de un elemento, o null si no existe. */
export function centerOf(el: Element | null | undefined): { x: number; y: number } | null {
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

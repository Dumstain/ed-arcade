/**
 * Geometría pura del mapa (en pixeles del contenedor medido): proyección de (x, y) 0..100,
 * recorte de carreteras en el borde de las ciudades, pellets sobre la carretera, flechas
 * (grafos dirigidos) y hacia dónde mira el comecocos.
 */
export interface Pt { x: number; y: number }
export interface MapBox { w: number; h: number; padX: number; padTop: number; padBottom: number }

export function project(x: number, y: number, box: MapBox): Pt {
  const iw = Math.max(1, box.w - 2 * box.padX)
  const ih = Math.max(1, box.h - box.padTop - box.padBottom)
  return { x: Math.round(box.padX + (x / 100) * iw), y: Math.round(box.padTop + (y / 100) * ih) }
}

export const dist = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y)

/** Desplaza el segmento `d` px a su izquierda (para dos carreteras de un solo sentido encimadas) */
export function offsetSegment(a: Pt, b: Pt, d: number): [Pt, Pt] {
  const len = dist(a, b) || 1
  const nx = -(b.y - a.y) / len
  const ny = (b.x - a.x) / len
  return [
    { x: a.x + nx * d, y: a.y + ny * d },
    { x: b.x + nx * d, y: b.y + ny * d },
  ]
}

/** Punto a `t` px desde a hacia b */
export function along(a: Pt, b: Pt, t: number): Pt {
  const len = dist(a, b) || 1
  return { x: a.x + ((b.x - a.x) * t) / len, y: a.y + ((b.y - a.y) * t) / len }
}

/** Pellets cada `gap` px entre a y b, dejando `trim` px libres en cada extremo (ciudades) */
export function pellets(a: Pt, b: Pt, gap: number, trim: number): Pt[] {
  const len = dist(a, b)
  const free = len - 2 * trim
  if (free < gap * 0.6) return []
  const n = Math.max(1, Math.floor(free / gap))
  const step = free / n
  const out: Pt[] = []
  for (let k = 0; k <= n; k++) {
    const p = along(a, b, trim + k * step)
    out.push({ x: Math.round(p.x), y: Math.round(p.y) })
  }
  return out
}

/** Triángulo (atributo points de <polygon>) que apunta a b, con la punta a `trim` px de b */
export function arrowHead(a: Pt, b: Pt, trim: number, size: number): string {
  const len = dist(a, b) || 1
  const ux = (b.x - a.x) / len
  const uy = (b.y - a.y) / len
  const tip = { x: b.x - ux * trim, y: b.y - uy * trim }
  const base = { x: tip.x - ux * size, y: tip.y - uy * size }
  const half = size * 0.6
  const l = { x: base.x - uy * half, y: base.y + ux * half }
  const r = { x: base.x + uy * half, y: base.y - ux * half }
  const f = (p: Pt) => `${Math.round(p.x)},${Math.round(p.y)}`
  return `${f(tip)} ${f(l)} ${f(r)}`
}

/** transform para que el comecocos (que mira a la derecha) mire de a hacia b, sin quedar de cabeza */
export function facing(a: Pt, b: Pt): string {
  const dx = b.x - a.x
  const dy = b.y - a.y
  if (dx === 0 && dy === 0) return 'rotate(0deg)'
  if (dx >= 0) return `rotate(${Math.round((Math.atan2(dy, dx) * 180) / Math.PI)}deg)`
  return `scaleX(-1) rotate(${Math.round((Math.atan2(dy, -dx) * 180) / Math.PI)}deg)`
}

export const midpoint = (a: Pt, b: Pt): Pt => ({ x: Math.round((a.x + b.x) / 2), y: Math.round((a.y + b.y) / 2) })

/**
 * Utilidades para pixel-art con SVG: convierte una cuadrícula de caracteres en
 * <rect>s (une corridas horizontales del mismo color para dibujar menos nodos).
 */
import type { CSSProperties, ReactElement } from 'react'

export type Palette = Record<string, string>
export interface Run { x: number; y: number; w: number; ch: string }

const cache = new WeakMap<readonly string[], Run[]>()

export function gridRuns(grid: readonly string[]): Run[] {
  const hit = cache.get(grid)
  if (hit) return hit
  const out: Run[] = []
  grid.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const ch = row[x]
      if (ch === '.' || ch === ' ') {
        x++
        continue
      }
      let w = 1
      while (x + w < row.length && row[x + w] === ch) w++
      out.push({ x, y, w, ch })
      x += w
    }
  })
  cache.set(grid, out)
  return out
}

/** Dibuja la cuadrícula como <rect>s. Los colores pueden ser var(--...) o currentColor. */
export function PixelRects({ grid, palette, dx = 0, dy = 0 }: { grid: readonly string[]; palette: Palette; dx?: number; dy?: number }) {
  const runs = gridRuns(grid)
  const els: ReactElement[] = []
  for (const r of runs) {
    const fill = palette[r.ch]
    if (!fill) continue
    els.push(<rect key={`${r.x}_${r.y}`} x={r.x + dx} y={r.y + dy} width={r.w} height={1} style={{ fill }} />)
  }
  return <>{els}</>
}

/** SVG completo a partir de una cuadrícula. */
export function PixelSvg({
  grid,
  palette,
  size = 24,
  className,
  style,
  title,
}: {
  grid: readonly string[]
  palette: Palette
  size?: number
  className?: string
  style?: CSSProperties
  title?: string
}) {
  const w = Math.max(...grid.map((r) => r.length))
  const h = grid.length
  return (
    <svg
      className={className}
      style={style}
      width={(size * w) / Math.max(w, h)}
      height={(size * h) / Math.max(w, h)}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      aria-label={title}
      focusable="false"
    >
      <PixelRects grid={grid} palette={palette} />
    </svg>
  )
}

export function prefersReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

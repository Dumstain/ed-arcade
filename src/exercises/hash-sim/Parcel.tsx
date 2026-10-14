/**
 * Paquete pixel-art (caja de cartón con cinta) para la tarjeta de "paquete actual".
 * Sprite propio de hash-sim; colores solo por variables CSS (claro y oscuro).
 */
const GRID = [
  '.SSSSSSSSSSSS.',
  'SOOOOOTTOOOOOS',
  'SOOOOOTTOOOOOS',
  'SDDDDDTTDDDDDS',
  'SOOOOOOOOOOOOS',
  'SOOOOOOOOOOOOS',
  'SOOOOOOOOOOOOS',
  'SOOOOOOOOOOOOS',
  'SOOOOOOOOOOOOS',
  'SDDDDDDDDDDDDS',
  '.SSSSSSSSSSSS.',
] as const

const FILL: Record<string, string> = {
  S: 'var(--pac-ink)',
  O: 'var(--ghost-orange)',
  D: 'color-mix(in srgb, var(--ghost-orange) 70%, var(--pac-ink))',
  T: 'var(--ui-paper)',
}

interface Run {
  x: number
  y: number
  w: number
  ch: string
}

const RUNS: Run[] = (() => {
  const out: Run[] = []
  GRID.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const ch = row[x]
      if (ch === '.') {
        x++
        continue
      }
      let w = 1
      while (x + w < row.length && row[x + w] === ch) w++
      out.push({ x, y, w, ch })
      x += w
    }
  })
  return out
})()

export function Parcel({ size = 36, className }: { size?: number; className?: string }) {
  const w = GRID[0].length
  const h = GRID.length
  return (
    <svg
      className={className}
      width={size}
      height={(size * h) / w}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {RUNS.map((r) => (
        <rect key={`${r.x}_${r.y}`} x={r.x} y={r.y} width={r.w} height={1} style={{ fill: FILL[r.ch] }} />
      ))}
    </svg>
  )
}

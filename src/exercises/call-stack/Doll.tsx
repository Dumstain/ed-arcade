/**
 * Muñeca rusa pixel-art (12×14). Cada marco de la pila es una muñeca;
 * la del caso base es la más chiquita: sólida (verde) y ya no se abre.
 */
const ROWS = [
  '...kkkkkk...',
  '..kcccccck..',
  '.kccffffcck.',
  '.kcffffffck.',
  '.kffeffeffk.',
  '.kfrffffrfk.',
  '..kffffffk..',
  '..kkkkkkkk..',
  '.kcccccccck.',
  'kccccyycccck',
  'kcccyyyyccck',
  'kccccyycccck',
  '.kcccccccck.',
  '..kkkkkkkk..',
]

const INK = '#14143a'
const SKIN = '#ffd9b0'
const CHEEK = '#ff8fa3'

export function Doll({ color, base = false, scale = 2 }: { color: string; base?: boolean; scale?: number }) {
  const fill = (ch: string): string => {
    switch (ch) {
      case 'k':
      case 'e':
        return INK
      case 'f':
        return SKIN
      case 'r':
        return CHEEK
      case 'y':
        return base ? '#ffffff' : 'var(--pac)'
      default:
        return base ? 'var(--ok)' : color
    }
  }
  return (
    <svg
      className="cs-doll"
      width={12 * scale}
      height={14 * scale}
      viewBox="0 0 12 14"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {ROWS.flatMap((row, y) =>
        Array.from(row).map((ch, x) =>
          ch === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} style={{ fill: fill(ch) }} />,
        ),
      )}
    </svg>
  )
}

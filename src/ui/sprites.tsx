/**
 * Sprites pixel-art ORIGINALES (inspirados en el arcade clásico, no copiados).
 * Todos son SVG con shapeRendering="crispEdges" y colores por tema vía CSS.
 */
import { useEffect, useState, type CSSProperties } from 'react'
import { PixelRects, PixelSvg, prefersReducedMotion, type Palette } from './pixel'
import { sfx } from './sfx'

export type FruitKind = 'cherry' | 'strawberry' | 'orange' | 'apple' | 'melon'
export type GhostColor = 'red' | 'pink' | 'cyan' | 'orange' | 'scared'

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

// ───────────────────────── Comecocos ─────────────────────────
const PAC_N = 14

/** Genera un círculo pixelado con cuña de boca (semiángulo en grados) y un ojito. */
function pacGrid(half: number): string[] {
  const c = PAC_N / 2
  const r2 = (PAC_N / 2) * (PAC_N / 2) - 0.2
  const rows: string[] = []
  for (let y = 0; y < PAC_N; y++) {
    let row = ''
    for (let x = 0; x < PAC_N; x++) {
      const dx = x + 0.5 - c
      const dy = y + 0.5 - c
      const inside = dx * dx + dy * dy <= r2
      // vértice de la boca un pixel a la izquierda del centro
      const ax = dx + 1
      const ang = (Math.abs(Math.atan2(dy, ax)) * 180) / Math.PI
      const mouth = half > 0 && ax > 0 && ang < half
      let ch = inside && !mouth ? 'P' : '.'
      if (ch === 'P' && x === 7 && y === 3) ch = 'E'
      row += ch
    }
    rows.push(row)
  }
  return rows
}
const PAC_OPEN = pacGrid(48)
const PAC_HALF = pacGrid(24)
const PAC_CLOSED = pacGrid(0)
const PAC_PAL: Palette = { P: 'currentColor', E: '#141414' }
const PAC_DIR: Record<'right' | 'left' | 'up' | 'down', string | undefined> = {
  right: undefined,
  left: 'translate(14 0) scale(-1 1)',
  up: 'rotate(-90 7 7)',
  down: 'rotate(90 7 7) translate(0 14) scale(1 -1)',
}

/** Comecocos animado (boca que abre/cierra) */
export function PacMan({
  size = 32,
  dir = 'right',
  chomp = true,
  className,
}: {
  size?: number
  dir?: 'right' | 'left' | 'up' | 'down'
  chomp?: boolean
  className?: string
}) {
  return (
    <svg
      className={cx('ui-pac', chomp && 'is-chomp', className)}
      width={size}
      height={size}
      viewBox="0 0 14 14"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <g transform={PAC_DIR[dir]}>
        {chomp ? (
          <>
            <g className="ui-pac__f ui-pac__f--open"><PixelRects grid={PAC_OPEN} palette={PAC_PAL} /></g>
            <g className="ui-pac__f ui-pac__f--half"><PixelRects grid={PAC_HALF} palette={PAC_PAL} /></g>
            <g className="ui-pac__f ui-pac__f--closed"><PixelRects grid={PAC_CLOSED} palette={PAC_PAL} /></g>
          </>
        ) : (
          <PixelRects grid={PAC_OPEN} palette={PAC_PAL} />
        )}
      </g>
    </svg>
  )
}

// ───────────────────────── Fantasma ─────────────────────────
const GHOST_TOP = [
  '.....XXXX.....',
  '...XXXXXXXX...',
  '..XXXXXXXXXX..',
  '.XXXXXXXXXXXX.',
  '.XXXXXXXXXXXX.',
  '.XXXXXXXXXXXX.',
  'XXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXX',
]
const SKIRT_A = ['XX.XXX..XXX.XX', 'X...XX..XX...X']
const SKIRT_B = ['XXXX.XXXX.XXXX', '.XX...XX...XX.']
const GHOST_EYES = [
  '..............',
  '..............',
  '..............',
  '...WW....WW...',
  '..WWWW..WWWW..',
  '..WWWW..WWWW..',
  '..WWWW..WWWW..',
  '...WW....WW...',
]
const GHOST_PUPILS = [
  '..............',
  '..............',
  '..............',
  '..............',
  '...PP....PP...',
  '...PP....PP...',
]
const SCARED_FACE = [
  '..............',
  '..............',
  '..............',
  '..............',
  '....FF..FF....',
  '....FF..FF....',
  '..............',
  '..............',
  '..FF..FF..FF..',
  '.F..FF..FF..F.',
]
const BODY_PAL: Palette = { X: 'currentColor' }

/** Fantasma pixel-art (ondulando) */
export function Ghost({
  color = 'red',
  size = 32,
  float = false,
  className,
}: {
  color?: GhostColor
  size?: number
  float?: boolean
  className?: string
}) {
  const scared = color === 'scared'
  return (
    <svg
      className={cx('ui-ghost', `ui-ghost--${color}`, float && 'is-float', className)}
      width={size}
      height={size}
      viewBox="0 0 14 14"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <PixelRects grid={GHOST_TOP} palette={BODY_PAL} />
      <g className="ui-ghost__skirt ui-ghost__skirt--a"><PixelRects grid={SKIRT_A} palette={BODY_PAL} dy={12} /></g>
      <g className="ui-ghost__skirt ui-ghost__skirt--b"><PixelRects grid={SKIRT_B} palette={BODY_PAL} dy={12} /></g>
      {scared ? (
        <PixelRects grid={SCARED_FACE} palette={{ F: '#ffd2bf' }} />
      ) : (
        <>
          <PixelRects grid={GHOST_EYES} palette={{ W: '#ffffff' }} />
          <g className="ui-ghost__pupils"><PixelRects grid={GHOST_PUPILS} palette={{ P: '#1b26c9' }} /></g>
        </>
      )}
    </svg>
  )
}

// ───────────────────────── Frutas ─────────────────────────
const FRUITS: Record<FruitKind, { label: string; grid: string[]; pal: Palette }> = {
  cherry: {
    label: 'Cereza',
    pal: { R: '#e8202a', D: '#97101c', W: '#ffffff', B: '#9a5a22', G: '#38b83c' },
    grid: [
      '...........BGG',
      '..........BBG.',
      '........BB.B..',
      '......BB...B..',
      '....BB....B...',
      '...B......B...',
      '..RRR.....B...',
      '.RRRRR...RRR..',
      'RWRRRRR.RRRRR.',
      'RWRRRRDRWRRRRR',
      'RRRRRRDRWRRRRD',
      '.RRRRD.RRRRRRD',
      '..DDD...RRRRD.',
      '.........DDD..',
    ],
  },
  strawberry: {
    label: 'Fresa',
    pal: { R: '#f0283c', D: '#a3122a', S: '#ffe68a', G: '#3cc24a' },
    grid: [
      '......GG......',
      '..GGG.GG.GGG..',
      '...GGGGGGGG...',
      '.RRRGGRRGGRRR.',
      'RRSRRRRRRRSRRR',
      'RRRRRSRRSRRRRD',
      'RSRRRRRRRRRRSD',
      'RRRRSRRRRSRRRD',
      '.RRRRRRSRRRRD.',
      '.RSRRRRRRRSRD.',
      '..RRRSRRSRRD..',
      '...RRRRRRRD...',
      '....RRSRDD....',
      '.....DDDD.....',
    ],
  },
  orange: {
    label: 'Naranja',
    pal: { O: '#ff9a1f', D: '#c45f00', W: '#ffdca8', G: '#3cb84a', B: '#8a4b1a' },
    grid: [
      '.......B......',
      '......BGGG....',
      '....OOBOGGG...',
      '..OOOOOOOOOO..',
      '.OOWOOOOOOOOO.',
      '.OWOOOOOOOOOO.',
      'OOWOOOOOOOOOOD',
      'OOOOOOOOOOOOOD',
      'OOOOOOOOOOOOOD',
      'OOOOOOOOOOOODD',
      '.OOOOOOOOOOOD.',
      '.OOOOOOOOOODD.',
      '..OOOOOOODDD..',
      '....DDDDDD....',
    ],
  },
  apple: {
    label: 'Manzana',
    pal: { R: '#d81b3c', D: '#8c0d24', W: '#ffc2cc', G: '#4cc23c', B: '#7a4416' },
    grid: [
      '......B.......',
      '......B.GGG...',
      '..RRR.BRRGG...',
      '.RRRRRRRRRRR..',
      'RRWRRRRRRRRRR.',
      'RWRRRRRRRRRRRR',
      'RWRRRRRRRRRRRD',
      'RRRRRRRRRRRRRD',
      'RRRRRRRRRRRRRD',
      'RRRRRRRRRRRRDD',
      '.RRRRRRRRRRRD.',
      '.RRRRRRRRRRDD.',
      '..RRRD.RRRDD..',
      '...DD...DDD...',
    ],
  },
  melon: {
    label: 'Melón',
    pal: { L: '#7fe05a', D: '#1f8a2e', W: '#e2ffc8', B: '#8a4b1a' },
    grid: [
      '......BB......',
      '.......B......',
      '....LDLLDL....',
      '..LLDLLDLLDL..',
      '.LLDLLLDLLLDL.',
      '.LWDLLLDLLLDL.',
      'LWLDLLLDLLLDLL',
      'LWLDLLLDLLLDLD',
      'LLLDLLLDLLLDLD',
      'LLLDLLLDLLLDLD',
      '.LLDLLLDLLLDD.',
      '.LLLDLLDLLDLD.',
      '..LLLDLDLDLD..',
      '....DDDDDD....',
    ],
  },
}

/** Fruta pixel-art (una por día: 1 cereza, 2 fresa, 3 naranja, 4 manzana, 5 melón) */
export function Fruit({ kind, size = 32, className }: { kind: FruitKind; size?: number; className?: string }) {
  const f = FRUITS[kind] ?? FRUITS.cherry
  return <PixelSvg grid={f.grid} palette={f.pal} size={size} className={cx('ui-fruit', className)} title={f.label} />
}

// ───────────────────────── Pellets ─────────────────────────
/** Fila de pellets: los `done` ya comidos, el comecocos en la posición actual */
export function Pellets({ total, done, className }: { total: number; done: number; className?: string }) {
  const n = Math.max(0, Math.floor(total || 0))
  if (n === 0) return null
  const d = Math.max(0, Math.min(n, Math.floor(done || 0)))
  const pos = Math.min(d, n - 1)
  const style = { '--n': n, '--i': pos } as CSSProperties
  return (
    <div
      className={cx('ui-pellets', d >= n && 'is-complete', className)}
      style={style}
      role="img"
      aria-label={`Progreso: ${d} de ${n}`}
    >
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="ui-pellets__slot">
          <span className={cx('ui-pellet', i === n - 1 && 'ui-pellet--power', (i < d || i === pos) && 'is-eaten')} />
        </span>
      ))}
      <span className="ui-pellets__pac">
        <PacMan size={22} dir="right" />
      </span>
    </div>
  )
}

// ───────────────────────── Vidas ─────────────────────────
/** Vidas como iconos de comecocos */
export function Lives({ lives, max }: { lives: number; max?: number }) {
  const l = Math.max(0, Math.floor(lives || 0))
  const total = Math.max(l, Math.floor(max ?? l))
  return (
    <span className="ui-lives" role="img" aria-label={`Vidas: ${l}${max ? ` de ${total}` : ''}`}>
      {Array.from({ length: total }, (_, i) => (
        <PacMan key={i} size={20} dir="left" chomp={false} className={cx('ui-life', i >= l && 'is-lost')} />
      ))}
    </span>
  )
}

// ───────────────────────── Estrellas ─────────────────────────
const STAR_CORE = [
  '......X......',
  '.....XXX.....',
  '.....XHX.....',
  '....XXHXX....',
  'XXXXXXXXXXXXX',
  '.XXXXXXXXXXX.',
  '..XXXXXXXXX..',
  '...XXXXXXX...',
  '...XXXXXXX...',
  '..XXXX.XXXX..',
  '..XXX...XXX..',
  '.XXX.....XXX.',
  '.XX.......XX.',
]
/** Agrega un contorno 'O' de 1 pixel alrededor de la figura */
function withOutline(g: string[]): string[] {
  const h = g.length + 2
  const w = g[0].length + 2
  const at = (x: number, y: number) => {
    const row = g[y - 1]
    if (!row) return '.'
    return row[x - 1] ?? '.'
  }
  const out: string[] = []
  for (let y = 0; y < h; y++) {
    let row = ''
    for (let x = 0; x < w; x++) {
      const c = at(x, y)
      if (c !== '.') row += c
      else {
        const near = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].some((n) => n !== '.')
        row += near ? 'O' : '.'
      }
    }
    out.push(row)
  }
  return out
}
const STAR = withOutline(STAR_CORE)
const STAR_ON: Palette = { X: 'var(--pac)', H: '#fffbe0', O: 'var(--ui-star-edge)' }
const STAR_OFF: Palette = { X: 'var(--bg-sunken)', H: 'var(--bg-sunken)', O: 'var(--fg-muted)' }
const STAR_NOTES = [0, 4, 7]

/** Estrellas 0..3 */
export function Stars({ value, size = 28, animate = false }: { value: number; size?: number; animate?: boolean }) {
  const v = Math.max(0, Math.min(3, Math.round(value || 0)))
  const [shown, setShown] = useState(animate ? 0 : v)
  useEffect(() => {
    if (!animate || prefersReducedMotion()) {
      setShown(v)
      return
    }
    setShown(0)
    const ts: number[] = []
    for (let i = 0; i < v; i++) {
      ts.push(
        window.setTimeout(() => {
          setShown(i + 1)
          sfx.combo(STAR_NOTES[i])
        }, 300 + i * 380),
      )
    }
    return () => ts.forEach((t) => clearTimeout(t))
  }, [v, animate])
  return (
    <span className={cx('ui-stars', animate && 'is-animated')} role="img" aria-label={`${v} de 3 estrellas`}>
      {[0, 1, 2].map((i) => {
        const on = i < shown
        return (
          <PixelSvg
            key={`${i}-${on ? 1 : 0}`}
            grid={STAR}
            palette={on ? STAR_ON : STAR_OFF}
            size={size}
            className={cx('ui-star', on && 'is-on')}
          />
        )
      })}
    </span>
  )
}

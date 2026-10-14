/**
 * Tablero del BST: carpetas (nodos) acomodadas con x por INORDEN e y por profundidad,
 * líneas en SVG, huecos punteados tocables (insert), clave viajera, números de orden,
 * signos de comparación y animaciones de reacomodo (los nodos se deslizan a su nueva posición).
 * Escala para caber a 360 px (mín. MIN_SCALE) y, si aun así no cabe, scroll horizontal interno.
 * Con huecos (insert) nunca se escala: los huecos conservan 44 px y se usa el scroll interno.
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, MutableRefObject, ReactNode } from 'react'
import { Ghost, PacMan } from '../../ui'
import type { GhostColor } from '../../ui'
import { GEO, columnWidth, columnsFor, layoutTree, shapeSig } from './logic'
import type { LHole, LNode, Side, Tree } from './logic'

export type Tone = 'path' | 'found' | 'target' | 'wrong' | 'visited' | 'new' | 'replace' | 'hint' | 'sol'
export interface NodeLook {
  tone?: Tone
  dim?: boolean
  /** número de orden (comparación / recorrido / inserción) */
  order?: number
  /** signo de comparación que se dibuja debajo, del lado hacia donde se baja */
  cmp?: '<' | '>' | '='
  /** se está yendo (comido por el comecocos) */
  gone?: boolean
  pac?: boolean
  ghost?: GhostColor
  /** etiqueta corta arriba del nodo, p.ej. "SUBE" */
  tag?: string
  /** texto extra para lectores de pantalla */
  note?: string
}
export type HoleLook = 'wrong' | 'land'
export type ChipAt = { node: number } | { hole: string } | 'top'
export interface ChipSpec {
  v: number
  at: ChipAt
}

export const MIN_SCALE = 0.66
/** columna mínima con huecos: dos huecos del mismo nivel quedan a ≥ 2 columnas (56 - 44 = 12 px libres) */
const HOLE_MIN_COL = 28
const CHIP_W = 44
const CHIP_H = 34
const STUB_W = 40
const STUB_H = 26

export interface BoardProps {
  tree: Tree
  holes?: boolean
  looks?: Map<number, NodeLook>
  holeLooks?: Map<string, HoleLook>
  /** ids de líneas resaltadas: "e<valor hijo>" o "h<id hueco>" */
  litEdges?: Set<string>
  hideEdges?: Set<string>
  /** dibuja el nodo v en la posición del nodo w (animación del sucesor que sube) */
  moves?: Map<number, number>
  chip?: ChipSpec | null
  /** búsqueda fallida: hueco vacío donde se cayó */
  stub?: { parent: number; side: Side } | null
  onNode?: (v: number, el: HTMLElement) => void
  onHole?: (h: LHole, el: HTMLElement) => void
  interactive: boolean
  label: string
  maxCol?: number
  nodeRefs?: MutableRefObject<Map<number, HTMLElement>>
  holeRefs?: MutableRefObject<Map<string, HTMLElement>>
  children?: ReactNode
}

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

function relation(n: LNode): string {
  if (n.parent === null) return 'raíz'
  return `hijo ${n.side === 'L' ? 'izquierdo' : 'derecho'} del ${n.parent}`
}

function toneText(t?: Tone): string {
  switch (t) {
    case 'path':
      return ', ya comparado'
    case 'found':
      return ', encontrado'
    case 'target':
      return ', el que se elimina'
    case 'visited':
      return ', ya visitado'
    case 'replace':
      return ', ocupa el lugar'
    case 'sol':
      return ', respuesta'
    default:
      return ''
  }
}

export function Board({
  tree,
  holes = false,
  looks,
  holeLooks,
  litEdges,
  hideEdges,
  moves,
  chip,
  stub,
  onNode,
  onHole,
  interactive,
  label,
  maxCol,
  nodeRefs,
  holeRefs,
  children,
}: BoardProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [cw, setCw] = useState(288)

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const update = () => {
      const w = el.clientWidth
      if (w > 0) setCw((p) => (Math.abs(p - w) < 1 ? p : w))
    }
    update()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update)
      return () => window.removeEventListener('resize', update)
    }
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const cols = columnsFor(tree, holes)
  // con huecos NO se achica el tablero: columnas de ≥ HOLE_MIN_COL (huecos de 44 px con ≥ 12 px
  // de separación); si no cabe, se usa el scroll horizontal interno
  const fitCol = columnWidth(cw, cols)
  const col = Math.min(maxCol ?? GEO.MAX_COL, holes ? Math.max(HOLE_MIN_COL, fitCol) : fitCol)
  const layout = useMemo(() => layoutTree(tree, { holes, col }), [tree, holes, col])
  const minScale = holes ? 1 : MIN_SCALE
  const scale = layout.width > cw ? Math.max(minScale, cw / layout.width) : 1
  const needsScroll = layout.width * scale > cw + 1
  const root = layout.nodes.find((n) => n.parent === null)
  const rootX = root ? root.x : (layout.holes[0]?.x ?? layout.width / 2)

  // si hay scroll, centrar la raíz (una vez por cambio de medida)
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el || !needsScroll) return
    el.scrollLeft = Math.max(0, rootX * scale - cw / 2)
  }, [needsScroll, cw, scale, rootX])

  const sig = shapeSig(tree) + (holes ? 'H' : '')
  const edges = useMemo(() => {
    const list = layout.edges.filter((e) => !hideEdges?.has(e.id))
    // las resaltadas al final (encima)
    return [...list.filter((e) => !litEdges?.has(e.id)), ...list.filter((e) => litEdges?.has(e.id))]
  }, [layout, hideEdges, litEdges])

  const posOf = (n: LNode) => {
    const w = moves?.get(n.v)
    const p = w !== undefined ? layout.byV.get(w) : undefined
    return p ?? n
  }

  // posición de la clave viajera (insert)
  let chipStyle: CSSProperties | null = null
  if (chip) {
    let x = rootX - CHIP_W / 2
    let y = Math.max(2, layout.padTop - CHIP_H - 10)
    const at = chip.at
    if (at !== 'top' && 'node' in at) {
      const n = layout.byV.get(at.node)
      if (n) {
        x = n.x + 14 - CHIP_W / 2
        y = n.y - 22
      }
    } else if (at !== 'top' && 'hole' in at) {
      const h = layout.holeById.get(at.hole)
      if (h) {
        x = h.x - CHIP_W / 2
        y = h.y + (GEO.NODE_H - CHIP_H) / 2
      }
    }
    chipStyle = { transform: `translate(${x}px, ${y}px)` }
  }

  // hueco vacío de una búsqueda fallida: una fila abajo, una columna hacia ese lado
  let stubEl: ReactNode = null
  let stageH = layout.height
  if (stub) {
    const p = layout.byV.get(stub.parent)
    if (p) {
      const half = STUB_W / 2
      const sx = Math.min(layout.width - half - 2, Math.max(half + 2, p.x + (stub.side === 'L' ? -1 : 1) * col))
      const sy = p.y + GEO.LEVEL_H + 8
      const y1 = p.y + GEO.NODE_H
      const ym = Math.round(y1 + (sy - y1) / 2)
      stageH = Math.max(stageH, sy + STUB_H + 10)
      stubEl = (
        <>
          <svg className="bst-stubline" width={layout.width} height={stageH} aria-hidden="true" focusable="false">
            <path d={`M${p.x} ${y1} V${ym} H${sx} V${sy}`} />
          </svg>
          <span
            className="bst-stub"
            style={{ transform: `translate(${sx - half}px, ${sy}px)` }}
            role="img"
            aria-label={`Hueco vacío a la ${stub.side === 'L' ? 'izquierda' : 'derecha'} del ${stub.parent}`}
          >
            null
          </span>
        </>
      )
    }
  }

  const renderNode = (n: LNode) => {
    const look = looks?.get(n.v) ?? {}
    const p = posOf(n)
    const style: CSSProperties = {
      transform: `translate(${p.x - GEO.NODE_W / 2}px, ${p.y}px)`,
      zIndex: moves?.has(n.v) ? 4 : look.gone ? 3 : undefined,
    }
    const digits = String(n.v).length
    const cls = cx(
      'bst-node',
      look.tone && `is-${look.tone}`,
      look.dim && 'is-dim',
      look.gone && 'is-gone',
      digits >= 4 && 'is-long',
    )
    const aria =
      `Carpeta ${n.v}, ${relation(n)}` +
      toneText(look.tone) +
      (look.order !== undefined ? `, número ${look.order}` : '') +
      (look.dim ? ', descartada' : '') +
      (look.note ? `, ${look.note}` : '')
    const inner = (
      <>
        <span className="bst-node__box">
          <span className="bst-node__tab" aria-hidden="true" />
          <span className="bst-node__val">{n.v}</span>
        </span>
        {look.order !== undefined && (
          <span key={`o${look.order}`} className="bst-node__ord" aria-hidden="true">
            {look.order}
          </span>
        )}
        {look.cmp && (
          <span
            className={cx('bst-node__cmp', look.cmp === '<' ? 'is-l' : look.cmp === '>' ? 'is-r' : 'is-eq')}
            aria-hidden="true"
          >
            {look.cmp}
          </span>
        )}
        {look.tag && (
          <span className="bst-node__tag" aria-hidden="true">
            {look.tag}
          </span>
        )}
        {look.ghost && (
          <span className="bst-node__ghost" aria-hidden="true">
            <Ghost color={look.ghost} size={22} float={look.ghost !== 'scared'} />
          </span>
        )}
        {look.pac && (
          <span className="bst-node__pac" aria-hidden="true">
            <PacMan size={30} dir="right" chomp />
          </span>
        )}
      </>
    )
    const setRef = (el: HTMLElement | null) => {
      if (!nodeRefs) return
      if (el) nodeRefs.current.set(n.v, el)
      else nodeRefs.current.delete(n.v)
    }
    if (onNode) {
      return (
        <button
          key={`n${n.v}`}
          ref={setRef}
          type="button"
          className={cls}
          style={style}
          aria-label={aria}
          disabled={!interactive || look.gone}
          onClick={(e) => onNode(n.v, e.currentTarget)}
        >
          {inner}
        </button>
      )
    }
    return (
      <div key={`n${n.v}`} ref={setRef} className={cls} style={style} role="img" aria-label={aria}>
        {inner}
      </div>
    )
  }

  const renderHole = (h: LHole) => {
    const look = holeLooks?.get(h.id)
    const style: CSSProperties = { transform: `translate(${h.x - GEO.NODE_W / 2}px, ${h.y}px)` }
    const aria =
      h.parent === null
        ? 'Hueco de la raíz (árbol vacío)'
        : `Hueco a la ${h.side === 'L' ? 'izquierda' : 'derecha'} del ${h.parent}`
    return (
      <button
        key={`h${h.id}`}
        ref={(el) => {
          if (!holeRefs) return
          if (el) holeRefs.current.set(h.id, el)
          else holeRefs.current.delete(h.id)
        }}
        type="button"
        className={cx('bst-hole', look && `is-${look}`)}
        style={style}
        aria-label={aria}
        disabled={!interactive || !onHole}
        onClick={(e) => onHole?.(h, e.currentTarget)}
      >
        <span className="bst-hole__pellet" aria-hidden="true" />
      </button>
    )
  }

  return (
    <div className="bst-board-wrap">
      <div className={cx('bst-scroller', needsScroll && 'is-scroll')} ref={scrollRef}>
        <div className="bst-sizer" style={{ width: layout.width * scale, height: stageH * scale }}>
          <div
            className="bst-stage"
            role="group"
            aria-label={label}
            style={{ width: layout.width, height: stageH, transform: `scale(${scale})` }}
          >
            <svg
              key={sig}
              className="bst-lines"
              width={layout.width}
              height={stageH}
              aria-hidden="true"
              focusable="false"
            >
              {edges.map((e) => (
                <path key={e.id} d={e.d} className={cx('bst-edge', e.hole && 'is-hole', litEdges?.has(e.id) && 'is-lit')} />
              ))}
            </svg>
            {stubEl}
            {layout.holes.map(renderHole)}
            {layout.nodes.map(renderNode)}
            {chip && chipStyle && (
              <div className={cx('bst-chip', String(chip.v).length >= 4 && 'is-long')} style={chipStyle} aria-hidden="true">
                <span className="bst-chip__tab" />
                <span className="bst-chip__val">{chip.v}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      {needsScroll && <p className="bst-scrollhint">Desliza el árbol a los lados</p>}
      {children}
    </div>
  )
}

/**
 * Tablero del tren de vagones (solo presentación): vagones [dato|sig] o [ant|dato|sig], tarjetas de
 * variables con flecha, flechas SVG (sig arriba, ant abajo), nodos sueltos debajo, fantasma que se come
 * los nodos perdidos y comecocos del recorrido. Si el tren no cabe, se desliza por dentro (scroll
 * horizontal del tablero, nunca de la página) y se acomoda solo para mostrar lo que cambió.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { Ghost, PacMan, PixelIcon, RichText } from '../../ui'
import { show, type Cfg, type LState } from './logic'
import { NULL_L, NULL_R, computeLayout, geometry, type Box, type Layout } from './layout'

export type SlotKey = string // id de nodo | NULL_L | NULL_R

export interface BoardProps {
  cfg: Cfg
  state: LState
  headNode: string | null
  /** nodos que se come el fantasma (paso que se va a deshacer) */
  eaten?: string[]
  /** puntero recién cambiado: 'n1.sig' | 'n1.ant' | 'var:p' */
  fresh?: string | null
  /** cambia en cada acción: reinicia destellos y el auto-desplazamiento */
  tick?: number
  /** el tren quedó armado */
  win?: boolean
  /** traverse: vagones y null son botones (se mantienen al bloquear: no se re-montan) */
  buttons?: boolean
  /** los botones están habilitados */
  interactive?: boolean
  onTap?: (key: SlotKey, el: HTMLElement) => void
  /** número de visita por nodo */
  visits?: Record<string, number>
  /** destino final del recorrido (marcado con FIN) */
  finalKey?: SlotKey | null
  pacAt?: SlotKey | null
  pacDir?: 'left' | 'right'
  flash?: { key: SlotKey; tone: 'bad' | 'ok' | 'warn'; n: number } | null
  /** qué mostrar si el tablero se desliza */
  focus?: SlotKey | null
}

const reducedMotion = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/** Ancho visible del contenedor (ResizeObserver; se limpia al desmontar). */
function useWidth(ref: RefObject<HTMLDivElement | null>): number {
  const [w, setW] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    let alive = true
    const read = () => {
      if (!alive) return
      const v = el.clientWidth
      setW((prev) => (Math.abs(prev - v) >= 1 ? v : prev))
    }
    read()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', read)
      return () => {
        alive = false
        window.removeEventListener('resize', read)
      }
    }
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => {
      alive = false
      ro.disconnect()
    }
  }, [ref])
  return w
}

function describe(cfg: Cfg, state: LState, L: Layout): string {
  const val = (id: string | null) => (id ? show(cfg.values[id]) : 'null')
  const startName = Object.prototype.hasOwnProperty.call(state.vars, cfg.head) ? cfg.head : 'el primer vagón'
  const main = L.mainIds.map(val)
  let s = `Lista desde ${startName}: ${main.length ? main.join(', ') : 'vacía'}`
  s += L.mainEnd === 'null' ? ', luego null.' : L.mainEnd === 'start' ? ', y el último regresa al primero.' : ', y forma un ciclo.'
  const loose = [...L.loose].map(val)
  if (loose.length) s += ` Fuera de la lista: ${loose.join(', ')}.`
  s += ' Variables: ' + state.order.map((v) => `${v} apunta a ${val(state.vars[v])}`).join('; ') + '.'
  return s
}

const LEGEND: Record<Cfg['kind'], string> = {
  simple: 'Tren de vagones: cada vagón sabe dónde está el **siguiente** (sig). El último apunta a **null**.',
  doble: 'Playlist: cada vagón conoce al **siguiente** (sig, arriba) y al **anterior** (ant, abajo).',
  circular: 'Lista circular: el **último** vagón se engancha con el **primero**. Nunca llegas a null.',
}

export function Board(p: BoardProps) {
  const { cfg, state, headNode, eaten = [], fresh = null, tick = 0, win = false, buttons = false, onTap } = p
  const interactive = buttons && !!p.interactive
  const visits = p.visits ?? {}
  const scrollRef = useRef<HTMLDivElement>(null)
  const width = useWidth(scrollRef)
  const geo = useMemo(() => geometry(cfg.hasAnt, cfg.ids.map((id) => cfg.values[id])), [cfg])
  const L = useMemo(
    () => computeLayout({ state, ids: cfg.ids, kind: cfg.kind, headNode, width: width || 320, geo }),
    [state, cfg, headNode, width, geo],
  )
  const boxFor = (k: SlotKey | null | undefined): Box | null =>
    !k ? null : k === NULL_L ? L.nullL : k === NULL_R ? L.nullR : (L.boxes[k] ?? null)

  // ── auto-desplazamiento: mostrar lo que cambió si el tren no cabe ──
  const focusBox = boxFor(p.focus)
  const fx = focusBox ? focusBox.x : -1
  const fw = focusBox ? focusBox.w : 0
  useEffect(() => {
    const el = scrollRef.current
    if (!el || fx < 0) return
    const vis = el.clientWidth
    if (L.W <= vis + 1) return
    const left = el.scrollLeft
    if (fx >= left + 8 && fx + fw <= left + vis - 8) return
    const target = Math.max(0, Math.min(L.W - vis, Math.round(fx + fw / 2 - vis / 2)))
    try {
      el.scrollTo({ left: target, behavior: reducedMotion() ? 'auto' : 'smooth' })
    } catch {
      el.scrollLeft = target
    }
  }, [fx, fw, tick, L.W])

  const eatenSet = new Set(eaten)
  const val = (id: string | null) => (id ? show(cfg.values[id]) : 'null')
  const winIdx = new Map(L.mainIds.map((id, i) => [id, i] as const))
  const freshVar = fresh && fresh.startsWith('var:') ? fresh.slice(4) : null
  const freshTag = freshVar ? (L.cards.find((c) => c.name === freshVar)?.target ?? null) : null

  const slotStyle = (b: Box): CSSProperties => ({ transform: `translate(${b.x}px, ${b.y}px)`, width: b.w, height: b.h })

  // ── vagones ──
  const nodes: ReactNode[] = cfg.ids.map((id) => {
    const b = L.boxes[id]
    const ptr = state.ptr[id]
    const loose = L.loose.has(id)
    const visit = visits[id]
    const isFinal = p.finalKey === id
    const cls = [
      'ls-node',
      cfg.hasAnt ? 'is-doble' : '',
      loose ? 'is-loose' : '',
      eatenSet.has(id) ? 'is-eaten' : '',
      visit ? 'is-visited' : '',
      p.pacAt === id ? 'is-current' : '',
      isFinal ? 'is-final' : '',
      win && winIdx.has(id) ? 'is-win' : '',
    ]
      .filter(Boolean)
      .join(' ')
    const style = win && winIdx.has(id) ? ({ '--ls-d': `${(winIdx.get(id) ?? 0) * 110}ms` } as CSSProperties) : undefined
    const inner = (
      <>
        {cfg.hasAnt && (
          <span className={'ls-ptr ls-ptr--ant' + (L.slashes.has(`${id}.ant`) ? ' is-null' : '')}>
            <i className="ls-dot" />
          </span>
        )}
        <span className="ls-data">{val(id)}</span>
        <span className={'ls-ptr ls-ptr--sig' + (L.slashes.has(`${id}.sig`) ? ' is-null' : '')}>
          <i className="ls-dot" />
        </span>
        {visit ? <span className="ls-badge">{visit}</span> : null}
        {isFinal ? <span className="ls-badge is-fin">FIN</span> : null}
      </>
    )
    const aria =
      `Vagón ${val(id)}. sig: ${val(ptr.sig)}` +
      (cfg.hasAnt ? `, ant: ${val(ptr.ant)}` : '') +
      (loose ? ', fuera de la lista' : '') +
      (visit ? `, visitado en el paso ${visit}` : '')
    return (
      <div key={id} className="ls-slot" style={slotStyle(b)}>
        {buttons ? (
          <button
            type="button"
            className={cls}
            style={style}
            aria-label={aria}
            disabled={!interactive}
            onClick={(e) => {
              if (interactive) onTap?.(id, e.currentTarget)
            }}
          >
            {inner}
          </button>
        ) : (
          <div className={cls} style={style}>
            {inner}
          </div>
        )}
      </div>
    )
  })

  const nullTile = (key: SlotKey, b: Box) => {
    const isFinal = p.finalKey === key
    const cls = ['ls-null', isFinal ? 'is-final' : '', p.pacAt === key ? 'is-current' : ''].filter(Boolean).join(' ')
    const aria = key === NULL_L ? 'null: antes del primer vagón' : 'null: después del último vagón'
    return (
      <div key={key} className="ls-slot" style={slotStyle(b)}>
        {buttons ? (
          <button
            type="button"
            className={cls}
            aria-label={aria}
            disabled={!interactive}
            onClick={(e) => {
              if (interactive) onTap?.(key, e.currentTarget)
            }}
          >
            null
            {isFinal ? <span className="ls-badge is-fin">FIN</span> : null}
          </button>
        ) : (
          <div className={cls}>
            null
            {isFinal ? <span className="ls-badge is-fin">FIN</span> : null}
          </div>
        )}
      </div>
    )
  }

  const pacBox = boxFor(p.pacAt)
  const flashBox = p.flash ? boxFor(p.flash.key) : null
  const mainBottom = L.mainIds.length || L.nullR ? (L.nullR ?? L.boxes[L.mainIds[0]]).y + geo.NH : null
  const scrolls = width > 0 && L.W > width + 2
  const cssVars = {
    width: L.W,
    height: L.H,
    '--ls-sy': `${geo.sigY}px`,
    '--ls-ay': `${geo.antY}px`,
    '--ls-pf': `${geo.PF}px`,
    '--ls-ch': `${geo.CARD_H}px`,
  } as CSSProperties

  return (
    <div className={'ls-board' + (scrolls ? ' is-scroll' : '')}>
      <div className="ls-scroll" ref={scrollRef} tabIndex={scrolls && !buttons ? 0 : undefined} aria-label={scrolls ? 'Tablero deslizable' : undefined}>
        <div
          className="ls-canvas"
          style={cssVars}
          role={buttons ? 'group' : 'img'}
          aria-label={describe(cfg, state, L)}
        >
          {mainBottom !== null && <div className="ls-rail" aria-hidden="true" style={{ top: mainBottom + 3, width: L.W }} />}
          {L.sideLabelY !== null && (
            <div className="ls-side" aria-hidden="true" style={{ top: L.sideLabelY, width: L.W }}>
              <span>FUERA DE LA LISTA</span>
            </div>
          )}
          {nodes}
          {L.nullL && nullTile(NULL_L, L.nullL)}
          {L.nullR && nullTile(NULL_R, L.nullR)}

          <svg className="ls-svg" width={L.W} height={L.H} aria-hidden="true" focusable="false">
            {L.arrows.map((a) => {
              const isFresh = a.key === fresh || (freshTag !== null && a.key === `tag:${freshTag}`)
              const cls = ['ls-ar', `is-${a.kind}`, a.kind === 'tag' ? `ls-c${a.color}` : '', isFresh ? 'is-fresh' : ''].filter(Boolean).join(' ')
              return (
                <g key={`${a.key}|${a.d}`} className={cls}>
                  <path d={a.d} pathLength={1} />
                  <polygon points={a.head} />
                </g>
              )
            })}
          </svg>

          {L.cards.map((c) => (
            <div
              key={c.name}
              className="ls-cardpos"
              style={{ transform: `translate(${c.x}px, ${c.y}px)`, width: c.w }}
              aria-hidden="true"
            >
              <span key={freshVar === c.name ? `f${tick}` : 'n'} className={`ls-card ls-c${c.color}${freshVar === c.name ? ' is-fresh' : ''}`}>
                {c.name}
              </span>
            </div>
          ))}

          {eaten.map((id) => {
            const b = L.boxes[id]
            if (!b) return null
            return (
              <div key={`g${id}`} className="ls-ghostpos" aria-hidden="true" style={{ transform: `translate(${b.x + b.w / 2 - 17}px, ${b.y - 6}px)` }}>
                <span className="ls-ghost-in">
                  <Ghost color="red" size={34} float />
                </span>
              </div>
            )
          })}

          {pacBox && (
            <div className="ls-pacpos" aria-hidden="true" style={{ transform: `translate(${pacBox.x + pacBox.w / 2 - 13}px, ${pacBox.y + pacBox.h + 1}px)` }}>
              <PacMan size={26} dir={p.pacDir ?? 'right'} chomp />
            </div>
          )}

          {p.flash && flashBox && (
            <div
              key={p.flash.n}
              className={`ls-flash is-${p.flash.tone}`}
              aria-hidden="true"
              style={{ transform: `translate(${flashBox.x - 4}px, ${flashBox.y - 4}px)`, width: flashBox.w + 8, height: flashBox.h + 8 }}
            />
          )}
        </div>
      </div>
      {scrolls && (
        <p className="ls-swipe" aria-hidden="true">
          <PixelIcon name="arrow-left" size={14} /> DESLIZA EL TREN <PixelIcon name="arrow-right" size={14} />
        </p>
      )}
      <div className="ls-legend">
        <span className="ls-lg-node" aria-hidden="true">
          {cfg.hasAnt && <span className="ls-lg-f">ant</span>}
          <span className="ls-lg-d">dato</span>
          <span className="ls-lg-f">sig</span>
        </span>
        <span className="ls-lg-item">
          <i className="ls-lg-arrow" aria-hidden="true" /> sig
        </span>
        {cfg.hasAnt && (
          <span className="ls-lg-item">
            <i className="ls-lg-arrow is-ant" aria-hidden="true" /> ant
          </span>
        )}
        <span className="ls-lg-item">
          <i className="ls-lg-null" aria-hidden="true" /> = null
        </span>
        <p className="ls-lg-text">
          <RichText text={LEGEND[cfg.kind]} />
        </p>
      </div>
    </div>
  )
}

export default Board

/**
 * Mapa pixel de carreteras: ciudades tocables (vértices), carreteras con pellets (aristas),
 * flechas si es dirigido, km opcionales y el comecocos que recorre las carreteras.
 * Se mide con ResizeObserver: todo se dibuja en pixeles reales (nítido a 360 px y en escritorio).
 */
import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Fruit, Ghost, PacMan, PixelIcon } from '../../ui'
import type { Cfg, GEdge, GNode } from './logic'
import { arrowHead, facing, midpoint, offsetSegment, pellets, project, type MapBox, type Pt } from './geom'
import { SEG_MS, cx, prefersReduced } from './kit'

export interface NodeView {
  /** clases de estado: is-visited, is-queued, is-current, is-sol, is-unreach, is-focus… */
  cls?: string
  badge?: string | number | null
  badgeCls?: string
  /** color de borde (BFS: capa) */
  ring?: string
  here?: boolean
  /** cambia → se repite la onda */
  ripple?: number | null
  aria: string
  pressed?: boolean
  /** etiqueta extra pequeña (matriz dirigida: DE / A) */
  mark?: string
}
export interface EdgeView {
  /** eaten = recorrida (pellets comidos) · sol = respuesta · old = recorrida pero ya no cuenta (atenuada) */
  state: 'eaten' | 'sol' | 'old'
  /** ciudad desde donde se comen los pellets */
  from?: string
  /** ms de espera antes de empezar a comer (sincronía con el comecocos) */
  delay?: number
}
export interface Walk { seq: number; route: string[] }

interface Props {
  cfg: Cfg
  nodeView: (n: GNode) => NodeView
  edgeView: (e: GEdge) => EdgeView | null
  /** sin onTap las ciudades no son botones (matriz) */
  onTap?: (id: string, el: HTMLElement) => void
  disabled: boolean
  walk: Walk | null
  ghost: { id: string; k: number } | null
  bad: boolean
  solved: boolean
  /** chips de la cabecera del mapa */
  chips?: ReactNode
  /** texto bajo el mapa (analogía) */
  footer?: ReactNode
}

const DEFAULT_SIZE = { w: 320, h: 270 }

export function MapView({ cfg, nodeView, edgeView, onTap, disabled, walk, ghost, bad, solved, chips, footer }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState(DEFAULT_SIZE)

  useLayoutEffect(() => {
    const el = mapRef.current
    if (!el) return
    const update = () => {
      const w = Math.round(el.clientWidth)
      const h = Math.round(el.clientHeight)
      if (w > 0 && h > 0) setSize((s) => (s.w === w && s.h === h ? s : { w, h }))
    }
    update()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const hasNames = cfg.nodes.some((n) => n.label !== n.code)
  const showLabels = hasNames && size.w >= 440
  const box: MapBox = { w: size.w, h: size.h, padX: 34, padTop: 38, padBottom: showLabels ? 58 : 34 }

  const pos = new Map<string, Pt>(cfg.nodes.map((n) => [n.id, project(n.x, n.y, box)]))
  const posRef = useRef(pos)
  posRef.current = pos

  // ── el comecocos recorre la ruta (solo cuando cambia walk.seq) ──
  const walkerRef = useRef<HTMLDivElement>(null)
  const [walking, setWalking] = useState(false)
  useLayoutEffect(() => {
    const el = walkerRef.current
    if (!walk || !el || walk.route.length < 2 || prefersReduced() || typeof el.animate !== 'function') {
      setWalking(false)
      return
    }
    const pts = walk.route.map((id) => posRef.current.get(id)).filter((p): p is Pt => !!p)
    if (pts.length < 2) return
    const segs = pts.length - 1
    const frames: Keyframe[] = []
    for (let i = 0; i < segs; i++) {
      const a = pts[i]
      const b = pts[i + 1]
      const f = `translate(-50%, -50%) ${facing(a, b)}`
      frames.push({ offset: i / segs, left: `${a.x}px`, top: `${a.y}px`, transform: f, opacity: 1, easing: 'steps(5, end)' })
      frames.push({ offset: (i + 1) / segs, left: `${b.x}px`, top: `${b.y}px`, transform: f, opacity: 1 })
    }
    let anim: Animation | null = null
    try {
      anim = el.animate(frames, { duration: segs * SEG_MS, fill: 'none' })
    } catch {
      setWalking(false)
      return
    }
    setWalking(true)
    anim.onfinish = () => setWalking(false)
    // respaldo: si la pestaña no pinta cuadros, el comecocos igual "llega" a su ciudad
    const fallback = window.setTimeout(() => {
      anim?.cancel()
      setWalking(false)
    }, segs * SEG_MS + 400)
    return () => {
      window.clearTimeout(fallback)
      if (anim) {
        anim.onfinish = null
        anim.cancel()
      }
    }
  }, [walk])

  const reverseOf = useMemo(() => {
    if (!cfg.directed) return new Set<string>()
    const keys = new Set(cfg.edges.map((e) => `${e.a}\u0001${e.b}`))
    return new Set(cfg.edges.filter((e) => keys.has(`${e.b}\u0001${e.a}`)).map((e) => e.key))
  }, [cfg.edges, cfg.directed])

  const roads = cfg.edges.map((e) => {
    const pa = pos.get(e.a) as Pt
    const pb = pos.get(e.b) as Pt
    const twin = reverseOf.has(e.key)
    const [a, b] = twin ? offsetSegment(pa, pb, 7) : [pa, pb]
    // km de ida y de vuelta: cada etiqueta de su lado para que no se encimen
    const label = twin ? midpoint(...offsetSegment(pa, pb, 22)) : midpoint(a, b)
    return { e, a, b, label, ev: edgeView(e) }
  })

  return (
    <section className={cx('px-panel gs-mappanel', bad && 'is-bad anim-shake', solved && 'is-solved')} aria-label="Mapa de carreteras">
      <div className="gs-maphead">
        <span className="gs-h gs-ico-t">
          <PixelIcon name="map" size={16} /> MAPA
        </span>
        {chips}
      </div>
      <div ref={mapRef} className="gs-map">
        <svg className="gs-roads" width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`} aria-hidden="true" focusable="false">
          {roads.map(({ e, a, b, ev }) => {
            const pel = pellets(a, b, 14, 27)
            const fromB = ev?.from === e.b
            return (
              <g key={e.key} className={cx('gs-road', ev && `is-${ev.state}`)}>
                <line className="gs-road-wall" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
                <line className="gs-road-in" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
                {pel.map((p, k) => {
                  const kk = fromB ? pel.length - 1 - k : k
                  const delay = (ev?.delay ?? 0) + Math.round((kk / Math.max(1, pel.length)) * SEG_MS)
                  return (
                    <rect
                      key={k}
                      className="gs-pel"
                      x={p.x - 2}
                      y={p.y - 2}
                      width={4}
                      height={4}
                      style={ev?.state === 'eaten' || ev?.state === 'old' ? { animationDelay: `${delay}ms` } : undefined}
                    />
                  )
                })}
                {cfg.directed && <polygon className="gs-arrow" points={arrowHead(a, b, 27, 13)} />}
              </g>
            )
          })}
        </svg>

        {cfg.showWeights &&
          roads.map(({ e, label, ev }) =>
            e.w === null ? null : (
              <span
                key={`w${e.key}`}
                className={cx('gs-w', ev && `is-${ev.state}`)}
                style={{ left: label.x, top: label.y }}
                aria-hidden="true"
              >
                {e.w}
              </span>
            ),
          )}

        {cfg.nodes.map((n) => {
          const p = pos.get(n.id) as Pt
          const v = nodeView(n)
          const isStart = cfg.mode !== 'matrix' && n.id === cfg.start
          const isGoal = n.id === cfg.goal
          const style = { left: p.x, top: p.y, ...(v.ring ? { '--gs-ring': v.ring } : null) } as CSSProperties
          const inner = (
            <>
              <span className="gs-code">{n.code}</span>
              {v.badge !== undefined && v.badge !== null && v.badge !== '' && (
                <span className={cx('gs-badge', v.badgeCls)} aria-hidden="true">
                  {v.badge}
                </span>
              )}
              {v.mark && (
                <span className="gs-mark" aria-hidden="true">
                  {v.mark}
                </span>
              )}
              {isStart && (
                <span className="gs-tag" aria-hidden="true">
                  <PixelIcon name="flag" size={18} />
                </span>
              )}
              {isGoal && (
                <span className="gs-tag" aria-hidden="true">
                  <Fruit kind="apple" size={20} />
                </span>
              )}
              {v.here && !walking && (
                <span className="gs-here" aria-hidden="true">
                  <PacMan size={20} chomp />
                </span>
              )}
              {v.ripple != null && <span key={`r${v.ripple}`} className="gs-ripple" aria-hidden="true" />}
              {ghost && ghost.id === n.id && (
                <span key={`g${ghost.k}`} className="gs-ghost" aria-hidden="true">
                  <Ghost color="red" size={30} float />
                </span>
              )}
            </>
          )
          const cls = cx('gs-node', v.cls, ghost && ghost.id === n.id && 'is-wrong')
          return (
            <div key={n.id} className="gs-city" style={style}>
              {onTap ? (
                <button
                  type="button"
                  className={cls}
                  disabled={disabled}
                  aria-label={v.aria}
                  aria-pressed={v.pressed}
                  title={n.label}
                  onClick={(ev) => onTap(n.id, ev.currentTarget)}
                >
                  {inner}
                </button>
              ) : (
                <div className={cls} role="img" aria-label={v.aria} title={n.label}>
                  {inner}
                </div>
              )}
              {showLabels && n.label !== n.code && (
                <span className="gs-label" aria-hidden="true">
                  {n.label}
                </span>
              )}
            </div>
          )
        })}

        <div ref={walkerRef} className="gs-walker" aria-hidden="true">
          <PacMan size={26} chomp />
        </div>
      </div>

      {!showLabels && hasNames && (
        <p className="gs-names">
          {cfg.nodes.map((n) => (
            <span key={n.id} className="gs-name">
              <b>{n.code}</b> {n.label}
            </span>
          ))}
        </p>
      )}
      {footer}
    </section>
  )
}

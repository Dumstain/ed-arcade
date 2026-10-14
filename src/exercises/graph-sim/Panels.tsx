/**
 * Paneles laterales de graph-sim (solo presentación):
 *  - AdjPanel   lista de adyacencia (vecinos en el orden que decide los empates)
 *  - QueuePanel COLA de BFS como fila horizontal (frente a la izquierda, la fila del día 3)
 *  - StackPanel PILA de llamadas de DFS como platos (tope arriba, la del día 2)
 *  - MatrixTable tabla n×n tocable (o de solo lectura para la solución)
 */
import type { CSSProperties } from 'react'
import { PacMan, PixelIcon } from '../../ui'
import { edgeKey, type Cfg } from './logic'
import { cx } from './kit'

const codeOf = (cfg: Cfg, id: string) => cfg.byId.get(id)?.code ?? id

// ───────────────────────── lista de adyacencia ─────────────────────────
export function AdjPanel({
  cfg,
  current,
  visited,
  queued,
  marks,
}: {
  cfg: Cfg
  current: string | null
  visited: Set<string>
  queued?: Set<string>
  /** marcar visitados / fila actual (ayudas con showStructure) */
  marks: boolean
}) {
  const weights = new Map(cfg.edges.map((e) => [e.key, e.w]))
  return (
    <section className="px-panel gs-side gs-adj" aria-label="Lista de adyacencia">
      <h3 className="gs-h gs-ico-t">
        <PixelIcon name="clipboard" size={16} /> LISTA DE ADYACENCIA
      </h3>
      <p className="gs-cap">
        {cfg.sortNeighbors ? 'Vecinos en orden alfabético.' : 'Vecinos en el orden de la lista.'}
        {cfg.directed ? ' Solo carreteras de salida.' : ''}
      </p>
      <ul className="gs-adj-list">
        {cfg.nodes.map((n) => {
          const list = cfg.adj.get(n.id) ?? []
          const isCur = marks && current === n.id
          return (
            <li
              key={n.id}
              className={cx('gs-adj-row', isCur && 'is-current')}
              aria-label={`${n.label}: ${list.length ? list.map((u) => cfg.byId.get(u)?.label ?? u).join(', ') : 'sin vecinos'}`}
            >
              <span className={cx('gs-adj-src', marks && visited.has(n.id) && 'is-visited')}>{n.code}</span>
              <i className="gs-arrow-r" aria-hidden="true" />
              <span className="gs-adj-ns" aria-hidden="true">
                {list.length === 0 && <span className="gs-adj-none">ninguno</span>}
                {list.map((u) => {
                  const w = cfg.showWeights ? weights.get(edgeKey(n.id, u, cfg.directed)) : null
                  return (
                    <span
                      key={u}
                      className={cx('gs-adj-n', marks && visited.has(u) && 'is-visited', marks && queued?.has(u) && !visited.has(u) && 'is-queued')}
                    >
                      {codeOf(cfg, u)}
                      {w !== null && w !== undefined && <small>{w}</small>}
                    </span>
                  )
                })}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// ───────────────────────── cola (BFS) ─────────────────────────
export function QueuePanel({
  cfg,
  queue,
  leaving,
  colorOf,
}: {
  cfg: Cfg
  queue: string[]
  leaving: { id: string; k: number } | null
  colorOf: (id: string) => string
}) {
  return (
    <section className="px-panel gs-side gs-queue" aria-label="Cola de BFS">
      <h3 className="gs-h gs-ico-t">
        <PixelIcon name="queue" size={16} /> COLA · FIFO
      </h3>
      <div className="gs-q-row" role="list" aria-label={queue.length ? `Cola, del frente al final: ${queue.map((id) => codeOf(cfg, id)).join(', ')}` : 'Cola vacía'}>
        {leaving && (
          <span key={`out${leaving.k}`} className="gs-q-out" aria-hidden="true">
            <span className="gs-q-chip">{codeOf(cfg, leaving.id)}</span>
            <span className="gs-q-eater">
              <PacMan size={24} dir="left" chomp />
            </span>
          </span>
        )}
        {queue.length === 0 && <span className="gs-q-empty">COLA VACÍA</span>}
        {queue.map((id, i) => (
          <span key={id} className={cx('gs-q-cell', i === 0 && 'is-front')} role="listitem">
            <span className="gs-q-chip" style={{ '--gs-ring': colorOf(id) } as CSSProperties}>
              {codeOf(cfg, id)}
            </span>
            <span className="gs-q-ptr" aria-hidden="true">
              {i === 0 && <span>frente</span>}
              {i === queue.length - 1 && <span>final</span>}
            </span>
          </span>
        ))}
      </div>
      <p className="gs-cap">
        Sale el del <b className="hl">frente</b>; sus vecinos nuevos se forman al <b className="hl">final</b>.
      </p>
    </section>
  )
}

// ───────────────────────── pila de llamadas (DFS) ─────────────────────────
export function StackPanel({
  cfg,
  stack,
  returned,
}: {
  cfg: Cfg
  /** fondo → tope */
  stack: string[]
  returned: { ids: string[]; k: number } | null
}) {
  const rows = [...stack].reverse()
  return (
    <section className="px-panel gs-side gs-stack" aria-label="Pila de llamadas de DFS">
      <h3 className="gs-h gs-ico-t">
        <PixelIcon name="plates" size={16} /> PILA DE LLAMADAS
      </h3>
      {returned && returned.ids.length > 0 && (
        <div key={`ret${returned.k}`} className="gs-st-ret" aria-label={`Regresaron: ${returned.ids.map((id) => codeOf(cfg, id)).join(', ')}`}>
          <span className="gs-st-ret-t">RETURN</span>
          {returned.ids.map((id, i) => (
            <span key={`${id}${i}`} className="gs-st-ret-chip" style={{ '--i': i } as CSSProperties}>
              dfs({codeOf(cfg, id)})
            </span>
          ))}
        </div>
      )}
      <div className="gs-st" role="list" aria-label={stack.length ? `Pila, del tope al fondo: ${rows.map((id) => `dfs(${codeOf(cfg, id)})`).join(', ')}` : 'Pila vacía'}>
        {rows.length === 0 && <span className="gs-st-empty">PILA VACÍA</span>}
        {rows.map((id, i) => (
          <div key={`${id}-${stack.length - 1 - i}`} className={cx('gs-frame', i === 0 && 'is-top')} role="listitem">
            <span>dfs({codeOf(cfg, id)})</span>
            {i === 0 && <span className="gs-frame-top">TOPE</span>}
          </div>
        ))}
        <div className="gs-st-floor" aria-hidden="true" />
      </div>
      <p className="gs-cap">
        Cada visita es una <b className="hl">llamada</b>; sin vecinos nuevos, la llamada <b className="hl">regresa</b>.
      </p>
    </section>
  )
}

// ───────────────────────── matriz ─────────────────────────
export function MatrixTable({
  cfg,
  values,
  onToggle,
  disabled,
  wrongRows,
  focus,
  compareTo,
  caption,
}: {
  cfg: Cfg
  values: number[][]
  onToggle?: (i: number, j: number, el: HTMLElement) => void
  disabled?: boolean
  /** filas con algún error en la última revisión (se marca la fila, no la casilla) */
  wrongRows?: Set<number>
  focus?: [number, number] | null
  /** solo lectura (solución): matriz del alumno para marcar las casillas que tenía distintas */
  compareTo?: number[][]
  caption: string
}) {
  const n = cfg.nodes.length
  return (
    <div className="gs-mx-scroll">
      <table className={cx('gs-mx', n > 5 && 'is-big')}>
        <caption className="gs-sr">{caption}</caption>
        <thead>
          <tr>
            <th className="gs-mx-corner" scope="col">
              {cfg.directed ? (
                <span className="gs-mx-dir" aria-label="fila = desde, columna = hacia">
                  DE<i className="gs-arrow-r" aria-hidden="true" />A
                </span>
              ) : (
                <span className="gs-sr">ciudades</span>
              )}
            </th>
            {cfg.nodes.map((c, j) => (
              <th key={c.id} scope="col" className={cx('gs-mx-h', focus && focus[1] === j && 'is-focus')} title={c.label}>
                {c.code}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cfg.nodes.map((r, i) => (
            <tr key={r.id} className={cx(wrongRows?.has(i) && 'is-badrow')}>
              <th
                scope="row"
                className={cx('gs-mx-h gs-mx-rh', focus && focus[0] === i && 'is-focus', wrongRows?.has(i) && 'is-wrong')}
                title={r.label}
              >
                {r.code}
              </th>
              {cfg.nodes.map((c, j) => {
                const v = values[i]?.[j] ?? 0
                const diff = compareTo ? (compareTo[i]?.[j] ?? 0) !== v : false
                const cls = cx(
                  'gs-mx-cell',
                  v === 1 && 'is-on',
                  i === j && 'is-diag',
                  focus && focus[0] === i && focus[1] === j && 'is-focus',
                  diff && 'is-diff',
                )
                const label = `${r.label} ${cfg.directed ? 'hacia' : 'con'} ${c.label}: ${v}${wrongRows?.has(i) ? ', fila con error' : ''}${diff ? ', tú tenías otra' : ''}`
                return (
                  <td key={c.id}>
                    {onToggle ? (
                      <button
                        type="button"
                        className={cls}
                        disabled={disabled}
                        aria-label={label}
                        aria-pressed={v === 1}
                        onClick={(e) => onToggle(i, j, e.currentTarget)}
                      >
                        {v}
                      </button>
                    ) : (
                      <span className={cls} aria-label={label} role="img">
                        {v}
                      </span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

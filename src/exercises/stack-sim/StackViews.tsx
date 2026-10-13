/**
 * Tres vistas de la misma pila (solo presentación, sin estado propio):
 *  - plates: platos pixel apilados, etiqueta "TOPE", caen al apilar y se los come el comecocos al sacar
 *  - array : celdas fijas (capacity) con índices 0..n-1 y flecha "tope"; el pop NO borra el dato (se atenúa)
 *  - nodes : tope → [dato|sig] → … → null (como la clase Nodo {dato, sig})
 */
import type { CSSProperties } from 'react'
import { PacMan } from '../../ui'
import type { Item, View } from './logic'
import './stack-sim.css'

export interface Leaving { key: number; item: Item; slot: number }

export interface StackVisualProps {
  view: View
  cells: (Item | null)[]
  size: number
  capacity: number
  leaving?: Leaving[]
  /** 'overflow' = destello rojo; 'ok' = borde verde (resuelto) */
  flash?: 'overflow' | 'ok' | null
  /** pila vacía en un modo de solo lectura: el escenario ocupa menos alto */
  compact?: boolean
}

const PLATE_H = 46
const PLATE_COLORS = ['var(--ghost-cyan)', 'var(--ghost-pink)', 'var(--ghost-orange)', 'var(--ghost-red)']

function describe(view: View, active: Item[]): string {
  const what = view === 'plates' ? 'Pila de platos' : view === 'array' ? 'Pila con arreglo' : 'Pila con nodos'
  if (active.length === 0) return `${what}: vacía.`
  return `${what}, del fondo al tope: ${active.map((i) => String(i.v)).join(', ')}. Tope: ${String(active[active.length - 1].v)}.`
}

export function StackVisual({ view, cells, size, capacity, leaving = [], flash = null, compact = false }: StackVisualProps) {
  const active = cells.slice(0, size).filter((c): c is Item => c !== null)
  const cls = 'stk-visual' + (flash ? ` is-${flash}` : '')
  return (
    <div className={cls} role="img" aria-label={describe(view, active)}>
      {view === 'plates' && <Plates active={active} leaving={leaving} compact={compact} />}
      {view === 'array' && <ArrayStack cells={cells} size={size} capacity={capacity} />}
      {view === 'nodes' && <Nodes active={active} leaving={leaving} />}
    </div>
  )
}

// ───────────────────────── Platos ─────────────────────────
function Plates({ active, leaving, compact }: { active: Item[]; leaving: Leaving[]; compact: boolean }) {
  const slots = Math.max(compact ? 2 : 4, active.length + 1)
  const top = active.length - 1
  return (
    <div className="stk-plates" style={{ height: slots * PLATE_H + 14 }}>
      <div className="stk-floor" aria-hidden="true" />
      {active.length === 0 && <div className="stk-empty" aria-hidden="true">PILA VACÍA</div>}
      {active.map((it, i) => (
        <div
          key={it.id}
          className={'stk-plate' + (i === top ? ' is-top' : '')}
          style={{ bottom: 6 + i * PLATE_H, '--plate-c': PLATE_COLORS[i % PLATE_COLORS.length] } as CSSProperties}
          title={String(it.v)}
        >
          <span className="stk-plate-v">{String(it.v)}</span>
        </div>
      ))}
      {top >= 0 && (
        <div className="stk-tag" style={{ bottom: 6 + top * PLATE_H + 8 }} aria-hidden="true">
          <i className="stk-tri-left" />
          <span>TOPE</span>
        </div>
      )}
      {leaving.map((l) => (
        <div key={`l${l.key}`} aria-hidden="true">
          <div
            className="stk-plate is-leaving"
            style={{ bottom: 6 + l.slot * PLATE_H, '--plate-c': PLATE_COLORS[l.slot % PLATE_COLORS.length] } as CSSProperties}
          >
            <span className="stk-plate-v">{String(l.item.v)}</span>
          </div>
          <div className="stk-eater" style={{ bottom: 6 + l.slot * PLATE_H + 2 }}>
            <PacMan size={34} dir="left" chomp />
          </div>
        </div>
      ))}
    </div>
  )
}

// ───────────────────────── Arreglo ─────────────────────────
function ArrayStack({ cells, size, capacity }: { cells: (Item | null)[]; size: number; capacity: number }) {
  const top = size - 1
  const small = capacity > 6
  return (
    <div className={'stk-array' + (small ? ' is-small' : '')}>
      {Array.from({ length: capacity }, (_, i) => {
        const it = cells[i] ?? null
        const live = i < size && it !== null
        const stale = i >= size && it !== null
        const cellCls =
          'px-cell stk-acell ' + (live ? (i === top ? 'is-hl is-live' : 'is-live') : stale ? 'is-dim is-stale' : 'is-empty')
        return (
          <div className="stk-acol" key={i}>
            <div key={it ? it.id : 'e'} className={cellCls} title={stale ? 'Dato viejo: sigue en memoria pero ya no cuenta' : undefined}>
              {it ? String(it.v) : ''}
            </div>
            <div className="stk-aidx">{i}</div>
            <div className="stk-aptr" aria-hidden="true">
              {i === top && (
                <>
                  <i className="stk-tri-up" />
                  <span>tope</span>
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ───────────────────────── Nodos ─────────────────────────
function Nodes({ active, leaving }: { active: Item[]; leaving: Leaving[] }) {
  const list = [...active].reverse() // el tope va primero
  return (
    <div className="stk-nodes">
      <div className="stk-chain">
        <div className="stk-ptr">tope</div>
        {list.map((it, i) => (
          <span className="stk-link" key={it.id}>
            <i className="stk-arrow" aria-hidden="true" />
            <span className={'stk-node' + (i === 0 ? ' is-top' : '')}>
              <span className="stk-node-d">{String(it.v)}</span>
              <span className="stk-node-n"><i className="stk-dot" /></span>
            </span>
          </span>
        ))}
        <span className="stk-link">
          <i className="stk-arrow" aria-hidden="true" />
          <span className="stk-null">null</span>
        </span>
      </div>
      {leaving.map((l) => (
        <div key={`l${l.key}`} aria-hidden="true">
          <span className="stk-node is-leaving">
            <span className="stk-node-d">{String(l.item.v)}</span>
            <span className="stk-node-n"><i className="stk-dot" /></span>
          </span>
          <span className="stk-eater is-node">
            <PacMan size={34} dir="left" chomp />
          </span>
        </div>
      ))}
    </div>
  )
}

export default StackVisual

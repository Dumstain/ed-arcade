/**
 * Dibujo de la tabla hash como casilleros de paquetería.
 *  - 'chaining': columna de casilleros; cada uno tiene una fila de vagones [clave | •] colgando (envuelve de línea).
 *  - 'linear'  : rejilla de casilleros numerados; cada uno guarda a lo más un paquete.
 * No sabe nada del juego: recibe la tabla, callbacks y "decoraciones" por casillero / por clave.
 * Los elementos tocables son SIEMPRE <button> (con `disabled` cuando no se puede tocar) para que no se
 * vuelvan a montar (y repitan animaciones) al terminar el ejercicio.
 */
import type { CSSProperties } from 'react'
import { Ghost, PacMan, PixelIcon, plainText } from '../../ui'
import { keyStr } from './logic'
import type { Strategy, Table as TableData } from './logic'

export interface NodeDeco {
  /** número de comparación (búsqueda) */
  order?: number
  eaten?: boolean
  found?: boolean
  /** el comecocos se la está comiendo */
  pac?: boolean
  wrong?: boolean
  /** recién acomodada (cae con animación) */
  placed?: boolean
  /** se acomoda sola al abrir el ejercicio */
  intro?: boolean
  /** parte de la respuesta */
  solution?: boolean
  delay?: number
}

export interface BucketDeco {
  wrong?: boolean
  /** casillero h(k) resaltado */
  home?: boolean
  collision?: boolean
  /** la prueba lineal pasa por aquí */
  probing?: boolean
  solution?: boolean
  delay?: number
}

export interface TableProps {
  strategy: Strategy
  table: TableData
  /** apaga toda la interacción (los botones siguen siendo botones) */
  disabled: boolean
  /** tocar un casillero (insert) · en search: casillero (encadenamiento) o casillero vacío (lineal) */
  onBucket?: (b: number) => void
  /** tocar una clave (search) */
  onKey?: (b: number, pos: number) => void
  nodeDeco: (b: number, pos: number) => NodeDeco | undefined
  bucketDeco: (b: number) => BucketDeco | undefined
  /** hay claves largas (palabras): celdas más anchas */
  wide: boolean
}

const cls = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')
const delayStyle = (ms?: number): CSSProperties | undefined => (ms ? ({ '--d': `${ms}ms` } as CSSProperties) : undefined)
/** casillero lineal: --d = retraso de la prueba (borde) · --dk = retraso de la caída del paquete */
function slotStyle(probeMs?: number, dropMs?: number): CSSProperties | undefined {
  if (!probeMs && !dropMs) return undefined
  const s: Record<string, string> = {}
  if (probeMs) s['--d'] = `${probeMs}ms`
  if (dropMs) s['--dk'] = `${dropMs}ms`
  return s as CSSProperties
}

function lockerLabel(b: number, cell: string[], strategy: Strategy): string {
  if (cell.length === 0) return `Casillero ${b}, vacío`
  return strategy === 'chaining'
    ? `Casillero ${b}, fila de paquetes: ${cell.join(', ')}`
    : `Casillero ${b}, ocupado por ${cell[0]}`
}

// ───────────────────────── Encadenamiento ─────────────────────────
function ChainRows(p: TableProps) {
  const canBucket = !p.disabled && !!p.onBucket
  return (
    <div className="hsh-rows" role="group" aria-label="Tabla hash: casilleros con fila de paquetes">
      {p.table.map((chain, b) => {
        const bd = p.bucketDeco(b)
        const texts = chain.map((k) => plainText(keyStr(k)))
        return (
          <div
            key={b}
            className={cls('hsh-row', bd?.wrong && 'is-wrong', bd?.home && 'is-home', bd?.collision && 'is-collision', bd?.solution && 'is-solution')}
          >
            <button
              type="button"
              className="hsh-lock"
              data-hsh-b={b}
              disabled={!canBucket}
              onClick={() => p.onBucket?.(b)}
              aria-label={lockerLabel(b, texts, 'chaining')}
            >
              <span className="hsh-lock-num">{b}</span>
              {bd?.wrong && <Ghost color="red" size={24} className="hsh-lock-ghost" />}
              {!bd?.wrong && bd?.collision && <Ghost color="orange" size={24} className="hsh-lock-ghost" />}
            </button>
            <div
              className="hsh-chain"
              onClick={canBucket && !p.onKey ? () => p.onBucket?.(b) : undefined}
            >
              {chain.length === 0 ? (
                <span className="hsh-nil">vacío</span>
              ) : (
                chain.map((k, pos) => {
                  const d = p.nodeDeco(b, pos)
                  const last = pos === chain.length - 1
                  const label =
                    `Paquete ${texts[pos]}, casillero ${b}, lugar ${pos + 1} de ${chain.length}` +
                    (d?.order ? `, comparación ${d.order}` : '') +
                    (d?.found ? ', encontrado' : '')
                  const inner = (
                    <>
                      <span className="hsh-node-key">{keyStr(k)}</span>
                      <span className={cls('hsh-node-sig', last && 'is-null')} aria-hidden="true" />
                      {d?.order !== undefined && (
                        <span className="hsh-order" aria-hidden="true">
                          {d.order}
                        </span>
                      )}
                    </>
                  )
                  const c = cls(
                    'hsh-node',
                    p.onKey && 'is-tap',
                    d?.eaten && 'is-eaten',
                    d?.found && 'is-found',
                    d?.wrong && 'is-wrong',
                    d?.placed && 'is-placed',
                    d?.intro && 'is-intro',
                    d?.solution && 'is-solution',
                  )
                  return (
                    <span className="hsh-unit" key={pos}>
                      <span className="hsh-link" aria-hidden="true">
                        {d?.pac ? <PacMan size={22} chomp className="hsh-pac" /> : <PixelIcon name="arrow-right" size={14} />}
                      </span>
                      {p.onKey ? (
                        <button
                          type="button"
                          className={c}
                          style={delayStyle(d?.delay)}
                          data-hsh-n={`${b}:${pos}`}
                          disabled={p.disabled}
                          onClick={() => p.onKey?.(b, pos)}
                          aria-label={label}
                        >
                          {inner}
                        </button>
                      ) : (
                        <span className={c} style={delayStyle(d?.delay)} data-hsh-n={`${b}:${pos}`} role="img" aria-label={label}>
                          {inner}
                        </span>
                      )}
                    </span>
                  )
                })
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ───────────────────────── Prueba lineal ─────────────────────────
function SlotGrid(p: TableProps) {
  const style = { '--hsh-slot-min': p.wide ? '80px' : '58px' } as CSSProperties
  return (
    <div className="hsh-slots" style={style} role="group" aria-label="Tabla hash: casilleros numerados">
      {p.table.map((cell, b) => {
        const bd = p.bucketDeco(b)
        const occupied = cell.length > 0
        const d = occupied ? p.nodeDeco(b, 0) : undefined
        const handler = occupied && p.onKey ? () => p.onKey?.(b, 0) : p.onBucket ? () => p.onBucket?.(b) : undefined
        const text = occupied ? plainText(keyStr(cell[0])) : ''
        const label =
          lockerLabel(b, occupied ? [text] : [], 'linear') +
          (d?.order ? `, comparación ${d.order}` : '') +
          (d?.found ? ', encontrado' : '')
        return (
          <button
            key={b}
            type="button"
            className={cls(
              'hsh-slot',
              occupied ? 'is-full' : 'is-free',
              bd?.home && 'is-home',
              bd?.wrong && 'is-wrong',
              bd?.collision && 'is-collision',
              bd?.probing && 'is-probing',
              bd?.solution && 'is-solution',
              d?.eaten && 'is-eaten',
              d?.found && 'is-found',
              d?.wrong && 'is-wrong',
              d?.placed && 'is-placed',
              d?.intro && 'is-intro',
              d?.solution && 'is-solution',
            )}
            style={slotStyle(bd?.delay, d?.delay)}
            data-hsh-b={b}
            data-hsh-n={`${b}:0`}
            disabled={p.disabled || !handler}
            onClick={handler}
            aria-label={label}
          >
            <span className="hsh-slot-num">{b}</span>
            <span className="hsh-slot-body">
              {occupied ? <span className={cls('hsh-slot-key', text.length > 8 ? 'is-xlong' : text.length > 6 && 'is-long')}>{keyStr(cell[0])}</span> : <span className="hsh-slot-empty">vacío</span>}
            </span>
            {d?.order !== undefined && (
              <span className="hsh-order" aria-hidden="true">
                {d.order}
              </span>
            )}
            {d?.pac && <PacMan size={22} chomp className="hsh-slot-pac" />}
            {bd?.wrong && <Ghost color="red" size={24} className="hsh-lock-ghost" />}
            {!bd?.wrong && bd?.collision && <Ghost color="orange" size={24} className="hsh-lock-ghost" />}
          </button>
        )
      })}
    </div>
  )
}

export function TableView(p: TableProps) {
  return p.strategy === 'chaining' ? <ChainRows {...p} /> : <SlotGrid {...p} />
}

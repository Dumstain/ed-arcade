/** Columna de marcos "binaria(a, x, inicio, fin)" apilados (la versión recursiva). */
import { RichText } from '../../ui'
import type { TraceStep } from './trace'

export interface Frame {
  lo: number
  hi: number
  /** paso ya resuelto en este marco (si no, el marco sigue "activo") */
  step?: TraceStep
}

interface Props {
  frames: Frame[]
  target: number
  values: number[]
  /** la búsqueda terminó: los marcos regresan uno por uno */
  resolved: boolean
  /** cuántos marcos ya regresaron (se desapilan desde el tope) */
  unwound: number
  retVal: number
  /** mostrar el medio calculado en el marco activo (predicción) o un "?" (juego) */
  revealMid: boolean
}

function subText(f: Frame, values: number[], target: number, revealMid: boolean): string {
  if (f.step) {
    const s = f.step
    const sym = s.cmp === 'eq' ? '=' : s.cmp === 'lt' ? '<' : '>'
    const tail = s.cmp === 'eq' ? ' **¡lo encontró!**' : s.cmp === 'lt' ? ' → **derecha**' : ' → **izquierda**'
    return `medio = ${s.idx} → ${values[s.idx]} ${sym} ${target}${tail}`
  }
  if (f.lo > f.hi) return '**inicio > fin** → **CASO BASE**'
  const mid = revealMid ? String(Math.floor((f.lo + f.hi) / 2)) : '?'
  return `medio = (${f.lo} + ${f.hi}) / 2 = ${mid}`
}

export function CallStack({ frames, target, values, resolved, unwound, retVal, revealMid }: Props) {
  const popped = resolved ? unwound : 0
  const visible = frames.slice(0, Math.max(1, frames.length - popped))
  const topIdx = visible.length - 1
  const rows = visible.map((f, depth) => ({ f, depth })).reverse()
  return (
    <aside className="ssg-stack" aria-label="Pila de llamadas">
      <p className="ssg-tag ssg-stack-title">PILA DE LLAMADAS</p>
      <div className="ssg-frames" role="list">
        {rows.map(({ f, depth }) => {
          const isTop = depth === topIdx
          const returning = isTop && resolved
          return (
            <div
              key={depth}
              role="listitem"
              className={`ssg-frame${isTop ? ' is-top' : ''}${returning ? ' is-return' : ''}`}
            >
              <div className="ssg-frame-call">{`binaria(a, ${target}, ${f.lo}, ${f.hi})`}</div>
              <div className="ssg-frame-sub">
                <RichText text={subText(f, values, target, revealMid)} />
              </div>
              {returning && <div className="ssg-ret">{`return ${retVal}`}</div>}
            </div>
          )
        })}
      </div>
      <p className="ssg-stack-base" aria-hidden="true">
        FONDO DE LA PILA
      </p>
    </aside>
  )
}

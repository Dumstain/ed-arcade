import type { CSSProperties, Ref } from 'react'
import type { Val } from '../schemas'
import { Doll } from './Doll'
import { cx, splitExpr, type Frame } from './helpers'

const COLORS = ['var(--ghost-cyan)', 'var(--ghost-pink)', 'var(--ghost-orange)', 'var(--ghost-red)']

export interface FrameViewProps {
  frame: Frame
  idx: number
  /** marco activo (el de arriba) */
  top: boolean
  /** versión de una línea para pilas largas */
  compact: boolean
  /** el marco acaba de regresar y se está yendo */
  leaving?: boolean
  /** mostrar que es el caso base (muñeca sólida) */
  revealBase: boolean
  /** hijo que ya regresó: su llamada se reemplaza por su valor en expr */
  child?: { call: string; value: Val }
  /** el valor sustituido acaba de llegar (animación) */
  freshSub: boolean
  /** mostrar "= valor" en el marco (modo solución) */
  showReturn: boolean
  /** overflow: la pila está llena y tiembla */
  boom: boolean
  liRef?: Ref<HTMLLIElement>
}

export function FrameView({ frame, idx, top, compact, leaving, revealBase, child, freshSub, showReturn, boom, liRef }: FrameViewProps) {
  const parts = child ? splitExpr(frame.expr, child.call) : null
  const tag = revealBase ? 'CASO BASE' : top ? 'ACTIVA' : null
  return (
    <li
      ref={liRef}
      className={cx(
        'cs-frame',
        top && 'is-top',
        compact && 'is-compact',
        leaving && 'is-leaving',
        revealBase && 'is-base',
        boom && 'is-boom',
      )}
      style={{ '--i': idx } as CSSProperties}
    >
      {!compact && <Doll color={COLORS[idx % COLORS.length]} base={revealBase} />}
      <div className="cs-frame__body">
        <div className="cs-frame__call">{frame.call}</div>
        <div className="cs-frame__expr">
          {parts && child ? (
            <>
              {parts.before}
              <span className={cx('cs-sub', freshSub && 'is-fresh')}>{String(child.value)}</span>
              {parts.after}
            </>
          ) : (
            <>
              {frame.expr}
              {child && <span className={cx('cs-sub', 'cs-sub--side', freshSub && 'is-fresh')}>{`← ${String(child.value)}`}</span>}
            </>
          )}
        </div>
      </div>
      {tag && !leaving && <span className={cx('cs-tag', revealBase && 'cs-tag--base')}>{tag}</span>}
      {leaving && <span className="cs-ret">{`REGRESA ${String(frame.returns)}`}</span>}
      {showReturn && !leaving && <span className="cs-ret cs-ret--sol">{`= ${String(frame.returns)}`}</span>}
    </li>
  )
}

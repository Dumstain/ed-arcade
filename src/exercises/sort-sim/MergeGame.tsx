/**
 * mode 'merge' (intercalar / mezclar, el corazón de merge sort): dos filas YA ORDENADAS. El alumno toca la
 * cabeza (el primero) de la fila que debe pasar a la salida: la MENOR; en empate, la de la izquierda.
 * Cuando una fila se vacía, el resto de la otra pasa sola. Acierto onStep; error onCheck(false); fin onCheck(true).
 */
import { useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { sfx } from '../../ui'
import { EatStrip } from '../_shared/EatStrip'
import { Bar, Board, Hud, PacPop, Sign, Stats, Status, cx, slotStyle, useCore } from './core'
import type { GameProps } from './core'
import { barScale } from './logic'
import type { MergeCfg, Side } from './logic'

export function MergeGame(props: GameProps<MergeCfg>) {
  const { cfg, locked, showSolution } = props
  const core = useCore(props)
  const { plan, left, right } = cfg
  const total = plan.moves.length
  const scale = useMemo(() => barScale([...left, ...right]), [left, right])

  const [k, setK] = useState(0)
  const [wrong, setWrong] = useState<Side | null>(null)
  const [pac, setPac] = useState({ i: 0, k: 0 })
  const outRef = useRef<HTMLDivElement>(null)

  const done = k >= total
  const takenL = plan.moves.slice(0, k).filter((m) => m.from === 'L').length
  const takenR = k - takenL
  const restL = left.slice(takenL)
  const restR = right.slice(takenR)
  const comps = showSolution ? plan.decisions : plan.moves.slice(0, k).filter((m) => !m.auto).length
  const mv = done ? null : plan.moves[k]
  const asking = !!mv && !mv.auto

  /** El resto de la fila que queda pasa sola, una por una. */
  const autoFlow = (from: number) => {
    core.setBusy(true)
    const per = core.reduced ? 120 : 380
    const rest = plan.moves.slice(from)
    const side = rest[0]?.from === 'L' ? 'izquierdo' : 'derecho'
    core.setMsg({ tone: 'info', text: `¡Un montón se vació! El resto del montón **${side}** pasa **solo**: ya viene ordenado.` })
    rest.forEach((_, i) => {
      core.later(() => {
        setK(from + i + 1)
        setPac((p) => ({ i: from + i, k: p.k + 1 }))
        sfx.waka()
      }, per * (i + 1))
    })
    core.later(
      () => {
        core.setBusy(false)
        core.setMsg({
          tone: 'ok',
          text: `¡Mezcla completa: **${plan.output.join(' ')}**! Con **${plan.decisions}** comparaciones.`,
        })
        core.fx(outRef.current, '¡ORDENADO!', '--ok', 14)
        core.win(plan.output, 700)
      },
      per * (rest.length + 1),
    )
  }

  const pick = (s: Side) => {
    if (!core.canAct() || !mv || mv.auto) return
    sfx.click()
    const a = restL[0]
    const b = restR[0]
    if (s !== mv.from) {
      setWrong(s)
      core.later(() => setWrong((w) => (w === s ? null : w)), 700)
      const text =
        a === b
          ? `Empate **${a} = ${b}** → sale el del montón **IZQUIERDO** (así no se revuelven los iguales).`
          : `**${a}** contra **${b}** → sale el **menor**: el **${Math.min(a, b)}**.`
      core.miss(`m${k}:${s}`, text, { step: k, side: s })
      return
    }
    // ── acierto ──
    setWrong(null)
    setK(k + 1)
    setPac((p) => ({ i: k, k: p.k + 1 }))
    core.advanced()
    core.step()
    core.setMsg({
      tone: 'ok',
      text: a === b ? `Empate **${a} = ${b}** → el de la **izquierda** primero.` : `**${mv.v}** es el menor → a la **salida**.`,
    })
    const next = plan.moves[k + 1]
    if (next && next.auto) core.later(() => autoFlow(k + 1), core.reduced ? 100 : 420)
  }

  const idle = asking
    ? `Compara las **cabezas**: **${restL[0]}** y **${restR[0]}**. Toca la que sale: la **menor** (empate → la **izquierda**).`
    : ''
  const next = asking && !core.busy ? `Sigue: **${restL[0]}** contra **${restR[0]}**.` : null
  const solution = showSolution
    ? `Respuesta: **${plan.output.join(' ')}** (${plan.moves.map((m) => (m.from === 'L' ? 'izq' : 'der')).join(', ')}).`
    : null
  const interactive = !locked && !showSolution && !core.won && !core.busy && asking

  const pile = (s: Side, rest: number[]) => {
    const head = rest[0]
    const isWrong = wrong === s
    return (
      <div className={cx('srt-pile', s === 'L' ? 'is-left' : 'is-right')}>
        <span className="srt-pile__name">{s === 'L' ? 'MONTÓN IZQUIERDO' : 'MONTÓN DERECHO'}</span>
        <div className="srt-pile__row">
          {head === undefined ? (
            <span className="srt-pile__empty">vacío</span>
          ) : (
            <>
              <button
                type="button"
                className={cx('srt-head', asking && 'is-asking', isWrong && 'is-wrong')}
                disabled={!interactive}
                onClick={() => pick(s)}
                aria-label={`Tomar el ${head} del montón ${s === 'L' ? 'izquierdo' : 'derecho'}`}
              >
                <Bar v={head} f={scale(head)} tone={s === 'L' ? 'left' : 'right'} />
              </button>
              {rest.slice(1).map((v, i) => (
                <span key={i} className="srt-pile__it">
                  <Bar v={v} f={scale(v)} tone={s === 'L' ? 'left' : 'right'} small />
                </span>
              ))}
            </>
          )}
        </div>
      </div>
    )
  }

  const shownK = showSolution ? total : k

  return (
    <section className={cx('srt', core.hit && 'srt--hit')} aria-label="Mezclar dos filas ordenadas">
      <Hud
        title={showSolution ? 'RESPUESTA' : core.won ? '¡MEZCLADO!' : 'MEZCLA'}
        badge={`SALIDA ${shownK}/${total}`}
        chomp={!core.won && !showSolution}
      />
      <Sign icon="clipboard" text="**Dos montones de exámenes** ya ordenados: siempre tomas el **de arriba más chico**." />
      <Stats
        items={[
          { label: 'COMPARACIONES', value: comps, tone: core.won ? 'ok' : 'hl', bump: comps },
          { label: 'EN LA SALIDA', value: `${shownK}/${total}`, tone: core.won ? 'ok' : undefined },
        ]}
      />

      <Board hit={core.hit} ghostKey={core.ghostKey} label="Dos montones y la salida">
        <div className={cx('srt-piles', asking && !showSolution && 'is-asking')}>
          {pile('L', showSolution ? [] : restL)}
          {pile('R', showSolution ? [] : restR)}
        </div>
        <p className="srt-board__cap">SALIDA (ORDENADA)</p>
        <div className="srt-track srt-track--out" ref={outRef}>
          {Array.from({ length: total }, (_, i) => {
            const m = plan.moves[i]
            const filled = i < shownK
            return (
              <span key={i} className={cx('srt-slot', filled && 'is-drop')} style={slotStyle(i, total) as CSSProperties}>
                {filled ? (
                  <Bar v={m.v} f={scale(m.v)} tone={m.from === 'L' ? 'left' : 'right'} />
                ) : (
                  <span className="srt-hole" aria-hidden="true" />
                )}
              </span>
            )
          })}
          <PacPop i={pac.i} n={total} k={showSolution ? 0 : pac.k} />
        </div>
        <p className="srt-key" aria-hidden="true">
          <span className="srt-key__l">IZQUIERDO</span>
          <span className="srt-key__r">DERECHO</span>
        </p>
      </Board>

      <Status msg={core.msg} idle={idle} solution={solution} next={next} />
      {core.won && !showSolution && <EatStrip pellets={12} />}
    </section>
  )
}

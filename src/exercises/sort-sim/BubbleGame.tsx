/**
 * mode 'bubble' (burbuja): un marco amarillo señala el par vecino [j, j+1] de la pasada actual.
 * El alumno elige INTERCAMBIAR (si el de la izquierda es mayor) o DEJAR. Acierto → se aplica y onStep();
 * error → onCheck(false). Al terminar cada pasada el mayor queda FIJO al final (el comecocos se lo "come").
 * Contadores de comparaciones e intercambios. Al completar las pasadas → onCheck(true).
 */
import { useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { PixelIcon, sfx } from '../../ui'
import { EatStrip } from '../_shared/EatStrip'
import { Bar, Board, Hud, IndexRow, PacPop, Sign, Stats, Status, cx, sign, slotStyle, useCore } from './core'
import type { GameProps } from './core'
import { barScale, isSortedAsc } from './logic'
import type { BubbleCfg } from './logic'

type Choice = 'swap' | 'keep'
interface Item {
  id: number
  v: number
}

export function BubbleGame(props: GameProps<BubbleCfg>) {
  const { cfg, locked, showSolution } = props
  const core = useCore(props)
  const { plan, values } = cfg
  const n = values.length
  const scale = useMemo(() => barScale(values), [values])

  const [items, setItems] = useState<Item[]>(() => values.map((v, id) => ({ id, v })))
  const [k, setK] = useState(0)
  const [pac, setPac] = useState({ i: 0, k: 0 })
  const [shown, setShown] = useState<{ j: number; s: '<' | '>' } | null>(null)
  const [wrongBtn, setWrongBtn] = useState<Choice | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  const total = plan.steps.length
  const done = k >= total
  const st = done ? null : plan.steps[k]
  // con la respuesta (showSolution) el tablero muestra la fila FINAL y los totales del plan
  const solItems = useMemo(() => {
    const idOf = new Map(values.map((v, id) => [v, id]))
    return plan.final.map((v) => ({ id: idOf.get(v) ?? -1, v }))
  }, [values, plan.final])
  const view = showSolution ? solItems : items
  const comps = showSolution ? plan.comparisons : k
  const swapsSoFar = useMemo(() => plan.steps.slice(0, k).filter((s) => s.swap).length, [plan.steps, k])
  const swaps = showSolution ? plan.swaps : swapsSoFar
  const passesSoFar = useMemo(() => plan.steps.slice(0, k).filter((s) => s.endOfPass).length, [plan.steps, k])
  const passesDone = showSolution ? plan.passes : passesSoFar
  const sortedAtEnd = (done || showSolution) && isSortedAsc(view.map((x) => x.v))
  const fixedFrom = sortedAtEnd ? 0 : n - passesDone
  const curPass = showSolution || !st ? plan.passes : Math.min(st.p + 1, plan.passes)

  const choose = (c: Choice) => {
    if (!core.canAct() || !st) return
    sfx.click()
    const right = (c === 'swap') === st.swap
    if (!right) {
      setWrongBtn(c)
      core.later(() => setWrongBtn((w) => (w === c ? null : w)), 700)
      const text = st.swap
        ? `**${st.a} > ${st.b}**: el de la izquierda es **mayor** → hay que **INTERCAMBIAR**.`
        : `**${st.a} < ${st.b}**: ya están en orden → hay que **DEJAR**.`
      core.miss(`b${k}:${c}`, text, { step: k, choice: c })
      return
    }

    // ── acierto ──
    setWrongBtn(null)
    core.setBusy(true)
    const last = k === total - 1
    setShown({ j: st.j, s: sign(st.a, st.b) as '<' | '>' })
    if (st.swap) {
      sfx.waka()
      setItems((arr) => {
        const next = arr.slice()
        const t = next[st.j]
        next[st.j] = next[st.j + 1]
        next[st.j + 1] = t
        return next
      })
      core.setMsg({ tone: 'ok', text: `**${st.a} > ${st.b}** → ¡INTERCAMBIAR! El **${st.a}** sube como burbuja.` })
    } else {
      core.setMsg({ tone: 'ok', text: `**${st.a} < ${st.b}** → se quedan así: **DEJAR**.` })
    }
    const wait = core.reduced ? 120 : st.swap ? 420 : 260
    core.later(() => {
      setShown(null)
      setK(k + 1)
      core.setBusy(false)
      core.advanced()
      if (st.endOfPass) {
        const fixedAt = n - 1 - st.p
        setPac((p) => ({ i: fixedAt, k: p.k + 1 }))
        const after = plan.afterPass[st.p]
        const top = after[fixedAt]
        if (last) {
          sfx.waka() // (en los demás pasos el runner ya suena con onStep)
          const sorted = isSortedAsc(after)
          core.setMsg({
            tone: 'ok',
            text: sorted
              ? `¡Quedó **ordenado** en **${plan.passes}** ${plan.passes === 1 ? 'pasada' : 'pasadas'}! **${plan.comparisons}** comparaciones y **${plan.swaps}** intercambios.`
              : `¡Listo! Tras **${plan.passes}** ${plan.passes === 1 ? 'pasada' : 'pasadas'}: **${plan.comparisons}** comparaciones y **${plan.swaps}** intercambios.`,
          })
          core.fx(trackRef.current, sorted ? '¡ORDENADO!' : '¡LISTO!', '--ok', 14)
          core.win(after, 700)
        } else {
          core.step()
          core.setMsg({
            tone: 'ok',
            text: `¡Fin de la pasada **${st.p + 1}**! El **${top}** burbujeó hasta el final: queda **fijo**.`,
          })
          core.fx(trackRef.current, 'FIJO', '--ok', 8)
        }
      } else {
        core.step()
      }
    }, wait)
  }

  // ── textos ──
  const idle = st
    ? `Pasada **${st.p + 1}**: compara el **${items[st.j]?.v}** con el **${items[st.j + 1]?.v}**. Si el de la izquierda es **mayor**, **INTERCAMBIAR**; si no, **DEJAR**.`
    : ''
  const next = st && !core.busy ? `Sigue: **${st.a}** con **${st.b}**.` : null
  const solution = showSolution
    ? `Respuesta: ${plan.afterPass.map((a, p) => `pasada ${p + 1} → **${a.join(' ')}**`).join(' · ')}. Total: **${plan.comparisons}** comparaciones y **${plan.swaps}** intercambios.`
    : null

  const pos = new Map(view.map((it, i) => [it.id, i]))
  const frameJ = st ? st.j : -1
  const interactive = !locked && !showSolution && !core.won && !done

  return (
    <section className={cx('srt', core.hit && 'srt--hit')} aria-label="Ordenamiento burbuja">
      <Hud
        title={showSolution ? 'RESPUESTA' : core.won ? (sortedAtEnd ? '¡ORDENADO!' : plan.passes === 1 ? '¡PASADA LISTA!' : '¡LISTO!') : 'BURBUJA'}
        badge={`PASADA ${curPass}/${plan.passes}`}
        chomp={!core.won && !showSolution}
      />
      <Sign icon="scale" text="Como formarse por **estatura**: solo comparas con el **de al lado**. **El más grande sube como burbuja** hasta el final." />
      <Stats
        items={[
          { label: 'COMPARACIONES', value: comps, tone: core.won ? 'ok' : 'hl', bump: comps },
          { label: 'INTERCAMBIOS', value: swaps, tone: core.won ? 'ok' : undefined, bump: swaps },
        ]}
      />

      <Board hit={core.hit} ghostKey={core.ghostKey} label="Fila de barras por ordenar">
        <div className="srt-track" ref={trackRef}>
          {/* orden ESTABLE en el DOM (por id) y posición por índice: así las DOS barras del intercambio se deslizan */}
          {[...view].sort((a, b) => a.id - b.id).map((it) => {
            const i = pos.get(it.id) ?? 0
            const fixed = i >= fixedFrom
            return (
              <span key={it.id} className="srt-slot" style={slotStyle(i, n)}>
                <Bar v={it.v} f={scale(it.v)} tone={fixed ? 'fixed' : 'base'} />
              </span>
            )
          })}
          {st && !showSolution && (
            <span className={cx('srt-frame', core.busy && 'is-busy')} style={{ ...slotStyle(frameJ, n), '--w': 2 } as CSSProperties} aria-hidden="true">
              <span className="srt-frame__tag">{shown && shown.j === frameJ ? shown.s : '?'}</span>
            </span>
          )}
          <PacPop i={pac.i} n={n} k={pac.k} />
        </div>
        <IndexRow n={n} />
        {fixedFrom < n && (
          <p className="srt-board__note">
            <PixelIcon name="lock" size={14} /> {sortedAtEnd ? 'TODO ORDENADO' : `FIJOS: ${n - fixedFrom}`}
          </p>
        )}
      </Board>

      <Status msg={core.msg} idle={idle} solution={solution} next={next} />

      {!done && !showSolution && (
        <div className="srt-choices" role="group" aria-label="¿Qué hacer con el par marcado?">
          <button
            type="button"
            className={cx('px-btn srt-choice', wrongBtn === 'swap' && 'is-wrong')}
            disabled={!interactive}
            onClick={() => choose('swap')}
          >
            <PixelIcon name="replay" size={16} /> INTERCAMBIAR
          </button>
          <button
            type="button"
            className={cx('px-btn srt-choice', wrongBtn === 'keep' && 'is-wrong')}
            disabled={!interactive}
            onClick={() => choose('keep')}
          >
            <PixelIcon name="check" size={16} /> DEJAR
          </button>
        </div>
      )}

      {showSolution && (
        <ol className="px-panel srt-solpasses" aria-label="Respuesta: arreglo tras cada pasada">
          {plan.afterPass.map((a, p) => (
            <li key={p}>
              <span className="srt-solpasses__lbl">PASADA {p + 1}</span>
              <span className="srt-solpasses__vals">
                {a.map((v, i) => (
                  <span
                    key={i}
                    className={cx('srt-mini', (i >= n - 1 - p || (p === plan.passes - 1 && isSortedAsc(a))) && 'is-fixed')}
                  >
                    {v}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ol>
      )}
      {core.won && !showSolution && <EatStrip pellets={12} />}
    </section>
  )
}

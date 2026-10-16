/**
 * mode 'partition' (quicksort): el PIVOTE (el capitán) es el último elemento (o el primero).
 * Un cursor recorre los demás de izquierda a derecha; el alumno elige MENOR o MAYOR que el pivote y la
 * ficha cae a su grupo conservando su orden. Al final el pivote baja al centro: queda en su lugar definitivo
 * (índice = cuántos son menores). Acierto onStep; error onCheck(false); fin onCheck(true).
 */
import { useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { PixelIcon, sfx } from '../../ui'
import { EatStrip } from '../_shared/EatStrip'
import { Bar, Board, Hud, IndexRow, PacPop, Sign, Stats, Status, cx, slotStyle, useCore } from './core'
import type { GameProps } from './core'
import { barScale } from './logic'
import type { PartitionCfg } from './logic'

type Side = 'L' | 'R'

export function PartitionGame(props: GameProps<PartitionCfg>) {
  const { cfg, locked, showSolution } = props
  const core = useCore(props)
  const { plan, values } = cfg
  const n = values.length
  const pv = plan.pivot
  const scale = useMemo(() => barScale(values), [values])

  const [k, setK] = useState(0)
  /** el pivote ya bajó al centro */
  const [landed, setLanded] = useState(false)
  const [wrongBtn, setWrongBtn] = useState<Side | null>(null)
  const [pac, setPac] = useState({ i: 0, k: 0 })
  const resultRef = useRef<HTMLDivElement>(null)
  const zoneRefs = { L: useRef<HTMLDivElement>(null), R: useRef<HTMLDivElement>(null) }

  const total = plan.scan.length
  const done = k >= total
  const cur = done ? -1 : plan.scan[k]
  const curV = cur >= 0 ? values[cur] : NaN

  // con la respuesta (showSolution) se ve la partición COMPLETA: todos en su grupo y el pivote al centro
  const shownK = showSolution ? total : k
  const landedView = landed || showSolution
  const placed = plan.scan.slice(0, shownK)
  const placedSet = new Set(placed)
  const lessIdx = placed.filter((_, i) => plan.isLess[i])
  const greaterIdx = placed.filter((_, i) => !plan.isLess[i])
  const lastPlaced = k > 0 ? plan.scan[k - 1] : -1

  const choose = (s: Side) => {
    if (!core.canAct() || done) return
    sfx.click()
    const isLess = plan.isLess[k]
    const right = (s === 'L') === isLess
    if (!right) {
      setWrongBtn(s)
      core.later(() => setWrongBtn((w) => (w === s ? null : w)), 700)
      core.miss(
        `p${k}:${s}`,
        isLess
          ? `**${curV} < ${pv}** → es **MENOR** que el capitán: va a la **izquierda**.`
          : `**${curV} > ${pv}** → es **MAYOR** que el capitán: va a la **derecha**.`,
        { index: cur, side: s },
      )
      return
    }

    // ── acierto: la ficha cae a su grupo ──
    setWrongBtn(null)
    const last = k === total - 1
    setK(k + 1)
    core.advanced()
    core.later(() => core.fx(zoneRefs[s].current, s === 'L' ? 'MENOR' : 'MAYOR', s === 'L' ? '--info' : '--ghost-orange', 6), 40)
    if (!last) {
      core.step()
      core.setMsg({
        tone: 'ok',
        text: isLess ? `**${curV} < ${pv}** → a los **MENORES**.` : `**${curV} > ${pv}** → a los **MAYORES**.`,
      })
      return
    }
    // último: el pivote baja al centro
    core.setBusy(true)
    core.setMsg({ tone: 'info', text: `¡Todos revisados! Ahora el capitán **${pv}** baja al centro…` })
    core.later(
      () => {
        setLanded(true)
        setPac((p) => ({ i: plan.pivotFinal, k: p.k + 1 }))
        sfx.waka()
        core.setBusy(false)
        core.setMsg({
          tone: 'ok',
          text: `¡El **${pv}** quedó en su **lugar definitivo**: índice **${plan.pivotFinal}** (hay **${plan.less.length}** menores). Luego se repite en cada lado.`,
        })
        core.later(() => core.fx(resultRef.current, `ÍNDICE ${plan.pivotFinal}`, '--ok', 14), 60)
        core.win(plan.final, 800)
      },
      core.reduced ? 150 : 650,
    )
  }

  const idle = done
    ? ''
    : `Compara el **${curV}** con el capitán **${pv}**: ¿es **MENOR** o **MAYOR**?`
  const next = done ? null : `Sigue: ¿el **${curV}** es **MENOR** o **MAYOR** que **${pv}**?`
  const solution = showSolution
    ? `Respuesta: menores **${plan.less.join(' ') || '(ninguno)'}** · pivote **${pv}** · mayores **${plan.greater.join(' ') || '(ninguno)'}**. El pivote queda en el índice **${plan.pivotFinal}**.`
    : null

  const showResult = landed || showSolution
  const interactive = !locked && !showSolution && !core.won && !done && !core.busy

  const zone = (s: Side, idxs: number[]) => (
    <div
      ref={zoneRefs[s]}
      className={cx('srt-zone', s === 'L' ? 'is-less' : 'is-greater', wrongBtn === s && 'is-wrong')}
      aria-label={s === 'L' ? `Menores que ${pv}` : `Mayores que ${pv}`}
    >
      <span className="srt-zone__head">
        {s === 'L' ? 'MENORES' : 'MAYORES'}
        <span className="srt-zone__rule">
          {s === 'L' ? '<' : '>'} {pv}
        </span>
      </span>
      <span className="srt-zone__items">
        {idxs.map((i) => (
          <span key={i} className={cx('srt-zone__it', i === lastPlaced && 'is-new')}>
            <Bar v={values[i]} f={scale(values[i])} tone={s === 'L' ? 'less' : 'greater'} small />
          </span>
        ))}
        {idxs.length === 0 && <span className="srt-zone__empty">vacío</span>}
      </span>
    </div>
  )

  return (
    <section className={cx('srt', core.hit && 'srt--hit')} aria-label="Partición con pivote (quicksort)">
      <Hud
        title={showSolution ? 'RESPUESTA' : core.won ? '¡EN SU LUGAR!' : 'PARTICIÓN'}
        badge={`PIVOTE ${pv}`}
        chomp={!core.won && !showSolution}
      />
      <Sign icon="crown" text="**El pivote es el capitán**: los más **chicos** a su izquierda, los más **grandes** a su derecha." />
      <Stats
        items={[
          { label: 'COMPARACIONES', value: shownK, tone: core.won ? 'ok' : 'hl', bump: shownK },
          { label: 'REVISADOS', value: `${shownK}/${total}`, tone: core.won ? 'ok' : undefined },
        ]}
      />

      <Board hit={core.hit} ghostKey={core.ghostKey} label="Fila con el pivote">
        <p className="srt-board__cap">LA FILA</p>
        <div className="srt-track">
          {values.map((v, i) => {
            const isPivot = i === plan.pivotIndex
            const gone = placedSet.has(i) || (isPivot && landedView)
            return (
              <span key={i} className={cx('srt-slot', gone && 'is-gone')} style={slotStyle(i, n)}>
                {gone ? (
                  <span className="srt-hole" aria-hidden="true" />
                ) : (
                  <Bar v={v} f={scale(v)} tone={isPivot ? 'pivot' : 'base'} />
                )}
                {isPivot && !gone && (
                  <span className="srt-crown" aria-hidden="true">
                    <PixelIcon name="crown" size={18} />
                  </span>
                )}
              </span>
            )
          })}
          {!done && !showSolution && (
            <span className="srt-frame" style={{ ...slotStyle(cur, n), '--w': 1 } as CSSProperties} aria-hidden="true">
              <span className="srt-frame__tag">?</span>
            </span>
          )}
        </div>
        <IndexRow n={n} />

        <div className="srt-zones">
          {zone('L', lessIdx)}
          <div className={cx('srt-zone is-pivot', landedView && 'is-landed')} aria-label={`Pivote ${pv}`}>
            <span className="srt-zone__head">
              <PixelIcon name="crown" size={14} />
            </span>
            <span className="srt-zone__items">
              {landedView ? (
                <span className="srt-zone__it is-new">
                  <Bar v={pv} f={scale(pv)} tone="pivot" small />
                </span>
              ) : (
                <span className="srt-zone__wait">{pv}</span>
              )}
            </span>
          </div>
          {zone('R', greaterIdx)}
        </div>

        {showResult && (
          <div className="srt-result" ref={resultRef}>
            <p className="srt-board__cap">ASÍ QUEDA · EL PIVOTE EN SU LUGAR</p>
            <div className="srt-track">
              {plan.final.map((v, i) => (
                <span key={i} className={cx('srt-slot', 'is-drop')} style={slotStyle(i, n)}>
                  <Bar
                    v={v}
                    f={scale(v)}
                    tone={i === plan.pivotFinal ? 'pivot' : i < plan.pivotFinal ? 'less' : 'greater'}
                  />
                </span>
              ))}
              <PacPop i={pac.i} n={n} k={pac.k} />
            </div>
            <IndexRow n={n} mark={plan.pivotFinal} />
          </div>
        )}
      </Board>

      <Status msg={core.msg} idle={idle} solution={solution} next={next} />

      {!done && !showSolution && (
        <div className="srt-choices" role="group" aria-label={`¿El ${curV} es menor o mayor que el pivote ${pv}?`}>
          <button
            type="button"
            className={cx('px-btn srt-choice srt-choice--less', wrongBtn === 'L' && 'is-wrong')}
            disabled={!interactive}
            onClick={() => choose('L')}
          >
            <PixelIcon name="arrow-left" size={16} /> MENOR
          </button>
          <button
            type="button"
            className={cx('px-btn srt-choice srt-choice--greater', wrongBtn === 'R' && 'is-wrong')}
            disabled={!interactive}
            onClick={() => choose('R')}
          >
            MAYOR <PixelIcon name="arrow-right" size={16} />
          </button>
        </div>
      )}
      {core.won && !showSolution && <EatStrip pellets={12} />}
    </section>
  )
}

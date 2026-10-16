/**
 * mode 'radix' (el cartero con casilleros): 10 casilleros 0–9; por cada número (en orden) el alumno toca el
 * casillero de su dígito (unidades o decenas). Luego RECOGER los junta del casillero 0 al 9 conservando el
 * orden de llegada. rounds 1 = un solo dígito; 2 = unidades y luego decenas (queda ordenado).
 * Acierto onStep; error onCheck(false); fin (último RECOGER) onCheck(true).
 */
import { useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { PixelIcon, sfx } from '../../ui'
import { EatStrip } from '../_shared/EatStrip'
import { Bar, Board, DigitNum, Hud, PacPop, Sign, Stats, Status, cx, slotStyle, useCore } from './core'
import type { GameProps } from './core'
import { barScale, digitOf, isSortedAsc } from './logic'
import type { Digit, RadixCfg } from './logic'

const DIGIT_WORD: Record<Digit, string> = { units: 'UNIDADES', tens: 'DECENAS' }
const digitWord = (d: Digit) => (d === 'units' ? 'unidades' : 'decenas')

export function RadixGame(props: GameProps<RadixCfg>) {
  const { cfg, locked, showSolution } = props
  const core = useCore(props)
  const { plan, values, rounds } = cfg
  const n = values.length
  const scale = useMemo(() => barScale(values), [values])

  const [r, setR] = useState(0)
  /** números ya repartidos en la ronda r */
  const [i, setI] = useState(0)
  /** casilleros ya recogidos (0..10) durante RECOGER; -1 = todavía no se recoge */
  const [collected, setCollected] = useState(-1)
  const [wrongBin, setWrongBin] = useState<number | null>(null)
  const [pac, setPac] = useState({ i: 0, k: 0 })
  const binRefs = useRef<(HTMLButtonElement | null)[]>([])
  const rowRef = useRef<HTMLDivElement>(null)

  const round = plan[Math.min(r, plan.length - 1)]
  const d = round.digit
  const input = round.input
  const dealt = i >= n
  const collecting = collected >= 0
  const finished = core.won
  const cur = dealt ? undefined : input[i]
  /** con una sola ronda (unidades) puede quedar sin ordenar: no presumir "¡ORDENADO!" */
  const sortedAtEnd = isSortedAsc(plan[plan.length - 1].output)

  // contenido de los casilleros (lo repartido hasta ahora, en orden de llegada)
  const bins: number[][] = useMemo(() => {
    const b: number[][] = Array.from({ length: 10 }, () => [])
    input.slice(0, i).forEach((v) => b[digitOf(v, d)].push(v))
    return b
  }, [input, i, d])

  // con la respuesta (showSolution) se pintan los casilleros y la salida de la ÚLTIMA ronda
  const solRound = plan[plan.length - 1]
  const binsView = showSolution ? solRound.bins : bins
  const dView = showSolution ? solRound.digit : d

  // fila de arriba: durante RECOGER se arma la salida (casilleros < collected)
  const gathered = collecting ? bins.slice(0, collected).flat() : []

  const tapBin = (b: number) => {
    if (!core.canAct() || cur === undefined || collecting) return
    sfx.click()
    const want = digitOf(cur, d)
    if (b !== want) {
      setWrongBin(b)
      core.later(() => setWrongBin((w) => (w === b ? null : w)), 700)
      core.miss(
        `r${r}:${i}:${b}`,
        `El **${cur}** tiene **${want}** en las **${digitWord(d)}** → va al casillero **${want}**.`,
        { round: r, value: cur, bin: b },
      )
      return
    }
    setWrongBin(null)
    setI(i + 1)
    core.advanced()
    core.step()
    core.later(() => core.fx(binRefs.current[b], `${cur}`, '--pac', 6), 40)
    core.setMsg({
      tone: 'ok',
      text:
        i + 1 >= n
          ? '¡Todo repartido! Ahora toca **RECOGER**: del casillero **0** al **9**, en orden de llegada.'
          : `El **${cur}** → casillero **${want}** (${digitWord(d)}).`,
    })
  }

  const collect = () => {
    if (!core.canAct() || !dealt || collecting) return
    sfx.click()
    core.setBusy(true)
    setCollected(0)
    const per = core.reduced ? 60 : 230
    const out = round.output
    core.setMsg({ tone: 'info', text: 'El cartero recoge del casillero **0** al **9**…' })
    for (let b = 1; b <= 10; b++) {
      core.later(() => {
        setCollected(b)
        if (bins[b - 1].length > 0) sfx.waka()
      }, per * b)
    }
    const lastRound = r >= plan.length - 1
    core.later(
      () => {
        if (lastRound) {
          setPac((p) => ({ i: n - 1, k: p.k + 1 }))
          core.setMsg({
            tone: 'ok',
            text:
              rounds === 2
                ? `¡Ordenado sin comparar! **${out.join(' ')}**. El cartero solo miró **un dígito** a la vez.`
                : `¡Recogido! Queda **${out.join(' ')}**: ordenado por las **${digitWord(d)}**.`,
          })
          core.fx(rowRef.current, sortedAtEnd ? '¡ORDENADO!' : '¡LISTO!', '--ok', 14)
          core.setBusy(false)
          core.win(out, 300)
        } else {
          core.step()
          setPac((p) => ({ i: n - 1, k: p.k + 1 }))
          setR(r + 1)
          setI(0)
          setCollected(-1)
          core.setBusy(false)
          core.advanced()
          core.setMsg({
            tone: 'ok',
            text: `Recogido: **${out.join(' ')}**. Ronda **2**: ahora reparte por las **DECENAS**, en este nuevo orden.`,
          })
        }
      },
      per * 11 + 120,
    )
  }

  // ── fila de arriba (las cartas por repartir / lo recogido) ──
  const ended = finished || showSolution
  const rowVals = ended ? solRound.output : collecting ? gathered : input
  const idle = cur !== undefined ? `Mira las **${digitWord(d)}** del **${cur}** y toca su **casillero**.` : ''
  const next = cur !== undefined && !collecting && !core.busy ? `Sigue: el **${cur}** (${digitWord(d)}).` : null
  const solution = showSolution
    ? 'Respuesta: ' +
      plan
        .map(
          (rd) =>
            `por ${digitWord(rd.digit)} → ` +
            rd.bins
              .map((b, k) => (b.length ? `**${k}**: ${b.join(', ')}` : ''))
              .filter(Boolean)
              .join(' · ') +
            ` → recoger: **${rd.output.join(' ')}**`,
        )
        .join(' | ')
    : null

  const interactive = !locked && !showSolution && !finished && !core.busy

  return (
    <section className={cx('srt', core.hit && 'srt--hit')} aria-label="Radix: el cartero con casilleros">
      <Hud
        title={showSolution ? 'RESPUESTA' : finished ? (sortedAtEnd ? '¡ORDENADO!' : '¡RECOGIDO!') : 'RADIX'}
        badge={`${rounds === 2 ? `RONDA ${showSolution ? 2 : r + 1}/2 · ` : ''}${DIGIT_WORD[dView]}`}
        chomp={!finished && !showSolution}
      />
      <Sign icon="locker" text="**El cartero** reparte por **un dígito** en los casilleros **0–9** y recoge del 0 al 9. ¡No compara!" />
      <Stats
        items={[
          { label: 'REPARTIDOS', value: `${ended ? n : i}/${n}`, tone: finished ? 'ok' : 'hl', bump: i },
          { label: 'RONDA', value: `${showSolution ? rounds : Math.min(r + 1, rounds)}/${rounds}`, tone: finished ? 'ok' : undefined },
        ]}
      />

      <Board hit={core.hit} ghostKey={core.ghostKey} label="Cartas y casilleros">
        <p className="srt-board__cap">
          {ended ? 'RESULTADO' : collecting ? 'RECOGIENDO DEL 0 AL 9' : `POR REPARTIR (${DIGIT_WORD[d]})`}
        </p>
        <div className="srt-track srt-track--radix" ref={rowRef}>
          {Array.from({ length: n }, (_, k) => {
            const v = rowVals[k]
            const sent = !collecting && !ended && k < i
            const isCur = !collecting && !ended && k === i
            return (
              <span
                key={collecting || ended ? `g${k}` : `p${r}:${k}`}
                className={cx('srt-slot', (collecting || ended) && v !== undefined && 'is-drop', isCur && 'is-cur')}
                style={slotStyle(k, n) as CSSProperties}
              >
                {v === undefined || sent ? (
                  <span className="srt-hole" aria-hidden="true" />
                ) : (
                  <Bar
                    v={v}
                    f={scale(v)}
                    tone={ended && sortedAtEnd ? 'fixed' : 'base'}
                    label={<DigitNum v={v} d={dView} on={!finished} />}
                  />
                )}
              </span>
            )
          })}
          {!collecting && !finished && cur !== undefined && !showSolution && (
            <span className="srt-frame" style={{ ...slotStyle(i, n), '--w': 1 } as CSSProperties} aria-hidden="true" />
          )}
          <PacPop i={pac.i} n={n} k={pac.k} />
        </div>

        {cur !== undefined && !showSolution && (
          <p className="srt-letter">
            <PixelIcon name="card" size={18} />
            <span>CARTA:</span>
            <span className="srt-letter__num">
              <DigitNum v={cur} d={d} />
            </span>
            <span className="srt-letter__hint">{digitWord(d)}</span>
          </p>
        )}

        <div className="srt-bins" role="group" aria-label="Casilleros del 0 al 9">
          {binsView.map((b, k) => {
            const emptied = !showSolution && collecting && k < collected
            return (
              <button
                key={k}
                type="button"
                ref={(el) => {
                  binRefs.current[k] = el
                }}
                className={cx('srt-bin', wrongBin === k && 'is-wrong', collecting && k === collected && 'is-collect')}
                disabled={!interactive || dealt}
                onClick={() => tapBin(k)}
                aria-label={`Casillero ${k}${b.length ? `: ${b.join(', ')}` : ', vacío'}`}
              >
                <span className="srt-bin__n">{k}</span>
                <span className="srt-bin__items">
                  {!emptied &&
                    b.map((v) => (
                      <span key={v} className="srt-bin__it">
                        {v}
                      </span>
                    ))}
                </span>
              </button>
            )
          })}
        </div>
      </Board>

      <Status msg={core.msg} idle={idle} solution={solution} next={next} />

      {dealt && !collecting && !finished && !showSolution && (
        <button type="button" className="px-btn px-btn--primary px-btn--block srt-collect" disabled={!interactive} onClick={collect}>
          <PixelIcon name="inbox" size={18} /> RECOGER DEL 0 AL 9
        </button>
      )}
      {finished && !showSolution && <EatStrip pellets={12} />}
    </section>
  )
}

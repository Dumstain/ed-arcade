import { useEffect, useMemo, useRef, useState } from 'react'
import type { ExerciseProps } from '../../engine/types'
import type { CallStackData, Val } from '../schemas'
import { Keypad } from '../_shared/Keypad'
import { Ghost, PacMan, Pellets, sfx } from '../../ui'
import { Feast } from './Feast'
import { FrameView } from './FrameView'
import { fxAt } from './fx'
import { cx, fakeNext, hash, isNumericVal, normalize, sameVal, type Cfg } from './helpers'
import './call-stack.css'

type Phase = 'down' | 'up' | 'auto' | 'done'
interface Leaving {
  idx: number
  key: number
}
interface Msg {
  text: string
  tone: 'ok' | 'bad' | 'info'
}
type GameProps = ExerciseProps<CallStackData> & { cfg: Cfg }

export function CallStackExercise(props: ExerciseProps<CallStackData>) {
  const cfg = useMemo(() => normalize(props.exercise.data), [props.exercise.data])
  if (!cfg) {
    return (
      <div className="px-panel cs-warn" role="alert">
        <Ghost color="orange" size={40} float />
        <p>Este ejercicio no trae llamadas para apilar. Avísale a tu profe.</p>
      </div>
    )
  }
  return <Game key={props.exercise.id} {...props} cfg={cfg} />
}

function Game({ exercise, onCheck, onStep, locked, showSolution, attempt, cfg }: GameProps) {
  const { frames, overflow, askReturns, baseIdx } = cfg
  const n = frames.length

  const [depth, setDepth] = useState(1)
  const [phase, setPhase] = useState<Phase>('down')
  const [vals, setVals] = useState<Record<number, Val>>({})
  const [leaving, setLeaving] = useState<Leaving | null>(null)
  const [input, setInput] = useState('')
  const [msg, setMsg] = useState<Msg | null>(null)
  const [flash, setFlash] = useState(false)
  const [ghostKey, setGhostKey] = useState(0)

  const topRef = useRef<HTMLLIElement | null>(null)
  const latest = useRef({ onCheck, onStep })
  const popRef = useRef<(auto: boolean) => void>(() => {})
  // Doble clic: el mismo error seguido no cobra otra vida, y tras avanzar se ignora el clic "rebote"
  const lastFail = useRef<string | null>(null)
  const advancedAt = useRef(0)
  useEffect(() => {
    latest.current = { onCheck, onStep }
  })

  // Error (attempt sube): fantasma cruza la pantalla + sacudida roja breve
  const firstAttempt = useRef(attempt)
  useEffect(() => {
    if (attempt === firstAttempt.current) return
    setFlash(true)
    setGhostKey((k) => k + 1)
    const t = setTimeout(() => setFlash(false), 650)
    return () => clearTimeout(t)
  }, [attempt])

  // La muñeca que regresó se va de la pila tras su animación
  useEffect(() => {
    if (!leaving) return
    const t = setTimeout(() => setLeaving(null), 650)
    return () => clearTimeout(t)
  }, [leaving])

  // askReturns=false: la pila se desapila sola, una muñeca cada ratito
  useEffect(() => {
    if (phase !== 'auto') return
    const t = setTimeout(() => popRef.current(true), 650)
    return () => clearTimeout(t)
  }, [phase, depth])

  const interactive = !locked && !showSolution
  const topIdx = depth - 1
  const topFrame: Cfg['frames'][number] | undefined = frames[topIdx]
  const isBaseTop = !overflow && topIdx === baseIdx
  const full = overflow && depth >= n

  function fail(text: string) {
    setMsg({ text, tone: 'bad' })
    latest.current.onCheck(false)
  }

  function popTop(auto: boolean) {
    const k = depth - 1
    if (k < 0 || !frames[k]) return
    const value = frames[k].returns
    fxAt(topRef.current, `↑ ${String(value)}`)
    if (auto) sfx.waka()
    setVals((v) => ({ ...v, [k]: value }))
    setLeaving({ idx: k, key: Date.now() })
    setDepth(k)
    setInput('')
    if (k === 0) {
      setMsg(null)
      setPhase('done')
      latest.current.onCheck(true)
    } else {
      setMsg({ text: `${frames[k].call} regresa ${String(value)}. Sube a la muñeca de abajo.`, tone: 'ok' })
      if (!auto) latest.current.onStep?.()
    }
  }
  useEffect(() => {
    popRef.current = popTop
  })

  function choose(kind: 'call' | 'base' | 'boom') {
    if (!interactive || phase !== 'down') return
    if (performance.now() - advancedAt.current < 350) return
    sfx.click()
    const failOnce = (text: string) => {
      const key = `${depth}:${kind}`
      if (lastFail.current === key) {
        setMsg({ text, tone: 'bad' })
        return
      }
      lastFail.current = key
      fail(text)
    }
    const advanced = () => {
      advancedAt.current = performance.now()
      lastFail.current = null
    }
    if (overflow) {
      if (kind === 'boom') {
        if (full) {
          advanced()
          fxAt(topRef.current, '¡BOOM!', '--bad')
          setMsg(null)
          setPhase('done')
          onCheck(true)
        } else {
          failOnce('Todavía cabe otra muñeca en la pila. ¡Sigue llamando!')
        }
      } else if (kind === 'call') {
        if (!full) {
          advanced()
          setDepth((d) => d + 1)
          setMsg(
            depth + 1 >= n
              ? { text: '¡La pila llegó al techo! ¿Qué va a pasar ahora?', tone: 'bad' }
              : { text: 'Otra llamada… y nunca se detiene.', tone: 'info' },
          )
          onStep?.()
        } else {
          failOnce('¡La pila ya no aguanta más! Eso es un desbordamiento.')
        }
      }
      return
    }
    if (kind === 'base') {
      if (isBaseTop) {
        advanced()
        onStep?.()
        setMsg({ text: '¡La muñeca más chiquita! Ya no se abre. Ahora a regresar.', tone: 'ok' })
        setPhase(askReturns ? 'up' : 'auto')
      } else {
        failOnce('Esa todavía llama a otra función. ¡Sigue abriendo muñecas!')
      }
    } else if (kind === 'call') {
      if (!isBaseTop) {
        advanced()
        setDepth((d) => d + 1)
        setMsg({ text: '¡Se abre otra muñeca más chica!', tone: 'ok' })
        onStep?.()
      } else {
        failOnce('Esa muñeca ya no se abre: ¡es el caso base!')
      }
    }
  }

  function submitReturn() {
    if (!interactive || phase !== 'up' || !topFrame) return
    if (input.trim() === '') return
    sfx.click()
    if (sameVal(input, topFrame.returns)) {
      popTop(false)
    } else {
      setInput('')
      fail(
        topIdx === baseIdx
          ? 'El caso base regresa un valor fijo. Léelo en la muñeca.'
          : 'Casi. Cambia la llamada por el valor que subió y calcula.',
      )
    }
  }

  // ───── derivados para pintar ─────
  const shown = showSolution ? n : depth
  const compactRef = shown
  const trem = overflow ? (depth >= n ? 3 : depth / n >= 0.75 ? 2 : depth / n >= 0.5 ? 1 : 0) : 0
  const swap = hash(`${exercise.id}:${depth}`) % 2 === 1
  const nextLabel = (() => {
    const real = !isBaseTop && !full ? frames[depth]?.call : undefined
    const label = real ?? fakeNext(frames, Math.max(0, topIdx))
    return label === topFrame?.call ? 'OTRA VEZ' : label
  })()
  const popped = n - depth
  const progressTotal = overflow ? n : 2 * n
  const progressDone = overflow ? depth - 1 : phase === 'down' ? depth - 1 : n + popped
  const solved = phase === 'done'

  const title =
    showSolution ? 'RESPUESTA' : solved ? '¡LISTO!' : phase === 'down' ? 'BAJANDO' : 'SUBIENDO'
  const sub = showSolution
    ? 'Así se resolvía.'
    : solved
      ? overflow
        ? 'La pila se llenó.'
        : 'Todas las muñecas regresaron.'
      : phase === 'down'
        ? overflow
          ? '¿Esta función se detiene alguna vez?'
          : 'Cada llamada abre una muñeca más chica. ¿Ya es la más chiquita?'
        : 'Cada muñeca regresa su valor a la de abajo.'

  const numericAnswer = topFrame ? isNumericVal(topFrame.returns) : true

  const callBtn = (
    <button key="call" type="button" className="px-btn cs-btn" disabled={!interactive} onClick={() => choose('call')}>
      {`LLAMAR ${nextLabel}`}
    </button>
  )
  const secondBtn = overflow ? (
    <button key="boom" type="button" className="px-btn cs-btn cs-btn--boom" disabled={!interactive} onClick={() => choose('boom')}>
      ¡STACK OVERFLOW!
    </button>
  ) : (
    <button key="base" type="button" className="px-btn px-btn--primary cs-btn" disabled={!interactive} onClick={() => choose('base')}>
      ¡CASO BASE! REGRESAR
    </button>
  )

  return (
    <section className={cx('cs-root', flash && 'cs-flash')} aria-label="Pila de llamadas">
      <div className="cs-hud">
        <PacMan size={30} dir={phase === 'down' ? 'down' : 'up'} chomp={!solved && !showSolution} />
        <div className="cs-hud__text">
          <div className="cs-hud__title">{title}</div>
          <div className="cs-hud__sub">{sub}</div>
        </div>
        <div className="cs-hud__pellets">
          <Pellets total={progressTotal} done={Math.max(0, Math.min(progressTotal, showSolution ? progressTotal : solved ? progressTotal : progressDone))} />
        </div>
      </div>

      <div className="px-panel cs-stage">
        {overflow && (
          <div className={cx('cs-gauge', trem >= 2 && 'is-hot')} aria-label={`Pila: ${depth} de ${n}`}>
            <span className="cs-gauge__lbl">PILA</span>
            {Array.from({ length: n }, (_, i) => (
              <i key={i} className={cx('cs-gauge__bar', i < depth && 'is-on', i < depth && trem >= 2 && 'is-warn', i < depth && trem >= 3 && 'is-full')} />
            ))}
            <span className="cs-gauge__lbl cs-gauge__lbl--end">TECHO</span>
          </div>
        )}
        <ol className={cx('cs-stack', trem > 0 && `cs-trem-${trem}`)} aria-label="Pila de llamadas: abajo la primera, arriba la más reciente">
          <li className="cs-floor" aria-hidden="true" />
          {shown === 0 && !leaving && <li className="cs-empty">SIN LLAMADAS</li>}
          {frames.slice(0, shown).map((f, i) => {
            const isTop = !showSolution && !solved && i === topIdx
            const next = frames[i + 1]
            const cv = overflow || !next ? undefined : showSolution ? next.returns : vals[i + 1]
            const child = next && cv !== undefined ? { call: next.call, value: cv } : undefined
            return (
              <FrameView
                key={i}
                frame={f}
                idx={i}
                top={isTop}
                compact={compactRef > 4 && i < compactRef - 2}
                revealBase={!overflow && i === baseIdx && (phase !== 'down' || showSolution)}
                child={child}
                freshSub={!!leaving && leaving.idx === i + 1}
                showReturn={showSolution && !overflow}
                boom={overflow && (solved || depth >= n)}
                liRef={isTop ? topRef : undefined}
              />
            )
          })}
          {leaving && !showSolution && frames[leaving.idx] && (
            <FrameView
              key={`leaving-${leaving.key}`}
              frame={frames[leaving.idx]}
              idx={leaving.idx}
              top={false}
              compact={false}
              leaving
              revealBase={!overflow && leaving.idx === baseIdx}
              freshSub={false}
              showReturn={false}
              boom={false}
            />
          )}
        </ol>
        {ghostKey > 0 && (
          <span key={ghostKey} className="cs-ghostrun" aria-hidden="true">
            <Ghost color="red" size={40} />
          </span>
        )}
      </div>

      <p className={cx('cs-msg', msg && `cs-msg--${msg.tone}`)} role="status" aria-live="polite">
        {!showSolution && msg ? msg.text : ''}
      </p>

      {showSolution && (
        <div className="px-panel cs-solution">
          <div className="px-title cs-solution__title">RESPUESTA</div>
          {overflow ? (
            <>
              <p>Esta función nunca llega a un caso base: sigue abriendo muñecas hasta llenar la pila.</p>
              <span className="px-btn cs-btn cs-btn--boom cs-solution__boom">¡STACK OVERFLOW!</span>
            </>
          ) : (
            <ol className="cs-solution__list">
              {[...frames.keys()].reverse().map((k) => (
                <li key={k}>
                  <b>{frames[k].call}</b>
                  {k === baseIdx ? ' es el caso base y regresa ' : ' regresa '}
                  <b className="cs-solution__val">{String(frames[k].returns)}</b>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {!showSolution && !solved && phase === 'down' && (
        <div className="cs-choices">{swap ? [secondBtn, callBtn] : [callBtn, secondBtn]}</div>
      )}

      {!showSolution && phase === 'up' && topFrame && (
        <div className="px-panel cs-ask">
          <p className="cs-ask__q">
            ¿Qué regresa <span className="cs-chip">{topFrame.call}</span>?
          </p>
          {numericAnswer ? (
            <Keypad
              value={input}
              onChange={setInput}
              onSubmit={submitReturn}
              allowNegative
              maxLength={Math.max(5, String(topFrame.returns).length + 2)}
              disabled={!interactive}
              submitLabel="COMPROBAR"
              status={flash ? 'bad' : 'idle'}
            />
          ) : (
            <form
              className="cs-ask__text"
              onSubmit={(e) => {
                e.preventDefault()
                submitReturn()
              }}
            >
              <input
                className="px-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={!interactive}
                aria-label="Valor que regresa"
                autoComplete="off"
              />
              <button type="submit" className="px-btn px-btn--primary" disabled={!interactive || input.trim() === ''}>
                COMPROBAR
              </button>
            </form>
          )}
        </div>
      )}

      {!showSolution && phase === 'auto' && (
        <p className="cs-auto">Las muñecas regresan solas…</p>
      )}

      {!showSolution && solved && (
        overflow ? (
          <Feast tone="bad" text="¡STACK OVERFLOW! Sin caso base la pila se llena y el programa se cae." />
        ) : (
          <Feast text={`${frames[0].call} = ${String(frames[0].returns)}`} />
        )
      )}
    </section>
  )
}

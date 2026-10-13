/**
 * Tablero de search-sim: arreglo como fila de celdas con pellet, comecocos que se come las
 * celdas revisadas, fantasmas asustados en la mitad descartada y contador de COMPARACIONES.
 * mode 'play': el alumno toca. mode 'predict': escribe un número y se anima la búsqueda.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ExerciseProps } from '../../engine/types'
import type { SearchSimData } from '../schemas'
import { Fruit, Ghost, PacMan, PixelIcon, RichText, burst, floatText, sfx } from '../../ui'
import type { FruitKind } from '../../ui'
import { Keypad } from '../_shared/Keypad'
import { CallStack } from './CallStack'
import type { Frame } from './CallStack'
import { buildTrace, plural, stepText } from './trace'
import type { CleanData } from './trace'

const PAC = 26
const STRIP = 28
const GAP = 6
const MIN_CELL = 44
const FRUITS: FruitKind[] = ['cherry', 'strawberry', 'orange', 'apple', 'melon']

type Tone = 'info' | 'ok' | 'bad'
interface Msg {
  tone: Tone
  text: string
}
type Phase = 'idle' | 'running' | 'done'
type MarkKind = 'ini' | 'med' | 'fin'

const MARK_LABEL: Record<MarkKind, string> = { ini: 'INI', med: 'MED', fin: 'FIN' }

function cssVar(name: string, fallback: string): string {
  try {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
  } catch {
    return fallback
  }
}

/** Columnas balanceadas: celdas de al menos 44px para que se pueda tocar con el dedo. */
function calcCols(width: number, n: number): number {
  const maxCols = Math.max(1, Math.floor((width + GAP) / (MIN_CELL + GAP)))
  const rows = Math.ceil(n / maxCols)
  return Math.max(1, Math.ceil(n / rows))
}

export interface BoardProps extends ExerciseProps<SearchSimData> {
  clean: CleanData
}

export function Board({ exercise, onCheck, onStep, locked, showSolution, attempt, clean }: BoardProps) {
  const { algorithm, mode, values, target, showCallStack } = clean
  const n = values.length
  const isBinary = algorithm === 'binary'
  const trace = useMemo(() => buildTrace(algorithm, values, target), [algorithm, values, target])
  const steps = trace.steps
  const total = steps.length
  const found = trace.foundIdx >= 0
  const fruit = FRUITS[Math.min(Math.max(Number(exercise.day) || 1, 1), 5) - 1] ?? 'cherry'

  const [k, setK] = useState(0) // comparaciones ya hechas
  const [declared, setDeclared] = useState(false) // binaria: tocó "NO ESTÁ"
  const [phase, setPhase] = useState<Phase>('idle') // predict
  const [guess, setGuess] = useState('')
  const [msg, setMsg] = useState<Msg | null>(null)
  const [wrongIdx, setWrongIdx] = useState<number | null>(null)
  const [flash, setFlash] = useState(0)
  const [moving, setMoving] = useState(false)
  const [unwound, setUnwound] = useState(0)
  const [cols, setCols] = useState(6)
  const [pacPos, setPacPos] = useState<{ x: number; y: number } | null>(null)
  const [pacReady, setPacReady] = useState(false)
  const [pacDir, setPacDir] = useState<'right' | 'left'>('right')

  const wrapRef = useRef<HTMLDivElement | null>(null)
  const gridRef = useRef<HTMLDivElement | null>(null)
  const cellRefs = useRef<(HTMLElement | null)[]>([])
  const guessRef = useRef(0)
  const pacScheduled = useRef(false)
  const flashTimer = useRef<number | null>(null)
  const timers = useRef<Set<number>>(new Set())
  const seq = useRef<number[]>([])
  /** errores ya cobrados ("k:celda" o "k:no-esta"): repetir el mismo no cuesta otra vida */
  const triedRef = useRef<Set<string>>(new Set())
  const latest = useRef({ onCheck, onStep })
  useLayoutEffect(() => {
    latest.current = { onCheck, onStep }
  })

  const later = useCallback((fn: () => void, ms: number, isSeq = false) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id)
      fn()
    }, ms)
    timers.current.add(id)
    if (isSeq) seq.current.push(id)
    return id
  }, [])
  const clearSeq = useCallback(() => {
    seq.current.forEach((id) => {
      window.clearTimeout(id)
      timers.current.delete(id)
    })
    seq.current = []
  }, [])
  useEffect(() => {
    const all = timers.current
    return () => {
      all.forEach((id) => window.clearTimeout(id))
      all.clear()
      seq.current = []
      pacScheduled.current = false // StrictMode vuelve a montar: que se reprograme
      if (flashTimer.current !== null) window.clearTimeout(flashTimer.current)
    }
  }, [])

  // ───────── estado derivado ─────────
  const effK = showSolution && phase !== 'running' ? total : k
  const allEaten = effK >= total
  const decl = declared || showSolution
  const resolved =
    mode === 'predict' ? phase === 'done' || showSolution : allEaten && (found || !isBinary || decl)
  const lo = effK === 0 ? 0 : steps[effK - 1].nlo
  const hi = effK === 0 ? n - 1 : steps[effK - 1].nhi
  const pacIdx = effK === 0 ? 0 : steps[effK - 1].idx
  const interactive = mode === 'play' && !locked && !resolved && !showSolution

  const orderOf = new Map<number, number>()
  for (let j = 0; j < effK; j++) orderOf.set(steps[j].idx, j + 1)

  const marks = new Map<number, MarkKind[]>()
  if (isBinary) {
    const add = (i: number, m: MarkKind) => {
      if (i >= 0 && i < n) marks.set(i, [...(marks.get(i) ?? []), m])
    }
    add(lo, 'ini')
    if (effK > 0) add(steps[effK - 1].idx, 'med')
    add(hi, 'fin')
  }

  // marcos de la pila de llamadas (binaria recursiva)
  const stackOn = showCallStack && isBinary
  const frames = useMemo<Frame[]>(() => {
    if (!stackOn) return []
    const out: Frame[] = []
    let l = 0
    let h = n - 1
    for (let j = 0; j <= effK; j++) {
      if (j > 0) {
        const prev = steps[j - 1]
        if (prev.cmp === 'eq') break
        l = prev.nlo
        h = prev.nhi
      }
      out.push({ lo: l, hi: h, step: j < effK ? steps[j] : undefined })
    }
    return out
  }, [stackOn, effK, steps, n])
  const framesLen = useRef(0)
  framesLen.current = frames.length

  // los marcos regresan uno por uno cuando la búsqueda termina
  useEffect(() => {
    if (!stackOn || !resolved || showSolution) return
    let u = 0
    setUnwound(0)
    const id = window.setInterval(() => {
      u += 1
      setUnwound(u)
      if (u >= framesLen.current - 1) window.clearInterval(id)
    }, 650)
    return () => window.clearInterval(id)
  }, [stackOn, resolved, showSolution])

  // ───────── medidas: columnas y posición del comecocos ─────────
  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const update = () => {
      const w = el.clientWidth
      if (w > 0) setCols(calcCols(w, n))
    }
    update()
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(update)
      ro.observe(el)
      return () => ro.disconnect()
    }
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [n])

  useLayoutEffect(() => {
    const el = cellRefs.current[pacIdx]
    if (!el || !gridRef.current) return
    const x = el.offsetLeft + el.offsetWidth / 2 - PAC / 2
    const y = el.offsetTop + STRIP / 2 - PAC / 2
    setPacPos((p) => (p && p.x === x && p.y === y ? p : { x, y }))
    if (!pacScheduled.current) {
      // la primera colocación no se anima (no debe "viajar" desde la esquina)
      pacScheduled.current = true
      later(() => setPacReady(true), 80)
    }
  })

  // el comecocos mira hacia donde se mueve y mastica mientras come
  const prevK = useRef(effK)
  useEffect(() => {
    if (prevK.current === effK) return
    const prevIdx = prevK.current === 0 ? 0 : (steps[prevK.current - 1]?.idx ?? 0)
    setPacDir(pacIdx < prevIdx ? 'left' : 'right')
    prevK.current = effK
    setMoving(true)
    later(() => setMoving(false), 520)
  }, [effK, pacIdx, steps, later])

  // fantasmas + sacudida cuando el runner nos avisa de un error
  const prevAttempt = useRef(attempt)
  useEffect(() => {
    if (attempt === prevAttempt.current) return
    prevAttempt.current = attempt
    if (attempt > 0) {
      setFlash((f) => f + 1)
      if (flashTimer.current !== null) window.clearTimeout(flashTimer.current)
      flashTimer.current = window.setTimeout(() => setFlash(0), 1200)
    }
  }, [attempt])

  // ───────── efectos locales (partículas / texto flotante) ─────────
  const fxAt = (i: number, text: string, color: string, count = 10) => {
    const el = cellRefs.current[i]
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = r.left + r.width / 2
    burst(x, r.top + 16, { color, count })
    floatText(x, r.top, text, { color })
  }
  const pacColor = () => cssVar('--pac', '#ffe600')
  const okColor = () => cssVar('--ok', '#3cff6e')

  // ───────── juego: tocar celdas ─────────
  const wrong = (i: number | null, text: string, answer: unknown) => {
    const sig = `${k}:${i === null ? 'no-esta' : i}`
    const repeated = triedRef.current.has(sig)
    triedRef.current.add(sig)
    if (i !== null) {
      setWrongIdx(i)
      later(() => setWrongIdx((w) => (w === i ? null : w)), 700)
    }
    setMsg({ tone: 'bad', text })
    if (repeated) return
    latest.current.onCheck(false, answer)
  }

  const onTap = (i: number) => {
    if (!interactive) return
    sfx.click()
    if (k >= total) {
      // binaria sin rango: ya solo falta declarar "NO ESTÁ"
      wrong(i, `Ya no queda rango (**inicio > fin**). Toca **NO ESTÁ (-1)**.`, { tapped: i })
      return
    }
    const s = steps[k]
    if (i === s.idx) {
      const nk = k + 1
      setK(nk)
      setWrongIdx(null)
      const last = s.cmp === 'eq'
      const seqEnd = !isBinary && nk >= total && !last
      let text = stepText(algorithm, s, values, target, nk)
      if (last) {
        fxAt(i, '¡LO TENGO!', okColor(), 18)
        later(() => latest.current.onCheck(true, { comparisons: nk, index: s.idx }), 700)
      } else if (seqEnd) {
        text = `Llegaste al final: el ${target} **no está** → devuelve **-1** (${plural(nk, 'comparación', 'comparaciones')}).`
        fxAt(i, '+1', pacColor())
        later(() => latest.current.onCheck(true, { comparisons: nk, index: -1 }), 900)
      } else {
        if (isBinary) {
          text +=
            s.nlo > s.nhi ? ` Ahora **inicio (${s.nlo}) > fin (${s.nhi})**: ya no queda nada. Toca **NO ESTÁ (-1)**.` : ' Toca el nuevo **MEDIO**.'
        }
        fxAt(i, '+1', pacColor())
        latest.current.onStep?.()
      }
      setMsg({ tone: last || seqEnd ? 'ok' : 'info', text })
      return
    }
    if (orderOf.has(i)) {
      setMsg({ tone: 'info', text: 'Esa celda ya se la comió el comecocos.' })
      return
    }
    if (isBinary) {
      if (i < lo || i > hi) wrong(i, 'Esa parte ya se descartó. Busca entre **INI** y **FIN**.', { tapped: i })
      else
        wrong(
          i,
          `Pista: inicio = ${lo}, fin = ${hi} → **medio = (${lo} + ${hi}) / 2**. ¡**División entera**, sin decimales!`,
          { tapped: i },
        )
    } else {
      wrong(i, `¡En orden! Toca primero la celda **${k}**.`, { tapped: i })
    }
  }

  const declareNotFound = () => {
    if (mode !== 'play' || !isBinary || locked || resolved || showSolution) return
    sfx.click()
    if (k >= total && !found) {
      setDeclared(true)
      setMsg({ tone: 'ok', text: `**Caso base**: **inicio (${lo}) > fin (${hi})**. Devuelve **-1**. ¡Bien!` })
      burst(window.innerWidth / 2, window.innerHeight / 2, { color: okColor(), count: 14 })
      later(() => latest.current.onCheck(true, { comparisons: total, index: -1 }), 700)
    } else {
      wrong(null, `Todavía no: **inicio (${lo}) ≤ fin (${hi})**, aún hay celdas por revisar. Sigue con el **medio**.`, 'no-esta')
    }
  }

  // ───────── predicción: animar y evaluar ─────────
  const finish = (g: number) => {
    setPhase('done')
    setK(total)
    const ok = g === total
    setMsg(
      ok
        ? { tone: 'ok', text: `¡**EXACTO**! Fueron **${plural(total, 'comparación', 'comparaciones')}**.` }
        : {
            tone: 'bad',
            text: `Fueron **${plural(total, 'comparación', 'comparaciones')}**, no ${g}. Mira cómo se come una celda por cada comparación.`,
          },
    )
    latest.current.onCheck(ok, g)
  }

  const submit = () => {
    if (locked || phase !== 'idle') return
    const g = parseInt(guess, 10)
    if (!Number.isFinite(g)) {
      setMsg({ tone: 'bad', text: 'Escribe un número con el teclado y luego toca COMPROBAR.' })
      return
    }
    guessRef.current = g
    sfx.click()
    setPhase('running')
    setK(0)
    setMsg({ tone: 'info', text: '¡Mira! El comecocos revisa celda por celda…' })
    const per = Math.max(280, Math.min(isBinary ? 1000 : 560, Math.floor(5200 / Math.max(total, 1))))
    const lead = 450
    steps.forEach((s, j) => {
      later(
        () => {
          setK(j + 1)
          sfx.waka()
          setMsg({ tone: s.cmp === 'eq' ? 'ok' : 'info', text: stepText(algorithm, s, values, target, j + 1) })
          if (s.cmp === 'eq') fxAt(s.idx, '¡LO TENGO!', okColor(), 18)
          else fxAt(s.idx, '+1', pacColor())
        },
        lead + per * j,
        true,
      )
    })
    later(() => finish(g), lead + per * total + 650, true)
  }

  const skip = () => {
    if (phase !== 'running') return
    clearSeq()
    setK(total)
    setMsg({ tone: 'info', text: 'Resultado de la búsqueda…' })
    later(() => finish(guessRef.current), 500, true)
  }

  const retry = () => {
    clearSeq()
    setPhase('idle')
    setK(0)
    setGuess('')
    setMsg(null)
  }

  // ───────── textos ─────────
  const list = steps.map((s) => values[s.idx]).join(', ')
  const solText = `Así era: revisa ${list} → **${plural(total, 'comparación', 'comparaciones')}**${
    found ? ` y lo encuentra en la posición **${trace.foundIdx}**.` : ' y **no está**: devuelve **-1**.'
  }`
  const idleText =
    mode === 'predict'
      ? '¿Cuántas **comparaciones** hará? Escribe tu predicción y mira cómo el comecocos lo revisa.'
      : isBinary
        ? 'Toca la celda del **MEDIO**: **medio = (inicio + fin) / 2**, sin decimales.'
        : `Toca las celdas **EN ORDEN**, desde la 0, hasta encontrar el ${target}.`
  const status: Msg = showSolution ? { tone: 'info', text: solText } : (msg ?? { tone: 'info', text: idleText })
  const analogy = isBinary
    ? 'Como adivinar un número del 1 al 100: "¿más alto o más bajo?". Cada intento **descarta la mitad**.'
    : 'Como buscar tus llaves: bolsillo por bolsillo, **uno por uno**.'
  const needsDeclare = interactive && isBinary && allEaten && !found && !declared
  const countLabel = mode === 'predict' && phase === 'idle' && !showSolution ? '?' : String(effK)

  const renderCell = (v: number, i: number) => {
    const order = orderOf.get(i)
    const eaten = order !== undefined
    const dim = isBinary && !eaten && (i < lo || i > hi)
    const foundCell = resolved && found && i === trace.foundIdx
    const next = !isBinary && interactive && i === effK
    const cls = [
      'ssg-cell',
      eaten ? 'is-eaten' : '',
      dim ? 'is-dim' : '',
      foundCell ? 'is-found' : '',
      next ? 'is-next' : '',
      wrongIdx === i ? 'is-wrong' : '',
    ]
      .filter(Boolean)
      .join(' ')
    const label = `Posición ${i}, valor ${v}${eaten ? `, revisada en la comparación ${order}` : dim ? ', descartada' : ''}`
    const mk = marks.get(i) ?? []
    const body = (
      <>
        <span className="ssg-strip" aria-hidden="true">
          {eaten ? null : dim ? (
            <span className="ssg-ghostwrap">
              <Ghost color="scared" size={22} float />
            </span>
          ) : (
            <span className="ssg-pellet" />
          )}
        </span>
        <span className="ssg-box">
          {order !== undefined && <span className="ssg-order">{order}</span>}
          <span className="ssg-val">{v}</span>
        </span>
        <span className="ssg-idx" aria-hidden="true">
          {i}
        </span>
        {isBinary && (
          <span className="ssg-marks" aria-hidden="true">
            {mk.map((m) => (
              <span key={m} className={`ssg-mark ssg-mark--${m}`}>
                {MARK_LABEL[m]}
              </span>
            ))}
          </span>
        )}
      </>
    )
    if (mode === 'play') {
      return (
        <button
          key={i}
          type="button"
          ref={(el) => {
            cellRefs.current[i] = el
          }}
          className={cls}
          aria-label={label}
          disabled={!interactive}
          onClick={() => onTap(i)}
        >
          {body}
        </button>
      )
    }
    return (
      <div
        key={i}
        ref={(el) => {
          cellRefs.current[i] = el
        }}
        className={cls}
        role="img"
        aria-label={label}
      >
        {body}
      </div>
    )
  }

  return (
    <div className={`ssg ssg--${algorithm}${flash > 0 ? ' ssg--hit' : ''}`}>
      <div className="ssg-hud">
        <div className={`ssg-target${resolved && found ? ' is-won' : ''}`}>
          <div className="ssg-hud-col">
            <span className="ssg-tag">{isBinary ? 'BINARIA' : 'SECUENCIAL'}</span>
            <span className="ssg-tag">BUSCANDO</span>
          </div>
          <Fruit kind={fruit} size={32} />
          <span className="ssg-target-val">{target}</span>
        </div>
        <div className="ssg-counter">
          <span className="ssg-tag">COMPARACIONES</span>
          <span key={effK} className="ssg-count" aria-live="polite" aria-label={`Comparaciones: ${countLabel}`}>
            {countLabel}
          </span>
        </div>
      </div>
      <p className="ssg-analogy">
        <RichText text={analogy} />
      </p>

      <div className={`ssg-layout${stackOn ? ' ssg-layout--stack' : ''}`}>
        <div className="ssg-main">
          <div className="ssg-board">
            <div className="ssg-legend" aria-hidden="true">
              {isBinary ? (
                <>
                  <span className="ssg-mark ssg-mark--ini">INI</span> inicio
                  <span className="ssg-mark ssg-mark--med">MED</span> medio
                  <span className="ssg-mark ssg-mark--fin">FIN</span> fin
                  <span className="ssg-legend-ghost">
                    <Ghost color="scared" size={18} float={false} />
                  </span>
                  descartado
                </>
              ) : (
                <>
                  <span className="ssg-pellet" /> sin revisar
                  <span className="ssg-order ssg-order--demo">1</span> orden de revisión
                </>
              )}
            </div>
            <div className="ssg-board-inner" ref={wrapRef}>
              <div
                className="ssg-grid"
                ref={gridRef}
                style={{ gridTemplateColumns: `repeat(${cols}, minmax(${MIN_CELL}px, 60px))` }}
              >
                {values.map((v, i) => renderCell(v, i))}
                <div
                  className={`ssg-pac${pacReady ? ' is-ready' : ''}`}
                  style={pacPos ? { transform: `translate(${pacPos.x}px, ${pacPos.y}px)` } : { visibility: 'hidden' }}
                  aria-hidden="true"
                >
                  <PacMan size={PAC} dir={pacDir} chomp={moving || phase === 'running'} />
                </div>
                {flash > 0 && (
                  <div key={flash} className="ssg-chaser" aria-hidden="true">
                    <Ghost color="red" size={32} float={false} />
                    <Ghost color="cyan" size={26} float={false} />
                  </div>
                )}
              </div>
            </div>
          </div>

          <p className={`ssg-status is-${status.tone}`} role="status" aria-live="polite">
            <RichText text={status.text} />
          </p>

          {mode === 'play' && isBinary && (
            <button
              type="button"
              className={`px-btn ssg-nofound${needsDeclare ? ' px-btn--primary ssg-pulse' : ''}`}
              disabled={!interactive}
              onClick={declareNotFound}
            >
              NO ESTÁ (-1)
            </button>
          )}

          {mode === 'predict' && (
            <div className="ssg-predict">
              {showSolution ? (
                <div className="px-panel ssg-answer">
                  <span className="ssg-tag">RESPUESTA</span>
                  <span className="ssg-answer-val">{total}</span>
                </div>
              ) : (
                <>
                  <p className="ssg-tag ssg-ask">¿CUÁNTAS COMPARACIONES HARÁ?</p>
                  <Keypad
                    value={guess}
                    onChange={setGuess}
                    onSubmit={submit}
                    maxLength={3}
                    disabled={locked || phase !== 'idle'}
                    submitLabel="COMPROBAR"
                  />
                  {phase === 'running' && (
                    <button type="button" className="px-btn px-btn--ghost ssg-skip" onClick={skip}>
                      SALTAR <PixelIcon name="arrow-right" size={14} />
                      <PixelIcon name="arrow-right" size={14} />
                    </button>
                  )}
                  {phase === 'done' && !locked && status.tone === 'bad' && (
                    <button type="button" className="px-btn px-btn--primary" onClick={retry}>
                      OTRA VEZ
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {stackOn && (
          <CallStack
            frames={frames}
            target={target}
            values={values}
            resolved={resolved}
            unwound={unwound}
            retVal={trace.foundIdx}
            revealMid={mode === 'predict'}
          />
        )}
      </div>
    </div>
  )
}

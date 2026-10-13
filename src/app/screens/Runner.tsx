/**
 * RUNNER: monta un ejercicio con el contrato ExerciseProps y decide vidas,
 * puntaje, combo, sonido y recompensas.
 */
import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react'
import type { Exercise, ExerciseProps } from '../../engine/types'
import { MAX_LIVES, TIER_NAMES, dayInfo, type DayNum } from '../../engine/course'
import { getDay, getModule } from '../../engine/content'
import { comboMultiplier, computeScore, starsFor, HINT_FACTOR, type ScoreBreakdown } from '../../engine/scoring'
import { tierStats } from '../../engine/progress'
import { useGame, type RecordOutcome } from '../game'
import { Banner, Fruit, Ghost, Lives, Modal, PacMan, Pellets, Stars, burst, floatText, sfx, shake, toast } from '../../ui'
import { ErrorBoundary } from '../ErrorBoundary'
import { readJSON, writeJSON } from '../../engine/storage'
import { padScore, prefersReducedMotion, useCountUp } from '../hooks'

interface Props {
  day: DayNum
  exercise: Exercise
  onNext: (outcome: RecordOutcome) => void
  onRetry: () => void
  onExit: () => void
}

interface Finish {
  correct: boolean
  score: ScoreBreakdown
  stars: number
  mistakes: number
  combo: number
  outcome: RecordOutcome
}

type Tone = 'pac' | 'ok' | 'bad' | 'info'

function CountNum({ value }: { value: number }) {
  const v = useCountUp(value, 900, 0)
  return <>{v}</>
}

/**
 * Errores/pista de un ejercicio que se dejó a medias (para que salir y volver
 * no regale vidas nuevas). Solo partidas "de verdad" (no práctica ni sala de pruebas).
 */
type Pending = Record<string, { m: number; h: boolean } | undefined>
const pendKey = (control: string) => `ed:pend:${control}`
function readPending(control: string | null, exId: string): { m: number; h: boolean } {
  if (!control) return { m: 0, h: false }
  const p = readJSON<Pending>(pendKey(control))?.[exId]
  const m = Math.max(0, Math.min(MAX_LIVES - 1, Math.floor(Number(p?.m) || 0)))
  return { m, h: !!p?.h }
}
function writePending(control: string | null, exId: string, v: { m: number; h: boolean } | null) {
  if (!control) return
  const all = readJSON<Pending>(pendKey(control)) ?? {}
  if (v) all[exId] = v
  else delete all[exId]
  writeJSON(pendKey(control), all)
}

export function Runner({ day, exercise, onNext, onRetry, onExit }: Props) {
  const game = useGame()
  const mod = getModule(exercise.type)
  const dc = getDay(day)
  const info = dayInfo(day)
  const [replay] = useState(() => !!game.prog[exercise.id]?.finished)
  /** se recuerdan errores/pista si el alumno sale a medias (no en práctica ni en la sala de pruebas) */
  const tracked = !replay && day !== 0
  const [resume] = useState(() => (tracked ? readPending(game.control, exercise.id) : { m: 0, h: false }))

  const [lives, setLives] = useState(MAX_LIVES - resume.m)
  const [attempt, setAttempt] = useState(0)
  const [locked, setLocked] = useState(false)
  const [showSolution, setShowSolution] = useState(false)
  const [usedHint, setUsedHint] = useState(resume.h)
  const [askHint, setAskHint] = useState(false)
  const [banner, setBanner] = useState<{ id: number; text: string; tone: Tone } | null>({ id: 1, text: 'READY!', tone: 'pac' })
  const [finish, setFinish] = useState<Finish | null>(null)
  const [ghostRun, setGhostRun] = useState(0)
  const [powerRun, setPowerRun] = useState(0)

  const mistakesRef = useRef(resume.m)
  const lockedRef = useRef(false)
  const usedHintRef = useRef(resume.h)
  const savePending = () => {
    if (tracked && !lockedRef.current) writePending(game.control, exercise.id, { m: mistakesRef.current, h: usedHintRef.current })
  }
  const startRef = useRef(performance.now())
  const pointerRef = useRef<{ x: number; y: number } | null>(null)
  const cardRef = useRef<HTMLElement>(null)
  const playRef = useRef<HTMLDivElement>(null)
  const resultRef = useRef<HTMLElement>(null)
  const nextBtnRef = useRef<HTMLButtonElement>(null)
  const timers = useRef<number[]>([])

  const total = useCountUp(game.total, 800)
  const combo = game.combo
  const mult = comboMultiplier(combo)
  const ts = dc ? tierStats(dc, exercise.tier, game.prog) : { total: 1, finished: 0 }

  /** setTimeout que se cancela al desmontar (solo para cambios de estado) */
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }, [])
  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), [])

  // volvió a un ejercicio que dejó a medias: avisar con cuántas vidas sigue
  const resumeToast = useRef(false)
  useEffect(() => {
    if (resume.m <= 0 || resumeToast.current) return
    resumeToast.current = true
    const left = MAX_LIVES - resume.m
    toast(`Sigues donde te quedaste: ${left} ${left === 1 ? 'vida' : 'vidas'}`, { icon: '👻' })
  }, [resume.m])

  // respaldo por si el Banner no llama onDone
  useEffect(() => {
    if (!banner) return
    const id = banner.id
    const t = window.setTimeout(() => setBanner((b) => (b && b.id === id ? null : b)), 1700)
    return () => clearTimeout(t)
  }, [banner])

  const point = useCallback((): { x: number; y: number } => {
    if (pointerRef.current) return pointerRef.current
    const r = playRef.current?.getBoundingClientRect()
    if (r) return { x: r.left + r.width / 2, y: Math.max(80, Math.min(window.innerHeight - 80, r.top + Math.min(r.height / 2, 160))) }
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
  }, [])

  // ───────── lógica de partida (refs → callbacks estables para los ejercicios) ─────────
  const logic = useRef({ step: () => {}, check: (_c: boolean) => {} })

  logic.current.step = () => {
    if (lockedRef.current) return
    sfx.waka()
    const p = point()
    burst(p.x, p.y, { count: 8, color: 'var(--pac)' })
  }

  const finishRun = (correct: boolean) => {
    lockedRef.current = true
    setLocked(true)
    if (tracked) writePending(game.control, exercise.id, null)
    const mistakes = mistakesRef.current
    const timeMs = Math.round(performance.now() - startRef.current)
    let c = game.getCombo()
    if (!correct || mistakes > 0) c = 0
    else if (!replay) c += 1
    game.setCombo(c)
    const score = computeScore(exercise, { mistakes, usedHint: usedHintRef.current, combo: c, solved: correct })
    const stars = starsFor(mistakes, correct)
    const outcome = game.recordResult({
      exercise,
      day,
      correct,
      score: score.total,
      stars,
      mistakes,
      usedHint: usedHintRef.current,
      timeMs,
      combo: c,
    })
    setFinish({ correct, score, stars, mistakes, combo: c, outcome })

    const p = point()
    if (!correct) {
      setShowSolution(true)
      sfx.death()
      setBanner({ id: Date.now(), text: '¡TE ATRAPÓ!', tone: 'bad' })
    } else {
      sfx.correct()
      burst(p.x, p.y, { count: 36 })
      window.setTimeout(() => burst(p.x, p.y, { count: 20, color: 'var(--pac)' }), 140)
      floatText(p.x, p.y - 24, `+${score.total}`, { color: 'var(--pac)' })
      setBanner({ id: Date.now(), text: mistakes === 0 ? '¡PERFECTO!' : '¡LO LOGRASTE!', tone: 'ok' })
      if (c >= 2) window.setTimeout(() => sfx.combo(c), 260)
      if (c >= 3) {
        window.setTimeout(() => {
          sfx.powerUp()
          toast(`¡COMBO x${c}!`, { icon: '⚡' })
        }, 520)
        later(() => setPowerRun((n) => n + 1), 520)
      }
    }
    // logros y rango (no se cancelan al salir: son globales)
    let delay = 1100
    for (const a of outcome.achievements) {
      window.setTimeout(() => {
        sfx.achievement()
        toast(a.title, { icon: a.icon })
      }, delay)
      delay += 1300
    }
    if (outcome.rankUp) {
      const name = outcome.rankUp
      window.setTimeout(() => {
        sfx.achievement()
        toast(`NUEVO RANGO: ${name}`, { icon: '👑' })
      }, delay)
    }
    later(() => {
      resultRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
      nextBtnRef.current?.focus({ preventScroll: true })
    }, 700)
  }

  logic.current.check = (correct: boolean) => {
    if (lockedRef.current) return
    if (correct) {
      finishRun(true)
      return
    }
    mistakesRef.current += 1
    const left = MAX_LIVES - mistakesRef.current
    setLives(Math.max(0, left))
    setAttempt((a) => a + 1)
    game.setCombo(0)
    if (left <= 0) {
      finishRun(false)
      return
    }
    savePending()
    sfx.wrong()
    shake(cardRef.current)
    setGhostRun((n) => n + 1)
    const p = point()
    floatText(p.x, p.y, '-1 VIDA', { color: 'var(--bad)' })
  }

  const onCheck = useCallback((correct: boolean) => logic.current.check(correct), [])
  const onStep = useCallback(() => logic.current.step(), [])

  const confirmHint = () => {
    usedHintRef.current = true
    savePending()
    setUsedHint(true)
    setAskHint(false)
    sfx.click()
  }

  const skipBroken = () => {
    if (lockedRef.current) return
    lockedRef.current = true
    if (tracked) writePending(game.control, exercise.id, null)
    const outcome = game.recordResult({
      exercise,
      day,
      correct: false,
      score: 0,
      stars: 0,
      mistakes: mistakesRef.current,
      usedHint: usedHintRef.current,
      timeMs: Math.round(performance.now() - startRef.current),
      combo: game.getCombo(),
      skipped: true,
    })
    onNext(outcome)
  }

  const Comp = mod?.Component as ComponentType<ExerciseProps> | undefined
  const title = finish ? (finish.correct ? (finish.mistakes === 0 ? '¡PERFECTO!' : '¡RESUELTO!') : '¡TE ATRAPÓ!') : ''

  return (
    <div className="eda-runner">
      <div className="eda-hud" role="group" aria-label="Marcador">
        <button type="button" className="px-btn px-btn--sm eda-hud__back" onClick={onExit} aria-label="Volver al mapa del día">
          ◀
        </button>
        <span className="eda-hud__fruit" aria-hidden="true">
          <Fruit kind={info.fruit} size={24} />
        </span>
        <div className="eda-hud__score" aria-label={`Puntaje total ${game.total}`}>
          <span className="eda-hud__label">1UP</span>
          <span className="eda-hud__num">{padScore(total)}</span>
        </div>
        <div className="eda-hud__lives" aria-label={`${lives} ${lives === 1 ? 'vida' : 'vidas'}`}>
          <Lives lives={lives} max={MAX_LIVES} />
        </div>
        <div className={`eda-hud__combo${mult > 1 ? ' is-hot' : ''}`} aria-label={`Combo ${combo}`}>
          <span className="eda-hud__label">COMBO</span>
          <span className="eda-hud__num">
            {combo}
            {mult > 1 ? ` ×${mult}` : ''}
          </span>
        </div>
        <div className="eda-hud__pellets" aria-label={`Nivel ${exercise.tier}: ${ts.finished} de ${ts.total}`}>
          <Pellets total={ts.total} done={ts.finished} />
        </div>
      </div>

      <article ref={cardRef} className={`eda-card px-panel${exercise.tier === 4 ? ' eda-card--boss' : ''}`}>
        <header className="eda-card__head">
          <span className="eda-tag">{exercise.topic}</span>
          <span className="eda-tag eda-tag--tier">
            NIVEL {exercise.tier} · {TIER_NAMES[exercise.tier]}
          </span>
          {replay && <span className="eda-tag eda-tag--info">PRÁCTICA</span>}
          {exercise.tier === 4 && (
            <span className="eda-card__boss" aria-hidden="true">
              <Ghost color="red" size={30} float />
            </span>
          )}
        </header>
        <h1 className="px-title eda-card__title">{exercise.title}</h1>
        <p className="eda-card__prompt">{exercise.prompt}</p>

        {exercise.hint &&
          (usedHint ? (
            <div className="eda-hint" role="note">
              <span className="eda-hint__label">PISTA</span> {exercise.hint}
            </div>
          ) : (
            <button
              type="button"
              className="px-btn px-btn--sm eda-hint-btn"
              disabled={locked}
              onClick={() => {
                sfx.click()
                setAskHint(true)
              }}
            >
              💡 PISTA
            </button>
          ))}

        <div
          ref={playRef}
          className="eda-play"
          onPointerDownCapture={(e) => {
            pointerRef.current = { x: e.clientX, y: e.clientY }
          }}
        >
          <ErrorBoundary
            resetKey={exercise.id}
            fallback={() => (
              <div className="eda-crash">
                <Ghost color="scared" size={40} />
                <p>¡Ups! Este ejercicio tuvo un problema técnico. No es tu culpa.</p>
                <div className="px-row">
                  <button type="button" className="px-btn px-btn--primary" onClick={skipBroken}>
                    SALTAR ▶
                  </button>
                  <button type="button" className="px-btn" onClick={onExit}>
                    MAPA
                  </button>
                </div>
              </div>
            )}
          >
            {Comp ? (
              <Comp
                key={exercise.id}
                exercise={exercise}
                onCheck={onCheck}
                onStep={onStep}
                locked={locked}
                showSolution={showSolution}
                attempt={attempt}
              />
            ) : (
              <p className="eda-muted">Tipo de ejercicio desconocido: {exercise.type}</p>
            )}
          </ErrorBoundary>
        </div>
      </article>

      {finish && (
        <section ref={resultRef} className={`eda-result px-panel anim-pop${finish.correct ? '' : ' is-dead'}`} aria-live="polite">
          <div className="eda-result__top">
            <h2 className={`px-title eda-result__title${finish.correct ? '' : ' is-bad'}`}>{title}</h2>
            <Stars value={finish.stars} size={34} animate />
          </div>

          <div className="eda-result__score">
            <span className="eda-result__points">
              +<CountNum value={finish.score.total} /> PTS
            </span>
            {replay &&
              (finish.outcome.improved ? (
                <span className="eda-tag eda-tag--ok anim-blink">¡NUEVO RÉCORD!</span>
              ) : (
                <span className="eda-tag">PRÁCTICA · TU MEJOR: {finish.outcome.best}</span>
              ))}
          </div>

          {finish.correct && (
            <ul className="eda-breakdown" aria-label="Desglose del puntaje">
              <li>BASE {finish.score.base}</li>
              {finish.mistakes > 0 && (
                <li className="is-bad">
                  {finish.mistakes} ERROR{finish.mistakes > 1 ? 'ES' : ''} ×{finish.score.mistakeFactor}
                </li>
              )}
              {usedHint && <li className="is-bad">PISTA ×{HINT_FACTOR}</li>}
              {finish.score.comboFactor > 1 && <li className="is-ok">COMBO ×{finish.score.comboFactor}</li>}
            </ul>
          )}

          {!finish.correct && <p className="eda-result__note">La respuesta correcta quedó marcada arriba. ¡Revísala con calma!</p>}

          {exercise.explanation && (
            <div className="eda-explain">
              <h3 className="eda-explain__title">
                <PacMan size={18} dir="right" /> ¿POR QUÉ?
              </h3>
              <p className="eda-explain__text">{exercise.explanation}</p>
            </div>
          )}

          <div className="eda-result__actions">
            <button
              ref={nextBtnRef}
              type="button"
              className="px-btn px-btn--primary px-btn--block eda-next"
              onClick={() => {
                sfx.click()
                onNext(finish.outcome)
              }}
            >
              SIGUIENTE ▶
            </button>
            <div className="px-row eda-result__secondary">
              <button
                type="button"
                className="px-btn px-btn--sm"
                onClick={() => {
                  sfx.click()
                  onRetry()
                }}
              >
                ↻ REINTENTAR
              </button>
              <button type="button" className="px-btn px-btn--sm px-btn--ghost" onClick={onExit}>
                MAPA
              </button>
            </div>
          </div>
        </section>
      )}

      <Modal open={askHint} title="¿USAR PISTA?" onClose={() => setAskHint(false)}>
        <p className="eda-modal-text">Ver la pista cuesta el 30% de los puntos de este ejercicio.</p>
        <div className="px-row">
          <button type="button" className="px-btn px-btn--primary" onClick={confirmHint}>
            SÍ, VER PISTA
          </button>
          <button type="button" className="px-btn" onClick={() => setAskHint(false)}>
            MEJOR NO
          </button>
        </div>
      </Modal>

      {banner && (
        <Banner
          key={banner.id}
          text={banner.text}
          tone={banner.tone}
          onDone={() => setBanner((b) => (b && b.id === banner.id ? null : b))}
        />
      )}

      {ghostRun > 0 && (
        <div className="eda-fx-layer" aria-hidden="true" key={`g${ghostRun}`}>
          <div className="eda-ghostrun">
            <Ghost color="red" size={44} />
          </div>
        </div>
      )}
      {powerRun > 0 && (
        <div className="eda-fx-layer" aria-hidden="true" key={`p${powerRun}`}>
          <div className="eda-powerrun">
            <PacMan size={44} dir="right" chomp />
            <span className="eda-powerrun__gap" />
            <Ghost color="scared" size={36} />
            <Ghost color="scared" size={36} />
            <Ghost color="scared" size={36} />
          </div>
        </div>
      )}
    </div>
  )
}


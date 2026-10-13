/**
 * quiz — opción múltiple estilo arcade.
 * Tocar una opción la selecciona (el comecocos se le para enfrente); COMPROBAR → onCheck(correcta).
 * Una opción incorrecta se queda marcada con un fantasma y se bloquea para que el alumno pruebe otra.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ExerciseModule, ExerciseProps } from '../../engine/types'
import type { QuizData } from '../schemas'
import { ContextView } from '../_shared/ContextView'
import { BadData } from '../_shared/BadData'
import { seededShuffle } from '../_shared/shuffle'
import { useAttemptFlash } from '../_shared/useAttemptFlash'
import { cssVar, centerOf } from '../_shared/dom'
import { Fruit, Ghost, PacMan, burst, sfx, type FruitKind, type GhostColor } from '../../ui'
import './quiz.css'

const LETTERS = ['A', 'B', 'C', 'D', 'E']
const FRUITS: FruitKind[] = ['cherry', 'strawberry', 'orange', 'apple', 'melon']
const GHOSTS: GhostColor[] = ['red', 'pink', 'cyan', 'orange']

interface Opt {
  text: string
  /** índice original dentro de data.choices */
  orig: number
}

type OptState = 'idle' | 'selected' | 'wrong' | 'correct'

function buildOptions(id: string, data: QuizData | undefined): Opt[] | null {
  const raw = data && Array.isArray(data.choices) ? data.choices : []
  const opts: Opt[] = raw.slice(0, LETTERS.length).map((c, i) => ({ text: String(c ?? ''), orig: i }))
  if (opts.length === 0) return null
  const ans = data?.answer
  if (typeof ans !== 'number' || !Number.isInteger(ans) || ans < 0 || ans >= opts.length) return null
  return data?.shuffle === false ? opts : seededShuffle(opts, id)
}

function QuizInner({ exercise, onCheck, locked, showSolution, attempt }: ExerciseProps<QuizData>) {
  const data = exercise.data
  const options = useMemo(() => buildOptions(exercise.id, data), [exercise.id, data])

  const [sel, setSel] = useState<number | null>(null)
  const [wrong, setWrong] = useState<ReadonlySet<number>>(() => new Set())
  const [solved, setSolved] = useState(false)
  const flash = useAttemptFlash(attempt)
  const rootRef = useRef<HTMLDivElement>(null)

  const fruit = FRUITS[Math.min(Math.max(exercise.day, 1), 5) - 1] ?? 'cherry'

  const optionEl = (i: number): Element | null =>
    rootRef.current?.querySelectorAll('.qz-choice')[i] ?? null

  const select = (i: number) => {
    if (locked || solved || wrong.has(i)) return
    sfx.click()
    setSel(i)
    const c = centerOf(optionEl(i))
    if (c) burst(c.x, c.y, { color: cssVar('--pac'), count: 6 })
  }

  const check = () => {
    if (locked || solved || sel === null || !options) return
    const picked = options[sel]
    if (picked.orig === data.answer) {
      setSolved(true)
      const c = centerOf(optionEl(sel))
      if (c) burst(c.x, c.y, { color: cssVar('--ok'), count: 18 })
      onCheck(true, picked.orig)
    } else {
      setWrong((prev) => new Set(prev).add(sel))
      setSel(null)
      onCheck(false, picked.orig)
    }
  }

  // Atajos de teclado: A–E o 1–5 eligen opción; Enter (sin foco en un botón) comprueba.
  useEffect(() => {
    if (locked || solved || !options) return
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return
      const t = e.target as HTMLElement | null
      const tag = t?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t?.isContentEditable) return
      if (e.key.length === 1) {
        const k = e.key.toUpperCase()
        let i = LETTERS.indexOf(k)
        if (i < 0 && k >= '1' && k <= '5') i = Number(k) - 1
        if (i >= 0 && i < options.length) {
          e.preventDefault()
          select(i)
        }
      } else if (e.key === 'Enter' && sel !== null && (!t || t === document.body)) {
        e.preventDefault()
        check()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked, solved, options, sel, wrong])

  if (!options) {
    return (
      <BadData
        message="Este reto no tiene opciones válidas. Avísale a tu profe."
        onSkip={() => onCheck(true)}
        locked={locked}
      />
    )
  }

  const stateOf = (o: Opt, i: number): OptState => {
    const isAnswer = o.orig === data.answer
    if (solved && sel === i) return 'correct'
    if (showSolution && isAnswer) return 'correct'
    if (wrong.has(i)) return 'wrong'
    if (sel === i) return 'selected'
    return 'idle'
  }

  return (
    <div ref={rootRef} className={`qz${flash ? ' is-flash' : ''}`}>
      <ContextView context={data.context} />

      <div className={`qz-choices${flash ? ' anim-shake' : ''}`} role="group" aria-label="Opciones de respuesta">
        {options.map((o, i) => {
          const st = stateOf(o, i)
          const disabled = locked || solved || wrong.has(i)
          const suffix = st === 'correct' ? ', correcta' : st === 'wrong' ? ', incorrecta' : st === 'selected' ? ', elegida' : ''
          return (
            <button
              key={i}
              type="button"
              className={`qz-choice is-${st}`}
              disabled={disabled}
              aria-pressed={st === 'selected'}
              aria-label={`Opción ${LETTERS[i]}: ${o.text}${suffix}`}
              onClick={() => select(i)}
            >
              <span className="qz-slot" aria-hidden="true">
                {st === 'selected' && <PacMan size={26} chomp className="qz-pac" />}
                {st === 'wrong' && <Ghost color={GHOSTS[i % GHOSTS.length]} size={26} />}
                {st === 'correct' && <span className="anim-pop"><Fruit kind={fruit} size={26} /></span>}
                {st === 'idle' && <i className="qz-pellet" />}
              </span>
              <span className="qz-letter" aria-hidden="true">{LETTERS[i]}</span>
              <span className="qz-text">{o.text}</span>
              {st === 'correct' && <span className="qz-mark" aria-hidden="true">OK</span>}
              {st === 'wrong' && <span className="qz-mark" aria-hidden="true">NO</span>}
            </button>
          )
        })}
      </div>

      {wrong.size > 0 && !locked && !solved && (
        <p className="qz-msg" role="status">
          <Ghost color="red" size={22} />
          <span>¡Esa no era! Elige otra.</span>
        </p>
      )}

      {!locked && !solved && (
        <button
          type="button"
          className="px-btn px-btn--primary px-btn--block qz-go"
          disabled={sel === null}
          onClick={check}
        >
          COMPROBAR
        </button>
      )}
    </div>
  )
}

/** key={exercise.id} reinicia todo el estado interno al cambiar de ejercicio */
function Quiz(props: ExerciseProps<QuizData>) {
  return <QuizInner key={props.exercise.id} {...props} />
}

export default {
  type: 'quiz',
  label: 'Opción múltiple',
  Component: Quiz,
} satisfies ExerciseModule<QuizData>

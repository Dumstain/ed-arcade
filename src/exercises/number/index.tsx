/**
 * number — respuesta numérica con teclado arcade.
 * Marcador + teclado 3x4 (o teclado físico) + COMPROBAR → onCheck(valor ∈ answer).
 * Los intentos fallidos quedan como fantasmitas para no repetir el mismo número.
 */
import { useMemo, useRef, useState } from 'react'
import type { ExerciseModule, ExerciseProps } from '../../engine/types'
import type { NumberData } from '../schemas'
import { ContextView } from '../_shared/ContextView'
import { Keypad } from '../_shared/Keypad'
import { BadData } from '../_shared/BadData'
import { EatStrip } from '../_shared/EatStrip'
import { useAttemptFlash } from '../_shared/useAttemptFlash'
import { cssVar, centerOf } from '../_shared/dom'
import { Ghost, burst, sfx, type GhostColor } from '../../ui'
import './number.css'

const GHOSTS: GhostColor[] = ['red', 'pink', 'cyan', 'orange']

/** Respuestas aceptadas: solo enteros finitos (el teclado no escribe decimales). */
function acceptedAnswers(a: NumberData['answer'] | undefined): number[] {
  const list = Array.isArray(a) ? a : a === undefined ? [] : [a]
  return list.filter((n): n is number => typeof n === 'number' && Number.isInteger(n))
}

function NumberInner({ exercise, onCheck, locked, showSolution, attempt }: ExerciseProps<NumberData>) {
  const data = exercise.data
  const answers = useMemo(() => acceptedAnswers(data?.answer), [data])

  const [value, setValue] = useState('')
  const [tried, setTried] = useState<number[]>([])
  const [dup, setDup] = useState(false)
  const [solved, setSolved] = useState(false)
  const flash = useAttemptFlash(attempt)
  const rootRef = useRef<HTMLDivElement>(null)

  if (answers.length === 0) {
    return (
      <BadData
        message="Este reto no tiene una respuesta numérica válida. Avísale a tu profe."
        onSkip={() => onCheck(true)}
        locked={locked}
      />
    )
  }

  const unit = typeof data.unit === 'string' && data.unit.trim() ? data.unit.trim() : undefined
  // Si hay unidad (conteos) no hace falta el signo; sin unidad la respuesta podría ser -1, etc.
  const allowNegative = answers.some((n) => n < 0) || !unit
  const maxDigits = Math.max(...answers.map((n) => String(Math.abs(n)).length))
  const maxLength = Math.max(6, maxDigits)

  const submit = () => {
    if (locked || solved || !/\d/.test(value)) return
    const n = parseInt(value, 10)
    if (!Number.isFinite(n)) return
    if (tried.includes(n)) {
      setDup(true) // ya lo intentó: no gasta vida
      sfx.click()
      return
    }
    setDup(false)
    if (answers.includes(n)) {
      setSolved(true)
      const c = centerOf(rootRef.current?.querySelector('.kp-display'))
      if (c) burst(c.x, c.y, { color: cssVar('--ok'), count: 18 })
      onCheck(true, n)
    } else {
      setTried((t) => [...t, n])
      setValue('')
      onCheck(false, n)
    }
  }

  const reveal = showSolution && !solved
  const shown = reveal ? String(answers[0]) : value
  const status = solved || reveal ? 'ok' : flash ? 'bad' : 'idle'
  const done = locked || solved
  const others = answers.slice(1).filter((n) => n !== answers[0])

  return (
    <div ref={rootRef} className="nm">
      <ContextView context={data.context} />

      <div className="nm-play">
        {reveal && <div className="nm-cap">LA RESPUESTA ERA</div>}
        <Keypad
          value={shown}
          onChange={(v) => {
            setValue(v)
            if (dup) setDup(false)
          }}
          onSubmit={done ? undefined : submit}
          allowNegative={allowNegative}
          maxLength={maxLength}
          disabled={done}
          unit={unit}
          status={status}
        />
        {reveal && others.length > 0 && <div className="nm-also">También vale: {others.join(' o ')}</div>}

        {dup && !done && (
          <p className="nm-msg" role="status">
            <Ghost color="cyan" size={22} />
            <span>Ese número ya lo probaste. Prueba otro.</span>
          </p>
        )}

        {tried.length > 0 && !solved && (
          <div className="nm-tried" aria-label="Números que ya probaste">
            <span className="nm-tried-label">YA PROBASTE</span>
            {tried.map((n, i) => (
              <span className="nm-try" key={i}>
                <Ghost color={GHOSTS[i % GHOSTS.length]} size={22} />
                <s>{n}</s>
              </span>
            ))}
          </div>
        )}

        {solved && <EatStrip pellets={10} />}
      </div>
    </div>
  )
}

/** key={exercise.id} reinicia todo el estado interno al cambiar de ejercicio */
function NumberExercise(props: ExerciseProps<NumberData>) {
  return <NumberInner key={props.exercise.id} {...props} />
}

export default {
  type: 'number',
  label: 'Respuesta numérica',
  Component: NumberExercise,
} satisfies ExerciseModule<NumberData>

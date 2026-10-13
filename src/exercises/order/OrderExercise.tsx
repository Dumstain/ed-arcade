/**
 * ORDER — "tocar en orden".
 * Fichas revueltas abajo; al tocar una se va al primer hueco libre de la FILA DE RESPUESTA
 * (huecos numerados 1,2,3…). Tocar una ficha colocada la regresa a la bandeja.
 * El comecocos espera en el primer hueco libre, se come los pellets y al final llega a la META.
 * Con todas colocadas -> COMPROBAR -> correcto si el orden (por texto) es idéntico a `items`.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent } from 'react'
import type { ExerciseProps } from '../../engine/types'
import type { OrderData } from '../schemas'
import { ContextView } from '../_shared/ContextView'
import { Fruit, Ghost, PacMan, PixelIcon, RichText, burst, floatText, plainText, sfx } from '../../ui'
import type { FruitKind } from '../../ui'
import { seededPermutation } from './shuffle'
import './order.css'

const FRUITS: FruitKind[] = ['cherry', 'strawberry', 'orange', 'apple', 'melon']

function cssColor(name: string, fallback: string): string {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    return v || fallback
  } catch {
    return fallback
  }
}

function cleanItems(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((v) => v !== null && v !== undefined).map((v) => String(v))
}

/** Índices de `items` en el orden en que aparecen en la bandeja (nunca igual al correcto, si se puede) */
function shuffleItems(items: string[], id: string): number[] {
  const n = items.length
  const identity = Array.from({ length: n }, (_, i) => i)
  if (n < 2) return identity
  const sameAsCorrect = (perm: number[]) => perm.every((p, i) => items[p] === items[i])
  for (let k = 0; k < 12; k++) {
    const perm = seededPermutation(n, `${id}#order#${k}`)
    if (!sameAsCorrect(perm)) return perm
  }
  return identity.map((i) => (i + 1) % n)
}

export default function OrderExercise(props: ExerciseProps<OrderData>) {
  // key = reinicia todo el estado interno al cambiar exercise.id
  return <OrderInner key={props.exercise.id} {...props} />
}

function OrderInner({ exercise, onCheck, locked, showSolution, attempt }: ExerciseProps<OrderData>) {
  const data = exercise.data
  const items = useMemo(() => cleanItems(data?.items), [data])
  const n = items.length
  const layout: 'list' | 'row' =
    data?.layout === 'row' || data?.layout === 'list'
      ? data.layout
      : items.every((t) => plainText(t).length <= 6)
        ? 'row'
        : 'list'
  const trayOrder = useMemo(() => shuffleItems(items, exercise.id), [items, exercise.id])

  // slots[i] = id de la ficha (índice en items) que ocupa el hueco i, o null
  const [slotsRaw, setSlots] = useState<(number | null)[]>(() => new Array<number | null>(n).fill(null))
  const slots = slotsRaw.length === n ? slotsRaw : new Array<number | null>(n).fill(null)
  const [wrong, setWrong] = useState<number[]>([])
  const [solved, setSolved] = useState(false)
  const [hit, setHit] = useState(false)
  const [ghostKey, setGhostKey] = useState(0)
  const [lastIn, setLastIn] = useState<number | null>(null)
  const prevAttempt = useRef(attempt)
  const hitTimer = useRef<number | undefined>(undefined)
  const laneRef = useRef<HTMLElement | null>(null)

  // Cada respuesta incorrecta: sacudida + flash rojo + fantasma que cruza la fila
  useEffect(() => {
    if (attempt === prevAttempt.current) return
    prevAttempt.current = attempt
    if (attempt <= 0) return
    setHit(true)
    setGhostKey((k) => k + 1)
    window.clearTimeout(hitTimer.current)
    hitTimer.current = window.setTimeout(() => setHit(false), 700)
  }, [attempt])
  useEffect(() => () => window.clearTimeout(hitTimer.current), [])

  const placed = new Set<number>()
  for (const s of slots) if (s !== null) placed.add(s)
  const filledCount = placed.size
  const cursor = slots.indexOf(null) // primer hueco libre (-1 = fila completa)
  const full = n > 0 && cursor === -1
  const interactive = !locked && !solved && !showSolution
  const trayItems = trayOrder.filter((id) => !placed.has(id))

  // Huecos mal puestos: tras COMPROBAR, o siempre que se muestre la solución
  const wrongNow =
    showSolution && full
      ? slots.flatMap((id, i) => (id !== null && items[id] !== items[i] ? [i] : []))
      : wrong

  function burstAt(el: Element | null, text?: string, color = '--pac') {
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = r.left + r.width / 2
    const y = r.top + r.height / 2
    burst(x, y, { color: cssColor(color, '#ffe600'), count: text ? 14 : 6 })
    if (text) floatText(x, y - 12, text, { color: cssColor(color, '#3cff6e') })
  }

  function place(id: number, ev: MouseEvent<HTMLButtonElement>) {
    if (!interactive) return
    const slot = slots.indexOf(null)
    if (slot === -1) return
    sfx.click()
    burstAt(ev.currentTarget)
    setWrong((w) => w.filter((i) => i !== slot))
    setLastIn(slot)
    setSlots(slots.map((v, i) => (i === slot ? id : v)))
  }

  function remove(slot: number) {
    if (!interactive) return
    sfx.click()
    setWrong((w) => w.filter((i) => i !== slot))
    setLastIn(null)
    setSlots(slots.map((v, i) => (i === slot ? null : v)))
  }

  function reset() {
    if (!interactive) return
    sfx.click()
    setWrong([])
    setLastIn(null)
    setSlots(new Array<number | null>(n).fill(null))
  }

  function check() {
    // wrong.length > 0 = misma fila que ya se marcó mal: no cobrar otra vida por lo mismo
    if (!interactive || !full || wrong.length > 0) return
    const answer = slots.map((id) => items[id as number])
    const flags: number[] = []
    answer.forEach((t, i) => {
      if (t !== items[i]) flags.push(i)
    })
    if (flags.length === 0) {
      setSolved(true)
      setWrong([])
      burstAt(laneRef.current, '¡ORDEN!', '--ok')
      onCheck(true, answer)
    } else {
      setWrong(flags)
      onCheck(false, answer)
    }
  }

  if (n === 0) {
    return (
      <div className="ord">
        <div className="px-panel ord-warn" role="alert">
          <Ghost color="orange" size={32} />
          <p>
            <PixelIcon name="warning" size={20} className="ord-warn-icon" /> Este ejercicio no trae fichas para ordenar.
          </p>
        </div>
      </div>
    )
  }

  let msg = 'Toca una ficha para mandarla a la fila. Toca una colocada para regresarla.'
  let msgBad = false
  if (solved) msg = '¡Orden perfecto! El comecocos llegó a la meta.'
  else if (showSolution) msg = 'Así era el orden correcto.'
  else if (wrongNow.length) {
    msg =
      (wrongNow.length === 1 ? 'Hay 1 ficha fuera de lugar (en rojo).' : `Hay ${wrongNow.length} fichas fuera de lugar (en rojo).`) +
      (showSolution
        ? ''
        : wrongNow.length === 1
          ? ' Tócala para regresarla y acomódala.'
          : ' Tócalas para regresarlas y acomódalas.')
    msgBad = true
  } else if (full) msg = 'Fila completa. ¡Presiona COMPROBAR!'

  const showPac = !showSolution
  const fruit = FRUITS[Math.min(Math.max((exercise.day ?? 1) - 1, 0), 4)]

  return (
    <div className={`ord ord--${layout}`}>
      {data?.context && (
        <div className="ord-context">
          <ContextView context={data.context} />
        </div>
      )}

      {/* ─────────── FILA DE RESPUESTA ─────────── */}
      <section
        ref={laneRef}
        className={`px-panel ord-lane${hit ? ' is-hit anim-shake' : ''}${solved ? ' is-won' : ''}`}
        aria-label="Fila de respuesta"
      >
        <header className="ord-head">
          <span className="ord-label">{showSolution ? 'TU RESPUESTA' : 'TU FILA'}</span>
          <span className="ord-count" aria-label={`${filledCount} de ${n} fichas colocadas`}>
            {filledCount}/{n}
          </span>
        </header>

        <ol className="ord-slots">
          {slots.map((id, i) => {
            const filled = id !== null
            const isCursor = showPac && i === cursor
            const isWrong = wrongNow.includes(i)
            return (
              <li
                key={i}
                className={`ord-slot${filled ? ' is-filled' : ''}${isCursor ? ' is-cursor' : ''}${isWrong ? ' is-wrong' : ''}`}
                style={{ '--i': i } as CSSProperties}
              >
                <span className="ord-badge" aria-hidden="true">
                  {i + 1}
                </span>
                <div className="ord-cell">
                  {filled ? (
                    <button
                      type="button"
                      className={`ord-token ord-token--placed${lastIn === i ? ' anim-pop' : ''}`}
                      disabled={!interactive}
                      onClick={() => remove(i)}
                      aria-label={`Lugar ${i + 1}: ${plainText(items[id])}${interactive ? '. Toca para regresarla.' : ''}`}
                    >
                      <RichText text={items[id]} />
                    </button>
                  ) : isCursor ? (
                    <PacMan
                      size={30}
                      dir={layout === 'row' ? 'right' : 'down'}
                      chomp
                      className="ord-pac"
                    />
                  ) : (
                    <span className="ord-pellet" role="img" aria-label={`Lugar ${i + 1} vacío`} />
                  )}
                  {isWrong && <Ghost color="red" size={22} float={false} className="ord-ghost-mark" />}
                </div>
              </li>
            )
          })}
          <li className={`ord-slot ord-slot--goal${showPac && full ? ' is-cursor' : ''}`}>
            <span className="ord-badge" aria-hidden="true">
              META
            </span>
            <div className="ord-cell">
              {showPac && full ? (
                <PacMan size={30} dir="right" chomp className="ord-pac" />
              ) : (
                <Fruit kind={fruit} size={28} />
              )}
            </div>
          </li>
        </ol>

        {ghostKey > 0 && (
          <div key={ghostKey} className="ord-ghost" aria-hidden="true">
            <Ghost color="red" size={36} />
          </div>
        )}
      </section>

      {/* ─────────── SOLUCIÓN (sin vidas) ─────────── */}
      {showSolution && (
        <section className="px-panel ord-solution anim-pop" aria-label="Orden correcto">
          <header className="ord-head">
            <span className="ord-label ord-label--ok">ASÍ ERA EL ORDEN</span>
          </header>
          <ol className="ord-sol-list">
            {items.map((t, i) => (
              <li key={i} className="ord-sol">
                <span className="ord-sol__n" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="ord-sol__t"><RichText text={t} /></span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ─────────── BANDEJA DE FICHAS ─────────── */}
      {!showSolution && !solved && (
        <section className="px-panel ord-tray" aria-label="Fichas disponibles">
          <header className="ord-head">
            <span className="ord-label">FICHAS</span>
            <span className="ord-count">{trayItems.length} por colocar</span>
          </header>
          {trayItems.length > 0 ? (
            <div className="ord-tray__list">
              {trayItems.map((id, pos) => (
                <button
                  key={id}
                  type="button"
                  className="ord-token ord-token--tray"
                  style={{ '--i': pos } as CSSProperties}
                  disabled={!interactive}
                  onClick={(e) => place(id, e)}
                >
                  <RichText text={items[id]} />
                </button>
              ))}
            </div>
          ) : (
            <p className="ord-empty">¡Todas las fichas están en la fila!</p>
          )}
        </section>
      )}

      <p className={`ord-msg${msgBad ? ' is-bad' : ''}`} role="status" aria-live="polite">
        {msg}
      </p>

      {interactive && (
        <div className="ord-actions">
          <button
            type="button"
            className="px-btn px-btn--ghost"
            onClick={reset}
            disabled={filledCount === 0}
          >
            REINICIAR
          </button>
          <button
            type="button"
            className={`px-btn px-btn--primary ord-check${full && wrong.length === 0 ? ' is-ready' : ''}`}
            onClick={check}
            disabled={!full || wrong.length > 0}
          >
            COMPROBAR
          </button>
        </div>
      )}
    </div>
  )
}

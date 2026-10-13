/**
 * CLASSIFY — "mandar cada ficha a su casillero".
 * Casilleros de paquetería / puertas del laberinto. Tocar ficha (parpadea) -> tocar casillero.
 * Tocar una ficha ya colocada la regresa a la bandeja (y la deja seleccionada).
 * Con todas colocadas -> COMPROBAR. Las incorrectas se marcan en rojo (con fantasma) y
 * regresan solas a la bandeja en el SIGUIENTE toque.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent } from 'react'
import type { ExerciseProps } from '../../engine/types'
import type { ClassifyData } from '../schemas'
import { Ghost, PacMan, PixelIcon, RichText, burst, floatText, isPixelIcon, plainText, sfx } from '../../ui'
import { seededPermutation } from './shuffle'
import './classify.css'

interface Bin {
  id: string
  label: string
  icon?: string
}
interface Item {
  idx: number
  text: string
  bin: string
}

function cssColor(name: string, fallback: string): string {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    return v || fallback
  } catch {
    return fallback
  }
}

function cleanBins(raw: unknown): Bin[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: Bin[] = []
  for (const b of raw) {
    if (!b || typeof b !== 'object') continue
    const o = b as Record<string, unknown>
    const id = o.id === null || o.id === undefined ? '' : String(o.id)
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push({
      id,
      label: o.label === null || o.label === undefined ? id : String(o.label),
      icon: typeof o.icon === 'string' && o.icon ? o.icon : undefined,
    })
  }
  return out
}

function cleanItems(raw: unknown, bins: Bin[]): { items: Item[]; skipped: number } {
  if (!Array.isArray(raw)) return { items: [], skipped: 0 }
  const ids = new Set(bins.map((b) => b.id))
  const items: Item[] = []
  let skipped = 0
  for (const it of raw) {
    if (!it || typeof it !== 'object') {
      skipped++
      continue
    }
    const o = it as Record<string, unknown>
    const text = o.text === null || o.text === undefined ? '' : String(o.text)
    const bin = o.bin === null || o.bin === undefined ? '' : String(o.bin)
    if (!text || !ids.has(bin)) {
      skipped++
      continue
    }
    items.push({ idx: items.length, text, bin })
  }
  return { items, skipped }
}

export default function ClassifyExercise(props: ExerciseProps<ClassifyData>) {
  // key = reinicia todo el estado interno al cambiar exercise.id
  return <ClassifyInner key={props.exercise.id} {...props} />
}

function ClassifyInner({ exercise, onCheck, locked, showSolution, attempt }: ExerciseProps<ClassifyData>) {
  const data = exercise.data
  const bins = useMemo(() => cleanBins(data?.bins), [data])
  const { items, skipped } = useMemo(() => cleanItems(data?.items, bins), [data, bins])
  const total = items.length
  const trayOrder = useMemo(() => seededPermutation(total, `${exercise.id}#classify`), [total, exercise.id])

  // assign[i] = id del casillero donde está la ficha i (null = en la bandeja)
  const [assignRaw, setAssign] = useState<(string | null)[]>(() => new Array<string | null>(total).fill(null))
  const assign = assignRaw.length === total ? assignRaw : new Array<string | null>(total).fill(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [wrong, setWrong] = useState<number[]>([])
  const [solved, setSolved] = useState(false)
  const [hit, setHit] = useState(false)
  const [ghostKey, setGhostKey] = useState(0)
  const [eat, setEat] = useState<{ bin: string; k: number } | null>(null)
  const [hintMsg, setHintMsg] = useState('')
  const prevAttempt = useRef(attempt)
  const hitTimer = useRef<number | undefined>(undefined)
  const eatTimer = useRef<number | undefined>(undefined)
  const boardRef = useRef<HTMLDivElement | null>(null)

  // Cada respuesta incorrecta: sacudida + flash rojo + fantasma que cruza los casilleros
  useEffect(() => {
    if (attempt === prevAttempt.current) return
    prevAttempt.current = attempt
    if (attempt <= 0) return
    setHit(true)
    setGhostKey((k) => k + 1)
    window.clearTimeout(hitTimer.current)
    hitTimer.current = window.setTimeout(() => setHit(false), 700)
  }, [attempt])
  useEffect(
    () => () => {
      window.clearTimeout(hitTimer.current)
      window.clearTimeout(eatTimer.current)
    },
    [],
  )

  const interactive = !locked && !solved && !showSolution
  const placedCount = assign.filter((a) => a !== null).length
  const ready = total > 0 && placedCount === total
  const sel = selected !== null && assign[selected] === null ? selected : null
  const trayItems = trayOrder.filter((i) => assign[i] === null)

  /** Devuelve a la bandeja las fichas marcadas como incorrectas (siguiente toque tras COMPROBAR) */
  function withoutWrong(base: (string | null)[]): (string | null)[] {
    if (wrong.length === 0) return base
    const next = base.slice()
    for (const i of wrong) next[i] = null
    return next
  }

  function tapTray(idx: number) {
    if (!interactive) return
    sfx.click()
    setAssign(withoutWrong(assign))
    setWrong([])
    setHintMsg('')
    setSelected(sel === idx ? null : idx)
  }

  function tapPlaced(idx: number) {
    if (!interactive) return
    sfx.click()
    const next = withoutWrong(assign)
    next[idx] = null // la ficha tocada vuelve a la bandeja
    setAssign(next)
    setWrong([])
    setHintMsg('')
    setSelected(idx) // y queda lista para mandarla a otro casillero
  }

  function tapBin(binId: string, ev: MouseEvent<HTMLElement>) {
    if (!interactive) return
    sfx.click()
    const base = withoutWrong(assign)
    const hadWrong = wrong.length > 0
    setWrong([])
    if (sel === null) {
      setAssign(base)
      setHintMsg(hadWrong ? '' : 'Primero toca una ficha de la bandeja.')
      return
    }
    const next = base.slice()
    next[sel] = binId
    setAssign(next)
    setSelected(null)
    setHintMsg('')
    const r = ev.currentTarget.getBoundingClientRect()
    burst(r.left + r.width / 2, r.top + 28, { color: cssColor('--pac', '#ffe600'), count: 8 })
    setEat({ bin: binId, k: Date.now() })
    window.clearTimeout(eatTimer.current)
    eatTimer.current = window.setTimeout(() => setEat(null), 650)
  }

  function reset() {
    if (!interactive) return
    sfx.click()
    setAssign(new Array<string | null>(total).fill(null))
    setWrong([])
    setSelected(null)
    setHintMsg('')
  }

  function check() {
    // wrong.length > 0 = mismo reparto que ya se marcó mal: no cobrar otra vida por lo mismo
    if (!interactive || !ready || wrong.length > 0) return
    const flags: number[] = []
    items.forEach((it, i) => {
      if (assign[i] !== it.bin) flags.push(i)
    })
    const answer = items.map((it, i) => ({ text: it.text, bin: assign[i] }))
    setSelected(null)
    if (flags.length === 0) {
      setSolved(true)
      setWrong([])
      const r = boardRef.current?.getBoundingClientRect()
      if (r) {
        burst(r.left + r.width / 2, r.top + r.height / 2, { color: cssColor('--ok', '#3cff6e'), count: 16 })
        floatText(r.left + r.width / 2, r.top + 24, '¡EXACTO!', { color: cssColor('--ok', '#3cff6e') })
      }
      onCheck(true, answer)
    } else {
      setWrong(flags)
      onCheck(false, answer)
    }
  }

  if (bins.length === 0 || total === 0) {
    return (
      <div className="cls">
        <div className="px-panel cls-warn" role="alert">
          <Ghost color="orange" size={32} />
          <p>
            <PixelIcon name="warning" size={20} className="cls-warn-icon" /> Este ejercicio no trae casilleros o fichas para clasificar.
          </p>
        </div>
      </div>
    )
  }

  let msg = 'Toca una ficha y luego su casillero.'
  let msgBad = false
  if (solved) msg = '¡Todo quedó en su casillero!'
  else if (showSolution) msg = 'Así se clasificaba cada ficha.'
  else if (wrong.length) {
    msg =
      wrong.length === 1
        ? '1 ficha mal (en rojo). Toca para regresarla.'
        : `${wrong.length} fichas mal (en rojo). Toca para regresarlas.`
    msgBad = true
  } else if (hintMsg) msg = hintMsg
  else if (sel !== null) {
    const t = plainText(items[sel].text)
    msg = `Llevas “${t.length > 24 ? `${t.slice(0, 23)}…` : t}”. ¿A cuál casillero va?`
  } else if (ready) msg = 'Todo repartido. ¡Presiona COMPROBAR!'

  const rank = new Map<number, number>()
  trayOrder.forEach((idx, pos) => rank.set(idx, pos))

  return (
    <div className="cls">
      {/* ─────────── BANDEJA ─────────── */}
      {!showSolution && !solved && (
        <section className="px-panel cls-tray" aria-label="Bandeja de fichas">
          <header className="cls-head">
            <span className="cls-label">BANDEJA</span>
            <span className="cls-count" aria-label={`${placedCount} de ${total} fichas colocadas`}>
              {placedCount}/{total}
            </span>
          </header>
          {trayItems.length > 0 ? (
            <div className="cls-tray__list">
              {trayItems.map((idx, pos) => (
                <button
                  key={idx}
                  type="button"
                  className={`cls-token cls-token--tray${sel === idx ? ' is-selected' : ''}`}
                  style={{ '--i': pos } as CSSProperties}
                  disabled={!interactive}
                  aria-pressed={sel === idx}
                  onClick={() => tapTray(idx)}
                >
                  <RichText text={items[idx].text} />
                </button>
              ))}
            </div>
          ) : (
            <p className="cls-empty">¡La bandeja quedó vacía!</p>
          )}
        </section>
      )}

      {/* ─────────── AVISO (justo entre la bandeja y los casilleros) ─────────── */}
      <p className={`cls-msg${msgBad ? ' is-bad' : ''}`} role="status" aria-live="polite">
        {msg}
      </p>

      {/* ─────────── CASILLEROS ─────────── */}
      <div
        ref={boardRef}
        className={`cls-board${hit ? ' is-hit anim-shake' : ''}${solved ? ' is-won' : ''}`}
      >
        <div className="cls-bins" data-n={bins.length}>
          {bins.map((bin) => {
            const inBin = showSolution
              ? trayOrder.filter((i) => items[i].bin === bin.id)
              : trayOrder.filter((i) => assign[i] === bin.id)
            const hasWrong = !showSolution && inBin.some((i) => wrong.includes(i))
            const armed = interactive && sel !== null
            return (
              <div
                key={bin.id}
                role="group"
                aria-label={`Casillero ${plainText(bin.label)}`}
                className={`cls-bin${armed ? ' is-armed' : ''}${hasWrong ? ' is-hit' : ''}${showSolution ? ' is-solution' : ''}`}
                onClick={(e) => tapBin(bin.id, e)}
              >
                <button
                  type="button"
                  className="cls-door"
                  disabled={!interactive}
                  aria-label={`Mandar la ficha al casillero ${plainText(bin.label)}`}
                >
                  {isPixelIcon(bin.icon) && (
                    <span className="cls-door__icon" aria-hidden="true">
                      <PixelIcon name={bin.icon} size={24} />
                    </span>
                  )}
                  <span className="cls-door__label"><RichText text={bin.label} /></span>
                  {!showSolution && inBin.length > 0 && (
                    <span className="cls-door__count" aria-hidden="true">
                      x{inBin.length}
                    </span>
                  )}
                </button>
                <ul className="cls-bin__items">
                  {inBin.map((idx) => {
                    const isWrong = !showSolution && wrong.includes(idx)
                    return (
                      <li key={idx} style={{ '--i': rank.get(idx) ?? 0 } as CSSProperties}>
                        {showSolution ? (
                          <span className="cls-token cls-token--solution"><RichText text={items[idx].text} /></span>
                        ) : (
                          <button
                            type="button"
                            className={`cls-token cls-token--placed anim-pop${isWrong ? ' is-wrong' : ''}`}
                            disabled={!interactive}
                            aria-label={`${plainText(items[idx].text)}${isWrong ? ' (incorrecta)' : ''}${interactive ? '. Toca para regresarla a la bandeja.' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              tapPlaced(idx)
                            }}
                          >
                            {isWrong && <Ghost color="red" size={20} float={false} />}
                            <RichText text={items[idx].text} />
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
                {eat && eat.bin === bin.id && (
                  <PacMan key={eat.k} size={26} dir="right" chomp className="cls-eater" />
                )}
              </div>
            )
          })}
        </div>

        {ghostKey > 0 && (
          <div key={ghostKey} className="cls-ghost" aria-hidden="true">
            <Ghost color="red" size={36} />
          </div>
        )}
      </div>

      {skipped > 0 && (
        <p className="cls-skip">
          <PixelIcon name="warning" size={16} className="cls-warn-icon" /> Se omitieron {skipped} {skipped === 1 ? 'ficha' : 'fichas'} con datos incompletos.
        </p>
      )}

      {interactive && (
        <div className="cls-actions">
          <button type="button" className="px-btn px-btn--ghost" onClick={reset} disabled={placedCount === 0}>
            REINICIAR
          </button>
          <button
            type="button"
            className={`px-btn px-btn--primary cls-check${ready && wrong.length === 0 ? ' is-ready' : ''}`}
            onClick={check}
            disabled={!ready || wrong.length > 0}
          >
            COMPROBAR
          </button>
        </div>
      )}
    </div>
  )
}

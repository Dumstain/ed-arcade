/**
 * queue-sim — "La fila de las tortillas / el carrusel" (Día 3).
 * Modos: build (armar la cola final), served (en qué orden atienden), pointers (dónde quedan FRENTE y FINAL).
 * Vistas: line (personitas), ring (carrusel circular), array (celdas con índices). Bicola con deque.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import type { ExerciseProps } from '../../engine/types'
import type { QueueSimData, Val } from '../schemas'
import { Ghost, PacMan, PixelIcon, RichText, burst, floatText, plainText, sfx } from '../../ui'
import { centerOf, cssVar } from '../_shared/dom'
import { QueueVisual } from './QueueViews'
import type { Leaving, PtrState } from './QueueViews'
import {
  dequeueItem,
  addFirstItem,
  enqueueItem,
  fromValues,
  isInsert,
  mod,
  parseOp,
  removeLastItem,
  rearIndex,
  sameSeq,
  simulate,
  valuesOf,
} from './logic'
import type { Cfg, End, Item, QModel } from './logic'
import './queue-sim.css'

type BtnEvent = ReactMouseEvent<HTMLButtonElement>
type NoteTone = 'bad' | 'warn' | 'ok'
interface NoteState { tone: NoteTone; title: string; sub?: string; k: number }

const TITLE = {
  line: { q: 'LA FILA DE LAS TORTILLAS', d: 'EL VAGÓN DEL METRO' },
  ring: { q: 'EL CARRUSEL', d: 'CARRUSEL CON DOS PUERTAS' },
  array: { q: 'COLA EN ARREGLO', d: 'BICOLA EN ARREGLO' },
} as const
const ICON = { line: 'tortilla', ring: 'carousel', array: 'queue' } as const

const FRONT_RULE = 'dequeue → **frente = (frente + 1) % capacidad**'
const REAR_RULE = 'enqueue → **final = (final + 1) % capacidad**'
const FRONT_BACK_RULE = 'addFirst → **frente = (frente - 1 + capacidad) % capacidad**'
const REAR_BACK_RULE = 'removeLast → **final = (final - 1 + capacidad) % capacidad**'

const COLOR: Record<End, string> = { front: '--info', rear: '--ghost-orange' }

/** Partículas + texto flotante locales sobre un elemento (opcionales: nunca deben romper el ejercicio) */
function fx(el: Element | null, text: string, colorVar: string) {
  try {
    const c = centerOf(el)
    if (!c) return
    const color = cssVar(colorVar)
    burst(c.x, c.y, { color, count: 8 })
    floatText(c.x, c.y - 26, text, { color })
  } catch {
    /* efectos opcionales */
  }
}

type Props = ExerciseProps<QueueSimData> & { cfg: Cfg }

export function QueueGame({ cfg, onCheck, locked, showSolution, attempt }: Props) {
  const { mode, view, deque, slots } = cfg
  const isLine = view === 'line'

  // ── estado ──
  const idRef = useRef(1)
  const newId = useCallback(() => idRef.current++, [])
  const [model, setModel] = useState<QModel>(() => fromValues(cfg.initial, slots, cfg.front0, () => idRef.current++))
  const modelRef = useRef(model)
  const commit = (m: QModel) => {
    modelRef.current = m
    setModel(m)
  }
  const [leaving, setLeaving] = useState<Leaving[]>([])
  const [fresh, setFresh] = useState<Record<number, End>>({})
  const [note, setNote] = useState<NoteState | null>(null)
  const [flash, setFlash] = useState<'full' | null>(null)
  const [bad, setBad] = useState(false)
  const [solved, setSolved] = useState(false)
  const solvedRef = useRef(false)
  const [door, setDoor] = useState<End>('rear')
  // served
  const [tray, setTray] = useState<{ k: number; chip: number }[]>([])
  // pointers
  const [picks, setPicks] = useState<{ front: number | null; rear: number | null }>({ front: null, rear: null })
  const [active, setActive] = useState<End>('front')
  const [wrongPtr, setWrongPtr] = useState<{ front: boolean; rear: boolean }>({ front: false, rear: false })

  // ── temporizadores con limpieza ──
  const timers = useRef<number[]>([])
  const noteTimer = useRef<number | undefined>(undefined)
  const noteSeq = useRef(0)
  useEffect(() => {
    const list = timers.current
    return () => {
      list.forEach((t) => window.clearTimeout(t))
      window.clearTimeout(noteTimer.current)
    }
  }, [])
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }, [])
  const clearNote = () => {
    window.clearTimeout(noteTimer.current)
    setNote(null)
  }
  const say = (tone: NoteTone, title: string, sub?: string) => {
    window.clearTimeout(noteTimer.current)
    noteSeq.current += 1
    setNote({ tone, title, sub, k: noteSeq.current })
    noteTimer.current = window.setTimeout(() => setNote(null), 3600)
  }

  // ── error global del runner: sacudir ──
  const prevAttempt = useRef(attempt)
  useEffect(() => {
    if (attempt > prevAttempt.current) {
      setBad(true)
      later(() => setBad(false), 700)
    }
    prevAttempt.current = attempt
  }, [attempt, later])

  // Firmas de respuestas ya marcadas mal: repetir la MISMA no cobra otra vida
  const wrongSigs = useRef<Set<string>>(new Set())
  // Anti doble clic: tras comprobar se ignoran toques ~350 ms
  const checkedAt = useRef(0)
  const guardCheck = () => {
    if (performance.now() - checkedAt.current < 350) return false
    checkedAt.current = performance.now()
    return true
  }

  // ── modelos de solo lectura (served / pointers) y soluciones ──
  const staticModel = useMemo(() => {
    let n = 0
    return fromValues(cfg.initial, slots, cfg.front0, () => ++n)
  }, [cfg.initial, slots, cfg.front0])
  const sim = useMemo(() => simulate(slots, cfg.front0, cfg.initial, cfg.ops), [slots, cfg.front0, cfg.initial, cfg.ops])
  // Estado final real (con la vuelta). Si el contenido no coincide con lo esperado, se dibuja lo esperado.
  const solutionModel = useMemo(() => {
    if (mode !== 'build' || sameSeq(valuesOf(sim.model), cfg.expected)) return sim.model
    let n = 0
    return fromValues(cfg.expected, slots, 0, () => ++n)
  }, [sim, mode, cfg.expected, slots])

  // ── operaciones sobre la cola ──
  const flashFull = () => {
    setFlash('full')
    later(() => setFlash(null), 700)
  }
  const full = () => {
    sfx.wrong()
    flashFull()
    if (isLine && !cfg.capacityGiven) say('bad', '¡FILA MUY LARGA!', `No caben más de **${slots}** personas en esta fila.`)
    else if (isLine) say('bad', '¡COLA LLENA!', `Solo caben **${slots}** personas. **Atiende** a alguien primero.`)
    else say('bad', '¡COLA LLENA!', `Las **${slots}** casillas están ocupadas. **Atiende** a alguien primero.`)
  }
  const empty = () => {
    sfx.wrong()
    say('warn', deque ? '¡NO HAY NADIE!' : '¡FILA VACÍA!', 'No hay a quién atender: la cola está **vacía**.')
  }
  const wrapNote = (kind: 'in-rear' | 'in-front' | 'out-front' | 'out-rear') => {
    if (isLine) return
    if (kind === 'in-rear') say('ok', '¡DIO LA VUELTA!', 'El **final** pasó de la última casilla a la **casilla 0**: **(final + 1) % capacidad**.')
    else if (kind === 'in-front') say('ok', '¡DIO LA VUELTA!', 'El **frente** pasó de la casilla 0 a la **última**: **(frente - 1 + capacidad) % capacidad**.')
    else if (kind === 'out-front') say('ok', '¡DIO LA VUELTA!', 'El **frente** pasó de la última casilla a la **casilla 0**: **(frente + 1) % capacidad**.')
    else say('ok', '¡DIO LA VUELTA!', 'El **final** pasó de la casilla 0 a la **última**: **(final - 1 + capacidad) % capacidad**.')
  }
  const doEnqueue = (v: Val, side: End) => {
    const item: Item = { id: newId(), v }
    const r = side === 'front' ? addFirstItem(modelRef.current, item) : enqueueItem(modelRef.current, item)
    if (!r) return null
    commit(r.model)
    setFresh((f) => ({ ...f, [item.id]: side }))
    return r
  }
  const doDequeue = (side: End) => {
    const r = side === 'rear' ? removeLastItem(modelRef.current) : dequeueItem(modelRef.current)
    if (!r) return null
    commit(r.model)
    const lv: Leaving = { key: newId(), item: r.item, index: r.index, end: side }
    setLeaving((l) => [...l, lv])
    later(() => setLeaving((l) => l.filter((x) => x.key !== lv.key)), 520)
    return r
  }

  // ───────── modo BUILD ─────────
  const onChip = (v: Val, e: BtnEvent) => {
    if (locked || solvedRef.current) return
    sfx.click()
    const side: End = deque ? door : 'rear'
    const r = doEnqueue(v, side)
    if (!r) return full()
    clearNote()
    fx(e.currentTarget, deque ? (side === 'front' ? 'AL FRENTE' : 'AL FINAL') : 'ENCOLAR', '--ok')
    if (r.wrapped) wrapNote(side === 'front' ? 'in-front' : 'in-rear')
  }
  const onDequeue = (side: End, e: BtnEvent) => {
    if (locked || solvedRef.current) return
    sfx.waka()
    const r = doDequeue(side)
    if (!r) return empty()
    clearNote()
    fx(e.currentTarget, deque ? (side === 'front' ? 'SALE FRENTE' : 'SALE FINAL') : 'ATENDER', COLOR.front)
    if (r.wrapped) wrapNote(side === 'front' ? 'out-front' : 'out-rear')
  }
  const onReset = () => {
    if (locked || solvedRef.current) return
    sfx.click()
    commit(fromValues(cfg.initial, slots, cfg.front0, newId))
    setLeaving([])
    setFresh({})
    setNote(null)
  }
  const stageRef = useRef<HTMLElement>(null)
  const celebrate = () => {
    fx(stageRef.current, 'BIEN', '--ok')
  }
  const sigOf = (vals: Val[]) => JSON.stringify(vals.map(String))
  const onCheckBuild = () => {
    if (locked || solvedRef.current) return
    if (!guardCheck()) return
    sfx.click()
    const vals = valuesOf(modelRef.current)
    if (sameSeq(vals, cfg.expected)) {
      solvedRef.current = true
      setSolved(true)
      celebrate()
      onCheck(true, vals)
      return
    }
    const sig = sigOf(vals)
    if (wrongSigs.current.has(sig)) {
      say('warn', '¡ES LA MISMA COLA!', 'Esa ya la probaste. Cambia algo antes de comprobar.')
      return
    }
    wrongSigs.current.add(sig)
    say(
      'bad',
      '¡TODAVÍA NO!',
      deque
        ? 'Ejecuta el programa y fíjate en la **puerta** de cada operación.'
        : 'Ejecuta el programa línea por línea: se forma **atrás** y atienden al de **adelante**.',
    )
    onCheck(false, vals)
  }

  // ───────── modo SERVED ─────────
  const expectedN = cfg.expected.length
  const usedChips = new Set(tray.map((t) => t.chip))
  const onTrayAdd = (chip: number, e: BtnEvent) => {
    if (locked || solvedRef.current || tray.length >= expectedN || usedChips.has(chip)) return
    sfx.click()
    setTray([...tray, { k: newId(), chip }])
    clearNote()
    fx(e.currentTarget, 'SALE', COLOR.front)
  }
  const onTrayRemove = (k: number) => {
    if (locked || solvedRef.current) return
    sfx.click()
    setTray(tray.filter((t) => t.k !== k))
  }
  const onCheckServed = () => {
    if (locked || solvedRef.current || tray.length < expectedN) return
    if (!guardCheck()) return
    sfx.click()
    const vals = tray.map((t) => cfg.palette[t.chip])
    if (sameSeq(vals, cfg.expected)) {
      solvedRef.current = true
      setSolved(true)
      celebrate()
      onCheck(true, vals)
      return
    }
    const sig = sigOf(vals)
    if (wrongSigs.current.has(sig)) {
      say('warn', '¡ES EL MISMO ORDEN!', 'Ese ya lo probaste. Toca un turno de la bandeja para quitarlo y cambia el orden.')
      return
    }
    wrongSigs.current.add(sig)
    say(
      'bad',
      '¡ESE ORDEN NO!',
      deque
        ? 'Fíjate **por qué puerta** sale cada uno: **removeFirst** es el frente y **removeLast** el final.'
        : 'Atienden primero al que **llegó primero** (**FIFO**). Repasa el programa.',
    )
    onCheck(false, vals)
  }

  // ───────── modo POINTERS ─────────
  const bothPicked = picks.front !== null && picks.rear !== null
  const onPick = (i: number, el: HTMLElement) => {
    if (locked || solvedRef.current) return
    sfx.click()
    const which = active
    setPicks((p) => ({ ...p, [which]: i }))
    setWrongPtr((w) => ({ ...w, [which]: false }))
    clearNote()
    fx(el, which === 'front' ? 'FRENTE' : 'FINAL', COLOR[which])
    const other: End = which === 'front' ? 'rear' : 'front'
    if (picks[other] === null) setActive(other)
  }
  const onSelect = (which: End) => {
    if (locked || solvedRef.current) return
    sfx.click()
    setActive(which)
  }
  const onCheckPtr = () => {
    if (locked || solvedRef.current) return
    if (picks.front === null || picks.rear === null) return
    if (!guardCheck()) return
    sfx.click()
    const f = picks.front
    const r = picks.rear
    const okF = f === cfg.expectedFront
    const okR = r === cfg.expectedRear
    if (okF && okR) {
      solvedRef.current = true
      setSolved(true)
      celebrate()
      onCheck(true, { front: f, rear: r })
      return
    }
    setWrongPtr({ front: !okF, rear: !okR })
    const sig = `${f}:${r}`
    if (wrongSigs.current.has(sig)) {
      say('warn', '¡ESA YA LA PROBASTE!', 'Cambia el **FRENTE** o el **FINAL** antes de comprobar.')
      return
    }
    wrongSigs.current.add(sig)
    if (!okF && !okR) say('bad', '¡NINGUNO!', 'Ni el **FRENTE** ni el **FINAL** quedan ahí. Ejecuta el programa línea por línea.')
    else if (!okF) say('bad', '¡EL FRENTE NO!', 'El **FINAL** va bien. Revisa el **FRENTE**: cada **atender** lo mueve una casilla (con vuelta).')
    else say('bad', '¡EL FINAL NO!', 'El **FRENTE** va bien. Revisa el **FINAL**: cada **encolar** lo mueve una casilla (con vuelta).')
    onCheck(false, { front: f, rear: r })
  }

  // ── vistas ──
  const ptr: PtrState | undefined =
    mode === 'pointers'
      ? {
          front: picks.front ?? staticModel.front,
          rear: picks.rear ?? rearIndex(staticModel),
          frontSet: picks.front !== null,
          rearSet: picks.rear !== null,
          wrongFront: wrongPtr.front,
          wrongRear: wrongPtr.rear,
        }
      : undefined
  const shownModel = mode === 'build' ? model : staticModel
  const title = TITLE[view][deque ? 'd' : 'q']
  const iconName = deque && isLine ? 'metro' : ICON[view]
  const size = shownModel.size
  const badge =
    mode === 'build'
      ? size === 0
        ? 'VACÍA'
        : size >= slots
          ? `LLENA ${size}/${slots}`
          : isLine && !cfg.capacityGiven
            ? `${size} ${size === 1 ? 'PERSONA' : 'PERSONAS'}`
            : `${size} / ${slots}`
      : isLine
        ? `${size} ${size === 1 ? 'PERSONA' : 'PERSONAS'}`
        : `${slots} CASILLAS`

  const legend = isLine
    ? deque
      ? 'Un **vagón con dos puertas**: se entra y se sale por el **frente** y por el **final**.'
      : 'Se forman **atrás** y atienden al de **adelante**: **FIFO**, el **primero en llegar** es el **primero en salir**.'
    : view === 'ring'
      ? 'Es un **carrusel**: después de la última casilla sigue la **0**. **FRENTE** = el primero de la fila, **FINAL** = el último. Atender **no borra** el dato: solo mueve el frente.'
      : 'Es un arreglo **circular**: después del índice **' + (slots - 1) + '** sigue el **0**. Atender **no borra** el dato: solo mueve el frente.'
  const rules = isLine
    ? []
    : deque
      ? [REAR_RULE, FRONT_RULE, FRONT_BACK_RULE, REAR_BACK_RULE]
      : [REAR_RULE, FRONT_RULE]

  const idle =
    mode === 'build'
      ? deque
        ? 'Elige la **puerta** y toca una ficha para meterla. Con los botones sacas por el **frente** o por el **final**.'
        : 'Toca una ficha para **encolarla** (se forma **atrás**). **ATENDER** saca al de **adelante**.'
      : mode === 'served'
        ? 'Toca los turnos en el orden en que **salen** de la fila.'
        : bothPicked
          ? 'Puedes cambiar cualquiera: toca su botón y otra casilla. Luego **COMPROBAR**.'
          : active === 'front'
            ? '**Paso 1:** toca la casilla donde termina el **FRENTE**.'
            : '**Paso 2:** toca la casilla donde termina el **FINAL**.'

  const initFront = cfg.front0
  const initRear = mod(cfg.front0 + cfg.initial.length - 1, slots)

  const rootCls = 'qs-root' + (bad ? ' is-bad anim-shake' : '') + (solved ? ' is-solved' : '')

  return (
    <div className={rootCls} data-mode={mode} data-view={view}>
      <div className="qs-main">
        <section className="px-panel qs-prog" aria-label="Programa (solo lectura)">
          <h3 className="qs-h">PROGRAMA</h3>
          <p className="qs-init">
            {cfg.initial.length === 0 ? (
              isLine ? (
                'Empieza con la fila vacía.'
              ) : (
                'Empieza con la cola vacía.'
              )
            ) : (
              <>
                Empieza con (frente → final):{' '}
                {cfg.initial.map((v, i) => (
                  <span key={i} className="qs-mini">{plainText(String(v))}</span>
                ))}
              </>
            )}
          </p>
          {!isLine && (
            <p className="qs-init">
              <RichText
                text={`**FRENTE = ${initFront}**, **FINAL = ${initRear}**. Capacidad: **${slots}** casillas.`}
              />
            </p>
          )}
          <ol className="qs-ops">
            {cfg.ops.map((op, i) => {
              const p = parseOp(op)
              const k = p.kind === 'unknown' ? 'unknown' : isInsert(p.kind) ? 'in' : 'out'
              return (
                <li key={i} className={`qs-op is-${k}`}>
                  <span className="qs-ln" aria-hidden="true">{i + 1}</span>
                  <code>{op}</code>
                </li>
              )
            })}
          </ol>
        </section>

        <section className="px-panel qs-stage" aria-label="Cola" ref={stageRef}>
          <div className="qs-head">
            <span className="qs-ttl">
              <PixelIcon name={iconName} size={20} />
              <span>{title}</span>
            </span>
            <span className={'qs-badge' + (mode === 'build' && size >= slots ? ' is-full' : '')}>{badge}</span>
          </div>
          {mode === 'served' && cfg.initial.length > 0 && <p className="qs-sub">Así empieza, antes del programa.</p>}
          {mode === 'pointers' && (
            <div className="qs-psel" role="group" aria-label="Qué estás colocando">
              {(['front', 'rear'] as End[]).map((w, n) => {
                const v = picks[w]
                const on = active === w
                return (
                  <button
                    key={w}
                    type="button"
                    className={`qs-pbtn qs-pbtn--${w === 'front' ? 'f' : 'r'}${on ? ' is-active' : ''}${v !== null ? ' is-set' : ''}${wrongPtr[w] ? ' is-wrong' : ''}`}
                    aria-pressed={on}
                    disabled={locked}
                    onClick={() => onSelect(w)}
                    aria-label={`Paso ${n + 1}: ${w === 'front' ? 'FRENTE' : 'FINAL'}${v !== null ? `, casilla ${v}` : ', sin colocar'}. Toca para cambiar este.`}
                  >
                    <span className="qs-pstep" aria-hidden="true">{n + 1}</span>
                    <span className="qs-pname">{w === 'front' ? 'FRENTE' : 'FINAL'}</span>
                    <span className="qs-pval">{v !== null ? `casilla ${v}` : 'toca una casilla'}</span>
                  </button>
                )
              })}
            </div>
          )}
          <QueueVisual
            view={view}
            model={shownModel}
            deque={deque}
            leaving={mode === 'build' ? leaving : []}
            fresh={mode === 'build' ? fresh : {}}
            flash={flash ?? (solved ? 'ok' : null)}
            ptr={ptr}
            tap={mode === 'pointers' ? { onPick, disabled: locked || solved, active } : undefined}
          />
          <p className="qs-legend">
            <RichText text={legend} />
          </p>
          {rules.length > 0 && (
            <ul className="qs-rules" aria-label="Fórmulas de la cola circular">
              {rules.map((r) => (
                <li key={r}>
                  <RichText text={r} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className={'qs-note' + (note ? ` is-${note.tone}` : '')} role="status" aria-live="polite">
        {note ? (
          <>
            <span className="qs-note-ico" key={note.k} aria-hidden="true">
              {note.tone === 'ok' ? <PacMan size={38} chomp /> : <Ghost color={note.tone === 'warn' ? 'orange' : 'red'} size={38} float />}
            </span>
            <span className="qs-note-txt">
              <span className="qs-note-t">{note.title}</span>
              {note.sub && (
                <span className="qs-note-s">
                  <RichText text={note.sub} />
                </span>
              )}
            </span>
          </>
        ) : (
          <span className="qs-note-s is-idle">
            <RichText text={idle} />
          </span>
        )}
      </div>

      {/* ───────── BUILD ───────── */}
      {mode === 'build' && (
        <section className="px-panel qs-controls">
          <h3 className="qs-h">{deque ? 'FICHAS · TOCA PARA METERLAS' : 'FICHAS · TOCA PARA ENCOLAR'}</h3>
          {deque && (
            <div className="qs-door" role="group" aria-label="Puerta por la que entran las fichas">
              {(['front', 'rear'] as End[]).map((w) => (
                <button
                  key={w}
                  type="button"
                  className={`px-btn px-btn--sm qs-door-b qs-door-b--${w === 'front' ? 'f' : 'r'}${door === w ? ' is-on' : ''}`}
                  aria-pressed={door === w}
                  disabled={locked}
                  onClick={() => {
                    sfx.click()
                    setDoor(w)
                  }}
                >
                  {w === 'front' ? 'PUERTA DEL FRENTE' : 'PUERTA DEL FINAL'}
                </button>
              ))}
            </div>
          )}
          <div className="qs-palette">
            {cfg.palette.map((v, i) => (
              <button
                key={i}
                type="button"
                className="px-chip qs-chip"
                disabled={locked}
                onClick={(e) => onChip(v, e)}
                aria-label={deque ? `Meter ${plainText(String(v))} por ${door === 'front' ? 'el frente' : 'el final'}` : `Encolar ${plainText(String(v))}`}
              >
                {plainText(String(v))}
              </button>
            ))}
          </div>
          <div className="qs-btns">
            {deque ? (
              <>
                <button type="button" className="px-btn qs-btn-out qs-btn-out--f" disabled={locked} onClick={(e) => onDequeue('front', e)}>
                  SACAR POR EL FRENTE
                </button>
                <button type="button" className="px-btn qs-btn-out qs-btn-out--r" disabled={locked} onClick={(e) => onDequeue('rear', e)}>
                  SACAR POR EL FINAL
                </button>
              </>
            ) : (
              <button
                type="button"
                className="px-btn qs-btn-out qs-btn-out--f"
                disabled={locked}
                onClick={(e) => onDequeue('front', e)}
                aria-label="Atender: sale el primero de la fila"
              >
                ATENDER
              </button>
            )}
            <button type="button" className="px-btn px-btn--ghost" disabled={locked} onClick={onReset}>
              REINICIAR
            </button>
          </div>
          <button type="button" className="px-btn px-btn--primary px-btn--block" disabled={locked} onClick={onCheckBuild}>
            COMPROBAR
          </button>
        </section>
      )}

      {/* ───────── SERVED ───────── */}
      {mode === 'served' && (
        <section className="px-panel qs-controls">
          <div className="qs-tray-head">
            <PacMan size={30} dir="right" chomp={!locked && tray.length < expectedN} />
            <h3 className="qs-h">BANDEJA DE ATENDIDOS · EN ORDEN</h3>
          </div>
          {expectedN === 0 ? (
            <p className="qs-sub">En este programa no sale nadie. ¡Solo comprueba!</p>
          ) : (
            <div className="qs-tray">
              {Array.from({ length: expectedN }, (_, i) => {
                const t = tray[i]
                return t ? (
                  <button
                    key={t.k}
                    type="button"
                    className="qs-slot is-full"
                    disabled={locked}
                    onClick={() => onTrayRemove(t.k)}
                    aria-label={`Atendido ${i + 1}: ${plainText(String(cfg.palette[t.chip]))}. Toca para quitar`}
                  >
                    {plainText(String(cfg.palette[t.chip]))}
                  </button>
                ) : (
                  <span key={`e${i}`} className="qs-slot" aria-label={`Atendido ${i + 1} vacío`}>
                    {i + 1}
                  </span>
                )
              })}
            </div>
          )}
          <h3 className="qs-h">TURNOS</h3>
          <div className="qs-palette">
            {cfg.palette.map((v, i) => (
              <button
                key={i}
                type="button"
                className="px-chip qs-chip"
                disabled={locked || tray.length >= expectedN || usedChips.has(i)}
                onClick={(e) => onTrayAdd(i, e)}
                aria-label={`Sale ${plainText(String(v))}`}
              >
                {plainText(String(v))}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="px-btn px-btn--primary px-btn--block"
            disabled={locked || tray.length < expectedN}
            onClick={onCheckServed}
          >
            COMPROBAR
          </button>
        </section>
      )}

      {/* ───────── POINTERS ───────── */}
      {mode === 'pointers' && (
        <section className="px-panel qs-controls">
          {bothPicked && (
            <p className="qs-sub qs-sub--tight">
              <RichText text={`Tu respuesta: **FRENTE = casilla ${picks.front}**, **FINAL = casilla ${picks.rear}**.`} />
            </p>
          )}
          <button
            type="button"
            className="px-btn px-btn--primary px-btn--block"
            disabled={locked || !bothPicked}
            onClick={onCheckPtr}
          >
            COMPROBAR
          </button>
        </section>
      )}

      {/* ───────── SOLUCIÓN (sin vidas) ───────── */}
      {showSolution && mode === 'build' && (
        <section className="px-panel qs-solution" aria-label="Respuesta correcta">
          <h3 className="qs-h">RESPUESTA · ASÍ DEBÍA QUEDAR</h3>
          <QueueVisual view={view} model={solutionModel} deque={deque} />
          <p className="qs-sub">
            {cfg.expected.length === 0
              ? 'La cola queda vacía.'
              : `De frente a final: ${cfg.expected.map((v) => plainText(String(v))).join(', ')}`}
          </p>
        </section>
      )}
      {showSolution && mode === 'served' && (
        <section className="px-panel qs-solution" aria-label="Respuesta correcta">
          <h3 className="qs-h">RESPUESTA · ASÍ LOS ATIENDEN</h3>
          <div className="qs-tray">
            {cfg.expected.map((v, i) => (
              <span key={i} className="qs-slot is-full is-ok">{plainText(String(v))}</span>
            ))}
          </div>
        </section>
      )}
      {showSolution && mode === 'pointers' && (
        <section className="px-panel qs-solution" aria-label="Respuesta correcta">
          <h3 className="qs-h">RESPUESTA · ASÍ QUEDA LA COLA</h3>
          <QueueVisual
            view={view}
            model={solutionModel}
            deque={deque}
            flash="ok"
            ptr={{ front: cfg.expectedFront, rear: cfg.expectedRear, frontSet: true, rearSet: true }}
          />
          <p className="qs-sub">
            <RichText text={`**FRENTE = casilla ${cfg.expectedFront}**, **FINAL = casilla ${cfg.expectedRear}**.`} />
          </p>
        </section>
      )}
    </div>
  )
}

export default QueueGame

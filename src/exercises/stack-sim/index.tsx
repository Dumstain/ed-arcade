/**
 * stack-sim — "Pila de platos" (Día 2).
 * Modos: build (armar la pila final), popped (en qué orden salen), trace (PUSH/POP/IGNORAR/¡ERROR! por token).
 * Vistas: plates (platos), array (celdas + tope; pop no borra el dato), nodes (tope → nodo → … → null).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import type { ExerciseModule, ExerciseProps } from '../../engine/types'
import type { StackSimData, Val } from '../schemas'
import { Ghost, PacMan, burst, floatText, sfx } from '../../ui'
import { StackVisual } from './StackViews'
import type { Leaving } from './StackViews'
import {
  ACTION_LABEL,
  ACTION_MARK,
  activeValues,
  fromValues,
  normalize,
  parseOp,
  popItem,
  pushItem,
  sameSeq,
} from './logic'
import type { Action, Cfg, Model } from './logic'
import './stack-sim.css'

type BtnEvent = ReactMouseEvent<HTMLButtonElement>
type NoteTone = 'bad' | 'warn' | 'ok'
interface NoteState { tone: NoteTone; title: string; sub?: string; k: number }

const ACTION_COLOR: Record<Action, string> = {
  push: '--ok',
  pop: '--info',
  skip: '--fg-muted',
  error: '--bad',
}
const ACTION_HELP: Record<Action, string> = {
  push: 'apilar',
  pop: 'sacar',
  skip: 'no hacer nada',
  error: 'no cuadra',
}
const VIEW_TITLE = { plates: 'PILA DE PLATOS', array: 'PILA CON ARREGLO', nodes: 'PILA CON NODOS' } as const
const LEGEND = {
  plates: 'Solo tocas el plato de arriba (LIFO: el último en entrar es el primero en salir). ¡Como Ctrl+Z!',
  array: 'pop() no borra el dato: solo baja el tope. Lo atenuado sigue en el arreglo pero ya no cuenta.',
  nodes: 'Cada nodo es { dato | sig }: sig apunta al nodo de abajo. El tope es el primero de la cadena.',
} as const

function cssVar(name: string): string {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    return v || '#ffe600'
  } catch {
    return '#ffe600'
  }
}

/** Partículas + texto flotante locales sobre un elemento (opcionales: nunca deben romper el ejercicio) */
function fx(el: Element | null, text: string, colorVar: string) {
  try {
    if (!el) return
    const r = el.getBoundingClientRect()
    const color = cssVar(colorVar)
    const x = r.left + r.width / 2
    burst(x, r.top + r.height / 2, { color, count: 8 })
    floatText(x, r.top - 4, text, { color })
  } catch {
    /* efectos opcionales */
  }
}

// ───────────────────────── Envoltorio (valida datos y reinicia al cambiar de ejercicio) ─────────────────────────
function StackSim(props: ExerciseProps<StackSimData>) {
  const parsed = useMemo(() => normalize(props.exercise?.data), [props.exercise?.data])
  if ('error' in parsed) return <Warning text={parsed.error} />
  return <StackSimInner key={props.exercise?.id} cfg={parsed.cfg} {...props} />
}

function Warning({ text }: { text: string }) {
  return (
    <div className="px-panel stk-warn" role="alert">
      <Ghost color="orange" size={44} float />
      <div>
        <div className="stk-warn-t">¡AVISO!</div>
        <p className="stk-warn-p">{text}</p>
      </div>
    </div>
  )
}

type InnerProps = ExerciseProps<StackSimData> & { cfg: Cfg }

function StackSimInner({ cfg, onCheck, onStep, locked, showSolution, attempt }: InnerProps) {
  const { mode, view, limit } = cfg
  const slots = view === 'array' ? cfg.capacity : 0

  // ── estado ──
  const idRef = useRef(1)
  const newId = useCallback(() => idRef.current++, [])
  const [model, setModel] = useState<Model>(() => fromValues(cfg.initial, slots, () => idRef.current++))
  const [leaving, setLeaving] = useState<Leaving[]>([])
  const [note, setNote] = useState<NoteState | null>(null)
  const [flash, setFlash] = useState<'overflow' | null>(null)
  const [bad, setBad] = useState(false)
  const [tray, setTray] = useState<{ k: number; v: Val }[]>([])
  const [idx, setIdx] = useState(0)
  const [solved, setSolved] = useState(false)
  const [lastWrong, setLastWrong] = useState<Action | null>(null)

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
    noteTimer.current = window.setTimeout(() => setNote(null), 3400)
  }

  // ── error global del runner: sacudir / destello rojo ──
  const prevAttempt = useRef(attempt)
  useEffect(() => {
    if (attempt > prevAttempt.current) {
      setBad(true)
      later(() => setBad(false), 700)
    }
    prevAttempt.current = attempt
  }, [attempt, later])

  // ── operaciones sobre la pila ──
  const flashOverflow = () => {
    setFlash('overflow')
    later(() => setFlash(null), 700)
  }
  const overflow = () => {
    sfx.wrong()
    flashOverflow()
    if (view === 'array') say('bad', '¡DESBORDAMIENTO!', `La pila está llena (capacidad ${cfg.capacity}). No cabe otro dato.`)
    else say('bad', '¡MUY ALTA!', `Máximo ${limit} elementos en esta pila.`)
  }
  const underflow = () => {
    sfx.wrong()
    say('warn', '¡PILA VACÍA!', 'No hay nada que sacar con pop().')
  }
  const doPush = (v: Val): boolean => {
    if (model.size >= limit) return false
    setModel(pushItem(model, { id: newId(), v }))
    return true
  }
  const doPop = (): boolean => {
    const r = popItem(model)
    if (!r.item) return false
    setModel(r.model)
    const lv: Leaving = { key: newId(), item: r.item, slot: r.slot }
    setLeaving((l) => [...l, lv])
    later(() => setLeaving((l) => l.filter((x) => x.key !== lv.key)), 520)
    return true
  }

  // ───────── modo BUILD ─────────
  const onPalettePush = (v: Val, e: BtnEvent) => {
    if (locked) return
    sfx.click()
    if (!doPush(v)) return overflow()
    clearNote()
    fx(e.currentTarget, 'PUSH', '--ok')
  }
  const onPopButton = (e: BtnEvent) => {
    if (locked) return
    sfx.click()
    if (!doPop()) return underflow()
    clearNote()
    fx(e.currentTarget, 'POP', '--info')
  }
  const onReset = () => {
    if (locked) return
    sfx.click()
    setModel(fromValues(cfg.initial, slots, newId))
    setLeaving([])
    setNote(null)
  }
  // Firma de la última respuesta incorrecta: comprobar lo MISMO otra vez no cobra otra vida
  const lastWrongSig = useRef<string | null>(null)
  const sigOf = (vals: Val[]) => JSON.stringify(vals.map(String))
  const onCheckBuild = () => {
    if (locked) return
    sfx.click()
    const vals = activeValues(model)
    if (sameSeq(vals, cfg.expected)) {
      setSolved(true)
      onCheck(true, vals)
    } else if (lastWrongSig.current === sigOf(vals)) {
      say('warn', '¡ES LA MISMA PILA!', 'Esa ya la probaste. Cambia algo antes de comprobar.')
    } else {
      lastWrongSig.current = sigOf(vals)
      say('bad', '¡TODAVÍA NO!', 'Ejecuta el programa línea por línea y compara con tu pila.')
      onCheck(false, vals)
    }
  }

  // ───────── modo POPPED ─────────
  const expectedN = cfg.expected.length
  const onTrayAdd = (v: Val, e: BtnEvent) => {
    if (locked || tray.length >= expectedN) return
    sfx.click()
    setTray([...tray, { k: newId(), v }])
    clearNote()
    fx(e.currentTarget, 'POP', '--info')
  }
  const onTrayRemove = (k: number) => {
    if (locked) return
    sfx.click()
    setTray(tray.filter((t) => t.k !== k))
  }
  const onCheckPopped = () => {
    if (locked || tray.length < expectedN) return
    sfx.click()
    const vals = tray.map((t) => t.v)
    if (sameSeq(vals, cfg.expected)) {
      setSolved(true)
      onCheck(true, vals)
    } else if (lastWrongSig.current === sigOf(vals)) {
      say('warn', '¡ES EL MISMO ORDEN!', 'Ese ya lo probaste. Toca una ficha de la bandeja para quitarla y cambia el orden.')
    } else {
      lastWrongSig.current = sigOf(vals)
      say('bad', '¡ESE ORDEN NO!', 'Recuerda: sale primero lo último que entró.')
      onCheck(false, vals)
    }
  }

  // ───────── modo TRACE ─────────
  const tokens = cfg.tokens
  const done = mode === 'trace' && idx >= tokens.length
  // Doble clic: el mismo error seguido no cobra otra vida, y tras avanzar se ignora el clic "rebote"
  const lastTraceWrong = useRef<string | null>(null)
  const traceAdvancedAt = useRef(0)
  const onChoose = (chosen: Action, e: BtnEvent) => {
    if (locked || done) return
    sfx.click()
    const tok = tokens[idx]
    if (!tok) return
    if (performance.now() - traceAdvancedAt.current < 300) return
    if (chosen !== tok.action) {
      setLastWrong(chosen)
      later(() => setLastWrong(null), 700)
      if (chosen === 'pop' && model.size === 0) say('bad', '¡PILA VACÍA!', 'No hay nada que sacar con pop().')
      else if (chosen === 'push' && view === 'array' && model.size >= limit)
        say('bad', '¡DESBORDAMIENTO!', `La pila ya está llena (capacidad ${cfg.capacity}).`)
      else {
        const sub: Record<Action, string> = {
          push: 'Ese token no se apila ahora.',
          pop: 'Ahí no toca sacar nada.',
          skip: 'Ese token no se ignora.',
          error: 'Aquí todavía no hay ningún error.',
        }
        say('bad', '¡UY!', sub[chosen])
      }
      if (chosen === 'push' && view === 'array' && model.size >= limit) flashOverflow()
      const wrongKey = `${idx}:${chosen}`
      if (lastTraceWrong.current === wrongKey) return
      lastTraceWrong.current = wrongKey
      onCheck(false, chosen)
      return
    }
    // acierto
    traceAdvancedAt.current = performance.now()
    lastTraceWrong.current = null
    setLastWrong(null)
    clearNote()
    if (tok.action === 'push') {
      if (!doPush(tok.text)) flashOverflow()
    } else if (tok.action === 'pop') {
      doPop()
    } else if (tok.action === 'error') {
      if (model.size === 0) say('ok', '¡BIEN VISTO!', 'La pila está vacía: no hay con qué emparejar.')
      else if (view === 'array' && model.size >= limit) say('ok', '¡BIEN VISTO!', 'Desbordamiento: la pila está llena.')
      else say('ok', '¡BIEN VISTO!', 'No coincide con el tope de la pila: es un error.')
    }
    fx(e.currentTarget, ACTION_LABEL[chosen], ACTION_COLOR[chosen])
    const next = idx + 1
    setIdx(next)
    if (next >= tokens.length) {
      setSolved(true)
      onCheck(true, activeValues(model))
    } else {
      onStep?.()
    }
  }

  // ── solución (sin vidas) ──
  const solutionModel = useMemo(() => {
    if (mode !== 'build') return null
    let n = -1
    return fromValues(cfg.expected, slots, () => n--)
  }, [mode, cfg.expected, slots])

  const idle =
    mode === 'build'
      ? 'Toca una ficha para apilarla (PUSH). POP quita la de arriba.'
      : mode === 'popped'
        ? 'Toca las fichas en el orden en que salen con pop().'
        : 'El comecocos revisa cada token. ¿Qué hace la pila con él?'

  const rootCls = 'stk-root' + (bad ? ' is-bad anim-shake' : '') + (solved ? ' is-solved' : '')
  const hasProgram = mode !== 'trace'
  const visualFlash = flash ?? (solved ? 'ok' : null)

  return (
    <div className={rootCls} data-mode={mode} data-view={view}>
      <div className="stk-main">
        {hasProgram && (
          <section className="px-panel stk-prog" aria-label="Programa (solo lectura)">
            <h3 className="stk-h">PROGRAMA</h3>
            <p className="stk-init">
              {cfg.initial.length === 0 ? (
                'Empieza con la pila vacía.'
              ) : (
                <>
                  Empieza con (fondo → tope):{' '}
                  {cfg.initial.map((v, i) => (
                    <span key={i} className="stk-mini">{String(v)}</span>
                  ))}
                </>
              )}
            </p>
            <ol className="stk-ops">
              {cfg.ops.map((op, i) => {
                const k = parseOp(op).kind
                return (
                  <li key={i} className={`stk-op is-${k}`}>
                    <span className="stk-ln" aria-hidden="true">{i + 1}</span>
                    <code>{op}</code>
                  </li>
                )
              })}
            </ol>
          </section>
        )}

        <section className="px-panel stk-stage" aria-label="Pila">
          <div className="stk-head">
            <span className="stk-ttl">{VIEW_TITLE[view]}</span>
            <span className="stk-badge">
              {view === 'array'
                ? `tope = ${model.size - 1}`
                : `${model.size} ${view === 'nodes' ? (model.size === 1 ? 'NODO' : 'NODOS') : model.size === 1 ? 'PLATO' : 'PLATOS'}`}
            </span>
          </div>
          {mode === 'popped' && cfg.initial.length > 0 && <p className="stk-sub">Así empieza la pila, antes del programa.</p>}
          <StackVisual
            view={view}
            cells={model.cells}
            size={model.size}
            capacity={cfg.capacity}
            leaving={leaving}
            flash={visualFlash}
            compact={mode === 'popped'}
          />
          <p className="stk-legend">{LEGEND[view]}</p>
        </section>
      </div>

      <div className={'stk-note' + (note ? ` is-${note.tone}` : '')} role="status" aria-live="polite">
        {note ? (
          <>
            <span className="stk-note-ico" key={note.k} aria-hidden="true">
              {note.tone === 'ok' ? <PacMan size={38} chomp /> : <Ghost color={note.tone === 'warn' ? 'orange' : 'red'} size={38} float />}
            </span>
            <span className="stk-note-txt">
              <span className="stk-note-t">{note.title}</span>
              {note.sub && <span className="stk-note-s">{note.sub}</span>}
            </span>
          </>
        ) : (
          <span className="stk-note-s is-idle">{idle}</span>
        )}
      </div>

      {/* ───────── BUILD ───────── */}
      {mode === 'build' && (
        <section className="px-panel stk-controls">
          <h3 className="stk-h">FICHAS · TOCA PARA APILAR</h3>
          <div className="stk-palette">
            {cfg.palette.map((v, i) => (
              <button
                key={i}
                type="button"
                className="px-chip stk-chip"
                disabled={locked}
                onClick={(e) => onPalettePush(v, e)}
                aria-label={`Apilar ${String(v)}`}
              >
                {String(v)}
              </button>
            ))}
          </div>
          <div className="stk-btns">
            <button type="button" className="px-btn stk-btn-pop" disabled={locked} onClick={onPopButton}>
              POP
            </button>
            <button type="button" className="px-btn px-btn--ghost" disabled={locked} onClick={onReset}>
              REINICIAR
            </button>
          </div>
          <button type="button" className="px-btn px-btn--primary px-btn--block" disabled={locked} onClick={onCheckBuild}>
            COMPROBAR
          </button>
        </section>
      )}

      {/* ───────── POPPED ───────── */}
      {mode === 'popped' && (
        <section className="px-panel stk-controls">
          <div className="stk-tray-head">
            <PacMan size={30} dir="right" chomp={!locked && tray.length < expectedN} />
            <h3 className="stk-h">BANDEJA DE SALIDA · EN ORDEN</h3>
          </div>
          {expectedN === 0 ? (
            <p className="stk-sub">En este programa no sale nada con pop(). ¡Solo comprueba!</p>
          ) : (
            <div className="stk-tray">
              {Array.from({ length: expectedN }, (_, i) => {
                const t = tray[i]
                return t ? (
                  <button
                    key={t.k}
                    type="button"
                    className="stk-slot is-full"
                    disabled={locked}
                    onClick={() => onTrayRemove(t.k)}
                    aria-label={`Salida ${i + 1}: ${String(t.v)}. Toca para quitar`}
                  >
                    {String(t.v)}
                  </button>
                ) : (
                  <span key={`e${i}`} className="stk-slot" aria-label={`Salida ${i + 1} vacía`}>
                    {i + 1}
                  </span>
                )
              })}
            </div>
          )}
          <h3 className="stk-h">FICHAS</h3>
          <div className="stk-palette">
            {cfg.palette.map((v, i) => (
              <button
                key={i}
                type="button"
                className="px-chip stk-chip"
                disabled={locked || tray.length >= expectedN}
                onClick={(e) => onTrayAdd(v, e)}
                aria-label={`Sale ${String(v)}`}
              >
                {String(v)}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="px-btn px-btn--primary px-btn--block"
            disabled={locked || tray.length < expectedN}
            onClick={onCheckPopped}
          >
            COMPROBAR
          </button>
        </section>
      )}

      {/* ───────── TRACE ───────── */}
      {mode === 'trace' && (
        <section className="px-panel stk-controls">
          <h3 className="stk-h">TOKENS</h3>
          <ol className="stk-tokens" aria-label="Tokens a procesar">
            {tokens.map((t, i) => {
              const isCur = i === idx && !done
              const revealed = i < idx || showSolution
              const state = i < idx ? 'is-eaten' : isCur ? 'is-current' : 'is-next'
              return (
                <li key={i} className={`stk-tok ${state}`} aria-current={isCur ? 'step' : undefined}>
                  <span className="stk-tok-slot" aria-hidden="true">
                    {isCur && <PacMan key={idx} size={30} dir="right" chomp className="stk-tok-pac" />}
                  </span>
                  <span className="stk-tok-chip">{t.text}</span>
                  <span className={`stk-tok-mark is-${t.action}`} aria-hidden="true">
                    {revealed ? ACTION_MARK[t.action] : ''}
                  </span>
                  {revealed && <span className="stk-sr">{ACTION_LABEL[t.action]}</span>}
                </li>
              )
            })}
          </ol>
          <div className="stk-acts">
            {(['push', 'pop', 'skip', 'error'] as Action[]).map((a) => (
              <button
                key={a}
                type="button"
                className={`px-btn stk-act is-${a}${lastWrong === a ? ' is-wrong' : ''}`}
                disabled={locked || done}
                onClick={(e) => onChoose(a, e)}
              >
                <span className="stk-act-t">{ACTION_LABEL[a]}</span>
                <span className="stk-act-s">{ACTION_HELP[a]}</span>
              </button>
            ))}
          </div>
          {done && <p className="stk-sub">¡Todos los tokens revisados!</p>}
        </section>
      )}

      {/* ───────── SOLUCIÓN (sin vidas) ───────── */}
      {showSolution && mode === 'build' && solutionModel && (
        <section className="px-panel stk-solution" aria-label="Respuesta correcta">
          <h3 className="stk-h">RESPUESTA · ASÍ DEBÍA QUEDAR</h3>
          <StackVisual view={view} cells={solutionModel.cells} size={solutionModel.size} capacity={cfg.capacity} />
          <p className="stk-sub">
            {cfg.expected.length === 0 ? 'La pila queda vacía.' : `Del fondo al tope: ${cfg.expected.map(String).join(', ')}`}
          </p>
        </section>
      )}
      {showSolution && mode === 'popped' && (
        <section className="px-panel stk-solution" aria-label="Respuesta correcta">
          <h3 className="stk-h">RESPUESTA · ASÍ SALEN</h3>
          <div className="stk-tray">
            {cfg.expected.map((v, i) => (
              <span key={i} className="stk-slot is-full is-ok">{String(v)}</span>
            ))}
          </div>
        </section>
      )}
      {showSolution && mode === 'trace' && (
        <section className="px-panel stk-solution" aria-label="Respuesta correcta">
          <h3 className="stk-h">RESPUESTA · QUÉ HACE CADA TOKEN</h3>
          <ul className="stk-sol-list">
            {tokens.map((t, i) => (
              <li key={i}>
                <span className="stk-sol-tok">{t.text}</span>
                <span className={`stk-sol-act is-${t.action}`}>{ACTION_LABEL[t.action]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

export default {
  type: 'stack-sim',
  label: 'Pila de platos',
  Component: StackSim,
} satisfies ExerciseModule<StackSimData>

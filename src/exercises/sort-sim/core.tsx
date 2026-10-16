/**
 * Núcleo compartido por los 4 modos de sort-sim: temporizadores con limpieza, protecciones
 * (doble clic, mismo error dos veces, onCheck(true) una sola vez, candado) y piezas de UI
 * (HUD con contadores grandes, letrero de la analogía, barras pixel, mensaje, comecocos que come).
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { ExerciseProps } from '../../engine/types'
import type { SortSimData } from '../schemas'
import { Ghost, PacMan, PixelIcon, RichText, burst, floatText } from '../../ui'
import { useAttemptFlash } from '../_shared/useAttemptFlash'
import { cssVar } from '../_shared/dom'
import type { Cfg, Digit } from './logic'

export type Tone = 'ok' | 'bad' | 'info'
export interface Msg {
  tone: Tone
  text: string
}
export type GameProps<C extends Cfg = Cfg> = ExerciseProps<SortSimData> & { cfg: C }

/** Tras avanzar de paso se ignoran toques durante este tiempo (rebote de doble clic). */
const GUARD_MS = 350

const FALLBACK: Record<string, string> = {
  '--pac': '#ffe600',
  '--ok': '#3cff6e',
  '--bad': '#ff3b3b',
  '--info': '#00e5ff',
  '--ghost-orange': '#ffb852',
}

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

export const sign = (a: number, b: number): '<' | '>' | '=' => (a === b ? '=' : a < b ? '<' : '>')

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

export function useCore({ onCheck, onStep, locked, showSolution, attempt }: GameProps) {
  const latest = useRef({ onCheck, onStep })
  useLayoutEffect(() => {
    latest.current = { onCheck, onStep }
  })

  // ── temporizadores: todos se cancelan al desmontar ──
  const timers = useRef<Set<number>>(new Set())
  useEffect(() => {
    const set = timers.current
    return () => {
      set.forEach((id) => window.clearTimeout(id))
      set.clear()
    }
  }, [])
  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id)
      fn()
    }, ms)
    timers.current.add(id)
    return id
  }, [])

  const [msg, setMsg] = useState<Msg | null>(null)
  const [won, setWon] = useState(false)
  const wonRef = useRef(false)
  const [busy, setBusyState] = useState(false)
  const busyRef = useRef(false)
  const setBusy = useCallback((b: boolean) => {
    busyRef.current = b
    setBusyState(b)
  }, [])
  const guardUntil = useRef(0)
  /** errores ya cobrados: repetir el mismo error no cuesta otra vida */
  const tried = useRef<Set<string>>(new Set())

  const canAct = () =>
    !locked && !showSolution && !wonRef.current && !busyRef.current && performance.now() >= guardUntil.current
  const advanced = (ms: number = GUARD_MS) => {
    guardUntil.current = performance.now() + ms
  }
  const miss = (sig: string, text: string, answer?: unknown) => {
    advanced()
    if (tried.current.has(sig)) {
      setMsg({ tone: 'bad', text: `${text} (Ese error ya contó: **no cuesta otra vida**.)` })
      return
    }
    tried.current.add(sig)
    setMsg({ tone: 'bad', text })
    latest.current.onCheck(false, answer)
  }
  const step = () => latest.current.onStep?.()
  /** Termina bien: bloquea de inmediato y avisa al runner UNA sola vez (tras la animación). */
  const win = (answer: unknown, delay = 600) => {
    if (wonRef.current) return
    wonRef.current = true
    setWon(true)
    later(() => latest.current.onCheck(true, answer), delay)
  }

  // ── error (attempt sube): sacudida roja + fantasma que cruza el tablero ──
  const hit = useAttemptFlash(attempt, 700)
  const [ghostKey, setGhostKey] = useState(0)
  const prevAttempt = useRef(attempt)
  useEffect(() => {
    if (attempt > prevAttempt.current) setGhostKey((k) => k + 1)
    prevAttempt.current = attempt
  }, [attempt])

  const reduced = useMemo(prefersReducedMotion, [])

  /** Partículas + texto flotante sobre un elemento (opcional: nunca rompe el ejercicio). */
  const fx = (el: Element | null | undefined, text?: string, colorVar = '--pac', count = 10) => {
    try {
      if (!el) return
      const r = el.getBoundingClientRect()
      const x = r.left + r.width / 2
      const y = r.top + r.height / 2
      const color = cssVar(colorVar, FALLBACK[colorVar] ?? '#ffe600')
      burst(x, y, { color, count })
      if (text) floatText(x, r.top - 6, text, { color })
    } catch {
      /* efectos opcionales */
    }
  }

  return { later, msg, setMsg, won, busy, setBusy, canAct, advanced, miss, step, win, hit, ghostKey, reduced, fx }
}

// ───────────────────────── Piezas de UI ─────────────────────────

export function Hud({ title, badge, chomp }: { title: string; badge?: string; chomp: boolean }) {
  return (
    <div className="srt-hud">
      <span className="srt-hud__pac" aria-hidden="true">
        <PacMan size={30} dir="right" chomp={chomp} />
      </span>
      <span className="srt-hud__title">{title}</span>
      {badge && <span className="srt-hud__badge">{badge}</span>}
    </div>
  )
}

/** Letrero con la analogía del curso */
export function Sign({ icon, text }: { icon: string; text: string }) {
  return (
    <p className="srt-sign">
      <PixelIcon name={icon} size={20} />
      <span>
        <RichText text={text} />
      </span>
    </p>
  )
}

/** Contadores grandes: etiqueta arriba, número grande abajo. */
export function Stats({ items }: { items: { label: string; value: ReactNode; tone?: 'hl' | 'ok'; bump?: number }[] }) {
  return (
    <div className="srt-stats">
      {items.map((s) => (
        <div key={s.label} className={cx('srt-stat', s.tone && `is-${s.tone}`)}>
          <span className="srt-stat__label">{s.label}</span>
          <span className="srt-stat__value" key={s.bump}>
            {s.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export function Board({ hit, ghostKey, children, label }: { hit: boolean; ghostKey: number; children: ReactNode; label?: string }) {
  return (
    <div className={cx('px-panel srt-board', hit && 'is-hit')} role="group" aria-label={label}>
      {children}
      {ghostKey > 0 && (
        <span key={ghostKey} className="srt-ghostrun" aria-hidden="true">
          <Ghost color="red" size={36} />
        </span>
      )}
    </div>
  )
}

/**
 * Mensaje de estado. `next` = instrucción corta del paso ACTUAL: se muestra debajo de un acierto ('ok')
 * para que la retroalimentación del paso anterior no se lea como si fuera del par/cabeza/carta actual.
 */
export function Status({ msg, idle, solution, next }: { msg: Msg | null; idle: string; solution?: string | null; next?: string | null }) {
  const m: Msg = solution ? { tone: 'info', text: solution } : (msg ?? { tone: 'info', text: idle })
  const showNext = !solution && msg?.tone === 'ok' && !!next
  return (
    <p className={cx('srt-msg', `is-${m.tone}`, !msg && !solution && 'is-idle')} role="status" aria-live="polite">
      <RichText text={m.text} />
      {showNext && <RichText className="srt-msg__next" text={next} />}
    </p>
  )
}

export type BarTone = 'base' | 'fixed' | 'pivot' | 'less' | 'greater' | 'left' | 'right' | 'bad' | 'ghost'

/** Barra pixel con su número encima; la altura es proporcional al número (f = 0.14 … 1). */
export function Bar({ v, f, tone = 'base', label, small }: { v: number; f: number; tone?: BarTone; label?: ReactNode; small?: boolean }) {
  const style = { '--f': f } as CSSProperties
  return (
    <span className={cx('srt-bar', `is-${tone}`, small && 'is-small')} style={style}>
      <span className="srt-bar__num">{label ?? v}</span>
      <span className="srt-bar__col" aria-hidden="true" />
    </span>
  )
}

/** Estilo de una casilla absoluta dentro de una pista de n casillas (se anima al cambiar --i). */
export const slotStyle = (i: number, n: number): CSSProperties => ({ '--i': i, '--n': n }) as CSSProperties

/** Comecocos que aparece y "come" sobre la casilla i (se repite al cambiar k). */
export function PacPop({ i, n, k }: { i: number; n: number; k: number }) {
  if (k <= 0) return null
  return (
    <span key={k} className="srt-pacpop" style={slotStyle(i, n)} aria-hidden="true">
      <PacMan size={26} dir="down" chomp />
    </span>
  )
}

/** Fila de índices debajo de una pista */
export function IndexRow({ n, mark }: { n: number; mark?: number }) {
  return (
    <div className="srt-idx" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={cx('srt-idx__i', mark === i && 'is-mark')}>
          {i}
        </span>
      ))}
    </div>
  )
}

/** Número con un dígito resaltado (radix). En decenas, los de un dígito se muestran con 0 adelante. */
export function DigitNum({ v, d, on = true }: { v: number; d: Digit; on?: boolean }) {
  let s = String(v)
  let pad = false
  if (d === 'tens' && s.length < 2) {
    s = '0' + s
    pad = true
  }
  const hi = d === 'units' ? s.length - 1 : s.length - 2
  return (
    <span className="srt-dnum">
      {s.split('').map((ch, i) => (
        <span key={i} className={cx(on && i === hi && 'is-digit', pad && i === 0 && 'is-pad')}>
          {ch}
        </span>
      ))}
    </span>
  )
}

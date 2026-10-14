/**
 * Núcleo compartido por los 4 modos de bst-sim: temporizadores con limpieza, protecciones
 * (doble clic, mismo error dos veces, onCheck(true) una sola vez, candado), efectos y piezas de UI.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { ExerciseProps } from '../../engine/types'
import type { BstSimData } from '../schemas'
import { Ghost, PacMan, PixelIcon, RichText, burst, floatText } from '../../ui'
import { useAttemptFlash } from '../_shared/useAttemptFlash'
import { cssVar } from '../_shared/dom'
import type { Cfg } from './logic'

export type Tone = 'ok' | 'bad' | 'info'
export interface Msg {
  tone: Tone
  text: string
}
export type GameProps = ExerciseProps<BstSimData> & { cfg: Cfg }

/** Tras avanzar de paso se ignoran clics durante este tiempo (rebote de doble clic). */
const GUARD_MS = 350

const FALLBACK: Record<string, string> = {
  '--pac': '#ffe600',
  '--ok': '#3cff6e',
  '--bad': '#ff3b3b',
  '--info': '#00e5ff',
}

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

/** "42 < 50" con el signo correcto */
export const cmpSign = (a: number, b: number): '<' | '>' | '=' => (a === b ? '=' : a < b ? '<' : '>')

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

  // ── temporizadores: todos se cancelan al desmontar (nada de setState después) ──
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
  /** errores ya cobrados ("paso:qué"): repetir el mismo error no cuesta otra vida */
  const tried = useRef<Set<string>>(new Set())

  const canAct = () =>
    !locked && !showSolution && !wonRef.current && !busyRef.current && performance.now() >= guardUntil.current
  const advanced = (ms: number = GUARD_MS) => {
    guardUntil.current = performance.now() + ms
  }
  const miss = (sig: string, text: string, answer?: unknown) => {
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

  const nodeRefs = useRef<Map<number, HTMLElement>>(new Map())
  const holeRefs = useRef<Map<string, HTMLElement>>(new Map())
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

  return {
    later,
    msg,
    setMsg,
    won,
    busy,
    setBusy,
    canAct,
    advanced,
    miss,
    step,
    win,
    hit,
    ghostKey,
    nodeRefs,
    holeRefs,
    reduced,
    fx,
  }
}

// ───────────────────────── Piezas de UI ─────────────────────────

export function Hud({ title, sub, right, chomp }: { title: string; sub?: string; right?: ReactNode; chomp: boolean }) {
  return (
    <div className="bst-hud">
      <span className="bst-hud__pac" aria-hidden="true">
        <PacMan size={30} dir="right" chomp={chomp} />
      </span>
      <div className="bst-hud__title">{title}</div>
      {right && <div className="bst-hud__right">{right}</div>}
      {sub && (
        <div className="bst-hud__sub">
          <RichText text={sub} />
        </div>
      )}
    </div>
  )
}

/** Marcador pequeño del HUD: etiqueta arriba, valor grande abajo. */
export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: 'hl' | 'ok' }) {
  return (
    <div className={cx('bst-stat', tone && `is-${tone}`)}>
      <span className="bst-stat__label">{label}</span>
      <span className="bst-stat__value">{value}</span>
    </div>
  )
}

export function BoardPanel({ hit, ghostKey, children }: { hit: boolean; ghostKey: number; children: ReactNode }) {
  return (
    <div className={cx('px-panel bst-board', hit && 'is-hit')}>
      {children}
      <p className="bst-legend" aria-hidden="true">
        <span className="bst-legend__side">
          <PixelIcon name="arrow-left" size={14} />
          MENORES
        </span>
        <span className="bst-legend__side">
          MAYORES
          <PixelIcon name="arrow-right" size={14} />
        </span>
      </p>
      {ghostKey > 0 && (
        <span key={ghostKey} className="bst-ghostrun" aria-hidden="true">
          <Ghost color="red" size={36} />
        </span>
      )}
    </div>
  )
}

export function Status({ msg, idle, solution }: { msg: Msg | null; idle: string; solution?: string | null }) {
  const m: Msg = solution ? { tone: 'info', text: solution } : (msg ?? { tone: 'info', text: idle })
  return (
    <p className={cx('bst-msg', `is-${m.tone}`, !msg && !solution && 'is-idle')} role="status" aria-live="polite">
      <RichText text={m.text} />
    </p>
  )
}

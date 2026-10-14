/**
 * Piezas compartidas por los 3 juegos de graph-sim: temporizadores con limpieza, aviso
 * (fantasma / comecocos), HUD, banquete final y efectos locales.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Ghost, PacMan, RichText, burst, floatText } from '../../ui'
import { EatStrip } from '../_shared/EatStrip'
import { cssVar } from '../_shared/dom'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

/** Milisegundos por tramo de carretera que recorre el comecocos */
export const SEG_MS = 380
/** Tras avanzar se ignoran los toques "rebote" (doble clic) durante este tiempo */
export const DEBOUNCE_MS = 350

/** setTimeout que se limpia solo al desmontar (nada de setState tras desmontar) */
export function useLater() {
  const timers = useRef<number[]>([])
  useEffect(() => {
    const list = timers.current
    return () => list.forEach((t) => window.clearTimeout(t))
  }, [])
  return useCallback((fn: () => void, ms: number) => {
    const t = window.setTimeout(() => {
      const i = timers.current.indexOf(t)
      if (i >= 0) timers.current.splice(i, 1)
      fn()
    }, ms)
    timers.current.push(t)
  }, [])
}

export function prefersReduced(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

// ───────────────────────── aviso ─────────────────────────
export type Tone = 'ok' | 'bad' | 'warn' | 'info'
export interface Note { tone: Tone; title: string; sub?: string; k: number }

export function useNote() {
  const [note, setNoteState] = useState<Note | null>(null)
  const seq = useRef(0)
  const say = useCallback((tone: Tone, title: string, sub?: string) => {
    seq.current += 1
    setNoteState({ tone, title, sub, k: seq.current })
  }, [])
  const clear = useCallback(() => setNoteState(null), [])
  return { note, say, clear }
}

/** Fantasma sobre una ciudad (error) que se va solo */
export function useGhostAt(later: (fn: () => void, ms: number) => void) {
  const [ghost, setGhost] = useState<{ id: string; k: number } | null>(null)
  const seq = useRef(0)
  const show = useCallback(
    (id: string) => {
      seq.current += 1
      const k = seq.current
      setGhost({ id, k })
      later(() => setGhost((g) => (g && g.k === k ? null : g)), 900)
    },
    [later],
  )
  return { ghost, showGhost: show }
}

export function NoteBar({ note, idle }: { note: Note | null; idle: string }) {
  return (
    <div className={cx('gs-note', note && `is-${note.tone}`)} role="status" aria-live="polite">
      {note ? (
        <>
          <span className="gs-note-ico" key={note.k} aria-hidden="true">
            {note.tone === 'ok' ? (
              <PacMan size={34} chomp />
            ) : note.tone === 'info' ? (
              <PacMan size={34} chomp={false} />
            ) : (
              <Ghost color={note.tone === 'warn' ? 'orange' : 'red'} size={34} float />
            )}
          </span>
          <span className="gs-note-txt">
            <span className="gs-note-t">{note.title}</span>
            {note.sub && (
              <span className="gs-note-s">
                <RichText text={note.sub} />
              </span>
            )}
          </span>
        </>
      ) : (
        <span className="gs-note-s is-idle">
          <RichText text={idle} />
        </span>
      )}
    </div>
  )
}

export function Hud({
  title,
  sub,
  right,
  chomp,
  progress,
}: {
  title: string
  sub: string
  right?: ReactNode
  chomp: boolean
  /** el contenido de la derecha es una barra de progreso (necesita ancho fijo) */
  progress?: boolean
}) {
  return (
    <div className="gs-hud">
      <PacMan size={30} dir="right" chomp={chomp} />
      <div className="gs-hud-text">
        <div className="gs-hud-title">{title}</div>
        <div className="gs-hud-sub">
          <RichText text={sub} />
        </div>
      </div>
      {right && <div className={cx('gs-hud-right', progress && 'is-progress')}>{right}</div>}
    </div>
  )
}

export function Win({ text }: { text: string }) {
  return (
    <div className="px-panel gs-win">
      <EatStrip pellets={12} />
      <p className="gs-win-t" role="status">
        <RichText text={text} />
      </p>
    </div>
  )
}

/** Partículas + texto flotante sobre un elemento (opcionales: nunca rompen el juego) */
export function fxAt(el: Element | null | undefined, text: string | undefined, colorVar = '--pac', count = 10) {
  if (!el) return
  try {
    const r = el.getBoundingClientRect()
    const x = r.left + r.width / 2
    const y = r.top + r.height / 2
    const color = cssVar(colorVar)
    burst(x, y, { color, count })
    if (text) floatText(x, r.top - 6, text, { color })
  } catch {
    /* efectos opcionales */
  }
}

/** Color de cada capa de BFS (la "onda") */
export const LAYER_VARS = ['--pac', '--ghost-cyan', '--ghost-pink', '--ghost-orange', '--ok', '--ghost-red']
export const layerColor = (layer: number) => `var(${LAYER_VARS[Math.max(0, layer) % LAYER_VARS.length]})`

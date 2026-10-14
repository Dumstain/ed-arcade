/** Piezas compartidas por los dos modos de list-sim: aviso (fantasma / comecocos), temporizadores, efectos y meta. */
import { useCallback, useEffect, useRef } from 'react'
import { Ghost, PacMan, PixelIcon, RichText, burst, floatText } from '../../ui'
import { centerOf, cssVar } from '../_shared/dom'
import { show, type Cfg } from './logic'

export type Tone = 'bad' | 'warn' | 'ok' | 'info'
export interface NoteState {
  tone: Tone
  title: string
  sub?: string
  /** cambia en cada aviso (reinicia la animación del ícono) */
  k: number
}

/** Barra de avisos: fantasma en errores, comecocos en aciertos. aria-live para lectores de pantalla. */
export function Note({ note, idle }: { note: NoteState | null; idle: string }) {
  return (
    <div className={'ls-note' + (note ? ` is-${note.tone}` : '')} role="status" aria-live="polite">
      {note ? (
        <>
          <span className="ls-note-ico" key={note.k} aria-hidden="true">
            {note.tone === 'bad' ? (
              <Ghost color="red" size={36} float />
            ) : note.tone === 'warn' ? (
              <Ghost color="orange" size={36} float />
            ) : note.tone === 'ok' ? (
              <PacMan size={36} chomp />
            ) : (
              <PixelIcon name="train" size={36} />
            )}
          </span>
          <span className="ls-note-txt">
            <span className="ls-note-t">{note.title}</span>
            {note.sub && (
              <span className="ls-note-s">
                <RichText text={note.sub} />
              </span>
            )}
          </span>
        </>
      ) : (
        <span className="ls-note-s is-idle">
          <RichText text={idle} />
        </span>
      )}
    </div>
  )
}

/** setTimeout que se cancela solo al desmontar (nada de setState tras desmontar). */
export function useTimers() {
  const list = useRef<number[]>([])
  useEffect(() => {
    const l = list.current
    return () => l.forEach((t) => window.clearTimeout(t))
  }, [])
  return useCallback((fn: () => void, ms: number) => {
    const t = window.setTimeout(fn, ms)
    list.current.push(t)
    return t
  }, [])
}

/** Partículas + texto flotante sobre un elemento (opcionales: nunca deben romper el ejercicio). */
export function fxAt(el: Element | null | undefined, text: string, colorVar = '--pac') {
  try {
    const c = centerOf(el)
    if (!c) return
    const color = cssVar(colorVar)
    burst(c.x, c.y, { color, count: 8 })
    if (text) floatText(c.x, c.y - 18, text, { color })
  } catch {
    /* efectos opcionales */
  }
}

/** Meta del ejercicio: inicio → 3 → 5 → 7 → null (doble: flechas de ida y vuelta; circular: regresa). */
export function Goal({ cfg }: { cfg: Cfg }) {
  const vals = cfg.expected
  const tail = cfg.kind === 'circular' ? (vals.length ? `regresa al ${show(vals[0])}` : 'null') : 'null'
  const aria =
    `Meta: desde ${cfg.head}, ` +
    (vals.length ? vals.map((v) => show(v)).join(', ') : 'lista vacía') +
    (cfg.kind === 'circular' && vals.length ? ', y el último regresa al primero.' : ', luego null.') +
    (cfg.hasAnt ? ' Cada ant apunta al anterior.' : '') +
    (cfg.tails.length && vals.length ? ` ${cfg.tails.join(' y ')} en el ${show(vals[vals.length - 1])}.` : '')
  const link = cfg.hasAnt ? (
    <span className="ls-glink2" aria-hidden="true">
      <i className="ls-glink" />
      <i className="ls-glink is-back" />
    </span>
  ) : (
    <i className="ls-glink" aria-hidden="true" />
  )
  return (
    <div className="ls-goal" role="img" aria-label={aria}>
      <span className="ls-goal-h">META</span>
      <span className="ls-goal-chain" aria-hidden="true">
        <span className="ls-goal-head">{cfg.head}</span>
        {vals.map((v, i) => (
          <span className="ls-goal-unit" key={i}>
            {i === 0 ? <i className="ls-glink is-tag" /> : link}
            <span className="ls-gbox">{show(v)}</span>
          </span>
        ))}
        <span className="ls-goal-unit">
          <i className={'ls-glink' + (vals.length ? '' : ' is-tag')} aria-hidden="true" />
          <span className={'ls-gnull' + (cfg.kind === 'circular' && vals.length ? ' is-loop' : '')}>{tail}</span>
        </span>
      </span>
      {cfg.tails.length > 0 && vals.length > 0 && (
        <span className="ls-goal-chain" aria-hidden="true">
          <span className="ls-goal-head">{cfg.tails.join(' · ')}</span>
          <span className="ls-goal-unit">
            <i className="ls-glink is-tag" />
            <span className="ls-gbox">{show(vals[vals.length - 1])}</span>
          </span>
        </span>
      )}
    </div>
  )
}

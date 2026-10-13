/**
 * Overlays declarativos: Banner, Modal e Intermission (todos via portal a <body>).
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { PixelSvg, prefersReducedMotion } from './pixel'
import { Ghost, PacMan } from './sprites'
import { sfx } from './sfx'

function Portal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

/** Guarda la callback más reciente sin reiniciar efectos */
function useLatest<T>(v: T) {
  const r = useRef(v)
  r.current = v
  return r
}

// ───────────────────────── Banner ─────────────────────────
const BANNER_MS = 1200

/** Texto arcade grande animado: "READY!", "¡PERFECTO!", "GAME OVER" */
export function Banner({ text, tone = 'pac', onDone }: { text: string; tone?: 'pac' | 'ok' | 'bad' | 'info'; onDone?: () => void }) {
  const done = useLatest(onDone)
  useEffect(() => {
    const t = window.setTimeout(() => done.current?.(), BANNER_MS)
    return () => clearTimeout(t)
  }, [text, done])
  return (
    <Portal>
      <div className={`ui-banner ui-banner--${tone}`} role="status" aria-live="assertive">
        <div className="ui-banner__band" key={text}>
          <span className="ui-banner__text">{text}</span>
        </div>
      </div>
    </Portal>
  )
}

// ───────────────────────── Modal ─────────────────────────
const CLOSE_X = ['XX....XX', 'XXX..XXX', '.XXXXXX.', '..XXXX..', '..XXXX..', '.XXXXXX.', 'XXX..XXX', 'XX....XX']
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Panel/modal con borde de laberinto */
export function Modal({ open, title, children, onClose }: { open: boolean; title?: string; children: ReactNode; onClose?: () => void }) {
  const panel = useRef<HTMLDivElement>(null)
  const close = useLatest(onClose)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Enfoca el primer elemento interactivo (o el panel)
    const p = panel.current
    if (p) {
      const first = p.querySelector<HTMLElement>(`.ui-modal__body :is(${FOCUSABLE})`) ?? p.querySelector<HTMLElement>(FOCUSABLE)
      ;(first ?? p).focus({ preventScroll: true })
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (close.current) {
          e.stopPropagation()
          close.current()
        }
        return
      }
      if (e.key !== 'Tab' || !panel.current) return
      const els = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null)
      if (els.length === 0) {
        e.preventDefault()
        panel.current.focus()
        return
      }
      const first = els[0]
      const last = els[els.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === panel.current)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      } else if (!panel.current.contains(active)) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = prevOverflow
      if (prev && typeof prev.focus === 'function' && prev.isConnected) prev.focus({ preventScroll: true })
    }
  }, [open, close])

  if (!open) return null
  return (
    <Portal>
      <div
        className="ui-modal"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && close.current) close.current()
        }}
      >
        <div
          ref={panel}
          className="px-panel ui-modal__panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-label={title ? undefined : 'Diálogo'}
          tabIndex={-1}
        >
          {(title || onClose) && (
            <div className="ui-modal__head">
              {title ? (
                <h2 id={titleId} className="px-title ui-modal__title">
                  {title}
                </h2>
              ) : (
                <span />
              )}
              {onClose && (
                <button
                  type="button"
                  className="px-btn px-btn--sm px-btn--ghost ui-modal__close"
                  aria-label="Cerrar"
                  onClick={() => {
                    sfx.click()
                    close.current?.()
                  }}
                >
                  <PixelSvg grid={CLOSE_X} palette={{ X: 'currentColor' }} size={14} />
                </button>
              )}
            </div>
          )}
          <div className="ui-modal__body">{children}</div>
        </div>
      </div>
    </Portal>
  )
}

// ───────────────────────── Intermission ─────────────────────────
const HALF_MS = 1500

/** Escena intermedia (comecocos perseguido por fantasma y luego al revés) entre niveles */
export function Intermission({ onDone }: { onDone?: () => void }) {
  const done = useLatest(onDone)
  const fired = useRef(false)
  const skipRef = useRef<HTMLButtonElement>(null)
  const [phase, setPhase] = useState<0 | 1>(0)
  const [reduced] = useState(prefersReducedMotion)

  const finish = () => {
    if (fired.current) return
    fired.current = true
    done.current?.()
  }
  const finishRef = useLatest(finish)

  useEffect(() => {
    fired.current = false
    skipRef.current?.focus({ preventScroll: true })
    const total = reduced ? 1600 : HALF_MS * 2 + 150
    const t1 = window.setTimeout(() => {
      setPhase(1)
      sfx.powerUp()
    }, reduced ? 700 : HALF_MS)
    const t2 = window.setTimeout(() => finishRef.current(), total)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finishRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      document.removeEventListener('keydown', onKey)
    }
  }, [reduced, finishRef])

  return (
    <Portal>
      <div className={`ui-inter${reduced ? ' is-reduced' : ''}`} role="dialog" aria-modal="true" aria-label="Escena intermedia">
        <div className="ui-inter__stage" aria-hidden="true">
          <div className="ui-inter__corridor">
            {phase === 0 ? (
              <div className="ui-inter__actors ui-inter__actors--ltr" key="a">
                <Ghost color="red" size={44} />
                <span className="ui-inter__gap" />
                <PacMan size={44} dir="right" />
              </div>
            ) : (
              <div className="ui-inter__actors ui-inter__actors--rtl" key="b">
                <Ghost color="scared" size={44} />
                <span className="ui-inter__gap" />
                <PacMan size={88} dir="left" />
              </div>
            )}
          </div>
        </div>
        <button
          ref={skipRef}
          type="button"
          className="px-btn px-btn--sm ui-inter__skip"
          onClick={() => {
            sfx.click()
            finish()
          }}
        >
          Saltar ▶
        </button>
      </div>
    </Portal>
  )
}

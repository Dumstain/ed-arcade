/**
 * Teclado numérico arcade compartido — API CONGELADA.
 * Lo usan: number, memory-street (type), search-sim (predict), call-stack, rec-tree.
 * Teclas en pantalla 3x4 (toque) + teclado físico (dígitos, Backspace/Delete, Enter → onSubmit, '-').
 *
 * Extras OPCIONALES (no rompen la API): `unit` (texto junto al marcador) y `status`
 * ('ok' | 'bad' colorea el marcador; 'bad' además lo sacude).
 *
 * Notas:
 * - maxLength cuenta DÍGITOS (el signo '-' no cuenta).
 * - Si hay dos Keypad visibles a la vez, ambos responden al teclado físico.
 * - El botón de enviar solo existe si se pasa onSubmit; queda deshabilitado mientras no haya dígitos.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { RichText, sfx } from '../../ui'
import './keypad.css'

export interface KeypadProps {
  value: string
  onChange: (v: string) => void
  onSubmit?: () => void
  allowNegative?: boolean
  maxLength?: number        // default 6
  disabled?: boolean
  submitLabel?: string      // default "COMPROBAR"
  unit?: string             // extra opcional: "comparaciones"
  status?: 'idle' | 'ok' | 'bad' // extra opcional
}

type KeyId = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'back' | 'clear' | 'neg'

/** Nuevo valor tras pulsar una tecla, o null si la tecla se rechaza. */
function nextValue(value: string, key: KeyId, allowNegative: boolean, maxLength: number): string | null {
  const neg = value.startsWith('-')
  const digits = neg ? value.slice(1) : value
  if (key.length === 1) {
    if (digits === '0') return key === '0' ? null : (neg ? '-' : '') + key // sin ceros a la izquierda
    if (digits.length >= maxLength) return null
    return value + key
  }
  if (key === 'back') return value.length > 0 ? value.slice(0, -1) : null
  if (key === 'clear') return value.length > 0 ? '' : null
  if (key === 'neg') {
    if (!allowNegative) return null
    return neg ? digits : '-' + digits
  }
  return null
}

const DIGIT_RE = /^\d$/

export function Keypad({
  value,
  onChange,
  onSubmit,
  allowNegative = false,
  maxLength = 6,
  disabled = false,
  submitLabel,
  unit,
  status = 'idle',
}: KeypadProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const latest = useRef({ value, onChange, onSubmit, allowNegative, maxLength, disabled })
  useLayoutEffect(() => {
    latest.current = { value, onChange, onSubmit, allowNegative, maxLength, disabled }
  })

  const [down, setDown] = useState<KeyId | null>(null)
  const [bump, setBump] = useState(false)
  const timers = useRef<number[]>([])
  useEffect(() => {
    const list = timers.current
    return () => list.forEach((t) => window.clearTimeout(t))
  }, [])

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }

  const press = (key: KeyId) => {
    const s = latest.current
    if (s.disabled) return
    setDown(key)
    later(() => setDown((d) => (d === key ? null : d)), 120)
    const nv = nextValue(s.value, key, s.allowNegative, s.maxLength)
    if (nv === null) {
      setBump(true)
      later(() => setBump(false), 250)
      return
    }
    sfx.click()
    s.value = nv // por si llegan dos teclas antes de re-render
    s.onChange(nv)
  }

  const submit = () => {
    const s = latest.current
    if (s.disabled || !s.onSubmit || !/\d/.test(s.value)) return
    s.onSubmit()
  }

  // Teclado físico
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = latest.current
      if (s.disabled || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return
      const root = rootRef.current
      if (!root || root.getClientRects().length === 0) return // oculto
      const t = e.target as HTMLElement | null
      const tag = t?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t?.isContentEditable) return

      if (DIGIT_RE.test(e.key)) {
        e.preventDefault()
        press(e.key as KeyId)
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault()
        press('back')
      } else if (e.key === '-') {
        if (!s.allowNegative) return
        e.preventDefault()
        press('neg')
      } else if (e.key === 'Enter') {
        if (!s.onSubmit) return
        // Un botón ajeno al teclado (p.ej. PISTA) conserva su propio Enter.
        if (t && t !== document.body && !root.contains(t) && t.closest('button, a, [role="button"]')) return
        e.preventDefault()
        submit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const canSubmit = !!onSubmit && !disabled && /\d/.test(value)

  const key = (id: KeyId, label: string, opts?: { aux?: boolean; aria?: string }) => (
    <button
      key={id}
      type="button"
      className={`kp-key${opts?.aux ? ' kp-key--aux' : ''}${down === id ? ' is-down' : ''}`}
      disabled={disabled}
      aria-label={opts?.aria ?? label}
      onClick={() => press(id)}
    >
      {label}
    </button>
  )

  return (
    <div ref={rootRef} className={`kp${disabled ? ' is-disabled' : ''}`}>
      <div
        className={`kp-display kp-display--${status}${bump ? ' is-bump' : ''}`}
        role="status"
        aria-live="polite"
        aria-label={`Valor: ${value === '' ? 'vacío' : value}`}
      >
        <span className="kp-digits" aria-hidden="true">
          {value}
          {!disabled && <span className="kp-cursor">_</span>}
        </span>
        {unit && <span className="kp-unit"><RichText text={unit} /></span>}
      </div>

      <div className="kp-grid">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => key(d as KeyId, d))}
        {allowNegative
          ? key('neg', '+/-', { aux: true, aria: 'Cambiar signo' })
          : key('clear', 'C', { aux: true, aria: 'Borrar todo' })}
        {key('0', '0')}
        {key('back', 'DEL', { aux: true, aria: 'Borrar último dígito' })}
      </div>

      {onSubmit && (
        <button
          type="button"
          className="px-btn px-btn--primary px-btn--block kp-submit"
          disabled={!canSubmit}
          onClick={submit}
        >
          {submitLabel ?? 'COMPROBAR'}
        </button>
      )}
    </div>
  )
}
export default Keypad

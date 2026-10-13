import { useId, useRef, useState, type FormEvent } from 'react'
import { Ghost, PacMan, sfx } from '../../ui'
import { normalizeControl } from '../../engine/storage'

interface Props {
  remembered: string | null
  onPlay: (control: string) => void
  onForget: () => void
}

export function StartScreen({ remembered, onPlay, onForget }: Props) {
  const [value, setValue] = useState(remembered ?? '')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const errId = useId()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const c = normalizeControl(value)
    if (!c) {
      setError(
        value.trim()
          ? 'Mmm… el número de control son 8 dígitos (puede empezar con una letra). Ej: 21120345 o C21120345.'
          : 'Escribe tu número de control para guardar tu progreso.',
      )
      sfx.wrong()
      inputRef.current?.focus()
      return
    }
    setError(null)
    // gesto del usuario → desbloquea el AudioContext
    sfx.start()
    onPlay(c)
  }

  return (
    <div className="eda-start">
      <div className="eda-chase" aria-hidden="true">
        <div className="eda-chase__dots" />
        <div className="eda-chase__actors">
          <Ghost color="orange" size={34} float />
          <Ghost color="cyan" size={34} float />
          <Ghost color="pink" size={34} float />
          <Ghost color="red" size={34} float />
          <span className="eda-chase__gap" />
          <PacMan size={36} dir="right" chomp />
        </div>
      </div>

      <h1 className="eda-logo">
        <span>ED</span> <span>ARCADE</span>
      </h1>
      <p className="eda-start__sub">Estructura de Datos · ITM Morelia</p>
      <p className="eda-coin anim-blink" aria-hidden="true">
        INSERT COIN
      </p>

      <form className="eda-login px-panel" onSubmit={submit} noValidate>
        <label htmlFor={inputId} className="eda-login__label">
          NÚMERO DE CONTROL
        </label>
        <input
          ref={inputRef}
          id={inputId}
          className="px-input eda-login__input"
          value={value}
          onFocus={(e) => {
            const el = e.currentTarget
            window.setTimeout(() => el.select(), 0)
          }}
          onChange={(e) => {
            setValue(e.target.value.toUpperCase())
            if (error) setError(null)
          }}
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={12}
          placeholder="Ej. 21120345"
          aria-invalid={!!error}
          aria-describedby={error ? errId : undefined}
        />
        {error && (
          <p id={errId} className="eda-login__error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="px-btn px-btn--primary px-btn--block eda-login__play">
          ▶ JUGAR
        </button>
        {remembered && (
          <div className="eda-login__who">
            <span>¿No eres {remembered}?</span>
            <button
              type="button"
              className="px-btn px-btn--sm px-btn--ghost"
              onClick={() => {
                sfx.click()
                setValue('')
                setError(null)
                onForget()
                inputRef.current?.focus()
              }}
            >
              CAMBIAR JUGADOR
            </button>
          </div>
        )}
      </form>

      <ul className="eda-howto" aria-label="Cómo se juega">
        <li>
          <PacMan size={18} dir="right" /> 3 vidas por ejercicio
        </li>
        <li>★ Sin errores = 3 estrellas</li>
        <li>⚡ Aciertos seguidos = COMBO</li>
      </ul>
    </div>
  )
}

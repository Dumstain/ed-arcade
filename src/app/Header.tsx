import { PacMan, SoundToggle, ThemeToggle, sfx } from '../ui'

interface Props {
  control: string | null
  onHome: () => void
  onLogout: () => void
}

export function Header({ control, onHome, onLogout }: Props) {
  return (
    <header className="eda-header">
      <button
        type="button"
        className="eda-header__logo"
        onClick={() => {
          sfx.click()
          onHome()
        }}
        aria-label="ED Arcade: ir al inicio"
      >
        <PacMan size={22} dir="right" />
        <span className="eda-header__name">ED ARCADE</span>
      </button>
      <div className="eda-header__right">
        {control && (
          <span className="eda-header__player" title="Número de control">
            {control}
          </span>
        )}
        <ThemeToggle />
        <SoundToggle />
        {control && (
          <button
            type="button"
            className="px-btn px-btn--sm px-btn--ghost eda-header__exit"
            onClick={() => {
              sfx.click()
              onLogout()
            }}
            aria-label="Salir (cambiar de jugador)"
            title="Salir"
          >
            SALIR
          </button>
        )}
      </div>
    </header>
  )
}

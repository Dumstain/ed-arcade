import { useCallback, useSyncExternalStore } from 'react'
import { sfx, subscribeMuted } from './sfx'
import { PixelSvg } from './pixel'

type Theme = 'dark' | 'light'
const THEME_KEY = 'ed:theme'

function readTheme(): Theme {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

function subscribeTheme(cb: () => void): () => void {
  if (typeof document === 'undefined') return () => {}
  const mo = new MutationObserver(cb)
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => mo.disconnect()
}

function applyTheme(t: Theme) {
  const root = document.documentElement
  root.dataset.theme = t
  try {
    localStorage.setItem(THEME_KEY, t)
  } catch {
    /* sin storage */
  }
  // Mantiene la barra del navegador móvil acorde al tema
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    const bg = getComputedStyle(root).getPropertyValue('--bg').trim()
    if (bg) meta.setAttribute('content', bg)
  }
}

export function useTheme(): { theme: 'dark' | 'light'; toggle: () => void } {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, getThemeServer)
  const toggle = useCallback(() => applyTheme(readTheme() === 'dark' ? 'light' : 'dark'), [])
  return { theme, toggle }
}

const subMuted = (cb: () => void) => subscribeMuted(() => cb())
const getMuted = () => sfx.isMuted()
const getMutedServer = () => false
const getThemeServer = (): Theme => 'dark'

export function useMuted(): [boolean, (m: boolean) => void] {
  const muted = useSyncExternalStore(subMuted, getMuted, getMutedServer)
  const set = useCallback((m: boolean) => sfx.setMuted(m), [])
  return [muted, set]
}

// ── Iconos pixel (12×12) ──
const SUN = [
  '.....Y......',
  '..Y..Y..Y...',
  '...Y...Y....',
  '.....YY.....',
  '....YYYY....',
  'YY.YYYYYY.YY',
  '...YYYYYY...',
  '....YYYY....',
  '.....YY.....',
  '...Y...Y....',
  '..Y..Y..Y...',
  '.....Y......',
]
const MOON = [
  '....MMMM....',
  '..MMMM......',
  '.MMMM.......',
  '.MMM........',
  'MMMM........',
  'MMMM........',
  'MMMM........',
  'MMMMM.......',
  '.MMMMM....M.',
  '.MMMMMMMMMM.',
  '..MMMMMMMM..',
  '....MMMM....',
]
const SPEAKER_ON = [
  '............',
  '....S.......',
  '...SS...W...',
  '..SSS.W..W..',
  'SSSSS..W.W..',
  'SSSSS..W.W..',
  'SSSSS..W.W..',
  'SSSSS..W.W..',
  '..SSS.W..W..',
  '...SS...W...',
  '....S.......',
  '............',
]
const SPEAKER_OFF = [
  '............',
  '....S.......',
  '...SS.......',
  '..SSS.X...X.',
  'SSSSS..X.X..',
  'SSSSS...X...',
  'SSSSS..X.X..',
  'SSSSS.X...X.',
  '..SSS.......',
  '...SS.......',
  '....S.......',
  '............',
]

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const next = theme === 'dark' ? 'claro' : 'oscuro'
  return (
    <button
      type="button"
      className="px-btn px-btn--sm ui-iconbtn"
      aria-label={`Cambiar a tema ${next}`}
      title={`Tema ${next}`}
      onClick={() => {
        sfx.click()
        toggle()
      }}
    >
      {theme === 'dark' ? (
        <PixelSvg grid={MOON} palette={{ M: 'var(--pac)' }} size={22} />
      ) : (
        <PixelSvg grid={SUN} palette={{ Y: 'var(--ghost-orange)' }} size={22} />
      )}
    </button>
  )
}

export function SoundToggle() {
  const [muted, setMuted] = useMuted()
  return (
    <button
      type="button"
      className="px-btn px-btn--sm ui-iconbtn"
      aria-label={muted ? 'Activar sonido' : 'Silenciar sonido'}
      aria-pressed={muted}
      title={muted ? 'Sonido apagado' : 'Sonido encendido'}
      onClick={() => {
        setMuted(!muted)
        if (muted) setTimeout(() => sfx.click(), 0)
      }}
    >
      <PixelSvg
        grid={muted ? SPEAKER_OFF : SPEAKER_ON}
        palette={{ S: 'currentColor', W: 'var(--info)', X: 'var(--bad)' }}
        size={22}
      />
    </button>
  )
}

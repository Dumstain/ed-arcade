import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/press-start-2p'
import '@fontsource/vt323'
import './styles/tokens.css'
import './styles/ui.css'
import App from './app/App'

// ?reset=1 borra el progreso local de este navegador (conserva tema y sonido)
try {
  const url = new URL(location.href)
  if (url.searchParams.has('reset')) {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('ed:') && k !== 'ed:theme' && k !== 'ed:muted')
      .forEach((k) => localStorage.removeItem(k))
    url.searchParams.delete('reset')
    history.replaceState(null, '', url.pathname + url.search + url.hash)
  }
} catch {
  // sin localStorage: nada que borrar
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

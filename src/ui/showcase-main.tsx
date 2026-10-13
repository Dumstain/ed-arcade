/** Entrada de desarrollo SOLO para QA del kit: `npx vite` y abrir /src/ui/showcase.html */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/press-start-2p'
import '@fontsource/vt323'
import '../styles/tokens.css'
import '../styles/ui.css'
import Showcase from './Showcase'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Showcase />
  </StrictMode>,
)

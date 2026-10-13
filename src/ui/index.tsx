/**
 * KIT DE UI 8-BIT — API CONGELADA. Implementación repartida en src/ui/*:
 *   sprites.tsx  PacMan, Ghost, Fruit, Pellets, Lives, Stars
 *   theme.tsx    ThemeToggle, SoundToggle, useTheme, useMuted
 *   sfx.ts       sfx (WebAudio, sin archivos)
 *   fx.ts        burst, floatText, shake, toast (imperativos)
 *   overlays.tsx Banner, Modal, Intermission
 * Estilos del kit: ./kit.css (prefijo .ui-). Clases de contrato: src/styles/ui.css (.px-*).
 * Vista de QA: src/ui/Showcase.tsx (export default).
 */
import './kit.css'

export type { FruitKind, GhostColor } from './sprites'
export { PacMan, Ghost, Fruit, Pellets, Lives, Stars } from './sprites'
export { ThemeToggle, SoundToggle, useTheme, useMuted } from './theme'
export { sfx } from './sfx'
export { burst, floatText, shake, toast } from './fx'
export { Banner, Modal, Intermission } from './overlays'
export { PixelIcon, pixelIconSvg, isPixelIcon, PIXEL_ICONS } from './PixelIcon'
export type { PixelIconName } from './PixelIcon'
export { RichText, plainText } from './RichText'

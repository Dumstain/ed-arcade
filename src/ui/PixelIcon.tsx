/**
 * Íconos pixel-art (reemplazan TODOS los emojis) — API CONGELADA (stub; el agente de UI
 * dibuja los bitmaps). SVG con <rect> por pixel, shape-rendering="crispEdges",
 * colores vía variables CSS (se ven bien en tema claro y oscuro).
 */
export const PIXEL_ICONS = [
  // interfaz
  'bulb', 'trophy', 'lock', 'unlock', 'star', 'star-empty', 'bolt', 'crown', 'check', 'cross',
  'warning', 'heart', 'flag', 'shield', 'replay', 'arrow-right', 'arrow-left', 'sound-on', 'sound-off',
  'sun', 'moon', 'info',
  // conceptos del curso (casilleros de classify, logros, notas)
  'plates', 'stack', 'queue', 'drawer', 'book', 'clipboard', 'people', 'seat', 'train', 'scale',
  'house', 'card', 'card-blank', 'doll', 'tree', 'tower', 'key', 'map', 'clock', 'undo', 'browser',
  'no', 'boom', 'inbox', 'outbox', 'magnifier', 'cherry', 'ghost',
] as const

export type PixelIconName = (typeof PIXEL_ICONS)[number]

export function isPixelIcon(name: unknown): name is PixelIconName {
  return typeof name === 'string' && (PIXEL_ICONS as readonly string[]).includes(name)
}

/** Ícono como componente React. Si el nombre no existe no pinta nada (nunca un emoji). */
export function PixelIcon(p: { name: PixelIconName | string; size?: number; title?: string; className?: string }) {
  if (!isPixelIcon(p.name)) return null
  const s = p.size ?? 16
  return (
    <svg width={s} height={s} viewBox="0 0 8 8" className={p.className} role={p.title ? 'img' : undefined}
      aria-label={p.title} aria-hidden={p.title ? undefined : true} shapeRendering="crispEdges">
      <rect x="1" y="1" width="6" height="6" fill="currentColor" />
    </svg>
  )
}

/** Mismo ícono como string SVG (para APIs imperativas como toast()) */
export function pixelIconSvg(name: PixelIconName | string, size = 16): string {
  if (!isPixelIcon(name)) return ''
  return `<svg width="${size}" height="${size}" viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true"><rect x="1" y="1" width="6" height="6" fill="currentColor"/></svg>`
}

export default PixelIcon

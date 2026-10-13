/**
 * KIT DE UI 8-BIT — API CONGELADA (stub). El agente de UI reemplaza las
 * implementaciones (puede repartirlas en varios archivos) pero DEBE conservar
 * exactamente estos nombres y firmas exportados desde src/ui/index.tsx.
 */
import type { ReactNode } from 'react'

export type FruitKind = 'cherry' | 'strawberry' | 'orange' | 'apple' | 'melon'
export type GhostColor = 'red' | 'pink' | 'cyan' | 'orange' | 'scared'

/** Comecocos animado (boca que abre/cierra) */
export function PacMan(_p: { size?: number; dir?: 'right' | 'left' | 'up' | 'down'; chomp?: boolean; className?: string }) {
  return <span className={_p.className}>ᗧ</span>
}
/** Fantasma pixel-art (ondulando) */
export function Ghost(_p: { color?: GhostColor; size?: number; float?: boolean; className?: string }) {
  return <span className={_p.className}>ᗣ</span>
}
/** Fruta pixel-art (una por día: 1 cereza, 2 fresa, 3 naranja, 4 manzana, 5 melón) */
export function Fruit(_p: { kind: FruitKind; size?: number; className?: string }) {
  return <span>🍒</span>
}
/** Fila de pellets: los `done` ya comidos, el comecocos en la posición actual */
export function Pellets(_p: { total: number; done: number; className?: string }) {
  return <span>{_p.done}/{_p.total}</span>
}
/** Vidas como iconos de comecocos */
export function Lives(_p: { lives: number; max?: number }) {
  return <span>{'ᗧ'.repeat(_p.lives)}</span>
}
/** Estrellas 0..3 */
export function Stars(_p: { value: number; size?: number; animate?: boolean }) {
  return <span>{'★'.repeat(_p.value)}</span>
}
/** Botón sol/luna que alterna data-theme en <html> y lo guarda en localStorage('ed:theme') */
export function ThemeToggle() {
  return null
}
/** Botón bocina que alterna el mute de sfx (persistente en localStorage('ed:muted')) */
export function SoundToggle() {
  return null
}
export function useTheme(): { theme: 'dark' | 'light'; toggle: () => void } {
  return { theme: 'dark', toggle: () => {} }
}
export function useMuted(): [boolean, (m: boolean) => void] {
  return [false, () => {}]
}
/** Efectos de sonido chiptune con WebAudio (sin archivos). Todos son no-op si está en mute. */
export const sfx = {
  click: () => {},
  waka: () => {},          // paso correcto / comer pellet
  correct: () => {},       // ejercicio resuelto
  wrong: () => {},         // error (pierde vida)
  death: () => {},         // sin vidas
  powerUp: () => {},       // racha / power pellet
  combo: (_n: number) => {}, // tono más agudo con racha mayor
  levelUp: () => {},       // nivel (tier) completado
  start: () => {},         // jingle de inicio "READY!"
  achievement: () => {},   // logro desbloqueado
  setMuted: (_m: boolean) => {},
  isMuted: () => false,
}
/** Explosión de partículas pixel en coordenadas de pantalla (overlay fijo, imperativo) */
export function burst(_x: number, _y: number, _opts?: { color?: string; count?: number }) {}
/** Texto flotante tipo "+150" que sube y se desvanece */
export function floatText(_x: number, _y: number, _text: string, _opts?: { color?: string }) {}
/** Sacudida de pantalla (o del elemento dado) */
export function shake(_el?: HTMLElement | null) {}
/** Texto arcade grande animado: "READY!", "¡PERFECTO!", "GAME OVER" */
export function Banner(_p: { text: string; tone?: 'pac' | 'ok' | 'bad' | 'info'; onDone?: () => void }) {
  return null
}
/** Panel/modal con borde de laberinto */
export function Modal(_p: { open: boolean; title?: string; children: ReactNode; onClose?: () => void }) {
  return _p.open ? <div className="px-panel">{_p.children}</div> : null
}
/** Toast de logro: "🏆 RACHA x5" (imperativo) */
export function toast(_text: string, _opts?: { icon?: string }) {}
/** Escena intermedia (comecocos perseguido por fantasma y luego al revés) entre niveles */
export function Intermission(_p: { onDone?: () => void }) {
  return null
}

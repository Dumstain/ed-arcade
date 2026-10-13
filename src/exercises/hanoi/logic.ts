/**
 * Lógica pura de Torres de Hanói (sin React): normalización de datos y solución óptima.
 * Los discos se numeran por tamaño: 1 = el más chico ... n = el más grande.
 * Cada torre es un arreglo fondo → tope (igual que una pila).
 */
import type { HanoiData } from '../schemas'

export type PegIdx = 0 | 1 | 2

export const MIN_DISKS = 2
export const MAX_DISKS = 5

export interface HanoiConfig {
  disks: number
  from: PegIdx
  to: PegIdx
  /** Tope de movimientos permitidos (default = óptimo 2^n - 1) */
  maxMoves: number
  /** Mínimo posible: 2^n - 1 */
  optimal: number
  /** Avisos por datos raros (se muestran discretos bajo el tablero) */
  warnings: string[]
}

const isPeg = (v: unknown): v is PegIdx => v === 0 || v === 1 || v === 2

/** Devuelve null si `raw` no sirve ni como base (el componente muestra aviso). */
export function normalizeConfig(raw: unknown): HanoiConfig | null {
  if (!raw || typeof raw !== 'object') return null
  const d = raw as Partial<HanoiData>
  const warnings: string[] = []

  let disks = Number(d.disks)
  if (!Number.isFinite(disks)) {
    disks = 3
    warnings.push('Dato raro: no venía el número de discos, usé 3.')
  }
  disks = Math.round(disks)
  if (disks < MIN_DISKS) {
    disks = MIN_DISKS
    warnings.push(`Dato raro: muy pocos discos, usé ${MIN_DISKS}.`)
  } else if (disks > MAX_DISKS) {
    disks = MAX_DISKS
    warnings.push(`Dato raro: demasiados discos para el celular, usé ${MAX_DISKS}.`)
  }

  const from: PegIdx = isPeg(d.from) ? d.from : 0
  let to: PegIdx = isPeg(d.to) ? d.to : from === 2 ? 0 : 2
  if (to === from) {
    to = from === 2 ? 0 : 2
    warnings.push('Dato raro: la torre de salida y la de meta eran la misma, moví la meta.')
  }

  const optimal = 2 ** disks - 1
  const m = Number(d.maxMoves)
  let maxMoves = optimal
  if (d.maxMoves !== undefined) {
    if (Number.isFinite(m) && m >= 1) maxMoves = Math.floor(m)
    else warnings.push('Dato raro: el máximo de movimientos no servía, usé el mínimo posible.')
  }

  return { disks, from, to, maxMoves, optimal, warnings }
}

/** Torres iniciales: todos los discos en `from`, el grande abajo. */
export function initialPegs(disks: number, from: PegIdx): number[][] {
  const pegs: number[][] = [[], [], []]
  for (let s = disks; s >= 1; s--) pegs[from].push(s)
  return pegs
}

/** Solución óptima clásica (recursiva): lista de movimientos [origen, destino]. */
export function solveMoves(disks: number, from: PegIdx, to: PegIdx): [PegIdx, PegIdx][] {
  const out: [PegIdx, PegIdx][] = []
  const go = (k: number, a: PegIdx, b: PegIdx, aux: PegIdx) => {
    if (k === 0) return
    go(k - 1, a, aux, b) // los k-1 chicos a la torre auxiliar
    out.push([a, b]) // el grande a su destino
    go(k - 1, aux, b, a) // los k-1 chicos encima del grande
  }
  go(disks, from, to, (3 - from - to) as PegIdx)
  return out
}

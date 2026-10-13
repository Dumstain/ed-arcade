/**
 * Reglas de avance dentro de un día: desbloqueo de niveles (tiers), siguiente
 * pendiente y estadísticas.
 */
import type { Exercise, Tier } from './types'
import type { DayContent } from './content'
import type { ExProgress } from './storage'
import { TIERS } from './course'

export type ProgMap = Record<string, ExProgress | undefined>

export function isTierComplete(dc: DayContent, tier: Tier, prog: ProgMap): boolean {
  return dc.byTier[tier].every((e) => !!prog[e.id]?.finished)
}

/** El tier N+1 se desbloquea cuando todos los del tier N están terminados (resueltos o sin vidas). */
export function isTierUnlocked(dc: DayContent, tier: Tier, prog: ProgMap): boolean {
  if (dc.day === 0) return true // sala de pruebas: sin desbloqueo
  for (const t of TIERS) {
    if (t >= tier) break
    if (!isTierComplete(dc, t, prog)) return false
  }
  return true
}

export function isDayComplete(dc: DayContent, prog: ProgMap): boolean {
  return dc.exercises.length > 0 && dc.exercises.every((e) => !!prog[e.id]?.finished)
}

/** Primer ejercicio no terminado de un tier desbloqueado (orden de juego). */
export function nextPending(dc: DayContent, prog: ProgMap): Exercise | null {
  for (const t of TIERS) {
    if (!isTierUnlocked(dc, t, prog)) break
    const e = dc.byTier[t].find((x) => !prog[x.id]?.finished)
    if (e) return e
  }
  return null
}

/** Tier "actual": el más alto desbloqueado con pendientes (o el último). */
export function currentTier(dc: DayContent, prog: ProgMap): Tier {
  const n = nextPending(dc, prog)
  return n ? n.tier : 4
}

export interface Stats {
  total: number
  finished: number
  solved: number
  stars: number
  maxStars: number
  points: number
}

export function statsOf(list: Exercise[], prog: ProgMap): Stats {
  const s: Stats = { total: list.length, finished: 0, solved: 0, stars: 0, maxStars: list.length * 3, points: 0 }
  for (const e of list) {
    const p = prog[e.id]
    if (!p) continue
    if (p.finished) s.finished++
    if (p.solved) s.solved++
    s.stars += p.stars || 0
    s.points += p.bestScore || 0
  }
  return s
}

export function dayStats(dc: DayContent | undefined, prog: ProgMap): Stats {
  return statsOf(dc?.exercises ?? [], prog)
}

export function tierStats(dc: DayContent, tier: Tier, prog: ProgMap): Stats {
  return statsOf(dc.byTier[tier], prog)
}

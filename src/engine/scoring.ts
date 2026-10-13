/**
 * Reglas de puntaje, estrellas, combo y rangos.
 */
import type { Exercise, Tier } from './types'

export const BASE_POINTS: Record<Tier, number> = { 1: 100, 2: 150, 3: 200, 4: 300 }
/** factor por número de errores (0, 1, 2). 3 errores = sin vidas = 0 */
export const MISTAKE_FACTORS = [1, 0.6, 0.3] as const
export const HINT_FACTOR = 0.7
/** Puntaje máximo aceptado por la base de datos (check constraint) */
export const SCORE_CAP = 2000

export function basePoints(ex: Exercise): number {
  const p = typeof ex.points === 'number' && ex.points > 0 ? ex.points : BASE_POINTS[ex.tier] ?? 100
  return Math.round(p)
}

export function mistakeFactor(mistakes: number): number {
  return MISTAKE_FACTORS[mistakes as 0 | 1 | 2] ?? 0
}

/** combo >= 5 → ×2, combo >= 3 → ×1.5 */
export function comboMultiplier(combo: number): number {
  if (combo >= 5) return 2
  if (combo >= 3) return 1.5
  return 1
}

/** 3 = sin errores, 2 = 1 error, 1 = 2 errores, 0 = sin vidas */
export function starsFor(mistakes: number, solved: boolean): number {
  if (!solved) return 0
  return Math.max(0, Math.min(3, 3 - mistakes))
}

export interface ScoreBreakdown {
  base: number
  mistakeFactor: number
  hintFactor: number
  comboFactor: number
  total: number
}

export function computeScore(ex: Exercise, opts: { mistakes: number; usedHint: boolean; combo: number; solved: boolean }): ScoreBreakdown {
  const base = basePoints(ex)
  const mf = opts.solved ? mistakeFactor(opts.mistakes) : 0
  const hf = opts.usedHint ? HINT_FACTOR : 1
  const cf = opts.solved && opts.mistakes === 0 ? comboMultiplier(opts.combo) : 1
  const total = Math.max(0, Math.min(SCORE_CAP, Math.round(base * mf * hf * cf)))
  return { base, mistakeFactor: mf, hintFactor: hf, comboFactor: cf, total }
}

export interface Rank {
  name: string
  min: number
}

export const RANKS: readonly Rank[] = [
  { name: 'FANTASMITA', min: 0 },
  { name: 'COMEPUNTOS', min: 500 },
  { name: 'CAZAFANTASMAS', min: 1500 },
  { name: 'POWER PELLET', min: 3000 },
  { name: 'LEYENDA DEL LABERINTO', min: 5000 },
]

export function rankFor(total: number): { rank: Rank; index: number; next: Rank | null; progress: number } {
  let index = 0
  for (let i = 0; i < RANKS.length; i++) if (total >= RANKS[i].min) index = i
  const rank = RANKS[index]
  const next = RANKS[index + 1] ?? null
  const progress = next ? Math.max(0, Math.min(1, (total - rank.min) / (next.min - rank.min))) : 1
  return { rank, index, next, progress }
}

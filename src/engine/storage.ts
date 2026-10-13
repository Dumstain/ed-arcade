/**
 * Persistencia local (localStorage) por número de control.
 * Toda lectura/escritura va en try/catch: en modo privado o con almacenamiento
 * bloqueado el juego sigue funcionando (solo no recuerda).
 */

export interface ExProgress {
  bestScore: number
  stars: number
  solved: boolean
  /** resuelto o sin vidas (cuenta para desbloquear el siguiente nivel) */
  finished: boolean
  /** datos de la MEJOR partida */
  mistakes: number
  usedHint: boolean
  timeMs: number
  plays: number
  /** el ejercicio falló al cargar y el alumno lo saltó */
  skipped?: boolean
}

export interface PlayerData {
  v: 1
  control: string
  progress: Record<string, ExProgress>
  achievements: string[]
  total: number
  updatedAt: number
}

const SESSION_KEY = 'ed:session'
const playerKey = (control: string) => `ed:player:${control}`

export const CONTROL_RE = /^[A-Za-z]?\d{8}$/

export function normalizeControl(raw: string): string | null {
  const c = raw.trim().replace(/\s+/g, '').toUpperCase()
  return CONTROL_RE.test(c) ? c : null
}

export function readJSON<T>(key: string): T | null {
  try {
    const s = localStorage.getItem(key)
    return s ? (JSON.parse(s) as T) : null
  } catch {
    return null
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* almacenamiento lleno o bloqueado: ignorar */
  }
}

export function loadSession(): string | null {
  try {
    const c = localStorage.getItem(SESSION_KEY)
    return c && CONTROL_RE.test(c) ? c : null
  } catch {
    return null
  }
}

export function saveSession(control: string): void {
  try {
    localStorage.setItem(SESSION_KEY, control)
  } catch {
    /* ignorar */
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignorar */
  }
}

export function computeTotal(progress: Record<string, ExProgress>): number {
  let t = 0
  for (const [id, p] of Object.entries(progress)) {
    if (id.startsWith('demo:')) continue
    t += Math.max(0, p.bestScore || 0)
  }
  return t
}

export function emptyPlayer(control: string): PlayerData {
  return { v: 1, control, progress: {}, achievements: [], total: 0, updatedAt: Date.now() }
}

export function loadPlayer(control: string): PlayerData {
  const raw = readJSON<Partial<PlayerData>>(playerKey(control))
  if (!raw || typeof raw !== 'object') return emptyPlayer(control)
  const progress: Record<string, ExProgress> = {}
  if (raw.progress && typeof raw.progress === 'object') {
    for (const [id, p] of Object.entries(raw.progress)) {
      if (!p || typeof p !== 'object') continue
      progress[id] = {
        bestScore: Number(p.bestScore) || 0,
        stars: Number(p.stars) || 0,
        solved: !!p.solved,
        finished: !!p.finished,
        mistakes: Number(p.mistakes) || 0,
        usedHint: !!p.usedHint,
        timeMs: Number(p.timeMs) || 0,
        plays: Number(p.plays) || 1,
        skipped: p.skipped ? true : undefined,
      }
    }
  }
  const achievements = Array.isArray(raw.achievements) ? raw.achievements.filter((a): a is string => typeof a === 'string') : []
  return { v: 1, control, progress, achievements, total: computeTotal(progress), updatedAt: Number(raw.updatedAt) || Date.now() }
}

export function savePlayer(p: PlayerData): void {
  writeJSON(playerKey(p.control), p)
}

export interface RunResult {
  correct: boolean
  score: number
  stars: number
  mistakes: number
  usedHint: boolean
  timeMs: number
  skipped?: boolean
}

/** Fusiona una partida con el progreso previo: se queda con lo mejor. */
export function applyResult(prev: ExProgress | undefined, r: RunResult): ExProgress {
  if (!prev) {
    return {
      bestScore: r.score,
      stars: r.stars,
      solved: r.correct,
      finished: true,
      mistakes: r.mistakes,
      usedHint: r.usedHint,
      timeMs: r.timeMs,
      plays: 1,
      skipped: r.skipped ? true : undefined,
    }
  }
  const better = r.score > prev.bestScore || (r.correct && !prev.solved)
  return {
    bestScore: Math.max(prev.bestScore, r.score),
    stars: Math.max(prev.stars, r.stars),
    solved: prev.solved || r.correct,
    finished: true,
    mistakes: better ? r.mistakes : prev.mistakes,
    usedHint: better ? r.usedHint : prev.usedHint,
    timeMs: better ? r.timeMs : prev.timeMs,
    plays: prev.plays + 1,
    skipped: prev.skipped && !r.correct && r.skipped ? true : undefined,
  }
}

export interface RemoteProgressRow {
  exercise_id: string
  day: number
  tier: number
  best_score: number
  best_stars: number
  solved: boolean
}

/** Mezcla el progreso remoto (otra computadora) tomando el mejor de cada ejercicio. */
export function mergeRemote(p: PlayerData, rows: RemoteProgressRow[]): PlayerData {
  if (!rows.length) return p
  const progress = { ...p.progress }
  let changed = false
  for (const r of rows) {
    if (!r || typeof r.exercise_id !== 'string') continue
    const cur = progress[r.exercise_id]
    const score = Number(r.best_score) || 0
    const stars = Number(r.best_stars) || 0
    const solved = !!r.solved
    if (!cur) {
      progress[r.exercise_id] = {
        bestScore: score,
        stars,
        solved,
        finished: true,
        mistakes: solved ? Math.max(0, 3 - stars) : 3,
        usedHint: false,
        timeMs: 0,
        plays: 1,
      }
      changed = true
    } else if (score > cur.bestScore || stars > cur.stars || (solved && !cur.solved) || !cur.finished) {
      progress[r.exercise_id] = {
        ...cur,
        bestScore: Math.max(cur.bestScore, score),
        stars: Math.max(cur.stars, stars),
        solved: cur.solved || solved,
        finished: true,
        skipped: undefined,
      }
      changed = true
    }
  }
  if (!changed) return p
  return { ...p, progress, total: computeTotal(progress), updatedAt: Date.now() }
}

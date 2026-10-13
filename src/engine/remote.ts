/**
 * Supabase OPCIONAL. Si no existen VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY el
 * juego corre en MODO LOCAL. Nunca bloquea el juego: todo con timeouts cortos y
 * los intentos se encolan en localStorage para reintentar si falla la red.
 * Esquema: supabase/schema.sql (ed_attempts, ed_config, rpc ed_progress / ed_leaderboard).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { readJSON, writeJSON, type RemoteProgressRow } from './storage'
import { SCORE_CAP } from './scoring'

const URL_ = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const KEY_ = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()

export const remoteEnabled = !!(URL_ && KEY_)

const TIMEOUT_MS = 6000
const QUEUE_KEY = 'ed:queue'

let clientPromise: Promise<SupabaseClient | null> | null = null

function getClient(): Promise<SupabaseClient | null> {
  if (!remoteEnabled) return Promise.resolve(null)
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js')
      .then((m) =>
        m.createClient(URL_!, KEY_!, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        }),
      )
      .catch((e) => {
        console.warn('[ED] No se pudo cargar Supabase', e)
        clientPromise = null
        return null
      })
  }
  return clientPromise
}

class TimeoutError extends Error {}

function withTimeout<T>(p: PromiseLike<T>, ms = TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new TimeoutError('timeout')), ms)
    Promise.resolve(p).then(
      (v) => {
        clearTimeout(t)
        resolve(v)
      },
      (e) => {
        clearTimeout(t)
        reject(e)
      },
    )
  })
}

// ───────────── Intentos (insert + cola de reintento) ─────────────

export interface AttemptRow {
  control: string
  day: number
  exercise_id: string
  tier: number
  correct: boolean
  score: number
  stars: number
  mistakes: number
  used_hint: boolean
  time_ms: number
}

function sanitize(a: AttemptRow): AttemptRow | null {
  const control = String(a.control || '').toUpperCase()
  if (!/^[A-Z]?[0-9]{8}$/.test(control)) return null
  const day = Math.round(a.day)
  const tier = Math.round(a.tier)
  if (!(day >= 1 && day <= 5) || !(tier >= 1 && tier <= 4) || !a.exercise_id) return null
  const clampInt = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(Number(n) || 0)))
  return {
    control,
    day,
    exercise_id: String(a.exercise_id).slice(0, 120),
    tier,
    correct: !!a.correct,
    score: clampInt(a.score, 0, SCORE_CAP),
    stars: clampInt(a.stars, 0, 3),
    mistakes: clampInt(a.mistakes, 0, 32000),
    used_hint: !!a.used_hint,
    time_ms: clampInt(a.time_ms, 0, 2_000_000_000),
  }
}

function readQueue(): AttemptRow[] {
  const q = readJSON<AttemptRow[]>(QUEUE_KEY)
  return Array.isArray(q) ? q : []
}

function writeQueue(q: AttemptRow[]): void {
  writeJSON(QUEUE_KEY, q.slice(-500))
}

export function pendingCount(): number {
  return readQueue().length
}

type Listener = (pending: number) => void
const listeners = new Set<Listener>()
export function onQueueChange(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
function emit() {
  const n = pendingCount()
  listeners.forEach((fn) => fn(n))
}

/** Encola y trata de enviar en segundo plano. Nunca lanza. */
export function sendAttempt(a: AttemptRow): void {
  if (!remoteEnabled) return
  const row = sanitize(a)
  if (!row) {
    console.warn('[ED] Intento inválido, no se envía', a)
    return
  }
  writeQueue([...readQueue(), row])
  emit()
  void flushQueue()
}

let flushing = false

/** Envía la cola uno por uno. Errores de datos (constraint) se descartan; de red, se reintentan después. */
export async function flushQueue(): Promise<void> {
  if (!remoteEnabled || flushing) return
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return
  const queue = readQueue()
  if (!queue.length) return
  flushing = true
  try {
    const sb = await getClient()
    if (!sb) return
    while (true) {
      const q = readQueue()
      if (!q.length) break
      const row = q[0]
      let drop = false
      try {
        const { error } = await withTimeout(sb.from('ed_attempts').insert(row))
        if (error) {
          const code = String((error as { code?: string }).code ?? '')
          // 22xxx/23xxx = datos inválidos; 42xxx = esquema; PGRST = petición inválida → no reintentar
          if (/^(22|23|42|PGRST)/.test(code)) {
            console.warn('[ED] Intento rechazado por la base de datos; se descarta', code, error.message)
            drop = true
          } else {
            console.warn('[ED] Error al enviar intento; se reintentará', error.message)
            break
          }
        } else {
          drop = true
        }
      } catch (e) {
        console.warn('[ED] Red no disponible; se reintentará', e instanceof Error ? e.message : e)
        break
      }
      if (drop) {
        const cur = readQueue()
        // quitar la primera coincidencia de esta fila
        const i = cur.findIndex((r) => r.exercise_id === row.exercise_id && r.control === row.control && r.score === row.score && r.time_ms === row.time_ms)
        if (i >= 0) cur.splice(i, 1)
        else cur.shift()
        writeQueue(cur)
        emit()
      }
    }
  } finally {
    flushing = false
  }
}

let retryTimer: ReturnType<typeof setInterval> | null = null
/** Reintentos periódicos y al recuperar conexión. */
export function startSyncLoop(): void {
  if (!remoteEnabled || retryTimer) return
  retryTimer = setInterval(() => {
    if (pendingCount() > 0) void flushQueue()
  }, 30_000)
  if (typeof window !== 'undefined') window.addEventListener('online', () => void flushQueue())
  void flushQueue()
}

// ───────────── Lecturas ─────────────

export async function fetchProgress(control: string): Promise<RemoteProgressRow[] | null> {
  if (!remoteEnabled) return null
  try {
    const sb = await getClient()
    if (!sb) return null
    const { data, error } = await withTimeout(sb.rpc('ed_progress', { p_control: control }))
    if (error) {
      console.warn('[ED] ed_progress', error.message)
      return null
    }
    return Array.isArray(data) ? (data as RemoteProgressRow[]) : null
  } catch (e) {
    console.warn('[ED] ed_progress sin respuesta', e instanceof Error ? e.message : e)
    return null
  }
}

export interface LeaderRow {
  alias: string
  total: number
  solved: number
}

export async function fetchLeaderboard(day: number, limit = 10): Promise<LeaderRow[] | null> {
  if (!remoteEnabled || day < 1 || day > 5) return null
  try {
    const sb = await getClient()
    if (!sb) return null
    const { data, error } = await withTimeout(sb.rpc('ed_leaderboard', { p_day: day, p_limit: limit }))
    if (error) {
      console.warn('[ED] ed_leaderboard', error.message)
      return null
    }
    if (!Array.isArray(data)) return null
    return (data as { alias: string; total: number | string; solved: number | string }[]).map((r) => ({
      alias: String(r.alias ?? '????'),
      total: Number(r.total) || 0,
      solved: Number(r.solved) || 0,
    }))
  } catch (e) {
    console.warn('[ED] ed_leaderboard sin respuesta', e instanceof Error ? e.message : e)
    return null
  }
}

/** ed_config.unlocked_day (número). null si no hay red o no está configurado. */
export async function fetchUnlockedDay(): Promise<number | null> {
  if (!remoteEnabled) return null
  try {
    const sb = await getClient()
    if (!sb) return null
    const { data, error } = await withTimeout(sb.from('ed_config').select('value').eq('key', 'unlocked_day').maybeSingle())
    if (error || !data) return null
    const n = Number((data as { value: unknown }).value)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

/** Alias igual que ed_leaderboard: el número de control completo (decisión del profesor) */
export function aliasFor(control: string): string {
  return control.toUpperCase()
}

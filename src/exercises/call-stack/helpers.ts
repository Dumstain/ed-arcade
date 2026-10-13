import type { CallStackData, Val } from '../schemas'

export interface Frame {
  call: string
  expr: string
  returns: Val
  base: boolean
}

export interface Cfg {
  frames: Frame[]
  overflow: boolean
  askReturns: boolean
  /** índice del marco que es caso base (-1 en modo overflow) */
  baseIdx: number
}

/** Limpia los datos del ejercicio; null si no hay nada jugable. */
export function normalize(data: CallStackData | undefined | null): Cfg | null {
  const rawFrames = Array.isArray(data?.frames) ? data.frames : []
  let frames: Frame[] = rawFrames
    .filter((f) => f && (typeof f.call === 'string' || typeof f.call === 'number'))
    .map((f) => ({
      call: String(f.call),
      expr: f.expr == null ? '' : String(f.expr),
      returns: f.returns ?? '',
      base: !!f.base,
    }))
  if (frames.length === 0) return null
  const overflow = !!data?.overflow
  let baseIdx = -1
  if (!overflow) {
    baseIdx = frames.findIndex((f) => f.base)
    if (baseIdx < 0) baseIdx = frames.length - 1
    frames = frames.slice(0, baseIdx + 1)
  }
  return { frames, overflow, askReturns: data?.askReturns !== false, baseIdx }
}

const NUM_RE = /^-?\d+(\.\d+)?$/

export function isNumericVal(v: Val): boolean {
  if (typeof v === 'number') return Number.isFinite(v)
  return NUM_RE.test(String(v).trim())
}

/** ¿Lo que escribió el alumno coincide con el valor esperado? */
export function sameVal(input: string, expected: Val): boolean {
  const a = input.trim()
  if (a === '') return false
  if (isNumericVal(expected) && NUM_RE.test(a)) return Number(a) === Number(expected)
  return a.toLowerCase() === String(expected).trim().toLowerCase()
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Parte `expr` alrededor de la llamada hija para poder reemplazarla por su valor
 * ("3 * factorial(2)" → "3 * " + [2] + ""). null si no se encuentra.
 */
export function splitExpr(expr: string, childCall: string): { before: string; after: string } | null {
  if (!childCall) return null
  const i = expr.indexOf(childCall)
  if (i >= 0) return { before: expr.slice(0, i), after: expr.slice(i + childCall.length) }
  const name = /^[^\s(]+/.exec(childCall)?.[0]
  if (name) {
    try {
      const m = new RegExp(`${escapeRe(name)}\\((?:[^()]|\\([^()]*\\))*\\)`).exec(expr)
      if (m) return { before: expr.slice(0, m.index), after: expr.slice(m.index + m[0].length) }
    } catch {
      /* regex raro: se ignora */
    }
  }
  return null
}

const NUM_G = /-?\d+/g

/**
 * Llamada "inventada" que seguiría después del marco i (señuelo del botón LLAMAR
 * cuando el marco ya es caso base, o continuación en modo overflow).
 */
export function fakeNext(frames: Frame[], i: number): string {
  const cur = frames[i].call
  const curNums = cur.match(NUM_G) ?? []
  if (curNums.length === 0) return cur
  const prevNums = i > 0 ? (frames[i - 1].call.match(NUM_G) ?? []) : []
  const deltas = curNums.map((m, j) =>
    prevNums.length === curNums.length ? Number(m) - Number(prevNums[j]) : 0,
  )
  const anyDelta = deltas.some((d) => d !== 0)
  let k = 0
  let first = true
  return cur.replace(NUM_G, (m) => {
    const d = deltas[k++]
    if (anyDelta) return String(Number(m) + d)
    if (first) {
      first = false
      return String(Number(m) - 1)
    }
    return m
  })
}

/** Hash determinista pequeño (para barajar el orden de botones por id). */
export function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function cx(...c: (string | false | null | undefined)[]): string {
  return c.filter(Boolean).join(' ')
}

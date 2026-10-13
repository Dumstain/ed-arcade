import type { Val } from '../schemas'

const NUM_RE = /^-?\d+(\.\d+)?$/

export function isNumericVal(v: Val): boolean {
  if (typeof v === 'number') return Number.isFinite(v)
  return NUM_RE.test(String(v).trim())
}

/** ¿Lo escrito coincide con el valor esperado? (numérico si ambos lo son, texto si no) */
export function sameVal(input: string, expected: Val): boolean {
  const a = input.trim()
  if (a === '') return false
  if (isNumericVal(expected) && NUM_RE.test(a)) return Number(a) === Number(expected)
  return a.toLowerCase() === String(expected).trim().toLowerCase()
}

export function cx(...c: (string | false | null | undefined)[]): string {
  return c.filter(Boolean).join(' ')
}

/**
 * Lógica pura de search-sim (sin React): validación de datos y traza de la búsqueda.
 * Convención del curso (Dia1.java): medio = (inicio + fin) / 2 entero; cada elemento
 * revisado suma 1 comparación.
 */
import type { SearchSimData } from '../schemas'

export type Cmp = 'eq' | 'lt' | 'gt'

/** Un elemento revisado. cmp: eq = es el buscado · lt = a[idx] < target · gt = a[idx] > target */
export interface TraceStep {
  idx: number
  /** rango ANTES de revisar (binaria) */
  lo: number
  hi: number
  /** rango DESPUÉS de revisar (binaria) */
  nlo: number
  nhi: number
  cmp: Cmp
}

export interface Trace {
  steps: TraceStep[]
  /** índice donde se encontró, o -1 */
  foundIdx: number
}

export interface CleanData {
  algorithm: 'sequential' | 'binary'
  mode: 'play' | 'predict'
  values: number[]
  target: number
  showCallStack: boolean
}

export type Parsed = { ok: true; data: CleanData } | { ok: false; why: string }

const MAX_VALUES = 40

export function parseData(raw: unknown): Parsed {
  if (!raw || typeof raw !== 'object') return { ok: false, why: 'no llegaron datos' }
  const d = raw as Partial<SearchSimData>
  if (d.algorithm !== 'sequential' && d.algorithm !== 'binary') {
    return { ok: false, why: 'algoritmo desconocido' }
  }
  if (!Array.isArray(d.values) || d.values.length === 0) {
    return { ok: false, why: 'el arreglo está vacío' }
  }
  if (d.values.length > MAX_VALUES) return { ok: false, why: 'el arreglo es demasiado grande' }
  if (d.values.some((v) => typeof v !== 'number' || !Number.isFinite(v))) {
    return { ok: false, why: 'el arreglo trae valores que no son números' }
  }
  if (typeof d.target !== 'number' || !Number.isFinite(d.target)) {
    return { ok: false, why: 'falta el número a buscar' }
  }
  return {
    ok: true,
    data: {
      algorithm: d.algorithm,
      mode: d.mode === 'predict' ? 'predict' : 'play',
      values: d.values as number[],
      target: d.target,
      showCallStack: d.showCallStack === true && d.algorithm === 'binary',
    },
  }
}

function cmpOf(v: number, target: number): Cmp {
  return v === target ? 'eq' : v < target ? 'lt' : 'gt'
}

export function buildTrace(algorithm: 'sequential' | 'binary', values: number[], target: number): Trace {
  const n = values.length
  const steps: TraceStep[] = []
  let foundIdx = -1
  if (algorithm === 'sequential') {
    for (let i = 0; i < n; i++) {
      const cmp = cmpOf(values[i], target)
      steps.push({ idx: i, lo: i, hi: n - 1, nlo: i + 1, nhi: n - 1, cmp })
      if (cmp === 'eq') {
        foundIdx = i
        break
      }
    }
    return { steps, foundIdx }
  }
  let lo = 0
  let hi = n - 1
  while (lo <= hi && steps.length <= n + 2) {
    const mid = Math.floor((lo + hi) / 2)
    const cmp = cmpOf(values[mid], target)
    if (cmp === 'eq') {
      steps.push({ idx: mid, lo, hi, nlo: lo, nhi: hi, cmp })
      foundIdx = mid
      break
    }
    const nlo = cmp === 'lt' ? mid + 1 : lo
    const nhi = cmp === 'gt' ? mid - 1 : hi
    steps.push({ idx: mid, lo, hi, nlo, nhi, cmp })
    lo = nlo
    hi = nhi
  }
  return { steps, foundIdx }
}

export function plural(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`
}

/** Texto explicativo del paso recién revisado (order = cuántas comparaciones van). */
export function stepText(
  algorithm: 'sequential' | 'binary',
  s: TraceStep,
  values: number[],
  target: number,
  order: number,
): string {
  const v = values[s.idx]
  if (s.cmp === 'eq') {
    return `¡ENCONTRADO! a[${s.idx}] = ${v}. Fueron ${plural(order, 'comparación', 'comparaciones')}.`
  }
  if (algorithm === 'sequential') {
    return `a[${s.idx}] = ${v} no es ${target}. Sigue con la siguiente.`
  }
  if (s.cmp === 'lt') {
    return `a[${s.idx}] = ${v} es MENOR que ${target}: está a la DERECHA. inicio = ${s.idx} + 1 = ${s.nlo}.`
  }
  return `a[${s.idx}] = ${v} es MAYOR que ${target}: está a la IZQUIERDA. fin = ${s.idx} - 1 = ${s.nhi}.`
}

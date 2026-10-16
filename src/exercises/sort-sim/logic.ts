/**
 * Lógica pura de sort-sim (sin React): simulaciones EXACTAS de las convenciones del curso
 * (ver SortSimData en src/exercises/schemas.ts) y validación defensiva de los datos.
 *   burbuja   → pares vecinos [j, j+1], j = 0 … n−2−pasada; intercambia si el de la izquierda es MAYOR.
 *   partición → pivote = último (o primero); los demás, de izquierda a derecha, a MENORES o MAYORES
 *               conservando su orden; el pivote queda en el índice = cuántos son menores.
 *   mezcla    → sale la cabeza MENOR; empate → la de la izquierda; al vaciarse una fila, el resto pasa solo.
 *   radix     → casilleros 0–9 por dígito; recoger del 0 al 9 en orden de llegada.
 * Se puede probar con: node --experimental-strip-types logic.ts (no importa nada en tiempo de ejecución).
 */
import type { SortSimData } from '../schemas'

export type Mode = 'bubble' | 'partition' | 'merge' | 'radix'
export type Digit = 'units' | 'tens'

// ───────────────────────── Burbuja ─────────────────────────
export interface BubbleStep {
  /** pasada (0-based) */
  p: number
  /** índice izquierdo del par */
  j: number
  a: number
  b: number
  swap: boolean
  /** último par de su pasada */
  endOfPass: boolean
}
export interface BubblePlan {
  steps: BubbleStep[]
  passes: number
  /** arreglo al terminar cada pasada */
  afterPass: number[][]
  final: number[]
  comparisons: number
  swaps: number
}

export function isSortedAsc(a: readonly number[]): boolean {
  for (let i = 1; i < a.length; i++) if (a[i - 1] > a[i]) return false
  return true
}

/** Pasadas necesarias para que quede ordenado (mínimo 1, máximo n−1). */
export function bubblePassesNeeded(values: readonly number[]): number {
  const n = values.length
  const arr = values.slice()
  for (let p = 0; p < n - 1; p++) {
    for (let j = 0; j <= n - 2 - p; j++) {
      if (arr[j] > arr[j + 1]) {
        const t = arr[j]
        arr[j] = arr[j + 1]
        arr[j + 1] = t
      }
    }
    if (isSortedAsc(arr)) return p + 1
  }
  return Math.max(1, n - 1)
}

export function bubblePlan(values: readonly number[], passes?: number): BubblePlan {
  const n = values.length
  const P = passes ?? bubblePassesNeeded(values)
  const arr = values.slice()
  const steps: BubbleStep[] = []
  const afterPass: number[][] = []
  let swaps = 0
  for (let p = 0; p < P; p++) {
    for (let j = 0; j <= n - 2 - p; j++) {
      const a = arr[j]
      const b = arr[j + 1]
      const swap = a > b
      steps.push({ p, j, a, b, swap, endOfPass: j === n - 2 - p })
      if (swap) {
        arr[j] = b
        arr[j + 1] = a
        swaps++
      }
    }
    afterPass.push(arr.slice())
  }
  return { steps, passes: P, afterPass, final: arr, comparisons: steps.length, swaps }
}

// ───────────────────────── Partición (quicksort) ─────────────────────────
export interface PartitionPlan {
  pivotIndex: number
  pivot: number
  /** índices originales que recorre el cursor, en orden */
  scan: number[]
  /** para cada elemento de scan: true = MENOR que el pivote */
  isLess: boolean[]
  less: number[]
  greater: number[]
  /** menores · pivote · mayores */
  final: number[]
  /** índice definitivo del pivote = cuántos son menores */
  pivotFinal: number
}

export function partitionPlan(values: readonly number[], pivot: 'last' | 'first' = 'last'): PartitionPlan {
  const n = values.length
  const pivotIndex = pivot === 'first' ? 0 : n - 1
  const pv = values[pivotIndex]
  const scan: number[] = []
  for (let i = 0; i < n; i++) if (i !== pivotIndex) scan.push(i)
  const isLess = scan.map((i) => values[i] < pv)
  const less = scan.filter((_, k) => isLess[k]).map((i) => values[i])
  const greater = scan.filter((_, k) => !isLess[k]).map((i) => values[i])
  return {
    pivotIndex,
    pivot: pv,
    scan,
    isLess,
    less,
    greater,
    final: [...less, pv, ...greater],
    pivotFinal: less.length,
  }
}

// ───────────────────────── Mezcla (merge) ─────────────────────────
export type Side = 'L' | 'R'
export interface MergeMove {
  from: Side
  v: number
  /** true = la fila contraria ya estaba vacía: pasa sola (no se pregunta) */
  auto: boolean
}
export interface MergePlan {
  moves: MergeMove[]
  output: number[]
  /** cuántas decisiones toma el alumno (= comparaciones) */
  decisions: number
}

export function mergePlan(left: readonly number[], right: readonly number[]): MergePlan {
  let i = 0
  let j = 0
  const moves: MergeMove[] = []
  while (i < left.length || j < right.length) {
    if (i < left.length && j < right.length) {
      // empate → la de la izquierda (estable)
      if (left[i] <= right[j]) moves.push({ from: 'L', v: left[i++], auto: false })
      else moves.push({ from: 'R', v: right[j++], auto: false })
    } else if (i < left.length) moves.push({ from: 'L', v: left[i++], auto: true })
    else moves.push({ from: 'R', v: right[j++], auto: true })
  }
  return { moves, output: moves.map((m) => m.v), decisions: moves.filter((m) => !m.auto).length }
}

// ───────────────────────── Radix (el cartero) ─────────────────────────
export function digitOf(v: number, d: Digit): number {
  const x = Math.abs(Math.trunc(v))
  return d === 'units' ? x % 10 : Math.floor(x / 10) % 10
}

export interface RadixRound {
  digit: Digit
  input: number[]
  /** 10 casilleros, cada uno en orden de llegada */
  bins: number[][]
  /** recogido del casillero 0 al 9 */
  output: number[]
}

export function radixPlan(values: readonly number[], rounds: 1 | 2, digit: Digit = 'units'): RadixRound[] {
  const digits: Digit[] = rounds === 2 ? ['units', 'tens'] : [digit]
  const out: RadixRound[] = []
  let cur = values.slice()
  for (const d of digits) {
    const bins: number[][] = Array.from({ length: 10 }, () => [])
    for (const v of cur) bins[digitOf(v, d)].push(v)
    const output = bins.flat()
    out.push({ digit: d, input: cur, bins, output })
    cur = output
  }
  return out
}

// ───────────────────────── Validación ─────────────────────────
export interface BubbleCfg {
  mode: 'bubble'
  values: number[]
  plan: BubblePlan
}
export interface PartitionCfg {
  mode: 'partition'
  values: number[]
  pivotSide: 'last' | 'first'
  plan: PartitionPlan
}
export interface MergeCfg {
  mode: 'merge'
  left: number[]
  right: number[]
  plan: MergePlan
}
export interface RadixCfg {
  mode: 'radix'
  values: number[]
  rounds: 1 | 2
  plan: RadixRound[]
}
export type Cfg = BubbleCfg | PartitionCfg | MergeCfg | RadixCfg
export type Parsed = { ok: true; cfg: Cfg } | { ok: false; why: string }

const MAX_VALUES = 10
const MAX_MERGE = 12

function numList(x: unknown, name: string): number[] | string {
  if (!Array.isArray(x)) return `falta la lista "${name}"`
  const out: number[] = []
  for (const v of x) {
    const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v
    if (typeof n !== 'number' || !Number.isFinite(n)) return `"${name}" tiene un valor que no es número`
    out.push(n)
  }
  return out
}

function distinct(a: readonly number[]): boolean {
  return new Set(a).size === a.length
}

export function normalize(raw: unknown): Parsed {
  if (!raw || typeof raw !== 'object') return { ok: false, why: 'no hay datos' }
  const d = raw as Partial<SortSimData>
  const mode = d.mode
  if (mode !== 'bubble' && mode !== 'partition' && mode !== 'merge' && mode !== 'radix') {
    return { ok: false, why: `modo desconocido "${String(mode)}"` }
  }

  if (mode === 'merge') {
    const left = numList(d.left, 'left')
    if (typeof left === 'string') return { ok: false, why: left }
    const right = numList(d.right, 'right')
    if (typeof right === 'string') return { ok: false, why: right }
    if (left.length < 1 || right.length < 1) return { ok: false, why: 'cada fila necesita al menos un valor' }
    if (left.length + right.length > MAX_MERGE) return { ok: false, why: `máximo ${MAX_MERGE} valores entre las dos filas` }
    if (!isSortedAsc(left) || !isSortedAsc(right)) return { ok: false, why: 'las filas de la mezcla deben venir ordenadas' }
    return { ok: true, cfg: { mode, left, right, plan: mergePlan(left, right) } }
  }

  const values = numList(d.values, 'values')
  if (typeof values === 'string') return { ok: false, why: values }
  if (values.length < 2 || values.length > MAX_VALUES) return { ok: false, why: `se necesitan de 2 a ${MAX_VALUES} valores` }
  if (!distinct(values)) return { ok: false, why: 'hay valores repetidos' }

  if (mode === 'bubble') {
    let passes: number | undefined
    if (d.passes !== undefined && d.passes !== null) {
      const p = Number(d.passes)
      if (!Number.isInteger(p) || p < 1) return { ok: false, why: '"passes" debe ser un entero de 1 en adelante' }
      passes = Math.min(p, values.length - 1)
    }
    return { ok: true, cfg: { mode, values, plan: bubblePlan(values, passes) } }
  }

  if (mode === 'partition') {
    const pv = d.pivot ?? 'last'
    if (pv !== 'last' && pv !== 'first') return { ok: false, why: `pivote desconocido "${String(pv)}"` }
    return { ok: true, cfg: { mode, values, pivotSide: pv, plan: partitionPlan(values, pv) } }
  }

  // radix
  const rounds = d.rounds ?? 1
  if (rounds !== 1 && rounds !== 2) return { ok: false, why: '"rounds" debe ser 1 o 2' }
  const digit = d.digit ?? 'units'
  if (digit !== 'units' && digit !== 'tens') return { ok: false, why: `dígito desconocido "${String(digit)}"` }
  const limit = rounds === 2 ? 100 : 1000
  if (values.some((v) => !Number.isInteger(v) || v < 0 || v >= limit)) {
    return { ok: false, why: `radix usa enteros de 0 a ${limit - 1}` }
  }
  return { ok: true, cfg: { mode, values, rounds, plan: radixPlan(values, rounds, digit) } }
}

// ───────────────────────── Dibujo ─────────────────────────
/** Altura relativa (0.14 … 1) de cada valor: proporcional al número si todos son positivos. */
export function barScale(all: readonly number[]): (v: number) => number {
  if (all.length === 0) return () => 1
  const lo = Math.min(...all)
  const hi = Math.max(...all)
  if (lo > 0) return (v) => Math.max(0.14, v / hi)
  if (hi === lo) return () => 0.6
  return (v) => 0.14 + (0.86 * (v - lo)) / (hi - lo)
}

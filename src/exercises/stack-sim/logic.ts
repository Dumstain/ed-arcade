/**
 * Lógica pura de stack-sim (sin React): normalización defensiva de los datos,
 * parser de operaciones ("push(3)", "pop()") y modelo de pila con celdas
 * obsoletas (para la vista de arreglo, donde pop NO borra el dato).
 */
import type { StackSimData, Val } from '../schemas'

export type Mode = 'build' | 'popped' | 'trace'
export type View = 'plates' | 'array' | 'nodes'
export type Action = 'push' | 'pop' | 'skip' | 'error'
export interface Token { text: string; action: Action }

/** Tope duro de elementos en vistas sin capacidad (platos / nodos) y en arreglos */
export const STACK_MAX = 12
export const ARRAY_DEFAULT_CAP = 5

export interface Cfg {
  mode: Mode
  view: View
  /** Celdas del arreglo (solo view 'array'); en otras vistas = STACK_MAX */
  capacity: number
  /** Elementos máximos permitidos antes de "desbordamiento" */
  limit: number
  initial: Val[]
  ops: string[]
  palette: Val[]
  /** build: pila final fondo→tope | popped: valores en orden de salida */
  expected: Val[]
  tokens: Token[]
}

const isVal = (v: unknown): v is Val =>
  (typeof v === 'number' && Number.isFinite(v)) || typeof v === 'string'

export const same = (a: Val, b: Val) => String(a) === String(b)
export const sameSeq = (a: Val[], b: Val[]) =>
  a.length === b.length && a.every((v, i) => same(v, b[i]))

function uniq(list: Val[]): Val[] {
  const seen = new Set<string>()
  const out: Val[] = []
  for (const v of list) {
    const k = String(v)
    if (!seen.has(k)) { seen.add(k); out.push(v) }
  }
  return out
}

// ───────────── Operaciones del programa ─────────────
export type Op = { kind: 'push'; value: Val } | { kind: 'pop' } | { kind: 'unknown' }

function parseArg(raw: string): Val {
  const s = raw.trim()
  const q = /^(['"])(.*)\1$/.exec(s)
  if (q) return q[2]
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s)
  return s
}

export function parseOp(line: string): Op {
  const m = /^\s*(?:[\w.]+\.)?(push|pop)\s*\(\s*(.*?)\s*\)\s*;?\s*$/i.exec(String(line))
  if (!m) return { kind: 'unknown' }
  if (m[1].toLowerCase() === 'pop') return { kind: 'pop' }
  if (m[2] === '') return { kind: 'unknown' }
  return { kind: 'push', value: parseArg(m[2]) }
}

export function simulate(initial: Val[], ops: string[], limit = Infinity) {
  const stack = [...initial]
  const popped: Val[] = []
  let issues = 0
  for (const line of ops) {
    const op = parseOp(line)
    if (op.kind === 'push') {
      if (stack.length >= limit) issues++
      else stack.push(op.value)
    } else if (op.kind === 'pop') {
      const v = stack.pop()
      if (v === undefined) issues++
      else popped.push(v)
    } else issues++
  }
  return { stack, popped, issues }
}

// ───────────── Normalización de datos ─────────────
export function normalize(raw: unknown): { cfg: Cfg } | { error: string } {
  if (!raw || typeof raw !== 'object') return { error: 'Faltan los datos de este ejercicio.' }
  const d = raw as Record<string, unknown>
  const mode = d.mode
  if (mode !== 'build' && mode !== 'popped' && mode !== 'trace') {
    return { error: 'Este ejercicio de pilas tiene un modo desconocido.' }
  }
  const view: View = d.view === 'array' || d.view === 'nodes' ? d.view : 'plates'
  const initial = (Array.isArray(d.initial) ? d.initial.filter(isVal) : []).slice(0, STACK_MAX)

  let ops: string[] = []
  let palette: Val[] = []
  let expected: Val[] = []
  let tokens: Token[] = []

  if (mode === 'trace') {
    const arr = Array.isArray(d.tokens) ? d.tokens : []
    tokens = arr.flatMap((t): Token[] => {
      if (!t || typeof t !== 'object') return []
      const o = t as Record<string, unknown>
      const a = o.action
      if (a !== 'push' && a !== 'pop' && a !== 'skip' && a !== 'error') return []
      if (!isVal(o.text)) return []
      return [{ text: String(o.text), action: a }]
    })
    if (tokens.length === 0) return { error: 'Este ejercicio no trae tokens para recorrer.' }
  } else {
    ops = Array.isArray(d.ops) ? d.ops.filter((o): o is string => typeof o === 'string') : []
    if (ops.length === 0) return { error: 'Este ejercicio no trae el programa (ops).' }
    const sim = simulate(initial, ops)
    const given = Array.isArray(d.expected) ? d.expected.filter(isVal) : null
    expected = given ?? (mode === 'build' ? sim.stack : sim.popped)
    const fromOps = ops.flatMap((o) => {
      const op = parseOp(o)
      return op.kind === 'push' ? [op.value] : []
    })
    const given2 = Array.isArray(d.palette) ? d.palette.filter(isVal) : []
    // Siempre incluimos lo necesario para poder resolverlo (robustez ante contenido incompleto)
    palette = uniq([...(given2.length ? given2 : [...initial, ...fromOps]), ...expected])
    if (palette.length === 0) return { error: 'Este ejercicio no trae fichas (palette).' }
  }

  let capacity = STACK_MAX
  if (view === 'array') {
    const c = typeof d.capacity === 'number' && Number.isFinite(d.capacity) ? Math.floor(d.capacity) : NaN
    const dflt = Math.max(ARRAY_DEFAULT_CAP, initial.length + 1, mode === 'build' ? expected.length : 0)
    capacity = Math.min(
      STACK_MAX,
      Math.max(Number.isNaN(c) ? dflt : c, initial.length, mode === 'build' ? expected.length : 0, 1),
    )
  }
  const limit = view === 'array' ? capacity : STACK_MAX

  return { cfg: { mode, view, capacity, limit, initial, ops, palette, expected, tokens } }
}

// ───────────── Modelo de pila (con celdas obsoletas) ─────────────
export interface Item { id: number; v: Val }
/** cells[0..size-1] son la pila; cells[size..] son datos "obsoletos" (pop no los borra) */
export interface Model { cells: (Item | null)[]; size: number }

export function fromValues(values: Val[], slots: number, nextId: () => number): Model {
  const items: (Item | null)[] = values.map((v) => ({ id: nextId(), v }))
  while (items.length < slots) items.push(null)
  return { cells: items, size: values.length }
}

export const activeItems = (m: Model): Item[] => m.cells.slice(0, m.size) as Item[]
export const activeValues = (m: Model): Val[] => activeItems(m).map((i) => i.v)

export function pushItem(m: Model, item: Item): Model {
  const cells = m.cells.slice()
  cells[m.size] = item
  return { cells, size: m.size + 1 }
}

export function popItem(m: Model): { model: Model; item: Item | null; slot: number } {
  if (m.size <= 0) return { model: m, item: null, slot: -1 }
  const slot = m.size - 1
  return { model: { cells: m.cells, size: slot }, item: m.cells[slot], slot }
}

export const ACTION_LABEL: Record<Action, string> = {
  push: 'PUSH',
  pop: 'POP',
  skip: 'IGNORAR',
  error: '¡ERROR!',
}
export const ACTION_MARK: Record<Action, string> = { push: '+', pop: '-', skip: '>', error: 'X' }

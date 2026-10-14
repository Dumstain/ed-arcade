/**
 * Lógica pura de queue-sim (sin React): normalización defensiva de los datos, parser de operaciones
 * ("enqueue(5)", "dequeue()", "addFirst(5)"…) y modelo de cola CIRCULAR con celdas obsoletas.
 *
 * Convención del curso (igual para las tres vistas, también para 'line'):
 *   frente = índice del PRIMER elemento · final = índice del ÚLTIMO · tamaño = cuántos hay.
 *   enqueue / addLast : final = (final + 1) % capacidad, ahí se guarda.
 *   dequeue / removeFirst : frente = (frente + 1) % capacidad.
 *   addFirst : frente = (frente - 1 + capacidad) % capacidad, ahí se guarda.
 *   removeLast : final = (final - 1 + capacidad) % capacidad.
 *   Cola vacía: final = frente - 1 (con vuelta). El dato "sacado" NO se borra de la celda (queda obsoleto).
 */
import type { QueueSimData, Val } from '../schemas'

export type Mode = 'build' | 'served' | 'pointers'
export type View = 'line' | 'ring' | 'array'
export type End = 'front' | 'rear'

/** Límites de tamaño (a 360 px) */
export const LINE_DEFAULT = 10 // personas en la fila si no hay capacity
export const LINE_MAX = 12
export const RING_MAX = 8 // casillas del carrusel; con más se dibuja como arreglo
export const RING_MIN = 3
export const ARRAY_MAX = 12
export const ARRAY_MIN = 2
export const DEFAULT_CAP = 5
export const ITEMS_MAX = 12 // fichas iniciales / esperadas

export interface Cfg {
  mode: Mode
  view: View
  deque: boolean
  /** Celdas del modelo = máximo de elementos. En 'line' sin capacity vale LINE_DEFAULT. */
  slots: number
  /** ¿el autor dio capacity? (cambia el texto de "llena") */
  capacityGiven: boolean
  initial: Val[]
  /** índice del frente al inicio (0 en 'line') */
  front0: number
  ops: string[]
  palette: Val[]
  /** build: frente→final | served: orden de salida */
  expected: Val[]
  /** pointers */
  expectedFront: number
  expectedRear: number
  /** la vista pedida era ring pero no cabe: se dibuja como arreglo (circular igual) */
  fellBack: boolean
}

const isVal = (v: unknown): v is Val => (typeof v === 'number' && Number.isFinite(v)) || typeof v === 'string'

export const same = (a: Val, b: Val) => String(a) === String(b)
export const sameSeq = (a: Val[], b: Val[]) => a.length === b.length && a.every((v, i) => same(v, b[i]))
export const mod = (a: number, n: number) => ((a % n) + n) % n
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

function uniq(list: Val[]): Val[] {
  const seen = new Set<string>()
  const out: Val[] = []
  for (const v of list) {
    const k = String(v)
    if (!seen.has(k)) {
      seen.add(k)
      out.push(v)
    }
  }
  return out
}

// ───────────── Operaciones del programa ─────────────
export type OpKind = 'enqueue' | 'dequeue' | 'addFirst' | 'addLast' | 'removeFirst' | 'removeLast'
export type Op = { kind: OpKind; value?: Val } | { kind: 'unknown' }

const NAMES: Record<string, OpKind> = {
  enqueue: 'enqueue',
  offer: 'enqueue',
  add: 'enqueue',
  dequeue: 'dequeue',
  poll: 'dequeue',
  remove: 'dequeue',
  addfirst: 'addFirst',
  offerfirst: 'addFirst',
  addlast: 'addLast',
  offerlast: 'addLast',
  removefirst: 'removeFirst',
  pollfirst: 'removeFirst',
  removelast: 'removeLast',
  polllast: 'removeLast',
}
const INSERT: OpKind[] = ['enqueue', 'addFirst', 'addLast']
export const isInsert = (k: OpKind) => INSERT.includes(k)
export const isDequeKind = (k: OpKind) => k === 'addFirst' || k === 'addLast' || k === 'removeFirst' || k === 'removeLast'

function parseArg(raw: string): Val {
  const s = raw.trim()
  const q = /^(['"])(.*)\1$/.exec(s)
  if (q) return q[2]
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s)
  return s
}

export function parseOp(line: string): Op {
  const m = /^\s*(?:[\w.]+\.)?([A-Za-z]+)\s*\(\s*(.*?)\s*\)\s*;?\s*$/.exec(String(line))
  if (!m) return { kind: 'unknown' }
  const kind = NAMES[m[1].toLowerCase()]
  if (!kind) return { kind: 'unknown' }
  if (isInsert(kind)) {
    if (m[2] === '') return { kind: 'unknown' }
    return { kind, value: parseArg(m[2]) }
  }
  return { kind }
}

// ───────────── Modelo de cola circular ─────────────
export interface Item { id: number; v: Val }
/** cells[(front + i) % n] para i < size son la cola; el resto son datos "obsoletos" o vacíos. */
export interface QModel { cells: (Item | null)[]; front: number; size: number }

export function fromValues(values: Val[], slots: number, front: number, nextId: () => number): QModel {
  const cells: (Item | null)[] = Array.from({ length: slots }, () => null)
  const f = mod(front, slots)
  const n = Math.min(values.length, slots)
  for (let i = 0; i < n; i++) cells[mod(f + i, slots)] = { id: nextId(), v: values[i] }
  return { cells, front: f, size: n }
}

export const slotsOf = (m: QModel) => m.cells.length
export const rearIndex = (m: QModel) => mod(m.front + m.size - 1, slotsOf(m))
export const isFull = (m: QModel) => m.size >= slotsOf(m)
export const isEmpty = (m: QModel) => m.size <= 0

/** Elementos vivos de frente a final */
export function itemsOf(m: QModel): Item[] {
  const n = slotsOf(m)
  const out: Item[] = []
  for (let i = 0; i < m.size; i++) {
    const it = m.cells[mod(m.front + i, n)]
    if (it) out.push(it)
  }
  return out
}
export const valuesOf = (m: QModel): Val[] => itemsOf(m).map((i) => i.v)

/** ¿la celda i guarda un elemento vivo? */
export function isLiveIndex(m: QModel, i: number): boolean {
  if (m.size <= 0) return false
  return mod(i - m.front, slotsOf(m)) < m.size
}

export interface Placed { model: QModel; index: number; wrapped: boolean }
export interface Taken { model: QModel; item: Item; index: number; wrapped: boolean }

/** enqueue / addLast. null = cola llena. */
export function enqueueItem(m: QModel, item: Item): Placed | null {
  if (isFull(m)) return null
  const n = slotsOf(m)
  const index = mod(m.front + m.size, n)
  const cells = m.cells.slice()
  cells[index] = item
  // dio la vuelta: el final pasa del último índice al 0
  const wrapped = m.size > 0 && index < rearIndex(m)
  return { model: { cells, front: m.front, size: m.size + 1 }, index, wrapped }
}

/** addFirst. null = cola llena. */
export function addFirstItem(m: QModel, item: Item): Placed | null {
  if (isFull(m)) return null
  const n = slotsOf(m)
  const index = mod(m.front - 1, n)
  const cells = m.cells.slice()
  cells[index] = item
  return { model: { cells, front: index, size: m.size + 1 }, index, wrapped: index > m.front }
}

/** dequeue / removeFirst. null = cola vacía. */
export function dequeueItem(m: QModel): Taken | null {
  if (isEmpty(m)) return null
  const n = slotsOf(m)
  const index = m.front
  const item = m.cells[index]
  if (!item) return null
  const front = mod(index + 1, n)
  return { model: { cells: m.cells, front, size: m.size - 1 }, item, index, wrapped: front < index }
}

/** removeLast. null = cola vacía. */
export function removeLastItem(m: QModel): Taken | null {
  if (isEmpty(m)) return null
  const index = rearIndex(m)
  const item = m.cells[index]
  if (!item) return null
  return { model: { cells: m.cells, front: m.front, size: m.size - 1 }, item, index, wrapped: index === 0 && slotsOf(m) > 1 }
}

export interface SimResult {
  model: QModel
  /** valores en el orden en que salieron (dequeue / removeFirst / removeLast) */
  served: Val[]
  /** operaciones que no se pudieron aplicar (cola llena / vacía / desconocida) */
  issues: number
}

export function simulate(slots: number, front0: number, initial: Val[], ops: string[]): SimResult {
  let id = 1
  let m = fromValues(initial, slots, front0, () => id++)
  const served: Val[] = []
  let issues = 0
  for (const line of ops) {
    const op = parseOp(line)
    if (op.kind === 'unknown') {
      issues++
      continue
    }
    if (isInsert(op.kind)) {
      const item: Item = { id: id++, v: op.value as Val }
      const r = op.kind === 'addFirst' ? addFirstItem(m, item) : enqueueItem(m, item)
      if (!r) issues++
      else m = r.model
    } else {
      const r = op.kind === 'removeLast' ? removeLastItem(m) : dequeueItem(m)
      if (!r) issues++
      else {
        m = r.model
        served.push(r.item.v)
      }
    }
  }
  return { model: m, served, issues }
}

// ───────────── Normalización de datos ─────────────
const finiteInt = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)

export function normalize(raw: unknown): { cfg: Cfg } | { error: string } {
  if (!raw || typeof raw !== 'object') return { error: 'Faltan los datos de este ejercicio.' }
  const d = raw as Record<string, unknown>
  const mode = d.mode
  if (mode !== 'build' && mode !== 'served' && mode !== 'pointers') {
    return { error: 'Este ejercicio de colas tiene un modo desconocido.' }
  }
  let view: View = d.view === 'ring' || d.view === 'array' ? d.view : 'line'
  // FRENTE y FINAL como índices necesitan casillas numeradas
  if (mode === 'pointers' && view === 'line') view = 'array'

  const initial = (Array.isArray(d.initial) ? d.initial.filter(isVal) : []).slice(0, ITEMS_MAX)
  const ops = Array.isArray(d.ops) ? d.ops.filter((o): o is string => typeof o === 'string') : []
  if (ops.length === 0) return { error: 'Este ejercicio no trae el programa (ops).' }

  const deque = d.deque === true || ops.some((o) => {
    const p = parseOp(o)
    return p.kind !== 'unknown' && isDequeKind(p.kind)
  })

  // ── capacidad / casillas ──
  const givenExpected = Array.isArray(d.expected) ? d.expected.filter(isVal).slice(0, ITEMS_MAX) : null
  const c = finiteInt(d.capacity) ? Math.floor(d.capacity) : NaN
  const need = Math.max(1, initial.length, mode === 'build' ? (givenExpected?.length ?? 0) : 0)
  let slots: number
  let fellBack = false
  if (view === 'line') {
    slots = clamp(Number.isNaN(c) ? LINE_DEFAULT : Math.max(c, need), need, LINE_MAX)
  } else {
    const dflt = Math.max(DEFAULT_CAP, initial.length + 1, need)
    slots = Number.isNaN(c) ? dflt : Math.max(c, need)
    if (view === 'ring' && slots > RING_MAX) {
      view = 'array'
      fellBack = true
    }
    slots = view === 'ring' ? clamp(slots, RING_MIN, RING_MAX) : clamp(slots, ARRAY_MIN, ARRAY_MAX)
    if (slots < need) return { error: 'La capacidad es menor que los datos del ejercicio.' }
  }
  const capacityGiven = !Number.isNaN(c)

  const f0raw = finiteInt(d.initialFront) ? Math.floor(d.initialFront) : 0
  const front0 = view === 'line' ? 0 : mod(f0raw, slots)

  const sim = simulate(slots, front0, initial, ops)
  const expected =
    givenExpected ?? (mode === 'served' ? sim.served : mode === 'build' ? valuesOf(sim.model) : [])

  let expectedFront = sim.model.front
  let expectedRear = rearIndex(sim.model)
  if (mode === 'pointers') {
    if (d.expectedFront !== undefined) {
      if (!finiteInt(d.expectedFront) || d.expectedFront < 0 || d.expectedFront >= slots)
        return { error: 'expectedFront está fuera de las casillas de la cola.' }
      expectedFront = Math.floor(d.expectedFront)
    }
    if (d.expectedRear !== undefined) {
      if (!finiteInt(d.expectedRear) || d.expectedRear < 0 || d.expectedRear >= slots)
        return { error: 'expectedRear está fuera de las casillas de la cola.' }
      expectedRear = Math.floor(d.expectedRear)
    }
  }

  // ── fichas ──
  let palette: Val[] = []
  if (mode !== 'pointers') {
    const fromOps = ops.flatMap((o) => {
      const p = parseOp(o)
      return p.kind !== 'unknown' && isInsert(p.kind) ? [p.value as Val] : []
    })
    const given = Array.isArray(d.palette) ? d.palette.filter(isVal) : []
    if (mode === 'served') {
      // cada ficha se usa una sola vez: garantizamos suficientes copias de lo que sale
      palette = given.length ? [...given] : uniq([...initial, ...fromOps])
      const have = new Map<string, number>()
      palette.forEach((v) => have.set(String(v), (have.get(String(v)) ?? 0) + 1))
      const need2 = new Map<string, number>()
      expected.forEach((v) => need2.set(String(v), (need2.get(String(v)) ?? 0) + 1))
      for (const v of expected) {
        const k = String(v)
        if ((have.get(k) ?? 0) < (need2.get(k) ?? 0)) {
          palette.push(v)
          have.set(k, (have.get(k) ?? 0) + 1)
        }
      }
    } else {
      // Se agregan los esperados que hay que ENCOLAR (vienen del programa o no estaban al inicio), pero no los
      // que se conservan de la cola inicial: si no, se podría vaciar la cola y rearmarla con otro frente.
      const needed = expected.filter((v) => !initial.some((i) => same(i, v)) || fromOps.some((o) => same(o, v)))
      palette = uniq([...(given.length ? given : [...initial, ...fromOps]), ...needed])
    }
    if (palette.length === 0 && !(mode === 'build' && expected.length === 0)) {
      return { error: 'Este ejercicio no trae fichas (palette).' }
    }
  }

  return {
    cfg: {
      mode,
      view,
      deque,
      slots,
      capacityGiven,
      initial,
      front0,
      ops,
      palette,
      expected,
      expectedFront,
      expectedRear,
      fellBack,
    },
  }
}

export const OP_LABEL: Record<OpKind, string> = {
  enqueue: 'ENCOLAR',
  addLast: 'AL FINAL',
  addFirst: 'AL FRENTE',
  dequeue: 'ATENDER',
  removeFirst: 'SALE FRENTE',
  removeLast: 'SALE FINAL',
}

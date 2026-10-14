/**
 * Lógica pura de graph-sim (sin React ni DOM): validación defensiva de los datos, códigos cortos
 * de ciudad (MOR, PAT…), lista de adyacencia con orden, BFS (cola), DFS recursivo (pila de
 * llamadas), caminos mínimos por número de aristas y matriz de adyacencia.
 * Probado con node --experimental-strip-types (solo importa tipos).
 */
import type { GraphSimData } from '../schemas'

export type Mode = 'bfs' | 'dfs' | 'matrix' | 'path'
export const MODES: readonly Mode[] = ['bfs', 'dfs', 'matrix', 'path']

/** Límites pensados para que el mapa siga siendo tocable a 360 px */
export const MAX_NODES = 12
export const MAX_MATRIX = 8
export const MAX_EDGES = 40
/** separación mínima recomendada entre ciudades (unidades 0..100): a 360 px el mapa mide ~270 px */
export const MIN_GAP = 24

export interface GNode {
  id: string
  /** Nombre completo sin marcado ** (p.ej. "Morelia") */
  label: string
  /** Código corto único (≤ 4 caracteres, p.ej. "MOR") */
  code: string
  /** 0..100 */
  x: number
  y: number
  idx: number
}
export interface GEdge {
  a: string
  b: string
  w: number | null
  /** clave única (no dirigido: independiente del orden a/b) */
  key: string
}
export type Adj = Map<string, string[]>

export interface Cfg {
  mode: Mode
  nodes: GNode[]
  byId: Map<string, GNode>
  edges: GEdge[]
  directed: boolean
  start: string
  goal: string | null
  sortNeighbors: boolean
  showStructure: boolean
  showWeights: boolean
  adj: Adj
  /** avisos para el autor del contenido (no bloquean) */
  warnings: string[]
}

// ───────────────────────── utilidades ─────────────────────────
/** Quita el marcado **…** (misma regla que RichText.plainText, sin importar React) */
export const plain = (s: unknown): string => String(s ?? '').replace(/\*\*([^*]+?)\*\*/g, '$1')

const stripAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Clave de arista: dirigida "a>b"; no dirigida independiente del orden */
export function edgeKey(a: string, b: string, directed: boolean): string {
  if (directed) return JSON.stringify([a, b])
  return a < b ? JSON.stringify([a, b]) : JSON.stringify([b, a])
}

/**
 * Códigos cortos únicos para encabezados de la matriz y nodos del mapa.
 * - id corto (≤ 4 letras/números) → ese id en mayúsculas ("MOR", "A")
 * - si no, 3 primeras letras del nombre sin acentos ("Pátzcuaro" → "PAT"); si choca, variantes.
 */
export function makeCodes(nodes: { id: string; label: string }[]): string[] {
  const used = new Set<string>()
  return nodes.map((n, i) => {
    const cands: string[] = []
    const id = n.id.trim()
    if (id.length > 0 && id.length <= 4 && /^[\p{L}\p{N}]+$/u.test(id)) cands.push(stripAccents(id).toUpperCase())
    const letters = stripAccents(plain(n.label)).toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (letters.length > 0) {
      cands.push(letters.slice(0, 3))
      const cons = letters.slice(1).replace(/[AEIOU]/g, '')
      if (cons.length >= 2) cands.push(letters[0] + cons.slice(0, 2))
      for (let k = 2; k < letters.length; k++) cands.push(letters.slice(0, 2) + letters[k])
    }
    const base = (letters || stripAccents(id).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'V').slice(0, 2)
    for (let k = 1; k < 100; k++) cands.push(`${base}${k}`)
    cands.push(`V${i}`)
    const pick = cands.find((c) => c.length > 0 && !used.has(c)) ?? `V${i}`
    used.add(pick)
    return pick
  })
}

const isFiniteNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Compara nombres en español (Á = A, números naturales) y desempata por id */
function byLabel(a: GNode, b: GNode): number {
  const c = a.label.localeCompare(b.label, 'es', { sensitivity: 'base', numeric: true })
  return c !== 0 ? c : a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

/**
 * Lista de adyacencia: vecinos en el ORDEN en que aparecen en `edges`
 * (no dirigido: la arista {a,b} agrega b a la lista de a y a a la de b), o alfabético por nombre.
 */
export function buildAdjacency(nodes: GNode[], edges: GEdge[], directed: boolean, sortNeighbors: boolean): Adj {
  const adj: Adj = new Map(nodes.map((n) => [n.id, [] as string[]]))
  for (const e of edges) {
    adj.get(e.a)?.push(e.b)
    if (!directed) adj.get(e.b)?.push(e.a)
  }
  if (sortNeighbors) {
    const byId = new Map(nodes.map((n) => [n.id, n]))
    for (const [k, list] of adj) {
      adj.set(
        k,
        [...list].sort((x, y) => {
          const nx = byId.get(x)
          const ny = byId.get(y)
          return nx && ny ? byLabel(nx, ny) : 0
        }),
      )
    }
  }
  return adj
}

// ───────────────────────── validación ─────────────────────────
export type Parsed = { cfg: Cfg } | { error: string }

export function normalize(raw: unknown): Parsed {
  if (!raw || typeof raw !== 'object') return { error: 'Este reto no trae el mapa. Avísale a tu profe.' }
  const d = raw as Partial<GraphSimData>
  const mode = d.mode as Mode
  if (!MODES.includes(mode)) return { error: `Modo desconocido: "${String(d.mode)}".` }

  // ── vértices ──
  if (!Array.isArray(d.nodes) || d.nodes.length < 2) return { error: 'El mapa necesita al menos 2 ciudades.' }
  const maxN = mode === 'matrix' ? MAX_MATRIX : MAX_NODES
  if (d.nodes.length > maxN)
    return { error: `Demasiadas ciudades (${d.nodes.length}). Máximo ${maxN} para que se pueda tocar en el celular.` }
  const seen = new Set<string>()
  const pre: { id: string; label: string; x: number; y: number }[] = []
  for (const n of d.nodes as unknown[]) {
    if (!n || typeof n !== 'object') return { error: 'Hay una ciudad mal escrita en los datos.' }
    const o = n as Record<string, unknown>
    const id = typeof o.id === 'string' ? o.id.trim() : isFiniteNum(o.id) ? String(o.id) : ''
    if (!id) return { error: 'Hay una ciudad sin id.' }
    if (seen.has(id)) return { error: `La ciudad "${id}" está repetida.` }
    seen.add(id)
    const label = typeof o.label === 'string' || isFiniteNum(o.label) ? plain(o.label).trim() || id : id
    const x = Number(o.x)
    const y = Number(o.y)
    if (!Number.isFinite(x) || !Number.isFinite(y)) return { error: `La ciudad "${id}" no tiene posición (x, y).` }
    pre.push({ id, label, x: clamp(x, 0, 100), y: clamp(y, 0, 100) })
  }
  const codes = makeCodes(pre)
  const nodes: GNode[] = pre.map((p, idx) => ({ ...p, code: codes[idx], idx }))
  const byId = new Map(nodes.map((n) => [n.id, n]))

  // ── aristas ──
  const directed = d.directed === true
  if (!Array.isArray(d.edges) || d.edges.length === 0) return { error: 'El mapa no tiene carreteras.' }
  if (d.edges.length > MAX_EDGES) return { error: `Demasiadas carreteras (${d.edges.length}). Máximo ${MAX_EDGES}.` }
  const edges: GEdge[] = []
  const keys = new Set<string>()
  for (const e of d.edges as unknown[]) {
    if (!e || typeof e !== 'object') return { error: 'Hay una carretera mal escrita en los datos.' }
    const o = e as Record<string, unknown>
    const a = typeof o.a === 'string' ? o.a.trim() : isFiniteNum(o.a) ? String(o.a) : ''
    const b = typeof o.b === 'string' ? o.b.trim() : isFiniteNum(o.b) ? String(o.b) : ''
    if (!byId.has(a) || !byId.has(b)) return { error: `La carretera ${a || '?'}–${b || '?'} usa una ciudad que no existe.` }
    if (a === b) return { error: `La carretera ${a}–${b} va de una ciudad a sí misma.` }
    const key = edgeKey(a, b, directed)
    if (keys.has(key)) return { error: `La carretera ${a}–${b} está repetida.` }
    keys.add(key)
    const w = isFiniteNum(o.w) && o.w >= 0 ? o.w : null
    edges.push({ a, b, w, key })
  }

  const sortNeighbors = d.sortNeighbors === true
  const adj = buildAdjacency(nodes, edges, directed, sortNeighbors)

  // ── inicio / meta ──
  let start = typeof d.start === 'string' ? d.start.trim() : isFiniteNum(d.start) ? String(d.start) : ''
  let goal: string | null = null
  if (mode !== 'matrix') {
    if (!start) {
      if (mode === 'path') return { error: 'Falta la ciudad de inicio (start).' }
      start = nodes[0].id
    }
    if (!byId.has(start)) return { error: `La ciudad de inicio "${start}" no está en el mapa.` }
  } else if (!byId.has(start)) {
    start = nodes[0].id
  }
  if (mode === 'bfs' || mode === 'dfs') {
    if ((adj.get(start) ?? []).length === 0) return { error: `De la ciudad de inicio "${start}" no sale ninguna carretera.` }
  }
  if (mode === 'path') {
    const g = typeof d.goal === 'string' ? d.goal.trim() : isFiniteNum(d.goal) ? String(d.goal) : ''
    if (!g) return { error: 'Falta la ciudad meta (goal).' }
    if (!byId.has(g)) return { error: `La ciudad meta "${g}" no está en el mapa.` }
    if (g === start) return { error: 'El inicio y la meta son la misma ciudad.' }
    if (!distances(adj, start).has(g)) return { error: `No hay camino de "${start}" a "${g}".` }
    goal = g
  }

  // ── avisos para el autor ──
  const warnings: string[] = []
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x
      const dy = nodes[i].y - nodes[j].y
      if (Math.hypot(dx, dy) < MIN_GAP)
        warnings.push(`"${nodes[i].id}" y "${nodes[j].id}" están muy juntas (se pueden encimar a 360 px; deja ≥ ${MIN_GAP} unidades).`)
    }
  }
  if (mode === 'bfs' || mode === 'dfs') {
    const reach = distances(adj, start)
    const lost = nodes.filter((n) => !reach.has(n.id)).map((n) => n.id)
    if (lost.length) warnings.push(`No se alcanzan desde "${start}": ${lost.join(', ')} (el recorrido no las visita).`)
  }

  return {
    cfg: {
      mode,
      nodes,
      byId,
      edges,
      directed,
      start,
      goal,
      sortNeighbors,
      showStructure: d.showStructure !== false,
      showWeights: d.showWeights === true,
      adj,
      warnings,
    },
  }
}

// ───────────────────────── BFS (cola) ─────────────────────────
export interface BfsStep {
  /** vértice que se VISITA (se saca del frente de la cola) */
  v: string
  parent: string | null
  layer: number
  /** vecinos que se formaron en la cola al visitar v (en el orden de la lista) */
  enqueued: string[]
  /** cola (frente → final) después de visitar v */
  queueAfter: string[]
}
export interface BfsResult {
  order: string[]
  steps: BfsStep[]
  parent: Map<string, string | null>
  layer: Map<string, number>
}

/** BFS clásico: se marca al ENCOLAR; el orden de visita es el orden en que salen de la cola. */
export function bfsTrace(adj: Adj, start: string): BfsResult {
  const parent = new Map<string, string | null>([[start, null]])
  const layer = new Map<string, number>([[start, 0]])
  const queue: string[] = [start]
  const steps: BfsStep[] = []
  const order: string[] = []
  while (queue.length > 0) {
    const v = queue.shift() as string
    order.push(v)
    const enqueued: string[] = []
    for (const u of adj.get(v) ?? []) {
      if (parent.has(u)) continue
      parent.set(u, v)
      layer.set(u, (layer.get(v) ?? 0) + 1)
      queue.push(u)
      enqueued.push(u)
    }
    steps.push({ v, parent: parent.get(v) ?? null, layer: layer.get(v) ?? 0, enqueued, queueAfter: [...queue] })
  }
  return { order, steps, parent, layer }
}

// ───────────────────────── DFS recursivo (pila de llamadas) ─────────────────────────
export interface DfsStep {
  v: string
  parent: string | null
  depth: number
  /** pila de llamadas (fondo → tope) justo después de llamar dfs(v) */
  stack: string[]
  /** llamadas que regresaron (return) antes de esta visita, en orden de salida */
  returned: string[]
}
export interface DfsResult {
  order: string[]
  steps: DfsStep[]
  parent: Map<string, string | null>
  /** llamadas que regresan al terminar todo (la pila se vacía) */
  finalReturned: string[]
}

/** dfs(v): marcar v; para cada vecino u en el orden de la lista: si no está visitado → dfs(u). */
export function dfsTrace(adj: Adj, start: string): DfsResult {
  const parent = new Map<string, string | null>()
  const stack: string[] = []
  const steps: DfsStep[] = []
  const order: string[] = []
  let pending: string[] = []
  const visit = (v: string, p: string | null) => {
    parent.set(v, p)
    stack.push(v)
    order.push(v)
    steps.push({ v, parent: p, depth: stack.length - 1, stack: [...stack], returned: pending })
    pending = []
    for (const u of adj.get(v) ?? []) {
      if (!parent.has(u)) visit(u, v)
    }
    stack.pop()
    pending.push(v)
  }
  visit(start, null)
  return { order, steps, parent, finalReturned: pending }
}

/**
 * Ruta del comecocos en DFS de `from` (último visitado) a `to` (nuevo):
 * regresa por las llamadas (padres) hasta el padre de `to` y de ahí baja a `to`.
 */
export function dfsRoute(parent: Map<string, string | null>, from: string | null, to: string): string[] {
  const p = parent.get(to) ?? null
  if (from === null || p === null) return [to]
  const route: string[] = [from]
  let cur: string | null = from
  let guard = 0
  while (cur !== null && cur !== p && guard++ < 64) {
    cur = parent.get(cur) ?? null
    if (cur !== null) route.push(cur)
  }
  if (cur !== p) return [p, to] // no debería pasar: p siempre es ancestro de from
  route.push(to)
  return route
}

// ───────────────────────── caminos mínimos (por número de carreteras) ─────────────────────────
export function distances(adj: Adj, start: string): Map<string, number> {
  const dist = new Map<string, number>([[start, 0]])
  const q = [start]
  while (q.length) {
    const v = q.shift() as string
    for (const u of adj.get(v) ?? []) {
      if (dist.has(u)) continue
      dist.set(u, (dist.get(v) ?? 0) + 1)
      q.push(u)
    }
  }
  return dist
}

/** El camino que encuentra BFS (respeta el orden de la lista de adyacencia), o null */
export function shortestPath(adj: Adj, start: string, goal: string): string[] | null {
  const { parent } = bfsTrace(adj, start)
  if (!parent.has(goal)) return null
  const path: string[] = []
  let cur: string | null = goal
  let guard = 0
  while (cur !== null && guard++ < 64) {
    path.push(cur)
    cur = parent.get(cur) ?? null
  }
  return path.reverse()
}

export const isNeighbor = (adj: Adj, a: string, b: string): boolean => (adj.get(a) ?? []).includes(b)

export interface PathCheck {
  valid: boolean
  reason?: 'empty' | 'start' | 'end' | 'gap' | 'repeat'
  /** número de carreteras del camino del alumno */
  edges: number
  /** mínimo posible */
  best: number
  minimal: boolean
}

export function checkPath(adj: Adj, path: string[], start: string, goal: string): PathCheck {
  const best = distances(adj, start).get(goal) ?? -1
  const edges = Math.max(0, path.length - 1)
  const fail = (reason: PathCheck['reason']): PathCheck => ({ valid: false, reason, edges, best, minimal: false })
  if (path.length === 0) return fail('empty')
  if (path[0] !== start) return fail('start')
  if (path[path.length - 1] !== goal) return fail('end')
  if (new Set(path).size !== path.length) return fail('repeat')
  for (let i = 1; i < path.length; i++) if (!isNeighbor(adj, path[i - 1], path[i])) return fail('gap')
  return { valid: true, edges, best, minimal: edges === best }
}

/** km totales de un camino (null si alguna carretera no trae km) */
export function pathKm(edges: GEdge[], directed: boolean, path: string[]): number | null {
  const w = new Map(edges.map((e) => [e.key, e.w]))
  let sum = 0
  for (let i = 1; i < path.length; i++) {
    const k = w.get(edgeKey(path[i - 1], path[i], directed))
    if (k === null || k === undefined) return null
    sum += k
  }
  return sum
}

// ───────────────────────── matriz de adyacencia ─────────────────────────
export function adjacencyMatrix(nodes: GNode[], edges: GEdge[], directed: boolean): number[][] {
  const idx = new Map(nodes.map((n, i) => [n.id, i]))
  const m = nodes.map(() => nodes.map(() => 0))
  for (const e of edges) {
    const i = idx.get(e.a)
    const j = idx.get(e.b)
    if (i === undefined || j === undefined) continue
    m[i][j] = 1
    if (!directed) m[j][i] = 1
  }
  return m
}

export const emptyMatrix = (n: number): number[][] => Array.from({ length: n }, () => Array.from({ length: n }, () => 0))

/** Alterna [i][j] (no dirigido: también [j][i]). No muta. */
export function toggleCell(m: number[][], i: number, j: number, directed: boolean): number[][] {
  const out = m.map((r) => r.slice())
  const v = out[i][j] ? 0 : 1
  out[i][j] = v
  if (!directed) out[j][i] = v
  return out
}

/** Casillas distintas (como "i,j") */
export function matrixDiff(user: number[][], expected: number[][]): string[] {
  const out: string[] = []
  for (let i = 0; i < expected.length; i++)
    for (let j = 0; j < expected.length; j++) if ((user[i]?.[j] ?? 0) !== expected[i][j]) out.push(`${i},${j}`)
  return out
}

export const countOnes = (m: number[][]): number => m.reduce((s, r) => s + r.reduce((a, b) => a + (b ? 1 : 0), 0), 0)
export const matrixSig = (m: number[][]): string => m.map((r) => r.join('')).join('|')

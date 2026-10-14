/**
 * Lógica pura de bst-sim (sin React): árbol binario de búsqueda inmutable, camino de búsqueda,
 * hueco de inserción, los 4 recorridos, eliminación con SUCESOR (convención del curso),
 * acomodo del dibujo (x por INORDEN, y por profundidad) y validación defensiva de los datos.
 * Se puede probar con: node --experimental-strip-types logic.ts (no importa nada en tiempo de ejecución).
 */
import type { BstSimData } from '../schemas'

export type Side = 'L' | 'R'
export interface TNode {
  v: number
  l: TNode | null
  r: TNode | null
}
export type Tree = TNode | null
export type Mode = 'insert' | 'search' | 'traversal' | 'delete'
export type TraversalKind = 'preorden' | 'inorden' | 'postorden' | 'niveles'

// ───────────────────────── Operaciones básicas ─────────────────────────

/** Inserta sin mutar (copia solo el camino). Duplicado → devuelve el mismo árbol. */
export function insert(t: Tree, v: number): Tree {
  if (t === null) return { v, l: null, r: null }
  if (v === t.v) return t
  if (v < t.v) {
    const l = insert(t.l, v)
    return l === t.l ? t : { v: t.v, l, r: t.r }
  }
  const r = insert(t.r, v)
  return r === t.r ? t : { v: t.v, l: t.l, r }
}

/** Arma el árbol insertando en ese orden. */
export function build(values: readonly number[]): Tree {
  let t: Tree = null
  for (const v of values) t = insert(t, v)
  return t
}

export function find(t: Tree, v: number): TNode | null {
  let cur = t
  while (cur) {
    if (v === cur.v) return cur
    cur = v < cur.v ? cur.l : cur.r
  }
  return null
}

export const contains = (t: Tree, v: number): boolean => find(t, v) !== null

export function size(t: Tree): number {
  return t ? 1 + size(t.l) + size(t.r) : 0
}

/** Altura en aristas: vacío = -1, solo raíz = 0. */
export function height(t: Tree): number {
  return t ? 1 + Math.max(height(t.l), height(t.r)) : -1
}

export function depthOf(t: Tree, v: number): number {
  let d = 0
  let cur = t
  while (cur) {
    if (v === cur.v) return d
    cur = v < cur.v ? cur.l : cur.r
    d++
  }
  return -1
}

/** Valores del subárbol (preorden). */
export function values(t: Tree): number[] {
  const out: number[] = []
  const go = (n: Tree) => {
    if (!n) return
    out.push(n.v)
    go(n.l)
    go(n.r)
  }
  go(t)
  return out
}

/** Padre de v y de qué lado cuelga (raíz → parent null). null si v no está. */
export function parentOf(t: Tree, v: number): { parent: number | null; side: Side | null } | null {
  let parent: TNode | null = null
  let side: Side | null = null
  let cur = t
  while (cur) {
    if (v === cur.v) return { parent: parent ? parent.v : null, side }
    parent = cur
    if (v < cur.v) {
      side = 'L'
      cur = cur.l
    } else {
      side = 'R'
      cur = cur.r
    }
  }
  return null
}

// ───────────────────────── Búsqueda e inserción ─────────────────────────

export interface SearchResult {
  /** valores comparados desde la raíz, en orden */
  path: number[]
  found: boolean
  /** si no está: hacia qué lado (vacío) se cayó desde el último comparado */
  endSide: Side | null
}

export function searchPath(t: Tree, v: number): SearchResult {
  const path: number[] = []
  let cur = t
  while (cur) {
    path.push(cur.v)
    if (v === cur.v) return { path, found: true, endSide: null }
    const side: Side = v < cur.v ? 'L' : 'R'
    const next = side === 'L' ? cur.l : cur.r
    if (!next) return { path, found: false, endSide: side }
    cur = next
  }
  return { path, found: false, endSide: null }
}

export interface Slot {
  /** null = árbol vacío (el hueco es la raíz) */
  parent: number | null
  side: Side | null
  /** valores comparados desde la raíz hasta el padre del hueco */
  path: number[]
}

/** Hueco donde queda v al insertarlo. null si v ya está (duplicado). */
export function insertSlot(t: Tree, v: number): Slot | null {
  const r = searchPath(t, v)
  if (r.found) return null
  if (r.path.length === 0) return { parent: null, side: null, path: [] }
  return { parent: r.path[r.path.length - 1], side: r.endSide, path: r.path }
}

/** Identificador de un hueco: "root" o "<padre><L|R>", p.ej. "30L". */
export function slotId(parent: number | null, side: Side | null): string {
  return parent === null || side === null ? 'root' : `${parent}${side}`
}

/**
 * Para una inserción equivocada: primer nodo del camino correcto donde el hueco tocado se va
 * por el otro lado. Devuelve ese nodo y el lado correcto (para la pista).
 */
export function divergence(t: Tree, key: number, holeParent: number | null, holeSide: Side | null): { at: number; side: Side } | null {
  if (holeParent === null || holeSide === null) return null
  // ruta del hueco tocado: nodos desde la raíz hasta su padre + lado final
  const hp = searchPath(t, holeParent)
  if (!hp.found) return null
  const route: { v: number; side: Side }[] = hp.path.map((v, i) => ({
    v,
    side: i < hp.path.length - 1 ? (hp.path[i + 1] < v ? 'L' : 'R') : holeSide,
  }))
  for (const step of route) {
    const want: Side = key < step.v ? 'L' : 'R'
    if (want !== step.side) return { at: step.v, side: want }
  }
  return null
}

/** Nodos de los subárboles que la búsqueda ya descartó (para atenuarlos, como la mitad de la binaria). */
export function discarded(t: Tree, target: number, compared: number): Set<number> {
  const out = new Set<number>()
  let cur = t
  let k = 0
  while (cur && k < compared) {
    if (target === cur.v) break
    const goLeft = target < cur.v
    for (const v of values(goLeft ? cur.r : cur.l)) out.add(v)
    cur = goLeft ? cur.l : cur.r
    k++
  }
  return out
}

// ───────────────────────── Recorridos ─────────────────────────

export function preorder(t: Tree): number[] {
  return values(t)
}

export function inorder(t: Tree): number[] {
  const out: number[] = []
  const go = (n: Tree) => {
    if (!n) return
    go(n.l)
    out.push(n.v)
    go(n.r)
  }
  go(t)
  return out
}

export function postorder(t: Tree): number[] {
  const out: number[] = []
  const go = (n: Tree) => {
    if (!n) return
    go(n.l)
    go(n.r)
    out.push(n.v)
  }
  go(t)
  return out
}

export function levelorder(t: Tree): number[] {
  const out: number[] = []
  const q: TNode[] = t ? [t] : []
  for (let i = 0; i < q.length; i++) {
    const n = q[i]
    out.push(n.v)
    if (n.l) q.push(n.l)
    if (n.r) q.push(n.r)
  }
  return out
}

export function traverse(t: Tree, kind: TraversalKind): number[] {
  switch (kind) {
    case 'preorden':
      return preorder(t)
    case 'inorden':
      return inorder(t)
    case 'postorden':
      return postorder(t)
    case 'niveles':
      return levelorder(t)
  }
}

// ───────────────────────── Eliminación (convención del curso: SUCESOR) ─────────────────────────

export function minValue(t: TNode): number {
  let cur = t
  while (cur.l) cur = cur.l
  return cur.v
}

export function maxValue(t: TNode): number {
  let cur = t
  while (cur.r) cur = cur.r
  return cur.v
}

export interface DeleteInfo {
  kind: 'leaf' | 'one' | 'two'
  /** quién ocupa su lugar: null (hoja), el único hijo o el sucesor inorden */
  replacement: number | null
  /** two: el predecesor (mayor de la izquierda), para dar una pista si lo tocan */
  predecessor: number | null
  /** hijos directos del que se borra */
  left: number | null
  right: number | null
}

export function deleteInfo(t: Tree, v: number): DeleteInfo | null {
  const n = find(t, v)
  if (!n) return null
  const left = n.l ? n.l.v : null
  const right = n.r ? n.r.v : null
  if (!n.l && !n.r) return { kind: 'leaf', replacement: null, predecessor: null, left, right }
  if (!n.l || !n.r) return { kind: 'one', replacement: (n.l ?? n.r)!.v, predecessor: null, left, right }
  return { kind: 'two', replacement: minValue(n.r), predecessor: maxValue(n.l), left, right }
}

/** Quita v sin mutar. Dos hijos → el sucesor (menor del subárbol derecho) toma su lugar. */
export function remove(t: Tree, v: number): Tree {
  if (!t) return null
  if (v < t.v) {
    const l = remove(t.l, v)
    return l === t.l ? t : { v: t.v, l, r: t.r }
  }
  if (v > t.v) {
    const r = remove(t.r, v)
    return r === t.r ? t : { v: t.v, l: t.l, r }
  }
  if (!t.l) return t.r
  if (!t.r) return t.l
  const s = minValue(t.r)
  return { v: s, l: t.l, r: remove(t.r, s) }
}

// ───────────────────────── Dibujo: x por inorden, y por profundidad ─────────────────────────

export const GEO = {
  PAD_X: 18,
  PAD_TOP: 30,
  /** espacio extra arriba en insert: la clave "espera" sobre la raíz */
  PAD_TOP_INSERT: 50,
  PAD_BOTTOM: 18,
  LEVEL_H: 70,
  NODE_W: 44,
  NODE_H: 44,
  /** columna mínima: dos nodos del MISMO nivel quedan a ≥ 2 columnas (≥ 48 px) */
  MIN_COL: 24,
  MAX_COL: 58,
} as const

export interface LNode {
  v: number
  x: number
  /** borde superior */
  y: number
  depth: number
  parent: number | null
  side: Side | null
}
export interface LHole {
  id: string
  parent: number | null
  side: Side | null
  x: number
  y: number
  depth: number
}
export interface LEdge {
  id: string
  /** valor del hijo (o id del hueco si hole) */
  to: string
  childValue: number | null
  hole: boolean
  d: string
}
export interface Layout {
  nodes: LNode[]
  holes: LHole[]
  edges: LEdge[]
  byV: Map<number, LNode>
  holeById: Map<string, LHole>
  width: number
  height: number
  cols: number
  col: number
  padTop: number
}

/** Columnas que ocupa el dibujo: n nodos (o 2n+1 con huecos: hueco, nodo, hueco, …). */
export function columnsFor(t: Tree, withHoles: boolean): number {
  const n = size(t)
  return withHoles ? 2 * n + 1 : Math.max(1, n)
}

/** Ancho de columna para que el árbol quepa en `avail` px (entre MIN_COL y MAX_COL). */
export function columnWidth(avail: number, cols: number): number {
  const c = Math.floor((avail - 2 * GEO.PAD_X) / Math.max(1, cols))
  return Math.max(GEO.MIN_COL, Math.min(GEO.MAX_COL, c))
}

export function layoutTree(t: Tree, opts: { holes: boolean; col: number; padTop?: number }): Layout {
  const col = opts.col
  const padTop = opts.padTop ?? (opts.holes ? GEO.PAD_TOP_INSERT : GEO.PAD_TOP)
  const nodes: LNode[] = []
  const holes: LHole[] = []
  let j = 0
  let maxDepth = 0
  const xAt = (k: number) => GEO.PAD_X + (k + 0.5) * col
  const yAt = (d: number) => padTop + d * GEO.LEVEL_H
  const walk = (n: Tree, depth: number, parent: number | null, side: Side | null) => {
    if (!n) {
      if (opts.holes) {
        holes.push({ id: slotId(parent, side), parent, side, x: xAt(j++), y: yAt(depth), depth })
        maxDepth = Math.max(maxDepth, depth)
      }
      return
    }
    walk(n.l, depth + 1, n.v, 'L')
    nodes.push({ v: n.v, x: xAt(j++), y: yAt(depth), depth, parent, side })
    maxDepth = Math.max(maxDepth, depth)
    walk(n.r, depth + 1, n.v, 'R')
  }
  walk(t, 0, null, null)
  const byV = new Map(nodes.map((n) => [n.v, n] as const))
  const holeById = new Map(holes.map((h) => [h.id, h] as const))

  const elbow = (px: number, py: number, cx: number, cy: number) => {
    const y1 = py + GEO.NODE_H
    const ym = Math.round(y1 + (cy - y1) / 2)
    return `M${px} ${y1} V${ym} H${cx} V${cy}`
  }
  const edges: LEdge[] = []
  for (const n of nodes) {
    if (n.parent === null) continue
    const p = byV.get(n.parent)
    if (p) edges.push({ id: `e${n.v}`, to: String(n.v), childValue: n.v, hole: false, d: elbow(p.x, p.y, n.x, n.y) })
  }
  for (const h of holes) {
    if (h.parent === null) continue
    const p = byV.get(h.parent)
    if (p) edges.push({ id: `h${h.id}`, to: h.id, childValue: null, hole: true, d: elbow(p.x, p.y, h.x, h.y) })
  }
  const cols = j
  return {
    nodes,
    holes,
    edges,
    byV,
    holeById,
    width: Math.max(1, cols) * col + 2 * GEO.PAD_X,
    height: padTop + maxDepth * GEO.LEVEL_H + GEO.NODE_H + GEO.PAD_BOTTOM,
    cols,
    col,
    padTop,
  }
}

/** Firma de la forma del árbol (para re-animar las líneas cuando cambia). */
export function shapeSig(t: Tree): string {
  if (!t) return '.'
  return `(${shapeSig(t.l)}${t.v}${shapeSig(t.r)})`
}

// ───────────────────────── Validación de datos ─────────────────────────

/** Topes duros (los recomendados para 360 px están en el reporte / examples). */
export const MAX_NODES = 20
export const MAX_HEIGHT = 7

export interface Cfg {
  mode: Mode
  initial: number[]
  keys: number[]
  target: number | null
  traversal: TraversalKind
  /** árbol armado con `initial` */
  tree: Tree
  /** insert: árbol final con todas las claves */
  finalTree: Tree
}

const MODES: Mode[] = ['insert', 'search', 'traversal', 'delete']
const KINDS: TraversalKind[] = ['preorden', 'inorden', 'postorden', 'niveles']

function toNum(x: unknown): number | null {
  if (typeof x === 'number' && Number.isFinite(x)) return x
  if (typeof x === 'string' && /^\s*-?\d+(\.\d+)?\s*$/.test(x)) return Number(x)
  return null
}

function numList(x: unknown, name: string): { ok: true; list: number[] } | { ok: false; why: string } {
  if (x === undefined || x === null) return { ok: true, list: [] }
  if (!Array.isArray(x)) return { ok: false, why: `"${name}" debe ser una lista de números` }
  const list: number[] = []
  for (const it of x) {
    const n = toNum(it)
    if (n === null) return { ok: false, why: `"${name}" trae un valor que no es número: ${String(it)}` }
    list.push(n)
  }
  return { ok: true, list }
}

function firstDup(list: number[]): number | null {
  const seen = new Set<number>()
  for (const v of list) {
    if (seen.has(v)) return v
    seen.add(v)
  }
  return null
}

export type Parsed = { ok: true; cfg: Cfg } | { ok: false; why: string }

export function normalize(raw: unknown): Parsed {
  if (!raw || typeof raw !== 'object') return { ok: false, why: 'faltan los datos del árbol' }
  const d = raw as Partial<BstSimData> & Record<string, unknown>
  const mode = d.mode as Mode
  if (!MODES.includes(mode)) return { ok: false, why: `modo desconocido "${String(d.mode)}"` }

  const ini = numList(d.initial, 'initial')
  if (!ini.ok) return ini
  const initial = ini.list
  const dupI = firstDup(initial)
  if (dupI !== null) return { ok: false, why: `"initial" repite el ${dupI} (un BST no tiene duplicados)` }

  let keys: number[] = []
  if (mode === 'insert') {
    const k = numList(d.keys, 'keys')
    if (!k.ok) return k
    keys = k.list
    if (keys.length === 0) return { ok: false, why: 'insert necesita al menos una clave en "keys"' }
    const all = [...initial, ...keys]
    const dup = firstDup(all)
    if (dup !== null) return { ok: false, why: `el ${dup} se repite (un BST no tiene duplicados)` }
  } else if (initial.length === 0) {
    return { ok: false, why: 'falta el árbol inicial ("initial")' }
  }

  const tree = build(initial)
  const finalTree = mode === 'insert' ? build([...initial, ...keys]) : tree
  if (size(finalTree) > MAX_NODES) return { ok: false, why: `el árbol es muy grande (máximo ${MAX_NODES} nodos)` }
  if (height(finalTree) > MAX_HEIGHT) return { ok: false, why: `el árbol es muy alto (altura máxima ${MAX_HEIGHT})` }

  let target: number | null = null
  if (mode === 'search' || mode === 'delete') {
    target = toNum(d.target)
    if (target === null) return { ok: false, why: 'falta el número a buscar/eliminar ("target")' }
    if (mode === 'delete' && !contains(tree, target)) return { ok: false, why: `el ${target} no está en el árbol: no se puede eliminar` }
  }

  let traversal: TraversalKind = 'inorden'
  if (mode === 'traversal') {
    if (!KINDS.includes(d.traversal as TraversalKind)) {
      return { ok: false, why: `recorrido desconocido "${String(d.traversal)}" (preorden, inorden, postorden o niveles)` }
    }
    traversal = d.traversal as TraversalKind
  }

  return { ok: true, cfg: { mode, initial, keys, target, traversal, tree, finalTree } }
}

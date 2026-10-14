/**
 * Lógica PURA de list-sim (sin React ni DOM): validación de datos, parser y simulador de asignaciones
 * ("x.sig.sig = y.ant", null, variables), detección de nodos perdidos, verificación de COMPROBAR,
 * recorridos y un solucionador acotado (para validar el banco y mostrar la respuesta).
 * Solo importa TIPOS: se puede probar con `node --experimental-strip-types`.
 */
import type { ListSimData, Val } from '../schemas'

export type Mode = 'relink' | 'traverse'
export type Kind = 'simple' | 'doble' | 'circular'
export type Field = 'sig' | 'ant'

export interface Ptrs { sig: string | null; ant: string | null }

/** Estado mutable de la simulación (se copia en cada paso: inmutable por fuera). */
export interface LState {
  ptr: Record<string, Ptrs>
  vars: Record<string, string | null>
  /** orden de aparición de las variables (las declaradas en el banco se agregan al final) */
  order: string[]
}

export interface PathExpr { root: string; fields: Field[] }
export interface Stmt {
  /** "Nodo q = ..." (declaración con tipo) */
  decl: boolean
  lhs: PathExpr
  /** null = literal null */
  rhs: PathExpr | null
}
export interface BankItem { text: string; stmt: Stmt }

export interface Cfg {
  mode: Mode
  kind: Kind
  /** solo 'doble' usa ant (en 'circular' se ignora) */
  hasAnt: boolean
  /** ids en el orden de los datos */
  ids: string[]
  values: Record<string, Val>
  initial: LState
  /** variable que marca el inicio de la lista */
  head: string
  // ── relink ──
  op: string
  bank: BankItem[]
  maxSteps: number
  expected: Val[]
  /**
   * Variables "cola de la lista" (fin / final / tail / ultimo) que al inicio señalan al ÚLTIMO vagón
   * (o a null si la lista está vacía). Es un invariante de la estructura: al COMPROBAR deben seguir
   * señalando al último. Así "encolar sin mover fin" no pasa como correcto.
   */
  tails: string[]
  /** índices del banco de una solución válida (la más corta) o null si no se pudo calcular */
  solution: number[] | null
  // ── traverse ──
  startLabel: string
  startNode: string | null
  dir: Field
  /** nodos en el orden de visita */
  path: string[]
  /** dónde termina el recorrido: en null o regresando al nodo inicial (circular) */
  endsAt: 'null' | 'start'
  /** inicio fijo para dibujar la fila principal en traverse */
  layoutHead: string | null
}

export const MAX_NODES = 12
export const MAX_BANK = 12

// ───────────────────────── utilidades ─────────────────────────
const isVal = (v: unknown): v is Val => (typeof v === 'number' && Number.isFinite(v)) || typeof v === 'string'
/** quita el marcado **...** (misma regla que RichText.plainText, sin importar React) */
export const plain = (s: unknown): string => String(s ?? '').replace(/\*\*([^*]+?)\*\*/g, '$1')
/** valor crudo para comparar respuestas */
export const same = (a: Val, b: Val) => String(a) === String(b)
export const sameSeq = (a: Val[], b: Val[]) => a.length === b.length && a.every((v, i) => same(v, b[i]))
/** valor para mostrar (sin marcado) */
export const show = (v: Val | undefined): string => plain(v === undefined ? '' : v)

const IDENT = /^[A-Za-z_$][\w$]*$/
const RESERVED = new Set([
  'null', 'new', 'this', 'true', 'false', 'class', 'int', 'return', 'if', 'else', 'while', 'for',
  'sig', 'ant', 'siguiente', 'anterior', 'next', 'prev', 'dato',
])
const FIELD_ALIAS: Record<string, Field> = {
  sig: 'sig', siguiente: 'sig', next: 'sig',
  ant: 'ant', anterior: 'ant', prev: 'ant',
}

export const isVarName = (s: string) => IDENT.test(s) && !RESERVED.has(s)

// ───────────────────────── parser ─────────────────────────
export function parsePath(src: string): PathExpr | null {
  const parts = String(src).split('.').map((p) => p.trim())
  if (parts.length === 0 || parts.some((p) => p === '')) return null
  const root = parts[0]
  if (!isVarName(root)) return null
  const fields: Field[] = []
  for (const p of parts.slice(1)) {
    const f = FIELD_ALIAS[p]
    if (!f) return null
    fields.push(f)
  }
  return { root, fields }
}

export const pathText = (p: PathExpr) => [p.root, ...p.fields].join('.')
export const stmtText = (s: Stmt) => `${s.lhs.fields.length === 0 && s.decl ? 'Nodo ' : ''}${pathText(s.lhs)} = ${s.rhs ? pathText(s.rhs) : 'null'};`

/** "x.sig.sig = y.ant;" · "Nodo q = p.sig;" · "p = null" → Stmt, o un error legible. */
export function parseStmt(text: string): Stmt | { error: string } {
  let s = String(text ?? '').trim().replace(/;\s*$/, '').trim()
  if (!s) return { error: 'asignación vacía' }
  let decl = false
  const m = /^([A-Z][\w$]*(?:\s*<[^>]*>)?)\s+(.+)$/.exec(s)
  if (m && !m[2].trim().startsWith('=')) {
    decl = true
    s = m[2].trim()
  }
  const eq = s.indexOf('=')
  if (eq < 0) return { error: 'le falta el signo =' }
  if (s.indexOf('=', eq + 1) >= 0 || s[eq - 1] === '!' || s[eq - 1] === '<' || s[eq - 1] === '>') {
    return { error: 'solo se permite UNA asignación con =' }
  }
  const L = s.slice(0, eq).trim()
  const R = s.slice(eq + 1).trim()
  const lhs = parsePath(L)
  if (!lhs) return { error: `no entiendo el lado izquierdo «${L}»` }
  if (decl && lhs.fields.length > 0) return { error: 'una declaración con tipo debe ser una variable sola' }
  if (R === 'null') return { decl, lhs, rhs: null }
  const rhs = parsePath(R)
  if (!rhs) return { error: `no entiendo el lado derecho «${R}»` }
  return { decl, lhs, rhs }
}

// ───────────────────────── simulador ─────────────────────────
export function cloneState(s: LState): LState {
  const ptr: Record<string, Ptrs> = {}
  for (const k of Object.keys(s.ptr)) ptr[k] = { sig: s.ptr[k].sig, ant: s.ptr[k].ant }
  return { ptr, vars: { ...s.vars }, order: s.order.slice() }
}

type Eval = { ok: true; val: string | null } | { ok: false; npe: string } | { ok: false; undeclared: string }

/** Evalúa variable(.campo)*: detecta desreferenciar null (NullPointerException). */
export function evalPath(s: LState, p: PathExpr, upto = p.fields.length): Eval {
  if (!Object.prototype.hasOwnProperty.call(s.vars, p.root)) return { ok: false, undeclared: p.root }
  let cur: string | null = s.vars[p.root]
  let txt = p.root
  for (let i = 0; i < upto; i++) {
    if (cur === null) return { ok: false, npe: txt }
    const node: Ptrs | undefined = s.ptr[cur]
    if (!node) return { ok: false, npe: txt }
    cur = node[p.fields[i]]
    txt += '.' + p.fields[i]
  }
  return { ok: true, val: cur }
}

export type ExecResult =
  | { ok: true; state: LState; changed: string }
  | { ok: false; kind: 'npe'; nullExpr: string; target: string }
  | { ok: false; kind: 'undeclared'; name: string }

/**
 * Ejecuta UNA asignación (orden de evaluación de Java: objeto del lado izquierdo, lado derecho, asignación).
 * `changed` = 'var:p' o '<idNodo>.sig' / '<idNodo>.ant' (para resaltar la flecha nueva).
 */
export function exec(s: LState, st: Stmt): ExecResult {
  const { lhs, rhs } = st
  const isVarAssign = lhs.fields.length === 0
  let obj: string | null = null
  if (!isVarAssign) {
    const o = evalPath(s, lhs, lhs.fields.length - 1)
    if (!o.ok) {
      if ('undeclared' in o) return { ok: false, kind: 'undeclared', name: o.undeclared }
      return { ok: false, kind: 'npe', nullExpr: o.npe, target: pathText(lhs) }
    }
    obj = o.val
  }
  let value: string | null = null
  if (rhs) {
    const r = evalPath(s, rhs)
    if (!r.ok) {
      if ('undeclared' in r) return { ok: false, kind: 'undeclared', name: r.undeclared }
      return { ok: false, kind: 'npe', nullExpr: r.npe, target: pathText(rhs) }
    }
    value = r.val
  }
  const out = cloneState(s)
  if (isVarAssign) {
    if (!Object.prototype.hasOwnProperty.call(out.vars, lhs.root)) out.order.push(lhs.root)
    out.vars[lhs.root] = value
    return { ok: true, state: out, changed: 'var:' + lhs.root }
  }
  if (obj === null) {
    return { ok: false, kind: 'npe', nullExpr: pathText({ root: lhs.root, fields: lhs.fields.slice(0, -1) }), target: pathText(lhs) }
  }
  const f = lhs.fields[lhs.fields.length - 1]
  out.ptr[obj][f] = value
  return { ok: true, state: out, changed: `${obj}.${f}` }
}

/** Nodos alcanzables desde alguna variable siguiendo sig (y ant si la lista es doble). */
export function reachable(s: LState, hasAnt: boolean): Set<string> {
  const seen = new Set<string>()
  const stack: string[] = []
  for (const v of s.order) {
    const t = s.vars[v]
    if (t) stack.push(t)
  }
  while (stack.length) {
    const n = stack.pop() as string
    if (seen.has(n) || !s.ptr[n]) continue
    seen.add(n)
    const p = s.ptr[n]
    if (p.sig) stack.push(p.sig)
    if (hasAnt && p.ant) stack.push(p.ant)
  }
  return seen
}

/** Nodos que ya nadie puede alcanzar (el fantasma se los come). */
export function lostNodes(s: LState, ids: string[], hasAnt: boolean): string[] {
  const r = reachable(s, hasAnt)
  return ids.filter((id) => !r.has(id))
}

export interface Walk {
  ids: string[]
  /** null = terminó en null · start = regresó al primero · other = ciclo hacia otro nodo */
  end: 'null' | 'start' | 'other'
  /** a dónde apunta el último cuando hay ciclo */
  loopTo: string | null
}

/** Recorre desde `start` por `field` hasta null o hasta repetir un nodo. */
export function walkFrom(s: LState, start: string | null, field: Field = 'sig'): Walk {
  const ids: string[] = []
  const seen = new Set<string>()
  let cur = start
  while (cur !== null && s.ptr[cur]) {
    if (seen.has(cur)) return { ids, end: cur === start ? 'start' : 'other', loopTo: cur }
    seen.add(cur)
    ids.push(cur)
    cur = s.ptr[cur][field]
  }
  return { ids, end: 'null', loopTo: null }
}

export type CheckResult =
  | { ok: true }
  | { ok: false; reason: 'shape'; walk: Walk }
  | { ok: false; reason: 'values'; got: Val[]; walk: Walk }
  | { ok: false; reason: 'ant'; at: string; want: string | null; walk: Walk }
  | { ok: false; reason: 'tail'; name: string; at: string | null; want: string | null; walk: Walk }

/** Nombres que se tratan como "puntero al último" (ver Cfg.tails). */
const TAIL_NAMES = new Set(['fin', 'final', 'tail', 'ultimo'])

/** Último nodo del recorrido desde head (null si la lista está vacía). */
function lastOf(w: Walk): string | null {
  return w.ids.length ? w.ids[w.ids.length - 1] : null
}

/**
 * COMPROBAR (relink): desde la variable head por sig (circular: una vuelta) === expected; en doble, ant consistente;
 * y las variables de `tails` siguen señalando al último vagón.
 */
export function checkRelink(cfg: Pick<Cfg, 'kind' | 'hasAnt' | 'head' | 'expected' | 'values'> & { tails?: string[] }, s: LState): CheckResult {
  const headNode = Object.prototype.hasOwnProperty.call(s.vars, cfg.head) ? s.vars[cfg.head] : null
  const w = walkFrom(s, headNode, 'sig')
  const shapeOk = cfg.kind === 'circular' ? (w.ids.length === 0 ? w.end === 'null' : w.end === 'start') : w.end === 'null'
  const got = w.ids.map((id) => cfg.values[id])
  if (!shapeOk) return { ok: false, reason: 'shape', walk: w }
  if (!sameSeq(got, cfg.expected)) return { ok: false, reason: 'values', got, walk: w }
  if (cfg.hasAnt) {
    for (let i = 0; i < w.ids.length; i++) {
      const want = i === 0 ? null : w.ids[i - 1]
      if (s.ptr[w.ids[i]].ant !== want) return { ok: false, reason: 'ant', at: w.ids[i], want, walk: w }
    }
  }
  const last = lastOf(w)
  for (const name of cfg.tails ?? []) {
    const at = Object.prototype.hasOwnProperty.call(s.vars, name) ? s.vars[name] : null
    if (at !== last) return { ok: false, reason: 'tail', name, at, want: last, walk: w }
  }
  return { ok: true }
}

/** Huella del estado (para no cobrar dos veces el mismo error y para el solucionador). */
export function stateKey(s: LState, ids: string[]): string {
  const p = ids.map((id) => `${s.ptr[id]?.sig ?? '-'}/${s.ptr[id]?.ant ?? '-'}`).join(',')
  const v = Object.keys(s.vars)
    .sort()
    .map((k) => `${k}=${s.vars[k] ?? '-'}`)
    .join(',')
  return p + '|' + v
}

/** Aplica una secuencia de índices del banco (sin validar pérdidas); null si alguna truena. */
export function applySeq(cfg: Pick<Cfg, 'initial' | 'bank'>, seq: number[]): LState | null {
  let s = cfg.initial
  for (const i of seq) {
    const r = exec(s, cfg.bank[i].stmt)
    if (!r.ok) return null
    s = r.state
  }
  return s
}

export type Solve = { status: 'found'; seq: number[] } | { status: 'none' } | { status: 'unknown' }

/**
 * Búsqueda en anchura (secuencia más corta) de asignaciones del banco, cada una a lo más una vez,
 * sin NullPointerException ni nodos perdidos, que pase COMPROBAR. Acotada por `budget` expansiones.
 */
export function solve(
  cfg: Pick<Cfg, 'kind' | 'hasAnt' | 'head' | 'expected' | 'values' | 'initial' | 'bank' | 'maxSteps' | 'ids' | 'tails'>,
  budget = 40000,
): Solve {
  const n = cfg.bank.length
  if (checkRelink(cfg, cfg.initial).ok) return { status: 'found', seq: [] }
  type Q = { s: LState; used: number; seq: number[] }
  let frontier: Q[] = [{ s: cfg.initial, used: 0, seq: [] }]
  const seen = new Set<string>([stateKey(cfg.initial, cfg.ids) + '#0'])
  let expanded = 0
  for (let depth = 0; depth < cfg.maxSteps && frontier.length; depth++) {
    const next: Q[] = []
    for (const q of frontier) {
      for (let i = 0; i < n; i++) {
        if (q.used & (1 << i)) continue
        if (++expanded > budget) return { status: 'unknown' }
        const r = exec(q.s, cfg.bank[i].stmt)
        if (!r.ok) continue
        if (lostNodes(r.state, cfg.ids, cfg.hasAnt).length) continue
        const used = q.used | (1 << i)
        const seq = [...q.seq, i]
        if (checkRelink(cfg, r.state).ok) return { status: 'found', seq }
        const k = stateKey(r.state, cfg.ids) + '#' + used
        if (seen.has(k)) continue
        seen.add(k)
        next.push({ s: r.state, used, seq })
      }
    }
    frontier = next
  }
  return { status: 'none' }
}

// ───────────────────────── normalización / validación ─────────────────────────
const fail = (error: string) => ({ error }) as const

/** Valida los datos de un ejercicio. Devuelve la configuración lista o un mensaje para el autor. */
export function normalize(raw: unknown): { cfg: Cfg } | { error: string } {
  if (!raw || typeof raw !== 'object') return fail('Faltan los datos del ejercicio.')
  const d = raw as Partial<ListSimData>
  const mode = d.mode
  if (mode !== 'relink' && mode !== 'traverse') return fail('mode debe ser "relink" o "traverse".')
  const kind: Kind = d.kind ?? 'simple'
  if (kind !== 'simple' && kind !== 'doble' && kind !== 'circular') return fail('kind debe ser "simple", "doble" o "circular".')
  const hasAnt = kind === 'doble'

  // nodos
  if (!Array.isArray(d.nodes) || d.nodes.length === 0) return fail('Faltan los nodos (nodes).')
  if (d.nodes.length > MAX_NODES) return fail(`Máximo ${MAX_NODES} nodos.`)
  const ids: string[] = []
  const values: Record<string, Val> = {}
  for (const n of d.nodes) {
    if (!n || typeof n !== 'object' || typeof n.id !== 'string' || !n.id.trim()) return fail('Cada nodo necesita un id de texto.')
    if (values[n.id] !== undefined) return fail(`El id de nodo "${n.id}" está repetido.`)
    if (!isVal(n.value)) return fail(`El nodo "${n.id}" necesita un value (número o texto).`)
    ids.push(n.id)
    values[n.id] = n.value
  }
  const ptr: Record<string, Ptrs> = {}
  for (const n of d.nodes) {
    const sig = n.sig === undefined ? null : n.sig
    if (sig !== null && (typeof sig !== 'string' || values[sig] === undefined)) return fail(`El sig del nodo "${n.id}" apunta a un nodo que no existe.`)
    let ant: string | null = null
    if (hasAnt) {
      const a = n.ant === undefined ? null : n.ant
      if (a !== null && (typeof a !== 'string' || values[a] === undefined)) return fail(`El ant del nodo "${n.id}" apunta a un nodo que no existe.`)
      ant = a
    }
    ptr[n.id] = { sig, ant }
  }

  // variables
  if (!d.vars || typeof d.vars !== 'object' || Array.isArray(d.vars)) return fail('Faltan las variables (vars).')
  const vars: Record<string, string | null> = {}
  const order: string[] = []
  for (const [k, v] of Object.entries(d.vars)) {
    if (!isVarName(k)) return fail(`"${k}" no es un nombre de variable válido.`)
    if (v !== null && (typeof v !== 'string' || values[v] === undefined)) return fail(`La variable "${k}" apunta a un nodo que no existe.`)
    vars[k] = v
    order.push(k)
  }
  if (order.length === 0) return fail('Se necesita al menos una variable (p.ej. inicio).')
  const initial: LState = { ptr, vars, order }

  // todos los nodos deben verse desde alguna variable
  const lost = lostNodes(initial, ids, hasAnt)
  if (lost.length) {
    return fail(`Ninguna variable llega a: ${lost.map((id) => show(values[id])).join(', ')}. Apunta una variable o una flecha a ese nodo.`)
  }
  // sin ciclos en listas que no son circulares
  if (kind !== 'circular') {
    for (const id of ids) {
      if (walkFrom(initial, id, 'sig').end !== 'null') return fail('La lista tiene un ciclo por sig; usa kind "circular" si así debe ser.')
    }
  }

  const head = typeof d.head === 'string' && d.head.trim() ? d.head.trim() : 'inicio'
  const headDeclared = Object.prototype.hasOwnProperty.call(vars, head)

  const base: Cfg = {
    mode,
    kind,
    hasAnt,
    ids,
    values,
    initial,
    head,
    op: typeof d.op === 'string' ? d.op : '',
    bank: [],
    maxSteps: 0,
    expected: [],
    tails: [],
    solution: null,
    startLabel: '',
    startNode: null,
    dir: 'sig',
    path: [],
    endsAt: 'null',
    layoutHead: null,
  }

  if (mode === 'relink') {
    if (!headDeclared) return fail(`La variable head "${head}" no está en vars.`)
    if (!Array.isArray(d.bank) || d.bank.length === 0) return fail('El modo relink necesita bank (asignaciones).')
    if (d.bank.length > MAX_BANK) return fail(`Máximo ${MAX_BANK} asignaciones en bank.`)
    const bank: BankItem[] = []
    for (const t of d.bank) {
      if (typeof t !== 'string') return fail('Cada asignación de bank debe ser texto.')
      const st = parseStmt(t)
      if ('error' in st) return fail(`La asignación «${t}» no se entiende: ${st.error}.`)
      bank.push({ text: t.trim(), stmt: st })
    }
    const declared = new Set(order)
    for (const b of bank) if (b.stmt.lhs.fields.length === 0) declared.add(b.stmt.lhs.root)
    for (const b of bank) {
      for (const p of [b.stmt.lhs, b.stmt.rhs]) {
        if (!p) continue
        if (!declared.has(p.root)) return fail(`La asignación «${b.text}» usa la variable "${p.root}", que no existe.`)
        if (!hasAnt && p.fields.includes('ant')) return fail(`La asignación «${b.text}» usa ant, pero la lista no es doble.`)
      }
    }
    if (!Array.isArray(d.expected) || !d.expected.every(isVal)) return fail('El modo relink necesita expected (valores desde head).')
    const ms = Number.isInteger(d.maxSteps) ? (d.maxSteps as number) : bank.length
    // fin / final / tail / ultimo: si al inicio señalan al último vagón, deben seguir así al COMPROBAR
    const last0 = lastOf(walkFrom(initial, vars[head], 'sig'))
    const tails = order.filter((v) => v !== head && TAIL_NAMES.has(v) && vars[v] === last0)
    const cfg: Cfg = {
      ...base,
      op: base.op,
      bank,
      maxSteps: Math.max(1, Math.min(bank.length, ms)),
      expected: d.expected.slice(),
      tails,
    }
    if (checkRelink(cfg, initial).ok) return fail('La lista ya está como pide expected antes de mover nada.')
    const sol = solve(cfg)
    if (sol.status === 'none') {
      return fail(
        'Con las asignaciones del banco (y maxSteps) no se llega a expected sin perder nodos ni tronar con null. ' +
          'Si la operación ELIMINA un nodo, deja una variable (p.ej. q) apuntándole: si nadie le apunta, el fantasma se lo come y cuenta como error.',
      )
    }
    cfg.solution = sol.status === 'found' ? sol.seq : null
    return { cfg }
  }

  // traverse
  const dir: Field = d.dir === 'ant' ? 'ant' : 'sig'
  if (d.dir !== undefined && d.dir !== 'sig' && d.dir !== 'ant') return fail('dir debe ser "sig" o "ant".')
  if (dir === 'ant' && !hasAnt) return fail('Recorrer por ant solo se puede en una lista doble.')
  const startRaw = typeof d.start === 'string' && d.start.trim() ? d.start.trim() : headDeclared ? head : ''
  if (!startRaw) return fail('El modo traverse necesita start (variable o id de nodo).')
  let startNode: string | null
  if (Object.prototype.hasOwnProperty.call(vars, startRaw)) startNode = vars[startRaw]
  else if (values[startRaw] !== undefined) startNode = startRaw
  else return fail(`start "${startRaw}" no es una variable ni un id de nodo.`)
  if (startNode === null) return fail(`start "${startRaw}" apunta a null: no hay nada que recorrer.`)
  const w = walkFrom(initial, startNode, dir)
  let endsAt: 'null' | 'start'
  if (kind === 'circular') {
    if (w.end !== 'start') return fail('En la lista circular el recorrido debe regresar al nodo inicial.')
    endsAt = 'start'
  } else {
    if (w.end !== 'null') return fail(`El recorrido por ${dir} no termina en null.`)
    endsAt = 'null'
  }
  // fila principal del dibujo: desde head; si no hay, desde un nodo sin nadie que le apunte por sig
  let layoutHead: string | null = headDeclared ? vars[head] : null
  if (!headDeclared) {
    const incoming = new Set<string>()
    for (const id of ids) if (ptr[id].sig) incoming.add(ptr[id].sig as string)
    layoutHead = ids.find((id) => !incoming.has(id)) ?? startNode
  }
  return {
    cfg: {
      ...base,
      startLabel: startRaw,
      startNode,
      dir,
      path: w.ids,
      endsAt,
      layoutHead,
    },
  }
}

// ───────────────────────── textos ─────────────────────────
/** "3 → 7 → 5 → null" para mensajes y solución */
export function chainText(vals: Val[], tail: string): string {
  return [...vals.map((v) => show(v)), tail].filter((x) => x !== '').join(' → ')
}

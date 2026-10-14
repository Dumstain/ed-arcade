/**
 * Lógica PURA de hash-sim (sin React ni DOM): validación defensiva de los datos, función hash,
 * simulación de inserción (encadenamiento / prueba lineal), plan de búsqueda y textos de pista.
 * Se puede probar con node (type stripping): no importa nada en tiempo de ejecución.
 */
import type { HashSimData, Val } from '../schemas'

export type Mode = 'insert' | 'search'
export type Strategy = 'chaining' | 'linear'
export type HashKind = 'mod' | 'initial'
/** Contenido por casillero: encadenamiento = la cadena (en orden); prueba lineal = [] o [clave]. */
export type Table = Val[][]

/** El esquema pide 5..11; se tolera 3..12 para no romper contenido ligeramente fuera de rango. */
export const MIN_SIZE = 3
export const MAX_SIZE = 12
/** Tope de claves entre `initial` y `keys` (por legibilidad en pantalla). */
export const MAX_KEYS = 24

export interface Cfg {
  mode: Mode
  size: number
  strategy: Strategy
  hash: HashKind
  /** insert: las que el alumno acomoda · search: las que se insertan solas */
  keys: Val[]
  /** Contenido inicial, SIEMPRE de longitud `size` */
  initial: Table
  target?: Val
  showMath: boolean
}

export type Checked = { ok: true; cfg: Cfg; warnings: string[] } | { ok: false; errors: string[] }

export const keyStr = (k: Val): string => String(k)
export const sameKey = (a: Val, b: Val): boolean => String(a) === String(b)
export const cloneTable = (t: Table): Table => t.map((c) => c.slice())

/** Cómo nombrar una clave en una frase: "el **23**" (números) · "**Rosa**" (palabras). */
export function who(k: Val, hash: HashKind): string {
  return hash === 'mod' ? `el **${keyStr(k)}**` : `**${keyStr(k)}**`
}
export const capFirst = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

// ───────────────────────── Función hash ─────────────────────────

/** Letra inicial normalizada (sin acentos; Ñ cuenta como N), o null si la palabra no empieza con letra. */
export function firstLetter(word: Val): string | null {
  const s = String(word).trim()
  if (!s) return null
  const c = s.charAt(0).normalize('NFD').charAt(0).toUpperCase()
  return c >= 'A' && c <= 'Z' ? c : null
}

/** Posición de la letra inicial: A=0, B=1, … Z=25. */
export function letterIndex(word: Val): number | null {
  const c = firstLetter(word)
  return c === null ? null : c.charCodeAt(0) - 65
}

/** Número que entra al "%": la clave misma (mod) o la posición de su letra inicial (initial). */
export function baseNumber(k: Val, hash: HashKind): number | null {
  if (hash === 'initial') return letterIndex(k)
  if (typeof k === 'number') return Number.isInteger(k) && k >= 0 ? k : null
  const s = String(k).trim()
  return /^\d+$/.test(s) ? Number(s) : null
}

export interface HashMath {
  base: number
  size: number
  result: number
  /** "23 % 7" */
  expr: string
  /** "h(23) = 23 % 7 = 2"  ·  "h(Pedro) = 'P' → 15 % 7 = 1" */
  full: string
  /** solo hash 'initial': "La letra P vale 15 (A=0, B=1, …)" */
  note?: string
}

export function describeHash(key: Val, hash: HashKind, size: number): HashMath | null {
  const base = baseNumber(key, hash)
  if (base === null || size < 1) return null
  const result = base % size
  const expr = `${base} % ${size}`
  if (hash === 'initial') {
    const letter = firstLetter(key) ?? '?'
    return {
      base,
      size,
      result,
      expr,
      full: `h(${keyStr(key)}) = '${letter}' → ${expr} = ${result}`,
      note: `La letra ${letter} vale ${base} (A=0, B=1, C=2, …)`,
    }
  }
  return { base, size, result, expr, full: `h(${keyStr(key)}) = ${expr} = ${result}` }
}

/** Casillero "natural" de la clave: h(k). (Con datos ya validados nunca es null.) */
export function homeOf(key: Val, hash: HashKind, size: number): number {
  return describeHash(key, hash, size)?.result ?? 0
}

// ───────────────────────── Inserción ─────────────────────────

export interface Placement {
  key: Val
  /** h(k) */
  home: number
  /** casillero donde termina la clave (chaining = home) */
  slot: number
  /** casilleros revisados en orden: linear = home, home+1, …, slot · chaining = [home] */
  probes: number[]
  /** posición dentro de la cadena (chaining) · 0 en linear */
  pos: number
  collided: boolean
  /** claves que estorbaron: chaining = la cadena previa · linear = las de los casilleros ocupados recorridos */
  blockers: Val[]
}

/** Dónde queda `key`. null = prueba lineal con la tabla llena. No modifica la tabla. */
export function placeKey(table: Table, key: Val, size: number, strategy: Strategy, hash: HashKind): Placement | null {
  const home = homeOf(key, hash, size)
  if (strategy === 'chaining') {
    const chain = table[home] ?? []
    return { key, home, slot: home, probes: [home], pos: chain.length, collided: chain.length > 0, blockers: chain.slice() }
  }
  const probes: number[] = []
  const blockers: Val[] = []
  for (let i = 0; i < size; i++) {
    const b = (home + i) % size
    probes.push(b)
    const cell = table[b] ?? []
    if (cell.length === 0) return { key, home, slot: b, probes, pos: 0, collided: i > 0, blockers }
    blockers.push(cell[0])
  }
  return null
}

export function applyPlacement(table: Table, p: Placement): Table {
  const next = cloneTable(table)
  next[p.slot].push(p.key)
  return next
}

export interface Built {
  placements: Placement[]
  /** tables[i] = tabla después de acomodar i claves (tables[0] = inicial) */
  tables: Table[]
  final: Table
}

export function buildTables(cfg: Pick<Cfg, 'size' | 'strategy' | 'hash' | 'keys' | 'initial'>): Built {
  let t = cloneTable(cfg.initial)
  const placements: Placement[] = []
  const tables: Table[] = [t]
  for (const key of cfg.keys) {
    const p = placeKey(t, key, cfg.size, cfg.strategy, cfg.hash)
    if (!p) break
    placements.push(p)
    t = applyPlacement(t, p)
    tables.push(t)
  }
  return { placements, tables, final: t }
}

// ───────────────────────── Búsqueda ─────────────────────────

export interface Probe {
  bucket: number
  /** posición dentro de la cadena (chaining) · 0 en linear */
  pos: number
  key: Val
  hit: boolean
}

export interface SearchPlan {
  home: number
  /** claves que se comparan, EN ORDEN (cada una cuenta como 1 comparación) */
  probes: Probe[]
  found: boolean
  /** linear: casillero vacío donde se detiene la búsqueda (null si encontró o si recorrió toda la tabla) */
  emptyAt: number | null
}

export function planSearch(table: Table, target: Val, size: number, strategy: Strategy, hash: HashKind): SearchPlan {
  const home = homeOf(target, hash, size)
  const probes: Probe[] = []
  if (strategy === 'chaining') {
    const chain = table[home] ?? []
    for (let i = 0; i < chain.length; i++) {
      const hit = sameKey(chain[i], target)
      probes.push({ bucket: home, pos: i, key: chain[i], hit })
      if (hit) return { home, probes, found: true, emptyAt: null }
    }
    return { home, probes, found: false, emptyAt: null }
  }
  for (let i = 0; i < size; i++) {
    const b = (home + i) % size
    const cell = table[b] ?? []
    if (cell.length === 0) return { home, probes, found: false, emptyAt: b }
    const hit = sameKey(cell[0], target)
    probes.push({ bucket: b, pos: 0, key: cell[0], hit })
    if (hit) return { home, probes, found: true, emptyAt: null }
  }
  return { home, probes, found: false, emptyAt: null }
}

// ───────────────────────── Textos (con **marcado**) ─────────────────────────

const join = (vals: Val[]): string => vals.map(keyStr).join(', ')

/** Una línea por clave: la cuenta y dónde termina (para la respuesta y para el mensaje de acierto). */
export function placementText(p: Placement, cfg: Pick<Cfg, 'size' | 'strategy' | 'hash'>): string {
  const m = describeHash(p.key, cfg.hash, cfg.size)
  const head = `**${m ? m.full : `h(${keyStr(p.key)}) = ${p.home}`}**`
  if (cfg.strategy === 'chaining') {
    return p.collided
      ? `${head}. ¡**Colisión**! El casillero ${p.slot} ya tenía ${join(p.blockers)}: la clave se cuelga **al final** de la fila.`
      : `${head}. El casillero **${p.slot}** estaba vacío.`
  }
  if (!p.collided) return `${head}. El casillero **${p.slot}** estaba libre.`
  const trail = p.probes
    .map((b, i) => (i < p.probes.length - 1 ? `${b} (ocupado por ${keyStr(p.blockers[i])})` : `${b} (libre)`))
    .join(' → ')
  return `${head}. ¡**Colisión**! Prueba ${trail}: queda en el **${p.slot}**.`
}

/** Pista tras tocar un casillero equivocado en modo insert. */
export function insertHint(
  table: Table,
  p: Placement,
  tapped: number,
  cfg: Pick<Cfg, 'size' | 'strategy' | 'hash'>,
): string {
  const m = describeHash(p.key, cfg.hash, cfg.size)
  const math = m ? `**${m.full}**` : `h(${keyStr(p.key)}) = ${p.home}`
  if (cfg.strategy === 'chaining') {
    return `Pista: ${math} → su casillero es el **${p.home}**.`
  }
  const cell = table[tapped] ?? []
  if (cell.length > 0) {
    if (tapped === p.home) {
      return `¡**Colisión**! El casillero ${tapped} ya tiene ${who(cell[0], cfg.hash)}. Con prueba lineal se pasa al **siguiente** casillero.`
    }
    return `El casillero ${tapped} está ocupado por ${who(cell[0], cfg.hash)}. Pista: ${math}; usa el **primero libre** desde ahí.`
  }
  return `Pista: ${math}. Empieza en el casillero **${p.home}** y usa el **primero libre**.`
}

// ───────────────────────── Validación ─────────────────────────

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isVal = (v: unknown): v is Val =>
  (typeof v === 'number' && Number.isFinite(v)) || (typeof v === 'string' && v.trim() !== '')

function keyProblem(k: unknown, hash: HashKind, where: string): string | null {
  if (!isVal(k)) return `${where}: hay un valor vacío o que no es número ni texto.`
  if (baseNumber(k, hash) === null) {
    return hash === 'mod'
      ? `${where}: la clave "${String(k)}" no es un entero mayor o igual a 0 (hash "mod" usa números).`
      : `${where}: la clave "${String(k)}" no empieza con letra (hash "initial" usa palabras).`
  }
  return null
}

/**
 * Valida y normaliza los datos. errors = no se puede jugar (se muestra BadData);
 * warnings = jugable pero raro (p.ej. una clave en un casillero que no le toca).
 */
export function checkData(raw: unknown): Checked {
  if (!isRecord(raw)) return { ok: false, errors: ['Faltan los datos del ejercicio.'] }
  const errors: string[] = []
  const warnings: string[] = []

  const mode = raw.mode
  const strategy = raw.strategy
  const hash = raw.hash
  const size = raw.size
  if (mode !== 'insert' && mode !== 'search') errors.push('mode debe ser "insert" o "search".')
  if (strategy !== 'chaining' && strategy !== 'linear') errors.push('strategy debe ser "chaining" o "linear".')
  if (hash !== 'mod' && hash !== 'initial') errors.push('hash debe ser "mod" o "initial".')
  if (typeof size !== 'number' || !Number.isInteger(size) || size < MIN_SIZE || size > MAX_SIZE) {
    errors.push(`size debe ser un entero entre ${MIN_SIZE} y ${MAX_SIZE} (lo recomendado: 5 a 11).`)
  }
  if (errors.length) return { ok: false, errors }
  const m = mode as Mode
  const st = strategy as Strategy
  const hk = hash as HashKind
  const n = size as number

  // keys
  const keysRaw = raw.keys === undefined ? [] : raw.keys
  const keys: Val[] = []
  if (!Array.isArray(keysRaw)) errors.push('keys debe ser una lista.')
  else {
    keysRaw.forEach((k, i) => {
      const p = keyProblem(k, hk, `keys[${i}]`)
      if (p) errors.push(p)
      else keys.push(k as Val)
    })
  }
  if (m === 'insert' && Array.isArray(keysRaw) && keysRaw.length < 1) errors.push('En modo insert hace falta al menos una clave en keys.')

  // initial
  const initial: Table = Array.from({ length: n }, () => [])
  if (raw.initial !== undefined) {
    if (!Array.isArray(raw.initial)) errors.push('initial debe ser una lista de listas (una por casillero).')
    else if (raw.initial.length > n) errors.push(`initial tiene ${raw.initial.length} casilleros pero size es ${n}.`)
    else {
      raw.initial.forEach((cell, b) => {
        if (!Array.isArray(cell)) {
          errors.push(`initial[${b}] debe ser una lista (vacía o con claves).`)
          return
        }
        if (st === 'linear' && cell.length > 1) errors.push(`initial[${b}]: en prueba lineal cada casillero guarda a lo más una clave.`)
        cell.forEach((k, j) => {
          const p = keyProblem(k, hk, `initial[${b}][${j}]`)
          if (p) errors.push(p)
          else initial[b].push(k as Val)
        })
      })
    }
  }

  // target
  let target: Val | undefined
  if (m === 'search') {
    const p = raw.target === undefined ? 'En modo search hace falta target.' : keyProblem(raw.target, hk, 'target')
    if (p) errors.push(p)
    else target = raw.target as Val
  }
  if (errors.length) return { ok: false, errors: errors.slice(0, 4) }

  // capacidad
  const stored = initial.reduce((a, c) => a + c.length, 0)
  const total = stored + keys.length
  if (total > MAX_KEYS) errors.push(`Hay ${total} claves (máximo ${MAX_KEYS}).`)
  if (st === 'linear' && total > n) errors.push(`Prueba lineal: ${total} claves no caben en ${n} casilleros.`)
  if (errors.length) return { ok: false, errors }

  // advertencias de consistencia del contenido inicial
  initial.forEach((cell, b) => {
    cell.forEach((k) => {
      const home = homeOf(k, hk, n)
      if (st === 'chaining') {
        if (home !== b) warnings.push(`initial: la clave ${keyStr(k)} está en el casillero ${b} pero h(${keyStr(k)}) = ${home}.`)
        return
      }
      // linear: de h(k) a b todos los casilleros deben estar ocupados
      for (let i = 0; i < n; i++) {
        const c = (home + i) % n
        if (c === b) return
        if (initial[c].length === 0) break
      }
      warnings.push(`initial: la clave ${keyStr(k)} está en el casillero ${b}, pero la prueba lineal desde h(${keyStr(k)}) = ${home} no llega ahí.`)
    })
  })

  const cfg: Cfg = { mode: m, size: n, strategy: st, hash: hk, keys, initial, target, showMath: raw.showMath !== false }
  return { ok: true, cfg, warnings }
}

/** Para el contenido: lista de problemas de unos datos (errores + advertencias). */
export function problemsOf(data: HashSimData): { errors: string[]; warnings: string[] } {
  const r = checkData(data)
  return r.ok ? { errors: [], warnings: r.warnings } : { errors: r.errors, warnings: [] }
}

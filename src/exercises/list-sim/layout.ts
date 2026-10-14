/**
 * Distribución PURA del tablero de list-sim (sin DOM): el tren va en UNA fila (desde la variable head
 * por sig; si no cabe, el tablero se desliza por dentro), los nodos "sueltos" van en filas de abajo
 * (debajo del lugar donde se engancharían), las tarjetas de variables encima de su nodo y las flechas
 * son ortogonales: viajan por los pasillos entre columnas y los canales bajo cada fila (nunca
 * atraviesan un nodo).
 *   - sig: sale del campo sig (derecha, arriba en doble) → entra por la izquierda del siguiente.
 *   - ant (doble): sale del campo ant (izquierda, abajo) → entra por la derecha del anterior.
 *   - flecha "lejana" (ciclos, sueltos, regresos): entra al nodo destino por ABAJO.
 */
import type { Val } from '../schemas'
import { show, walkFrom, type Field, type Kind, type LState } from './logic'

export const NULL_L = '#nullL'
export const NULL_R = '#nullR'
/** borde del vagón (debe coincidir con list-sim.css) */
export const BORDER = 3

export interface Geo {
  hasAnt: boolean
  /** ancho de un campo de flecha (sig / ant) */
  PF: number
  /** ancho del campo dato */
  DF: number
  /** ancho y alto del vagón */
  NW: number
  NH: number
  /** pasillo entre columnas */
  GX: number
  /** márgenes laterales (carriles de las flechas que dan la vuelta) */
  ML: number
  MR: number
  /** canal bajo cada fila */
  CH: number
  CARD_H: number
  CARD_GAP: number
  /** largo de la flecha de la tarjeta al nodo */
  TA: number
  NULLW: number
  TOP: number
  /** banda con la etiqueta de los nodos sueltos */
  SIDE: number
  /** altura (desde el borde superior del vagón) de los carriles sig / ant */
  sigY: number
  antY: number
}

export function geometry(hasAnt: boolean, values: Val[]): Geo {
  const maxLen = Math.min(8, Math.max(1, ...values.map((v) => show(v).length)))
  const DF = Math.max(40, Math.min(100, 14 + 12 * maxLen))
  const PF = 20
  return {
    hasAnt,
    PF,
    DF,
    NW: DF + PF * (hasAnt ? 2 : 1),
    NH: hasAnt ? 56 : 52,
    GX: 30,
    ML: 22,
    MR: 22,
    CH: 28,
    CARD_H: 24,
    CARD_GAP: 3,
    TA: 12,
    NULLW: 50,
    TOP: 6,
    SIDE: 26,
    sigY: hasAnt ? 17 : 26,
    antY: hasAnt ? 39 : 26,
  }
}

export interface Box { x: number; y: number; w: number; h: number; row: number; col: number }
export interface Arrow {
  /** 'n1.sig' · 'n1.ant' · 'tag:n1' */
  key: string
  kind: Field | 'tag'
  d: string
  head: string
  color: number
  /** destino ('#nullR', id) — para resaltar */
  to: string
}
export interface Card { name: string; x: number; y: number; w: number; color: number; target: string }

export interface Layout {
  /** ancho del lienzo (>= ancho visible) */
  W: number
  H: number
  cols: number
  geo: Geo
  boxes: Record<string, Box>
  nullL: Box | null
  nullR: Box | null
  /** campos que valen null sin flecha: se dibujan tachados ('n9.sig') */
  slashes: Set<string>
  arrows: Arrow[]
  cards: Card[]
  sideLabelY: number | null
  mainIds: string[]
  mainEnd: 'null' | 'start' | 'other'
  /** nodos fuera de la fila principal */
  loose: Set<string>
}

export interface LayoutInput {
  state: LState
  ids: string[]
  kind: Kind
  headNode: string | null
  /** ancho visible del tablero; si el tren es más ancho, Layout.W lo excede (scroll interno) */
  width: number
  geo: Geo
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const rnd = (v: number) => Math.round(v)

/** Línea ortogonal + punta de flecha (la línea se acorta para no atravesar la punta). */
export function arrowGeom(pts: [number, number][]): { d: string; head: string } {
  const n = pts.length
  const [x2, y2] = pts[n - 1]
  const [x1, y1] = pts[n - 2]
  const dx = Math.sign(x2 - x1)
  const dy = Math.sign(y2 - y1)
  const L = 8
  const HW = 5
  const bx = x2 - dx * L
  const by = y2 - dy * L
  const line: [number, number][] = [...pts.slice(0, -1), [bx, by]]
  const d = 'M' + line.map(([x, y]) => `${rnd(x)} ${rnd(y)}`).join(' L')
  const px = -dy
  const py = dx
  const head = `${rnd(x2)},${rnd(y2)} ${rnd(bx + px * HW)},${rnd(by + py * HW)} ${rnd(bx - px * HW)},${rnd(by - py * HW)}`
  return { d, head }
}

export function computeLayout(inp: LayoutInput): Layout {
  const { state, ids, kind, headNode, geo } = inp
  const hasAnt = geo.hasAnt
  const avail = Math.max(220, Math.floor(inp.width || 320))
  const colorOf = (v: string) => Math.max(0, state.order.indexOf(v)) % 4

  // ── fila principal: desde head por sig ──
  const main = walkFrom(state, headNode, 'sig')
  const anyNullVar = state.order.some((v) => state.vars[v] === null)
  const flow: string[] = []
  if (hasAnt && main.ids.length) flow.push(NULL_L)
  flow.push(...main.ids)
  if (kind !== 'circular' || main.ids.length === 0 || main.end === 'null' || anyNullVar) flow.push(NULL_R)

  // Una sola fila (el tren no se parte): si no cabe, el tablero se desliza por dentro.
  const pos: Record<string, { row: number; col: number }> = {}
  flow.forEach((k, i) => {
    pos[k] = { row: 0, col: i }
  })
  let cols = Math.max(1, flow.length)
  const mainRows = 1

  // ── nodos sueltos (fuera de la fila principal): cadenas por sig, debajo ──
  const inMain = new Set(main.ids)
  const rest = ids.filter((id) => !inMain.has(id))
  const restSet = new Set(rest)
  const hasPred = new Set<string>()
  for (const id of rest) {
    const s = state.ptr[id].sig
    if (s && restSet.has(s) && s !== id) hasPred.add(s)
  }
  const placed = new Set<string>()
  const chains: string[][] = []
  const take = (start: string) => {
    const ch: string[] = []
    let cur: string | null = start
    while (cur && restSet.has(cur) && !placed.has(cur)) {
      ch.push(cur)
      placed.add(cur)
      cur = state.ptr[cur].sig
    }
    return ch
  }
  for (const id of rest) if (!hasPred.has(id) && !placed.has(id)) chains.push(take(id))
  for (const id of rest) if (!placed.has(id)) chains.push(take(id))

  // columnas que solo tienen un null: no conviene poner ahí un vagón suelto (se ensancharían)
  const firstNodeCol = hasAnt && main.ids.length ? 1 : 0
  let r = mainRows
  let c = 0
  for (const ch of chains) {
    // se acomoda debajo del lugar donde se engancharía
    const last = ch[ch.length - 1]
    const t = state.ptr[last].sig
    let want = firstNodeCol
    if (t && inMain.has(t)) want = pos[t].col - ch.length
    else if (hasAnt) {
      const a = state.ptr[ch[0]].ant
      if (a && inMain.has(a)) want = pos[a].col + 1
    }
    want = Math.max(firstNodeCol, want)
    let start = Math.max(want, c)
    if (c > 0 && start + ch.length > cols) {
      r++
      c = 0
      start = want
    }
    ch.forEach((id, i) => {
      pos[id] = { row: r, col: start + i }
    })
    cols = Math.max(cols, start + ch.length)
    c = start + ch.length + 1
  }
  let totalRows = mainRows
  for (const k of Object.keys(pos)) totalRows = Math.max(totalRows, pos[k].row + 1)
  const hasSide = rest.length > 0

  // ── pilas de tarjetas (variables) por destino ──
  const stacks: Record<string, string[]> = {}
  for (const v of state.order) {
    const t = state.vars[v]
    const k = t === null ? NULL_R : t
    if (!pos[k]) continue
    ;(stacks[k] ??= []).push(v)
  }
  const rowStack: number[] = Array.from({ length: totalRows }, () => 0)
  for (const [k, vs] of Object.entries(stacks)) rowStack[pos[k].row] = Math.max(rowStack[pos[k].row], vs.length)

  // ── alturas ──
  const nodeTop: number[] = []
  const chanTop: number[] = []
  let y = geo.TOP
  let sideLabelY: number | null = null
  for (let row = 0; row < totalRows; row++) {
    if (row === mainRows && hasSide) {
      sideLabelY = y + 2
      y += geo.SIDE
    }
    const k = rowStack[row]
    const vz = k > 0 ? k * geo.CARD_H + (k - 1) * geo.CARD_GAP + geo.TA : 10
    nodeTop[row] = y + vz
    chanTop[row] = nodeTop[row] + geo.NH
    y = chanTop[row] + geo.CH
  }
  const H = y + 2

  // ── x: columnas de ancho variable (las de null son angostas) ──
  const colW: number[] = Array.from({ length: cols }, () => 0)
  for (const [k, p] of Object.entries(pos)) {
    const w = k === NULL_L || k === NULL_R ? geo.NULLW : geo.NW
    colW[p.col] = Math.max(colW[p.col], w)
  }
  for (let i = 0; i < cols; i++) if (colW[i] === 0) colW[i] = geo.NULLW
  const gridW = colW.reduce((a, b) => a + b, 0) + (cols - 1) * geo.GX
  const natural = geo.ML + gridW + geo.MR
  const W = Math.max(avail, natural)
  const offX = Math.max(0, Math.floor((avail - natural) / 2))
  const colLeft: number[] = []
  {
    let x = offX + geo.ML
    for (let i = 0; i < cols; i++) {
      colLeft[i] = x
      x += colW[i] + geo.GX
    }
  }
  const colX = (col: number) => colLeft[col]
  const colR = (col: number) => colLeft[col] + colW[col]

  const boxOf = (k: string): Box => {
    const p = pos[k]
    const x0 = colX(p.col)
    const y0 = nodeTop[p.row]
    if (k === NULL_L) return { x: colR(p.col) - geo.NULLW, y: y0, w: geo.NULLW, h: geo.NH, ...p }
    if (k === NULL_R) return { x: x0, y: y0, w: geo.NULLW, h: geo.NH, ...p }
    return { x: x0, y: y0, w: geo.NW, h: geo.NH, ...p }
  }
  const boxes: Record<string, Box> = {}
  for (const id of ids) boxes[id] = boxOf(id)
  const nullL = pos[NULL_L] ? boxOf(NULL_L) : null
  const nullR = pos[NULL_R] ? boxOf(NULL_R) : null

  // ── flechas de los nodos ──
  const arrows: Arrow[] = []
  const slashes = new Set<string>()
  const corr = new Map<string, number>()
  const chan = new Map<number, number>()
  const entry = new Map<string, number>()
  const bump = <K>(m: Map<K, number>, k: K) => {
    const n = m.get(k) ?? 0
    m.set(k, n + 1)
    return n
  }
  const mainFirst = main.ids[0]
  const mainLast = main.ids[main.ids.length - 1]

  const route = (src: string, f: Field, S: Box, T: Box, to: string) => {
    const pts: [number, number][] = []
    if (f === 'sig') {
      const sy = S.y + geo.sigY
      const sx = S.x + S.w - BORDER - geo.PF / 2
      if (T.row === S.row && T.col === S.col + 1) {
        pts.push([sx, sy], [T.x, sy])
      } else {
        const k = bump(corr, `b${S.col + 1}`)
        const cx = colR(S.col) + 6 + 6 * (k % 3)
        const j = bump(chan, T.row)
        const cy = chanTop[T.row] + 17 + 6 * (j % 2)
        const m = bump(entry, to)
        const ex = T.x + 9 + 8 * (m % 3)
        pts.push([sx, sy], [cx, sy], [cx, cy], [ex, cy], [ex, T.y + T.h])
      }
    } else {
      const sy = S.y + geo.antY
      const sx = S.x + BORDER + geo.PF / 2
      if (T.row === S.row && T.col === S.col - 1) {
        pts.push([sx, sy], [T.x + T.w, sy])
      } else {
        const k = bump(corr, `b${S.col}`)
        const cx = colX(S.col) - 6 - 6 * (k % 3)
        const j = bump(chan, T.row)
        const cy = chanTop[T.row] + 17 + 6 * (j % 2)
        const m = bump(entry, to)
        const ex = T.x + T.w - 9 - 8 * (m % 3)
        pts.push([sx, sy], [cx, sy], [cx, cy], [ex, cy], [ex, T.y + T.h])
      }
    }
    const g = arrowGeom(pts)
    arrows.push({ key: `${src}.${f}`, kind: f, d: g.d, head: g.head, color: 0, to })
  }

  const fields: Field[] = hasAnt ? ['sig', 'ant'] : ['sig']
  for (const id of ids) {
    const S = boxes[id]
    for (const f of fields) {
      const t = state.ptr[id][f]
      if (t === null) {
        if (f === 'sig' && id === mainLast && main.end === 'null' && nullR) route(id, f, S, nullR, NULL_R)
        else if (f === 'ant' && id === mainFirst && nullL) route(id, f, S, nullL, NULL_L)
        else slashes.add(`${id}.${f}`)
        continue
      }
      route(id, f, S, boxes[t], t)
    }
  }

  // ── tarjetas de variables (encima de su nodo) + flechita hacia abajo ──
  const cards: Card[] = []
  for (const [k, vs] of Object.entries(stacks)) {
    const B = k === NULL_R ? (nullR as Box) : boxes[k]
    const cx = B.x + B.w / 2
    const n = vs.length
    vs.forEach((v, i) => {
      const w = clamp(v.length * 10 + 16, 34, geo.NW + geo.GX - 4)
      cards.push({
        name: v,
        x: rnd(clamp(cx - w / 2, 1, W - w - 1)),
        y: rnd(B.y - geo.TA - (n - i) * geo.CARD_H - (n - 1 - i) * geo.CARD_GAP),
        w,
        color: colorOf(v),
        target: k,
      })
    })
    const g = arrowGeom([
      [cx, B.y - geo.TA],
      [cx, B.y],
    ])
    arrows.push({ key: `tag:${k}`, kind: 'tag', d: g.d, head: g.head, color: colorOf(vs[n - 1]), to: k })
  }

  return {
    W,
    H,
    cols,
    geo,
    boxes,
    nullL,
    nullR,
    slashes,
    arrows,
    cards,
    sideLabelY,
    mainIds: main.ids,
    mainEnd: main.end,
    loose: new Set(rest),
  }
}

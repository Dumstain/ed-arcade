import type { RecNode, Val } from '../schemas'

/** Medidas naturales del árbol (px); luego se escala para caber. */
export const NODE_H = 60
export const LEVEL_H = 88
const GAP = 8
const PAD_X = 8
const PAD_TOP = 30
const PAD_BOTTOM = 16
const MAX_DEPTH = 8
const MAX_NODES = 80

export interface LNode {
  /** ruta: "0", "0.1", "0.1.0"… */
  id: string
  label: string
  value: Val
  depth: number
  parentId: string | null
  kids: LNode[]
  leaf: boolean
  /** ancho de la cajita */
  w: number
  /** centro horizontal */
  x: number
  /** borde superior */
  y: number
  /** índice en post-orden (hijos antes que padre) */
  order: number
}

export interface Layout {
  /** pre-orden */
  nodes: LNode[]
  byId: Map<string, LNode>
  width: number
  height: number
  rootX: number
}

function nodeWidth(label: string): number {
  return Math.max(56, Math.min(150, label.length * 10 + 14))
}

/** Acomoda el árbol: cada subárbol ocupa max(su caja, suma de sus hijos); el padre queda centrado. */
export function buildLayout(root: RecNode | undefined | null): Layout | null {
  if (!root || typeof root !== 'object') return null
  const nodes: LNode[] = []
  let count = 0

  const build = (r: RecNode, id: string, depth: number, parentId: string | null): LNode => {
    count++
    const label = r.label == null ? '?' : String(r.label)
    const n: LNode = {
      id,
      label,
      value: r.value ?? '',
      depth,
      parentId,
      kids: [],
      leaf: true,
      w: nodeWidth(label),
      x: 0,
      y: PAD_TOP + depth * LEVEL_H,
      order: 0,
    }
    nodes.push(n)
    if (depth < MAX_DEPTH && Array.isArray(r.children)) {
      r.children.forEach((c, i) => {
        if (c && typeof c === 'object' && count < MAX_NODES) n.kids.push(build(c, `${id}.${i}`, depth + 1, id))
      })
    }
    n.leaf = n.kids.length === 0
    return n
  }
  const top = build(root, '0', 0, null)

  // Layout "compacto" por contornos: los subárboles se pegan lo más posible sin encimarse
  // (nivel por nivel) y el padre queda centrado sobre su primer y último hijo.
  interface Sub {
    left: number[]
    right: number[]
    kidsX: number[]
  }
  const subs = new Map<LNode, Sub>()
  const arrange = (n: LNode): Sub => {
    let res: Sub
    if (n.kids.length === 0) {
      res = { left: [-n.w / 2], right: [n.w / 2], kidsX: [] }
    } else {
      const ks = n.kids.map(arrange)
      const xs = [0]
      const accL = ks[0].left.slice()
      const accR = ks[0].right.slice()
      for (let i = 1; i < ks.length; i++) {
        let off = -Infinity
        const common = Math.min(accR.length, ks[i].left.length)
        for (let d = 0; d < common; d++) off = Math.max(off, accR[d] + GAP - ks[i].left[d])
        xs.push(off)
        ks[i].left.forEach((l, d) => {
          const r = ks[i].right[d] + off
          if (d < accR.length) {
            accR[d] = Math.max(accR[d], r)
            accL[d] = Math.min(accL[d], l + off)
          } else {
            accR.push(r)
            accL.push(l + off)
          }
        })
      }
      const mid = (xs[0] + xs[xs.length - 1]) / 2
      res = {
        left: [-n.w / 2, ...accL.map((v) => v - mid)],
        right: [n.w / 2, ...accR.map((v) => v - mid)],
        kidsX: xs.map((x) => x - mid),
      }
    }
    subs.set(n, res)
    return res
  }
  const rootSub = arrange(top)
  const minLeft = Math.min(...rootSub.left)
  const maxRight = Math.max(...rootSub.right)
  const place = (n: LNode, x: number) => {
    n.x = x
    const sub = subs.get(n)
    n.kids.forEach((k, i) => place(k, x + (sub?.kidsX[i] ?? 0)))
  }
  place(top, PAD_X - minLeft)
  const total = maxRight - minLeft

  let ord = 0
  const post = (n: LNode) => {
    n.kids.forEach(post)
    n.order = ord++
  }
  post(top)

  const maxDepth = nodes.reduce((m, n) => Math.max(m, n.depth), 0)
  return {
    nodes,
    byId: new Map(nodes.map((n) => [n.id, n])),
    width: total + PAD_X * 2,
    height: PAD_TOP + maxDepth * LEVEL_H + NODE_H + PAD_BOTTOM,
    rootX: top.x,
  }
}

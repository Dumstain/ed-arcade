import type { MemoryStreetData } from '../schemas'

/** Máximo de casas que se dibujan (por seguridad ante datos raros). */
export const MAX_HOUSES = 24

export function houseSizeOf(d: MemoryStreetData): number {
  return typeof d.houseSize === 'number' && Number.isFinite(d.houseSize) && d.houseSize > 0 ? d.houseSize : 4
}

const isInt = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n)

/** Devuelve la lista de problemas del ejercicio (vacía = jugable). */
export function validate(d: MemoryStreetData | undefined): string[] {
  const p: string[] = []
  if (!d || typeof d !== 'object') return ['Faltan los datos del ejercicio.']
  if (typeof d.baseAddress !== 'number' || !Number.isFinite(d.baseAddress)) p.push('baseAddress no es un número.')
  if (!isInt(d.houses) || d.houses < 1) p.push('houses debe ser un entero positivo.')

  if (d.mode === 'address') {
    const a = d.array
    if (!a || typeof a !== 'object') {
      p.push('Falta array en el modo address.')
    } else {
      if (!Array.isArray(a.values) || a.values.length < 1) p.push('array.values está vacío.')
      if (!isInt(a.startHouse) || a.startHouse < 0) p.push('array.startHouse inválido.')
      else if (Array.isArray(a.values) && a.startHouse + a.values.length > MAX_HOUSES) p.push('El arreglo no cabe en la calle.')
      if (!isInt(a.ask) || !Array.isArray(a.values) || a.ask < 0 || a.ask >= a.values.length) p.push('array.ask fuera de rango.')
    }
  } else if (d.mode === 'chain') {
    const nodes = d.nodes
    if (!Array.isArray(nodes) || nodes.length < 1) {
      p.push('Faltan los nodos (nodes) en el modo chain.')
    } else {
      const seen = new Set<number>()
      for (const n of nodes) {
        if (!isInt(n.house) || n.house < 0 || n.house >= MAX_HOUSES) p.push(`Nodo con casa inválida (${String(n.house)}).`)
        else if (seen.has(n.house)) p.push(`Dos nodos en la misma casa (${n.house}).`)
        else seen.add(n.house)
        if (n.next !== null && (!isInt(n.next) || n.next < 0 || n.next >= MAX_HOUSES)) p.push(`Nodo ${n.house}: next inválido.`)
      }
      if (!isInt(d.headHouse)) p.push('Falta headHouse.')
      else {
        const { path, ok } = computePath(d)
        if (!ok) p.push('La cadena desde headHouse no termina en null (casa faltante o ciclo).')
        else if (path.length < 1) p.push('Cadena vacía.')
      }
    }
  } else {
    p.push('mode debe ser "address" o "chain".')
  }
  return p
}

/** Casas de la cadena, en orden, desde headHouse hasta el nodo cuyo next es null. */
export function computePath(d: MemoryStreetData): { path: number[]; ok: boolean } {
  const map = new Map((d.nodes ?? []).map((n) => [n.house, n] as const))
  const path: number[] = []
  const seen = new Set<number>()
  let cur: number | null | undefined = d.headHouse
  while (cur !== null && cur !== undefined) {
    const node = map.get(cur)
    if (!node || seen.has(cur)) return { path, ok: false }
    seen.add(cur)
    path.push(cur)
    cur = node.next
  }
  return { path, ok: path.length > 0 }
}

/** Cuántas casas dibujar para que quepa todo lo que se menciona. */
export function houseCount(d: MemoryStreetData): number {
  let need = Math.max(1, d.houses | 0)
  if (d.mode === 'address' && d.array) need = Math.max(need, d.array.startHouse + d.array.values.length)
  if (d.mode === 'chain') {
    for (const n of d.nodes ?? []) need = Math.max(need, n.house + 1, n.next === null ? 0 : n.next + 1)
  }
  return Math.min(MAX_HOUSES, need)
}

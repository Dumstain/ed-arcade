/**
 * Barajado DETERMINISTA (misma semilla => mismo orden) para que un ejercicio se vea igual
 * en cada render, en cada intento y para todos los alumnos. Útil para quiz, order, etc.
 */

/** Hash FNV-1a de 32 bits */
export function hashString(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h >>> 0
}

/** PRNG mulberry32 → () => número en [0, 1) */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Fisher–Yates con semilla de texto (p.ej. exercise.id). No muta el arreglo original.
 * avoidIdentity=true garantiza que el resultado NO quede igual al original (si length > 1):
 * indispensable en "ordenar", donde el orden original es la respuesta correcta.
 */
export function seededShuffle<T>(arr: readonly T[], seed: string, avoidIdentity = false): T[] {
  const out = arr.slice()
  const rnd = mulberry32(hashString(seed))
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    const tmp = out[i]
    out[i] = out[j]
    out[j] = tmp
  }
  if (avoidIdentity && out.length > 1 && out.every((v, i) => v === arr[i])) {
    out.push(out.shift() as T)
  }
  return out
}

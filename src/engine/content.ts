/**
 * Carga automática de tipos de ejercicio y contenido:
 * - src/exercises/<tipo>/index.tsx    → default export ExerciseModule
 * - src/content/dayN.ts               → default export Exercise[] (orden de juego)
 * - src/exercises/<tipo>/examples.ts  → export const examples: Exercise[] (solo ?demo=1)
 * Tolera archivos ausentes. Ejercicios con tipo desconocido se omiten con console.warn.
 */
import type { Day, Exercise, ExerciseModule, Tier } from './types'
import { DEMO_MODE, TIERS, type DayNum } from './course'

type ModFile = { default?: ExerciseModule }
type ContentFile = { default?: Exercise[] }
type ExamplesFile = { examples?: Exercise[] }

const modFiles = import.meta.glob<ModFile>('../exercises/*/index.tsx', { eager: true })
const contentFiles = import.meta.glob<ContentFile>('../content/day*.ts', { eager: true })
const exampleFiles = DEMO_MODE
  ? import.meta.glob<ExamplesFile>('../exercises/*/examples.ts', { eager: true })
  : ({} as Record<string, ExamplesFile>)

// ───────────── Registro de tipos ─────────────
export const registry = new Map<string, ExerciseModule>()
for (const [path, file] of Object.entries(modFiles)) {
  const m = file?.default
  if (!m || typeof m.type !== 'string' || !m.Component) {
    console.warn(`[ED] ${path} no exporta por default un ExerciseModule válido`)
    continue
  }
  if (registry.has(m.type)) console.warn(`[ED] Tipo de ejercicio duplicado: "${m.type}" (${path})`)
  registry.set(m.type, m)
}

// ───────────── Contenido ─────────────
export interface DayContent {
  day: DayNum
  /** en orden de juego: tier 1..4, y dentro de cada tier el orden del archivo */
  exercises: Exercise[]
  byTier: Record<Tier, Exercise[]>
}

export interface ExerciseRef {
  exercise: Exercise
  day: DayNum
  /** posición 1-based dentro de su tier */
  index: number
}

function isTier(t: unknown): t is Tier {
  return t === 1 || t === 2 || t === 3 || t === 4
}
function isDay(d: unknown): d is Day {
  return d === 1 || d === 2 || d === 3 || d === 4 || d === 5
}

const days = new Map<DayNum, DayContent>()
const byId = new Map<string, ExerciseRef>()

function ensureDay(day: DayNum): DayContent {
  let dc = days.get(day)
  if (!dc) {
    dc = { day, exercises: [], byTier: { 1: [], 2: [], 3: [], 4: [] } }
    days.set(day, dc)
  }
  return dc
}

function accept(ex: unknown, where: string): ex is Exercise {
  if (!ex || typeof ex !== 'object') {
    console.warn(`[ED] ${where}: ejercicio inválido`, ex)
    return false
  }
  const e = ex as Partial<Exercise>
  if (typeof e.id !== 'string' || !e.id) {
    console.warn(`[ED] ${where}: ejercicio sin id`, ex)
    return false
  }
  if (typeof e.type !== 'string' || !registry.has(e.type)) {
    console.warn(`[ED] ${where}: "${e.id}" usa el tipo "${String(e.type)}" que no existe en el registro; se omite`)
    return false
  }
  if (!isTier(e.tier)) {
    console.warn(`[ED] ${where}: "${e.id}" tiene tier inválido (${String(e.tier)}); se omite`)
    return false
  }
  return true
}

function addExercise(day: DayNum, ex: Exercise) {
  if (byId.has(ex.id)) {
    console.warn(`[ED] id de ejercicio duplicado "${ex.id}"; se omite el segundo`)
    return
  }
  const dc = ensureDay(day)
  dc.byTier[ex.tier].push(ex)
  byId.set(ex.id, { exercise: ex, day, index: dc.byTier[ex.tier].length })
}

const dayFromPath = (p: string) => Number(/day(\d+)\.ts$/.exec(p)?.[1] ?? NaN)

for (const [path, file] of Object.entries(contentFiles).sort((a, b) => dayFromPath(a[0]) - dayFromPath(b[0]))) {
  const fileDay = dayFromPath(path)
  const list = file?.default
  if (!Array.isArray(list)) {
    console.warn(`[ED] ${path} no exporta por default un Exercise[]`)
    continue
  }
  for (const ex of list) {
    if (!accept(ex, path)) continue
    const day = isDay(ex.day) ? ex.day : isDay(fileDay) ? fileDay : null
    if (!day) {
      console.warn(`[ED] ${path}: "${ex.id}" sin día válido; se omite`)
      continue
    }
    addExercise(day, ex)
  }
}

// ───────────── Día 0 · Sala de pruebas (?demo=1) ─────────────
if (DEMO_MODE) {
  for (const [path, file] of Object.entries(exampleFiles).sort((a, b) => a[0].localeCompare(b[0]))) {
    const folder = /exercises\/([^/]+)\/examples\.ts$/.exec(path)?.[1] ?? 'x'
    const list = file?.examples
    if (!Array.isArray(list)) {
      console.warn(`[ED] ${path} no exporta "examples" como arreglo`)
      continue
    }
    list.forEach((ex, i) => {
      if (!accept(ex, path)) return
      let id = `demo:${folder}:${ex.id || i}`
      while (byId.has(id)) id += '+'
      addExercise(0, { ...ex, id, day: 0 as unknown as Day })
    })
  }
}

for (const dc of days.values()) {
  dc.exercises = TIERS.flatMap((t) => dc.byTier[t])
}

export function getDay(day: DayNum): DayContent | undefined {
  const dc = days.get(day)
  return dc && dc.exercises.length ? dc : undefined
}

export function findExercise(id: string): ExerciseRef | undefined {
  return byId.get(id)
}

export function getModule(type: string): ExerciseModule | undefined {
  return registry.get(type)
}

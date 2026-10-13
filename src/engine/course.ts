/**
 * Configuración del curso: días, fechas de apertura, frutas y nombres de nivel.
 * Las fechas se interpretan en HORA LOCAL y el día se abre a las 00:00.
 */
import type { Day, Tier } from './types'
import type { FruitKind } from '../ui'

/** 0 = "Sala de pruebas" (solo con ?demo=1) */
export type DayNum = 0 | Day

export interface CourseDay {
  day: DayNum
  title: string
  fruit: FruitKind
  /** YYYY-MM-DD (hora local) */
  date: string
}

export const COURSE_DAYS: readonly CourseDay[] = [
  { day: 1, title: 'Memoria y eficiencia', fruit: 'cherry', date: '2026-10-12' },
  { day: 2, title: 'Recursividad y pilas', fruit: 'strawberry', date: '2026-10-13' },
  { day: 3, title: 'Colas, listas y hash', fruit: 'orange', date: '2026-10-14' },
  { day: 4, title: 'Árboles y grafos', fruit: 'apple', date: '2026-10-15' },
  { day: 5, title: 'Ordenamiento', fruit: 'melon', date: '2026-10-16' },
]

export const DEMO_DAY: CourseDay = { day: 0, title: 'Sala de pruebas', fruit: 'cherry', date: '2000-01-01' }

export const TIERS: readonly Tier[] = [1, 2, 3, 4]
export const TIER_NAMES: Record<Tier, string> = {
  1: 'CALENTAMIENTO',
  2: 'RETO',
  3: 'COMBO',
  4: 'JEFE FINAL',
}

export const MAX_LIVES = 3

const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams()
/** ?demo=1 → Sala de pruebas (QA) */
export const DEMO_MODE = params.get('demo') === '1'

export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0)
}

/** Fecha "actual". Con ?demo=1&fecha=YYYY-MM-DD se puede simular otro día (QA). */
export function now(): Date {
  const f = params.get('fecha')
  if (DEMO_MODE && f && /^\d{4}-\d{2}-\d{2}$/.test(f)) {
    const d = parseLocalDate(f)
    const t = new Date()
    d.setHours(t.getHours(), t.getMinutes(), t.getSeconds())
    return d
  }
  return new Date()
}

export function dayInfo(day: DayNum): CourseDay {
  return COURSE_DAYS.find((d) => d.day === day) ?? DEMO_DAY
}

/** Abierto si hoy >= fecha de apertura O si el día <= unlocked_day remoto. Los días pasados siguen abiertos. */
export function isDayOpen(day: DayNum, remoteUnlocked = 0, at: Date = now()): boolean {
  if (day === 0) return DEMO_MODE
  if (day <= remoteUnlocked) return true
  return at.getTime() >= parseLocalDate(dayInfo(day).date).getTime()
}

/** ¿Es el día de hoy según el calendario? */
export function isToday(day: DayNum, at: Date = now()): boolean {
  if (day === 0) return false
  const d = parseLocalDate(dayInfo(day).date)
  return d.getFullYear() === at.getFullYear() && d.getMonth() === at.getMonth() && d.getDate() === at.getDate()
}

const WEEKDAYS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']

/** "SE ABRE EL MIÉ 14" */
export function opensLabel(day: DayNum): string {
  const d = parseLocalDate(dayInfo(day).date)
  return `SE ABRE EL ${WEEKDAYS[d.getDay()]} ${d.getDate()}`
}

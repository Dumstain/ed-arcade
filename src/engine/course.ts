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
  /** YYYY-MM-DD (hora local) — día del calendario */
  date: string
  /** Instante exacto de apertura (ISO con zona horaria). Si falta, abre a las 00:00 locales de `date`. */
  opensAt?: string
  /** Hora de apertura para la etiqueta, p.ej. "12:59" (hora de Morelia) */
  opensTime?: string
  /** Candado manual del profesor: solo abre con ed_config.unlocked_day >= day */
  manual?: boolean
}

export const COURSE_DAYS: readonly CourseDay[] = [
  { day: 1, title: 'Memoria y eficiencia', fruit: 'cherry', date: '2026-10-12' },
  { day: 2, title: 'Recursividad y pilas', fruit: 'strawberry', date: '2026-10-13' },
  // Morelia (America/Mexico_City) es UTC−6 todo el año desde 2022
  { day: 3, title: 'Colas, listas y hash', fruit: 'orange', date: '2026-10-14', opensAt: '2026-10-14T12:59:00-06:00', opensTime: '12:59' },
  { day: 4, title: 'Árboles y grafos', fruit: 'apple', date: '2026-10-15', manual: true },
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
/** ?demo=1 → Sala de pruebas (QA). Solo en desarrollo y en builds `--mode qa`, nunca en el sitio publicado. */
export const DEMO_MODE = params.get('demo') === '1' && (import.meta.env.DEV || import.meta.env.MODE === 'qa')

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

/** Milisegundos del instante de apertura del día */
export function opensAtMs(day: DayNum): number {
  const info = dayInfo(day)
  return info.opensAt ? Date.parse(info.opensAt) : parseLocalDate(info.date).getTime()
}

/**
 * Abierto si el día <= unlocked_day remoto, o si ya llegó su instante de apertura.
 * Los días con candado manual solo abren con unlocked_day (en ?demo=1 abren por fecha, para QA).
 * Los días pasados siguen abiertos.
 */
export function isDayOpen(day: DayNum, remoteUnlocked = 0, at: Date = now()): boolean {
  if (day === 0) return DEMO_MODE
  if (day <= remoteUnlocked) return true
  if (dayInfo(day).manual && !DEMO_MODE) return false
  return at.getTime() >= opensAtMs(day)
}

/** ¿Es el día de hoy según el calendario? */
export function isToday(day: DayNum, at: Date = now()): boolean {
  if (day === 0) return false
  const d = parseLocalDate(dayInfo(day).date)
  return d.getFullYear() === at.getFullYear() && d.getMonth() === at.getMonth() && d.getDate() === at.getDate()
}

const WEEKDAYS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']

/** "SE ABRE EL MIÉ 14 · 12:59" | "CANDADO DEL PROFE" */
export function opensLabel(day: DayNum): string {
  const info = dayInfo(day)
  if (info.manual) return 'CANDADO DEL PROFE'
  const d = parseLocalDate(info.date)
  return `SE ABRE EL ${WEEKDAYS[d.getDay()]} ${d.getDate()}${info.opensTime ? ' · ' + info.opensTime : ''}`
}

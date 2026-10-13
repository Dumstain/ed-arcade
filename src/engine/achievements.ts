/**
 * Logros (se guardan por jugador). Se evalúan al terminar cada ejercicio.
 */
import type { Exercise } from './types'
import type { DayContent } from './content'
import { isDayComplete, isTierComplete, type ProgMap } from './progress'

export interface Achievement {
  id: string
  title: string
  desc: string
  icon: string
}

export const ACHIEVEMENTS: readonly Achievement[] = [
  { id: 'first-bite', title: '¡PRIMER BOCADO!', desc: 'Tu primer acierto.', icon: '🍒' },
  { id: 'flawless', title: 'SIN UN RASGUÑO', desc: 'Un nivel completo con 3 estrellas en todo.', icon: '🛡️' },
  { id: 'combo5', title: 'COMBO x5', desc: '5 aciertos seguidos al primer intento.', icon: '⚡' },
  { id: 'boss', title: 'JEFE DERROTADO', desc: 'Resuelve todo el Nivel 4 de un día.', icon: '👻' },
  { id: 'day-done', title: 'DÍA COMPLETADO', desc: 'Termina todos los ejercicios de un día.', icon: '🏁' },
  { id: 'hanoi', title: 'MAESTRO DE HANÓI', desc: 'Resuelve unas torres de Hanói sin errores.', icon: '🗼' },
]

export function achievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id)
}

export interface AchievementCtx {
  has: ReadonlySet<string>
  exercise: Exercise
  correct: boolean
  mistakes: number
  combo: number
  dc: DayContent
  /** progreso YA actualizado con esta partida */
  prog: ProgMap
}

/** Devuelve los logros NUEVOS ganados con esta partida. */
export function evaluateAchievements(c: AchievementCtx): Achievement[] {
  const won: string[] = []
  const add = (id: string) => {
    if (!c.has.has(id) && !won.includes(id)) won.push(id)
  }
  if (c.correct) add('first-bite')
  if (c.combo >= 5) add('combo5')
  if (c.correct && c.mistakes === 0 && c.exercise.type === 'hanoi') add('hanoi')

  const tierList = c.dc.byTier[c.exercise.tier]
  if (tierList.length && isTierComplete(c.dc, c.exercise.tier, c.prog) && tierList.every((e) => (c.prog[e.id]?.stars ?? 0) >= 3)) {
    add('flawless')
  }
  const boss = c.dc.byTier[4]
  if (boss.length && boss.every((e) => !!c.prog[e.id]?.solved)) add('boss')
  if (isDayComplete(c.dc, c.prog)) add('day-done')

  return won.map((id) => achievementById(id)).filter((a): a is Achievement => !!a)
}

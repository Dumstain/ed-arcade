/**
 * CONTRATO COMPARTIDO — no cambiar sin coordinar.
 * Todo tipo de ejercicio vive en src/exercises/<tipo>/index.tsx y exporta por
 * default un ExerciseModule. El contenido vive en src/content/dayN.ts y exporta
 * por default un Exercise[] en ORDEN DE JUEGO (se auto-descubren con import.meta.glob).
 * Los esquemas de `data` de cada tipo están en src/exercises/schemas.ts.
 */
import type { ComponentType } from 'react'

export type Day = 1 | 2 | 3 | 4 | 5

/**
 * Dificultad dentro de un día (cada tier es un "nivel" del laberinto):
 * 1 = concepto simple, tal cual se vio en clase      (CALENTAMIENTO)
 * 2 = el mismo concepto, más complicado               (RETO)
 * 3 = combina conceptos de forma simple               (COMBO)
 * 4 = combinaciones más complicadas                   (JEFE FINAL)
 * El tier N+1 se desbloquea al terminar todos los del tier N.
 */
export type Tier = 1 | 2 | 3 | 4

export interface Exercise<TData = unknown> {
  /** Único en todo el curso, p.ej. "d2-pila-01" */
  id: string
  day: Day
  tier: Tier
  /** Debe coincidir con ExerciseModule.type */
  type: string
  /** Tema del temario, p.ej. "Pilas" */
  topic: string
  /** Título corto estilo arcade (≤ 22 caracteres), p.ej. "PILA DE PLATOS" */
  title: string
  /** Instrucción en español, clara y breve (1–3 frases) */
  prompt: string
  /** Puntos máximos (default por tier: 100 / 150 / 200 / 300) */
  points?: number
  /** Pista opcional (usarla cuesta 30% de los puntos) */
  hint?: string
  /** Se muestra al terminar (acierto o sin vidas) — el "por qué", con la analogía del curso */
  explanation?: string
  /** Payload específico del tipo de ejercicio (ver schemas.ts) */
  data: TData
}

export interface ExerciseProps<TData = unknown> {
  exercise: Exercise<TData>
  /**
   * Resultado de un intento. El runner decide vidas/puntaje/feedback/sonido.
   * - Ejercicios de UNA respuesta: llamar al presionar su botón "COMPROBAR".
   * - Ejercicios de VARIOS PASOS: llamar onCheck(false) por cada error
   *   (cuesta una vida; el componente sigue montado y conserva su estado) y
   *   onCheck(true) UNA sola vez al completar todo correctamente.
   * Tras onCheck(true) o al quedarse sin vidas el runner pone locked=true.
   */
  onCheck: (correct: boolean, answer?: unknown) => void
  /**
   * Paso intermedio correcto en ejercicios de varios pasos (no termina nada):
   * el runner da micro-recompensa (sonido "waka", partículas). Opcional.
   */
  onStep?: () => void
  /** true cuando terminó (resuelto o sin vidas): bloquear interacción */
  locked: boolean
  /** true cuando se quedó sin vidas: mostrar la respuesta correcta si es posible */
  showSolution: boolean
  /** Se incrementa con cada respuesta incorrecta (para animar/sacudir) */
  attempt: number
}

export interface ExerciseModule<TData = unknown> {
  type: string
  /** Nombre legible, p.ej. "Ordenar secuencia" */
  label: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Component: ComponentType<ExerciseProps<TData>> | ComponentType<ExerciseProps<any>>
}

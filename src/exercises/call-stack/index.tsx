import type { ExerciseModule } from '../../engine/types'
import type { CallStackData } from '../schemas'
import { CallStackExercise } from './CallStackExercise'

export default {
  type: 'call-stack',
  label: 'Pila de llamadas',
  Component: CallStackExercise,
} satisfies ExerciseModule<CallStackData>

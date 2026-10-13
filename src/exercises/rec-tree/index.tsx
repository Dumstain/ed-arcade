import type { ExerciseModule } from '../../engine/types'
import type { RecTreeData } from '../schemas'
import { RecTreeExercise } from './RecTreeExercise'

export default {
  type: 'rec-tree',
  label: 'Árbol de llamadas',
  Component: RecTreeExercise,
} satisfies ExerciseModule<RecTreeData>

import type { ExerciseModule } from '../../engine/types'
import type { HanoiData } from '../schemas'
import HanoiExercise from './HanoiGame'

export default {
  type: 'hanoi',
  label: 'Torres de Hanói',
  Component: HanoiExercise,
} satisfies ExerciseModule<HanoiData>

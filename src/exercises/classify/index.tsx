import type { ExerciseModule } from '../../engine/types'
import type { ClassifyData } from '../schemas'
import ClassifyExercise from './ClassifyExercise'

export default {
  type: 'classify',
  label: 'Clasificar en casilleros',
  Component: ClassifyExercise,
} satisfies ExerciseModule<ClassifyData>

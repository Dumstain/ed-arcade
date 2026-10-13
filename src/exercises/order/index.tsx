import type { ExerciseModule } from '../../engine/types'
import type { OrderData } from '../schemas'
import OrderExercise from './OrderExercise'

export default {
  type: 'order',
  label: 'Ordenar secuencia',
  Component: OrderExercise,
} satisfies ExerciseModule<OrderData>

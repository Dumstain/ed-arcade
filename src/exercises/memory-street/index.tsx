import type { ExerciseModule, ExerciseProps } from '../../engine/types'
import type { MemoryStreetData } from '../schemas'
import { AddressGame } from './AddressGame'
import { ChainGame } from './ChainGame'
import { Warn } from './parts'
import { validate } from './validate'
import './memory-street.css'

function MemoryStreet(props: ExerciseProps<MemoryStreetData>) {
  const { exercise } = props
  const problems = validate(exercise.data)
  if (problems.length > 0) {
    return (
      <div className="ms-root">
        <Warn items={problems} />
      </div>
    )
  }
  // key = id: si cambia el ejercicio, todo el estado interno se reinicia
  const Game = exercise.data.mode === 'chain' ? ChainGame : AddressGame
  return (
    <div className="ms-root">
      <Game key={exercise.id} {...props} />
    </div>
  )
}

export default {
  type: 'memory-street',
  label: 'La calle de la memoria',
  Component: MemoryStreet,
} satisfies ExerciseModule<MemoryStreetData>

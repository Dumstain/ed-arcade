import type { ExerciseModule, ExerciseProps } from '../../engine/types'
import type { RefCardsData } from '../schemas'
import { Game } from './Game'
import { validate } from './validate'
import './ref-cards.css'

function RefCards(props: ExerciseProps<RefCardsData>) {
  const { exercise } = props
  const problems = validate(exercise.data)
  if (problems.length > 0) {
    return (
      <div className="px-panel rc-warn" role="alert">
        <p className="rc-warn-title">AVISO</p>
        <p>Este ejercicio tiene datos que no se pueden jugar:</p>
        <ul>
          {problems.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </div>
    )
  }
  // key = id: si cambia el ejercicio, todo el estado interno se reinicia
  return <Game key={exercise.id} {...props} />
}

export default {
  type: 'ref-cards',
  label: 'Tarjetas con dirección',
  Component: RefCards,
} satisfies ExerciseModule<RefCardsData>

/**
 * search-sim — búsqueda secuencial / binaria con comecocos (Día 1 / Día 2).
 * Comportamiento exacto en src/exercises/schemas.ts (SearchSimData).
 */
import { useMemo } from 'react'
import type { ExerciseModule, ExerciseProps } from '../../engine/types'
import type { SearchSimData } from '../schemas'
import { Ghost } from '../../ui'
import { Board } from './Board'
import { parseData } from './trace'
import './search-sim.css'

function SearchSim(props: ExerciseProps<SearchSimData>) {
  const parsed = useMemo(() => parseData(props.exercise.data), [props.exercise.data])
  if (!parsed.ok) {
    return (
      <div className="px-panel ssg-warn" role="alert">
        <p className="px-title">¡AVISO!</p>
        <Ghost color="orange" size={32} />
        <p>Este ejercicio trae datos raros ({parsed.why}). Avísale al profe.</p>
      </div>
    )
  }
  // key = id: si cambia el ejercicio se reinicia todo el estado interno
  return <Board key={props.exercise.id} {...props} clean={parsed.data} />
}

export default {
  type: 'search-sim',
  label: 'Búsqueda con comecocos',
  Component: SearchSim,
} satisfies ExerciseModule<SearchSimData>

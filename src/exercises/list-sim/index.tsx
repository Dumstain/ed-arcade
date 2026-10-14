/**
 * list-sim — "Tren de vagones / playlist" (Día 3): listas enlazadas simple, doble y circular.
 *   relink   : armar el programa tocando asignaciones en orden (simulador de punteros con
 *              NullPointerException y fantasma que se come los vagones perdidos).
 *   traverse : tocar los vagones en el orden de un recorrido por sig / ant.
 * Datos y comportamiento: src/exercises/schemas.ts (ListSimData). Lógica pura: ./logic.ts y ./layout.ts.
 */
import { useMemo } from 'react'
import type { ExerciseModule, ExerciseProps } from '../../engine/types'
import type { ListSimData } from '../schemas'
import { BadData } from '../_shared/BadData'
import { normalize } from './logic'
import { Relink } from './Relink'
import { Traverse } from './Traverse'
import './list-sim.css'

function ListSim(props: ExerciseProps<ListSimData>) {
  const data = props.exercise?.data
  const parsed = useMemo(() => normalize(data), [data])
  if ('error' in parsed) {
    return (
      <BadData
        message={`Este reto tiene datos incorrectos: ${parsed.error} Avísale a tu profe.`}
        onSkip={() => props.onCheck(true)}
        locked={props.locked}
      />
    )
  }
  const id = props.exercise?.id ?? 'list-sim'
  // key = id: si cambia el ejercicio, todo el estado interno se reinicia
  return parsed.cfg.mode === 'relink' ? (
    <Relink key={id} {...props} cfg={parsed.cfg} seed={id} />
  ) : (
    <Traverse key={id} {...props} cfg={parsed.cfg} />
  )
}

export default {
  type: 'list-sim',
  label: 'Tren de vagones (listas enlazadas)',
  Component: ListSim,
} satisfies ExerciseModule<ListSimData>

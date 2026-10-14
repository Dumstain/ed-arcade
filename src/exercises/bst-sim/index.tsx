/**
 * bst-sim — árbol binario de búsqueda (Día 4). Analogía: carpetas de la computadora;
 * a la izquierda las menores, a la derecha las mayores.
 * Modos: insert (tocar el hueco), search (tocar el camino / NO ESTÁ), traversal (4 recorridos),
 * delete (quién ocupa su lugar). Comportamiento exacto en src/exercises/schemas.ts (BstSimData).
 */
import { useMemo } from 'react'
import type { ExerciseModule, ExerciseProps } from '../../engine/types'
import type { BstSimData } from '../schemas'
import { BadData } from '../_shared/BadData'
import { DeleteGame } from './DeleteGame'
import { InsertGame } from './InsertGame'
import { SearchGame } from './SearchGame'
import { TraversalGame } from './TraversalGame'
import { normalize } from './logic'
import './bst-sim.css'

function BstSim(props: ExerciseProps<BstSimData>) {
  const parsed = useMemo(() => normalize(props.exercise?.data), [props.exercise?.data])
  if (!parsed.ok) {
    return (
      <BadData
        message={`Este árbol trae datos raros (${parsed.why}). Avísale a tu profe.`}
        onSkip={() => props.onCheck(true)}
        locked={props.locked}
      />
    )
  }
  const cfg = parsed.cfg
  // key = id: si cambia el ejercicio se reinicia todo el estado interno
  const key = props.exercise.id
  switch (cfg.mode) {
    case 'insert':
      return <InsertGame key={key} {...props} cfg={cfg} />
    case 'search':
      return <SearchGame key={key} {...props} cfg={cfg} />
    case 'traversal':
      return <TraversalGame key={key} {...props} cfg={cfg} />
    case 'delete':
      return <DeleteGame key={key} {...props} cfg={cfg} />
  }
}

export default {
  type: 'bst-sim',
  label: 'Árbol binario de búsqueda',
  Component: BstSim,
} satisfies ExerciseModule<BstSimData>

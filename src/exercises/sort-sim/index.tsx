/**
 * sort-sim — ordenamiento (Día 5). Valores como barras pixel (altura proporcional al número).
 * Modos: bubble (el más grande sube como burbuja), partition (el pivote es el capitán),
 * merge (dos montones de exámenes), radix (el cartero con casilleros 0–9).
 * Comportamiento exacto en src/exercises/schemas.ts (SortSimData); lógica pura en logic.ts.
 */
import { useMemo } from 'react'
import type { ExerciseModule, ExerciseProps } from '../../engine/types'
import type { SortSimData } from '../schemas'
import { BadData } from '../_shared/BadData'
import { BubbleGame } from './BubbleGame'
import { MergeGame } from './MergeGame'
import { PartitionGame } from './PartitionGame'
import { RadixGame } from './RadixGame'
import { normalize } from './logic'
import './sort-sim.css'

function SortSim(props: ExerciseProps<SortSimData>) {
  const parsed = useMemo(() => normalize(props.exercise?.data), [props.exercise?.data])
  if (!parsed.ok) {
    return (
      <BadData
        message={`Este reto de ordenamiento trae datos raros (${parsed.why}). Avísale a tu profe.`}
        onSkip={() => props.onCheck(true)}
        locked={props.locked}
      />
    )
  }
  const cfg = parsed.cfg
  // key = id: si cambia el ejercicio se reinicia todo el estado interno
  const key = props.exercise.id
  switch (cfg.mode) {
    case 'bubble':
      return <BubbleGame key={key} {...props} cfg={cfg} />
    case 'partition':
      return <PartitionGame key={key} {...props} cfg={cfg} />
    case 'merge':
      return <MergeGame key={key} {...props} cfg={cfg} />
    case 'radix':
      return <RadixGame key={key} {...props} cfg={cfg} />
  }
}

export default {
  type: 'sort-sim',
  label: 'Ordenamiento',
  Component: SortSim,
} satisfies ExerciseModule<SortSimData>

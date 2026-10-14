/**
 * queue-sim — "La fila de las tortillas / el carrusel" (Día 3).
 * Modos: build (armar la cola final), served (en qué orden atienden), pointers (dónde quedan FRENTE y FINAL).
 * Vistas: line (personitas), ring (carrusel circular), array (celdas con índices). Bicola con deque.
 * La lógica pura está en logic.ts; las vistas en QueueViews.tsx; el juego en QueueGame.tsx.
 */
import { useMemo } from 'react'
import type { ExerciseModule, ExerciseProps } from '../../engine/types'
import type { QueueSimData } from '../schemas'
import { BadData } from '../_shared/BadData'
import { normalize } from './logic'
import { QueueGame } from './QueueGame'

function QueueSim(props: ExerciseProps<QueueSimData>) {
  const parsed = useMemo(() => normalize(props.exercise?.data), [props.exercise?.data])
  if ('error' in parsed) {
    return (
      <BadData
        message={`${parsed.error} Avísale a tu profe.`}
        onSkip={() => props.onCheck(true)}
        locked={props.locked}
      />
    )
  }
  // key: al cambiar de ejercicio el estado se reinicia por completo
  return <QueueGame key={props.exercise?.id} cfg={parsed.cfg} {...props} />
}

export default {
  type: 'queue-sim',
  label: 'La fila de las tortillas',
  Component: QueueSim,
} satisfies ExerciseModule<QueueSimData>

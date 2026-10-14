/**
 * graph-sim — "Mapa de carreteras de Michoacán" (Día 4).
 * Ciudades = vértices, carreteras = aristas, km = pesos.
 * Modos: bfs (onda en el agua, con COLA) · dfs (laberinto, con PILA de llamadas) ·
 *        matrix (matriz de adyacencia tocable) · path (ruta con menos carreteras).
 * Valida los datos al montar (si vienen mal muestra BadData) y reinicia el estado si cambia exercise.id.
 */
import { useEffect, useMemo } from 'react'
import type { ExerciseModule, ExerciseProps } from '../../engine/types'
import type { GraphSimData } from '../schemas'
import { BadData } from '../_shared/BadData'
import { normalize } from './logic'
import { TraversalGame } from './TraversalGame'
import { MatrixGame } from './MatrixGame'
import { PathGame } from './PathGame'
import './graph-sim.css'

function GraphSim(props: ExerciseProps<GraphSimData>) {
  const data = props.exercise?.data
  const parsed = useMemo(() => normalize(data), [data])
  const id = props.exercise?.id

  useEffect(() => {
    if ('cfg' in parsed && parsed.cfg.warnings.length > 0) {
      console.warn(`[graph-sim] ${id ?? ''}:\n- ${parsed.cfg.warnings.join('\n- ')}`)
    }
  }, [parsed, id])

  if ('error' in parsed) {
    return (
      <BadData
        message={`Este mapa tiene datos incorrectos: ${parsed.error} Avísale a tu profe.`}
        onSkip={() => props.onCheck(true)}
        locked={props.locked}
      />
    )
  }
  const { cfg } = parsed
  if (cfg.mode === 'matrix') return <MatrixGame key={id} cfg={cfg} {...props} />
  if (cfg.mode === 'path') return <PathGame key={id} cfg={cfg} {...props} />
  return <TraversalGame key={`${id}:${cfg.mode}`} cfg={cfg} {...props} />
}

export default {
  type: 'graph-sim',
  label: 'Mapa de carreteras (grafos)',
  Component: GraphSim,
} satisfies ExerciseModule<GraphSimData>

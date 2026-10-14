/**
 * hash-sim — casilleros de paquetería / tabla hash (Día 3).
 * Comportamiento exacto en src/exercises/schemas.ts (HashSimData).
 * Modos: insert (tocar el casillero de cada clave) y search (tocar en orden las claves que se comparan).
 * Estrategias: chaining (filas de vagones) y linear (prueba lineal con vuelta al 0).
 */
import { useMemo } from 'react'
import type { ExerciseModule, ExerciseProps } from '../../engine/types'
import type { HashSimData } from '../schemas'
import { BadData } from '../_shared/BadData'
import { Game } from './Game'
import { checkData } from './logic'
import './hash-sim.css'

function HashSim(props: ExerciseProps<HashSimData>) {
  const checked = useMemo(() => {
    const r = checkData(props.exercise?.data)
    if (r.ok && r.warnings.length && import.meta.env.DEV) {
      console.warn(`[hash-sim] ${props.exercise?.id}: ${r.warnings.join(' | ')}`)
    }
    return r
  }, [props.exercise?.data, props.exercise?.id])
  if (!checked.ok) {
    return (
      <BadData
        message={`Este reto tiene datos incorrectos: ${checked.errors.join(' ')} Avísale a tu profe.`}
        onSkip={() => props.onCheck(true)}
        locked={props.locked}
      />
    )
  }
  // key = id: si cambia el ejercicio se reinicia todo el estado interno
  return <Game key={props.exercise.id} {...props} cfg={checked.cfg} />
}

export default {
  type: 'hash-sim',
  label: 'Casilleros de paquetería (tabla hash)',
  Component: HashSim,
} satisfies ExerciseModule<HashSimData>

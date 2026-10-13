import type { Exercise } from '../../engine/types'
import type { HanoiData } from '../schemas'

/** Ejemplos CORRECTOS para la SALA DE PRUEBAS (?demo=1). */
export const examples: Exercise<HanoiData>[] = [
  {
    id: 'demo-hanoi-1',
    day: 2,
    tier: 1,
    type: 'hanoi',
    topic: 'Recursión',
    title: 'TORRES MINI',
    prompt: 'Pasa los 2 discos de la torre A a la torre C. Solo mueves **el disco de arriba** y **nunca uno grande sobre uno chico**.',
    hint: 'Primero el chiquito a la torre B, luego el grande a C, y el chiquito encima.',
    explanation:
      'Con 2 discos: el chico se hace a un lado (B), el grande pasa a C y el chico regresa encima. Son **3 movimientos = 2^2 - 1**. Es una muñeca rusa: **resolver el problema grande depende de resolver uno más chico**.',
    data: { disks: 2 },
  },
  {
    id: 'demo-hanoi-2',
    day: 2,
    tier: 2,
    type: 'hanoi',
    topic: 'Recursión',
    title: 'HANÓI AL CENTRO',
    prompt: 'Esta vez la meta es la torre B (la del centro). Mueve los 3 discos en **máximo 7 movimientos**.',
    hint: 'Para mover 3 discos: primero **2 discos a la torre auxiliar**, luego el grande, y de nuevo los 2 encima.',
    explanation:
      'Mover n discos = mover **n-1** a la torre auxiliar, mover el más grande a la meta y volver a mover los **n-1** encima. Cada llamada recursiva es más chica, igual que en la pila de llamadas. Mínimo: **2^n - 1 = 7 movimientos**.',
    data: { disks: 3, from: 0, to: 1, maxMoves: 7 },
  },
  {
    id: 'demo-hanoi-3',
    day: 2,
    tier: 4,
    type: 'hanoi',
    topic: 'Recursión',
    title: 'JEFE: 5 DISCOS',
    prompt: 'Jefe final: 5 discos de A a C en **máximo 31 movimientos**. Cada movimiento de más te acerca a los fantasmas.',
    hint: 'Trátalo como **4 discos + 1**: los 4 de arriba a B, el grande a C y los 4 de B a C.',
    explanation:
      'Con 5 discos la recursión llama a Hanói de 4 discos dos veces: **15 + 1 + 15 = 31 movimientos**. Cada disco extra duplica el trabajo más uno: **2^n - 1**.',
    data: { disks: 5, from: 0, to: 2, maxMoves: 31 },
  },
]

import type { Exercise } from '../../engine/types'
import type { SortSimData } from '../schemas'

/**
 * Ejemplos CORRECTOS para la SALA DE PRUEBAS (?demo=1). Cubren los 4 modos (bubble, partition con pivote
 * último y primero, merge con empate, radix de 2 rondas). Cada comentario trae la respuesta verificada con
 * logic.ts. NO usan los datos reservados para la presentación del día 5.
 */
export const examples: Exercise<SortSimData>[] = [
  // bubble (tier 1): [6, 3, 8, 2]
  // pasada 1 → 3 6 2 8 · pasada 2 → 3 2 6 8 · pasada 3 → 2 3 6 8 · 6 comparaciones, 4 intercambios
  {
    id: 'demo-sort-sim-1',
    day: 5,
    tier: 1,
    type: 'sort-sim',
    topic: 'Burbuja',
    title: 'BURBUJA',
    prompt:
      'Ordena de **menor a mayor** con **burbuja**: para cada par marcado elige **INTERCAMBIAR** (si el de la izquierda es mayor) o **DEJAR**.',
    hint: 'Solo comparas con el **de al lado**. Al final de cada pasada, el **más grande** ya llegó al final.',
    explanation:
      'En cada pasada el **más grande burbujea** hasta el final y queda fijo. Comparar a todos con todos cuesta **O(n²)**: con 4 valores fueron **6 comparaciones**.',
    data: { mode: 'bubble', values: [6, 3, 8, 2] },
  },

  // partition (tier 2): [8, 3, 11, 1, 9, 5], pivote = último (5)
  // menores 3, 1 · pivote 5 · mayores 8, 11, 9 → el 5 queda en el índice 2
  {
    id: 'demo-sort-sim-2',
    day: 5,
    tier: 2,
    type: 'sort-sim',
    topic: 'Quicksort',
    title: 'EL CAPITÁN',
    prompt:
      'El **pivote** es el **último** (el capitán). Para cada ficha, de izquierda a derecha, decide si es **MENOR** o **MAYOR** que el pivote.',
    hint: 'Solo compara cada ficha con el **pivote**, no entre ellas. Cada grupo **conserva su orden**.',
    explanation:
      'Tras la partición el pivote queda en su **lugar definitivo**: su índice es **cuántos son menores** (2). Luego quicksort repite lo mismo en cada lado (**recursión**).',
    data: { mode: 'partition', values: [8, 3, 11, 1, 9, 5], pivot: 'last' },
  },

  // merge (tier 2): izquierda [2, 5, 8, 9] y derecha [3, 5, 6]
  // salida 2 3 5(izq) 5(der) 6 8 9 · 5 comparaciones; el 8 y el 9 pasan solos
  {
    id: 'demo-sort-sim-3',
    day: 5,
    tier: 2,
    type: 'sort-sim',
    topic: 'Merge sort',
    title: 'DOS MONTONES',
    prompt:
      'Mezcla los dos montones **ya ordenados**: toca la **cabeza** que sale a la salida, siempre la **menor**. En **empate**, la del montón **izquierdo**.',
    hint: 'Solo comparas las dos **cabezas**. Cuando un montón se vacía, el otro **pasa solo**.',
    explanation:
      'Mezclar dos montones ordenados toma un paso por elemento. **Merge sort** parte a la mitad hasta montoncitos de 1 y mezcla de regreso: **O(n log n)** siempre.',
    data: { mode: 'merge', left: [2, 5, 8, 9], right: [3, 5, 6] },
  },

  // radix (tier 3): [42, 17, 35, 12, 50, 27], 2 rondas
  // unidades: 0:[50] 2:[42,12] 5:[35] 7:[17,27] → 50 42 12 35 17 27
  // decenas:  1:[12,17] 2:[27] 3:[35] 4:[42] 5:[50] → 12 17 27 35 42 50
  {
    id: 'demo-sort-sim-4',
    day: 5,
    tier: 3,
    type: 'sort-sim',
    topic: 'Radix',
    title: 'EL CARTERO',
    prompt:
      'Eres el **cartero**: reparte cada número en el casillero de su dígito de **unidades**, **RECOGE** del 0 al 9 y repite con las **decenas**.',
    hint: 'Al recoger, cada casillero sale en el **orden de llegada**. En la ronda 2 usa el **nuevo orden**.',
    explanation:
      'Radix **no compara**: reparte por dígito y recoge en orden. Tras las **unidades** y las **decenas**, los números de 2 dígitos quedan **ordenados**.',
    data: { mode: 'radix', values: [42, 17, 35, 12, 50, 27], rounds: 2 },
  },

  // partition (tier 4): [6, 9, 2, 7, 4, 1, 8], pivote = PRIMERO (6)
  // menores 2, 4, 1 · pivote 6 · mayores 9, 7, 8 → el 6 queda en el índice 3
  {
    id: 'demo-sort-sim-5',
    day: 5,
    tier: 4,
    type: 'sort-sim',
    topic: 'Quicksort',
    title: 'CAPITÁN AL FRENTE',
    prompt:
      'Ahora el **pivote** es el **primero**. Recorre las demás fichas de izquierda a derecha y mándalas a **MENORES** o **MAYORES**.',
    hint: 'El capitán es el **6**. Compara cada ficha **solo** con él.',
    explanation:
      'Hay **3** menores, así que el 6 queda en el **índice 3**. Los lados **todavía no están ordenados**: quicksort los parte otra vez con su propio pivote.',
    data: { mode: 'partition', values: [6, 9, 2, 7, 4, 1, 8], pivot: 'first' },
  },
]

export default examples

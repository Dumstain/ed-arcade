/** Ejemplos de "number" para la SALA DE PRUEBAS (?demo=1). Todos con respuesta correcta verificada. */
import type { Exercise } from '../../engine/types'
import type { NumberData } from '../schemas'

export const examples: Exercise<NumberData>[] = [
  {
    id: 'demo-number-1',
    day: 2,
    tier: 1,
    type: 'number',
    topic: 'Búsqueda secuencial',
    title: 'CUENTA COMPARACIONES',
    prompt: 'Búsqueda secuencial del 7. ¿Cuántas comparaciones hace hasta encontrarlo?',
    hint: 'Cada elemento que se revisa cuenta como una comparación.',
    explanation: 'Revisa 4, 9, 2 y 7: cuatro elementos revisados = 4 comparaciones.',
    data: {
      context: {
        array: { name: 'a', values: [4, 9, 2, 7, 5], highlight: [3] },
        note: 'Se revisa de izquierda a derecha, empezando en el índice 0.',
      },
      answer: 4,
      unit: 'comparaciones',
    },
  },
  {
    id: 'demo-number-2',
    day: 2,
    tier: 3,
    type: 'number',
    topic: 'Pilas',
    title: 'PUSH, POP, POP',
    prompt: 'Sigue las operaciones sobre la pila. ¿Cuánto vale x al final?',
    hint: 'Anota cómo queda la pila después de cada línea.',
    explanation:
      '[2,5] → push(8): [2,5,8] → pop() saca 8 → push(3): [2,5,3] → pop() saca 3 → x = pop() saca 5.',
    data: {
      context: {
        stack: { values: [2, 5], label: 'pila inicial' },
        code: 'p.push(8);\np.pop();\np.push(3);\np.pop();\nint x = p.pop();',
      },
      answer: 5,
    },
  },
  {
    id: 'demo-number-3',
    day: 2,
    tier: 4,
    type: 'number',
    topic: 'Búsqueda binaria',
    title: 'NO ESTÁ EL 5',
    prompt: 'Búsqueda binaria del 5 en este arreglo ordenado. ¿Qué número devuelve el método al terminar?',
    hint: 'Si el valor no existe, el método devuelve -1. Usa +/- para escribirlo.',
    explanation:
      'medio = 1 (vale 4) → el 5 está a la derecha, inicio = 2. medio = 2 (vale 6) → está a la izquierda, fin = 1. Como inicio > fin, no está: devuelve -1.',
    data: {
      context: {
        array: {
          name: 'a',
          values: [2, 4, 6, 8],
          pointers: [
            { label: 'inicio', index: 0 },
            { label: 'fin', index: 3 },
          ],
        },
        note: 'Si el valor no está, se devuelve -1.',
      },
      answer: -1,
    },
  },
]

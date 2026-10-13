import type { Exercise } from '../../engine/types'
import type { StackSimData } from '../schemas'

/** Ejemplos CORRECTOS para la SALA DE PRUEBAS (?demo=1): cubren los 3 modos y las 3 vistas. */
export const examples: Exercise<StackSimData>[] = [
  // popped + plates (tier 1)
  // push 3,7,5 → [3,7,5] · pop→5 · pop→7 → [3] · push 9 → [3,9] · pop→9
  {
    id: 'demo-stack-sim-1',
    day: 2,
    tier: 1,
    type: 'stack-sim',
    topic: 'Pilas',
    title: 'PLATOS QUE SALEN',
    prompt: 'Lee el programa y toca los platos en el orden en que salen con pop().',
    hint: 'Solo sale el plato de arriba: lo último que entró.',
    explanation: 'Una pila es LIFO: el último en entrar es el primero en salir, como los platos o el Ctrl+Z.',
    data: {
      mode: 'popped',
      view: 'plates',
      initial: [],
      ops: ['push(3)', 'push(7)', 'push(5)', 'pop()', 'pop()', 'push(9)', 'pop()'],
      palette: [3, 5, 7, 9],
      expected: [5, 7, 9],
    },
  },
  // build + array con capacidad 4 (tier 2) — probar de empujar de más: ¡DESBORDAMIENTO!
  // inicia [2] · push 4 → [2,4] · push 6 → [2,4,6] · pop → [2,4] · push 8 → [2,4,8] · push 1 → [2,4,8,1]
  {
    id: 'demo-stack-sim-2',
    day: 2,
    tier: 2,
    type: 'stack-sim',
    topic: 'Pilas',
    title: 'PILA EN ARREGLO',
    prompt: 'Ejecuta el programa y arma cómo queda la pila. Ojo: el arreglo tiene solo 4 casillas.',
    hint: 'pop() solo baja el tope; el siguiente push escribe encima del dato viejo.',
    explanation: 'En un arreglo, pop() no borra el dato: baja el tope. Y si la pila se llena, otro push es desbordamiento.',
    data: {
      mode: 'build',
      view: 'array',
      capacity: 4,
      initial: [2],
      ops: ['push(4)', 'push(6)', 'pop()', 'push(8)', 'push(1)'],
      palette: [1, 2, 4, 6, 8],
      expected: [2, 4, 8, 1],
    },
  },
  // trace + nodes (tier 3) — revisar paréntesis/corchetes
  // "(" push · a skip · "[" push · b skip · "]" pop · ")" pop · ")" error (pila vacía)
  {
    id: 'demo-stack-sim-3',
    day: 2,
    tier: 3,
    type: 'stack-sim',
    topic: 'Pilas',
    title: 'REVISA PARÉNTESIS',
    prompt: 'El comecocos revisa la expresión token por token. Abre = PUSH, cierra = POP, letra = IGNORAR, sobra = ¡ERROR!',
    hint: 'Si la pila está vacía y llega un cierre, no hay con qué emparejarlo.',
    explanation: 'Cada apertura se apila; cada cierre saca la última apertura. Si sobra un cierre, la expresión está mal.',
    data: {
      mode: 'trace',
      view: 'nodes',
      tokens: [
        { text: '(', action: 'push' },
        { text: 'a', action: 'skip' },
        { text: '[', action: 'push' },
        { text: 'b', action: 'skip' },
        { text: ']', action: 'pop' },
        { text: ')', action: 'pop' },
        { text: ')', action: 'error' },
      ],
    },
  },
]

export default examples

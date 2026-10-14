import type { Exercise } from '../../engine/types'
import type { QueueSimData } from '../schemas'

/**
 * Ejemplos CORRECTOS para la SALA DE PRUEBAS (?demo=1). Cubren los 3 modos (build, served, pointers),
 * las 3 vistas (line, ring, array) y la bicola (deque). Cada uno trae en el comentario el estado final
 * que sale de simular el programa con la convención del curso.
 */
export const examples: Exercise<QueueSimData>[] = [
  // build + ring (tier 2) — el carrusel DA LA VUELTA.
  // 5 casillas, frente en 3, arranca [10, 20] (casillas 3 y 4).
  // dequeue → [20] · enqueue 30 → casilla 0 (¡vuelta!) · enqueue 40 → 1 · enqueue 50 → 2 · dequeue → [30, 40, 50]
  // final: frente 0, final 2
  {
    id: 'demo-queue-sim-1',
    day: 3,
    tier: 2,
    type: 'queue-sim',
    topic: 'Colas',
    title: 'CARRUSEL QUE DA VUELTA',
    prompt:
      'Ejecuta el programa en el **carrusel** (cola circular de **5 casillas**) y arma cómo queda la cola, de **frente a final**.',
    hint: 'Al llegar a la última casilla, el **final** da la vuelta a la **casilla 0**: **final = (final + 1) % capacidad**.',
    explanation:
      'En una cola circular el índice **no se sale** del arreglo: usa **% capacidad** y **da la vuelta**. Así se reutilizan las casillas que ya se atendieron.',
    data: {
      mode: 'build',
      view: 'ring',
      capacity: 5,
      initialFront: 3,
      initial: [10, 20],
      ops: ['dequeue()', 'enqueue(30)', 'enqueue(40)', 'enqueue(50)', 'dequeue()'],
      palette: [30, 40, 50, 60],
      expected: [30, 40, 50],
    },
  },

  // served + line (tier 1) — la fila de las tortillas
  // [3, 8] · enqueue 5 → [3, 8, 5] · dequeue→3 · enqueue 1 → [8, 5, 1] · dequeue→8 · dequeue→5 · queda [1]
  {
    id: 'demo-queue-sim-2',
    day: 3,
    tier: 1,
    type: 'queue-sim',
    topic: 'Colas',
    title: 'QUIÉN SE ATIENDE',
    prompt: 'Lee el programa y toca los turnos en el **orden en que los atienden** en la tortillería.',
    hint: 'Atienden al de **adelante**: el que **llegó primero** sale primero.',
    explanation:
      'La cola es **FIFO**: el **primero en entrar** es el **primero en salir**. Los nuevos se forman **atrás**; nadie se cuela.',
    data: {
      mode: 'served',
      view: 'line',
      initial: [3, 8],
      ops: ['enqueue(5)', 'dequeue()', 'enqueue(1)', 'dequeue()', 'dequeue()'],
      palette: [1, 3, 5, 6, 8],
      expected: [3, 8, 5],
    },
  },

  // pointers + array + deque (tier 4) — la bicola circular
  // 6 casillas, frente en 1, [7, 2, 9] (casillas 1, 2 y 3)
  // addFirst 5 → frente 0 · addFirst 6 → frente 5 (¡vuelta hacia atrás!) · removeLast (sale 9) → final 2
  // addLast 4 → final 3 · removeFirst (sale 6) → frente 0 · queda [5, 7, 2, 4]: frente 0, final 3
  {
    id: 'demo-queue-sim-3',
    day: 3,
    tier: 4,
    type: 'queue-sim',
    topic: 'Colas',
    title: 'BICOLA EN ARREGLO',
    prompt:
      'Es una **bicola circular** de 6 casillas. Ejecuta el programa y toca la casilla donde terminan el **FRENTE** y el **FINAL**.',
    hint: '**addFirst** mueve el frente **hacia atrás** (con vuelta); **removeLast** mueve el final hacia atrás.',
    explanation:
      'En una bicola los dos extremos se mueven: **frente = (frente - 1 + capacidad) % capacidad** al meter por adelante y **final = (final - 1 + capacidad) % capacidad** al sacar por atrás.',
    data: {
      mode: 'pointers',
      view: 'array',
      deque: true,
      capacity: 6,
      initialFront: 1,
      initial: [7, 2, 9],
      ops: ['addFirst(5)', 'addFirst(6)', 'removeLast()', 'addLast(4)', 'removeFirst()'],
      expectedFront: 0,
      expectedRear: 3,
    },
  },

  // pointers + ring (tier 3) — frente y final con vuelta
  // 6 casillas, frente en 2, [4, 1, 6, 3] (casillas 2, 3, 4, 5)
  // dequeue ×2 → frente 4 · enqueue 9 → casilla 0 (vuelta) · enqueue 2 → 1 · enqueue 7 → 2
  // queda [6, 3, 9, 2, 7]: frente 4, final 2
  {
    id: 'demo-queue-sim-4',
    day: 3,
    tier: 3,
    type: 'queue-sim',
    topic: 'Colas',
    title: 'FRENTE Y FINAL',
    prompt:
      'Cola circular de **6 casillas**. Después del programa, ¿en qué casilla quedan el **FRENTE** y el **FINAL**? Primero el **FRENTE**, luego el **FINAL**.',
    hint: 'Cada **dequeue** mueve el **frente** una casilla; cada **enqueue** mueve el **final**. Después de la casilla **5** sigue la **0**.',
    explanation:
      'El **frente** avanzó 2 casillas (4) y el **final** dio la vuelta: de la 5 a la 0, 1 y 2. Los índices solo se mueven; **los datos viejos no se borran**.',
    data: {
      mode: 'pointers',
      view: 'ring',
      capacity: 6,
      initialFront: 2,
      initial: [4, 1, 6, 3],
      ops: ['dequeue()', 'dequeue()', 'enqueue(9)', 'enqueue(2)', 'enqueue(7)'],
      expectedFront: 4,
      expectedRear: 2,
    },
  },

  // build + line + deque (tier 4) — el vagón del metro con dos puertas
  // [3] · addLast 5 → [3, 5] · addFirst 8 → [8, 3, 5] · removeLast → [8, 3] · addFirst 2 → [2, 8, 3]
  // addLast 7 → [2, 8, 3, 7] · removeFirst → [8, 3, 7]
  {
    id: 'demo-queue-sim-5',
    day: 3,
    tier: 4,
    type: 'queue-sim',
    topic: 'Colas',
    title: 'VAGÓN DE METRO',
    prompt:
      'Un vagón con **dos puertas** (bicola): se entra y se sale por el **frente** y por el **final**. Ejecuta el programa y arma cómo queda, de **frente a final**.',
    hint: 'Fíjate en la **puerta** de cada operación: **addFirst** y **removeFirst** son del frente; **addLast** y **removeLast**, del final.',
    explanation:
      'Una **bicola** (deque) deja insertar y quitar por **los dos extremos**. Con una sola puerta sería una cola; con dos, es un vagón de metro.',
    data: {
      mode: 'build',
      view: 'line',
      deque: true,
      capacity: 5,
      initial: [3],
      ops: ['addLast(5)', 'addFirst(8)', 'removeLast()', 'addFirst(2)', 'addLast(7)', 'removeFirst()'],
      palette: [2, 5, 7, 8],
      expected: [8, 3, 7],
    },
  },
]

export default examples

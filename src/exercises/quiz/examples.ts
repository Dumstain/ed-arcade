/** Ejemplos de "quiz" para la SALA DE PRUEBAS (?demo=1). Todos con respuesta correcta verificada. */
import type { Exercise } from '../../engine/types'
import type { QuizData } from '../schemas'

export const examples: Exercise<QuizData>[] = [
  {
    id: 'demo-quiz-1',
    day: 2,
    tier: 1,
    type: 'quiz',
    topic: 'Pilas',
    title: 'EL PLATO DE ARRIBA',
    prompt: 'Mira la pila de platos. ¿Qué valor devuelve pop()?',
    hint: '**pop()** solo puede sacar el plato que está hasta arriba (el **tope**).',
    explanation:
      'Una pila es **LIFO**: el último en entrar es el primero en salir. Como un montón de platos, **pop()** quita el de arriba: aquí es el **5**.',
    data: {
      context: {
        stack: { values: [3, 7, 5], label: 'pila' },
        note: 'Piensa en platos: solo puedes tomar el **de arriba**.',
      },
      choices: ['3', '7', '5', 'Nada: la pila está vacía'],
      answer: 2,
    },
  },
  {
    id: 'demo-quiz-2',
    day: 2,
    tier: 2,
    type: 'quiz',
    topic: 'Búsqueda binaria',
    title: 'EL PUNTO MEDIO',
    prompt: 'En **búsqueda binaria**, inicio = 0 y fin = 5. ¿Cuál es el índice medio?',
    hint: 'medio = (inicio + fin) / 2, **división ENTERA**: se queda con la parte entera.',
    explanation: '(0 + 5) / 2 = 2.5, pero en Java la **división entera** descarta el .5: **medio = 2**.',
    data: {
      context: {
        array: {
          name: 'a',
          values: [2, 5, 8, 12, 16, 23],
          pointers: [
            { label: 'inicio', index: 0 },
            { label: 'fin', index: 5 },
          ],
        },
        note: '**medio = (inicio + fin) / 2**, entero.',
      },
      choices: ['2', '3', '2.5', '5'],
      answer: 0,
    },
  },
  {
    id: 'demo-quiz-3',
    day: 2,
    tier: 3,
    type: 'quiz',
    topic: 'Recursión',
    title: 'MUÑECAS RUSAS',
    prompt: 'Se llama fact(3). En el momento más profundo, ¿cuántas llamadas están apiladas a la vez?',
    hint: 'Cuenta desde fact(3) hasta la llamada que ya no llama a nadie (el caso base).',
    explanation:
      'fact(3) llama a fact(2), que llama a fact(1). fact(1) es el **caso base** y regresa 1. En ese punto hay **3 marcos** en la pila de llamadas.',
    data: {
      context: {
        code: 'int fact(int n) {\n  if (n <= 1) return 1;\n  return n * fact(n - 1);\n}',
      },
      choices: ['2 llamadas', '3 llamadas', '4 llamadas', '6 llamadas'],
      answer: 1,
      shuffle: false,
    },
  },
]

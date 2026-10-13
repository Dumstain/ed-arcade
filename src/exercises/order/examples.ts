import type { Exercise } from '../../engine/types'
import type { OrderData } from '../schemas'

/** Ejemplos CORRECTOS para la SALA DE PRUEBAS (?demo=1) */
export const examples: Exercise<OrderData>[] = [
  {
    id: 'demo-order-1',
    day: 2,
    tier: 1,
    type: 'order',
    topic: 'Pilas',
    title: 'EL ORDEN DE SALIDA',
    prompt: 'Se hacen 3 push y luego 3 pop. Toca los números en el orden en que SALEN de la pila.',
    hint: 'El último plato que pones es el primero que quitas.',
    explanation: 'Una pila es LIFO: el último en entrar es el primero en salir. Por eso salen 3, 2 y 1.',
    data: {
      context: {
        code: 'push(1);\npush(2);\npush(3);\npop(); pop(); pop();',
        stack: { values: [1, 2, 3], label: 'pila' },
      },
      items: ['3', '2', '1'],
      layout: 'row',
    },
  },
  {
    id: 'demo-order-2',
    day: 2,
    tier: 2,
    type: 'order',
    topic: 'Recursión',
    title: 'LLAMADAS Y REGRESOS',
    prompt: 'Ordena lo que pasa al ejecutar factorial(3): primero se apilan las llamadas y luego van regresando.',
    hint: 'Las llamadas bajan hasta el caso base; los valores suben de regreso.',
    explanation:
      'Primero se apilan las llamadas (como muñecas rusas) hasta el caso base. Luego cada marco regresa su valor al que lo llamó: 1, luego 2 y al final 6.',
    data: {
      items: [
        'factorial(3) llama a factorial(2)',
        'factorial(2) llama a factorial(1)',
        'factorial(1) es el caso base y regresa 1',
        'factorial(2) regresa 2 * 1 = 2',
        'factorial(3) regresa 3 * 2 = 6',
      ],
      layout: 'list',
    },
  },
  {
    id: 'demo-order-3',
    day: 2,
    tier: 3,
    type: 'order',
    topic: 'Recursión',
    title: 'EL ÁRBOL DE fib(3)',
    prompt: '¿En qué orden se EMPIEZAN las llamadas de fib(3)? Siempre primero la rama izquierda y luego la derecha.',
    hint: 'fib(3) llama primero a fib(2) y este, a su vez, llama a fib(1) y a fib(0).',
    explanation:
      'fib(3) llama a fib(2) y fib(1). Pero antes de llegar a fib(1) se termina toda la rama de fib(2), que llama a fib(1) y a fib(0). Nota que fib(1) se calcula dos veces: trabajo repetido.',
    data: {
      context: {
        code: 'int fib(int n) {\n  if (n <= 1) return n;\n  return fib(n - 1) + fib(n - 2);\n}',
      },
      items: ['fib(3)', 'fib(2)', 'fib(1)', 'fib(0)', 'fib(1)'],
      layout: 'row',
    },
  },
]

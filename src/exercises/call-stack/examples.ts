import type { Exercise } from '../../engine/types'
import type { CallStackData } from '../schemas'

/** Ejemplos para la SALA DE PRUEBAS (?demo=1). */
export const examples: Exercise<CallStackData>[] = [
  {
    id: 'demo-call-stack-1',
    day: 2,
    tier: 1,
    type: 'call-stack',
    topic: 'Recursividad',
    title: 'MUÑECAS RUSAS',
    prompt: 'Baja por la pila: abre muñecas hasta llegar a la más chiquita (el caso base). Las demás se resuelven solas.',
    hint: 'La muñeca que ya no llama a nadie más es el caso base.',
    explanation:
      'Cada llamada abre una muñeca más pequeña. El caso base es la muñeca que ya no se abre: ahí empiezan a regresar los valores.',
    data: {
      askReturns: false,
      frames: [
        { call: 'factorial(3)', expr: '3 * factorial(2)', returns: 6 },
        { call: 'factorial(2)', expr: '2 * factorial(1)', returns: 2 },
        { call: 'factorial(1)', expr: 'return 1', returns: 1, base: true },
      ],
    },
  },
  {
    id: 'demo-call-stack-2',
    day: 2,
    tier: 2,
    type: 'call-stack',
    topic: 'Recursividad',
    title: 'BAJAR Y SUBIR',
    prompt: 'Baja hasta el caso base y luego sube: escribe el valor que regresa cada llamada.',
    hint: 'Al subir, cambia la llamada de la expresión por el valor que regresó la muñeca de arriba.',
    explanation:
      'Primero se apilan las llamadas (platos) hasta el caso base. Después se desapilan una por una y cada valor sube a la llamada de abajo: 1, 3, 6 y 10.',
    data: {
      frames: [
        { call: 'suma(4)', expr: '4 + suma(3)', returns: 10 },
        { call: 'suma(3)', expr: '3 + suma(2)', returns: 6 },
        { call: 'suma(2)', expr: '2 + suma(1)', returns: 3 },
        { call: 'suma(1)', expr: 'return 1', returns: 1, base: true },
      ],
    },
  },
  {
    id: 'demo-call-stack-3',
    day: 2,
    tier: 3,
    type: 'call-stack',
    topic: 'Recursividad',
    title: 'SIN CASO BASE',
    prompt: 'Esta función no tiene caso base. Sigue llamando hasta que la pila toque el techo y entonces avisa.',
    hint: 'Cuando la barra de PILA se llena y toca el techo, ya no cabe otra llamada.',
    explanation:
      'Sin caso base nadie detiene la recursión: las muñecas se siguen abriendo hasta llenar la pila y el programa truena con un StackOverflowError.',
    data: {
      overflow: true,
      frames: [
        { call: 'infinito(1)', expr: 'return infinito(2)', returns: 0 },
        { call: 'infinito(2)', expr: 'return infinito(3)', returns: 0 },
        { call: 'infinito(3)', expr: 'return infinito(4)', returns: 0 },
        { call: 'infinito(4)', expr: 'return infinito(5)', returns: 0 },
        { call: 'infinito(5)', expr: 'return infinito(6)', returns: 0 },
      ],
    },
  },
]

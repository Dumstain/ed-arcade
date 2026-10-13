import type { Exercise } from '../../engine/types'
import type { RecNode, RecTreeData } from '../schemas'

/** Árbol de llamadas de fib(n) (valores calculados, no a mano). */
function fibTree(n: number): RecNode {
  if (n <= 1) return { label: `fib(${n})`, value: n }
  const a = fibTree(n - 1)
  const b = fibTree(n - 2)
  return { label: `fib(${n})`, value: Number(a.value) + Number(b.value), children: [a, b] }
}

/** Suma por mitades de a = [3, 1, 4, 2]: suma(ini,fin) */
const sumaMitades: RecNode = {
  label: 'suma(0,3)',
  value: 10,
  children: [
    {
      label: 'suma(0,1)',
      value: 4,
      children: [
        { label: 'suma(0,0)', value: 3 },
        { label: 'suma(1,1)', value: 1 },
      ],
    },
    {
      label: 'suma(2,3)',
      value: 6,
      children: [
        { label: 'suma(2,2)', value: 4 },
        { label: 'suma(3,3)', value: 2 },
      ],
    },
  ],
}

/** Ejemplos para la SALA DE PRUEBAS (?demo=1). */
export const examples: Exercise<RecTreeData>[] = [
  {
    id: 'demo-rec-tree-1',
    day: 2,
    tier: 1,
    type: 'rec-tree',
    topic: 'Recursividad',
    title: 'ÁRBOL DE FIBONACCI',
    prompt: 'Las **hojas** ya saben su valor. Sube por el árbol: cada fib(n) es **la suma de sus dos hijas**.',
    hint: '**fib(3) = fib(2) + fib(1)**. Empieza por los nodos de más abajo.',
    explanation:
      'Cada llamada se divide en dos más pequeñas, como muñecas que se abren en dos. Los valores suben de las hojas (**casos base**) hacia la raíz.',
    data: { mode: 'fill', root: fibTree(4), given: 'leaves' },
  },
  {
    id: 'demo-rec-tree-2',
    day: 2,
    tier: 3,
    type: 'rec-tree',
    topic: 'Recursividad',
    title: 'TRABAJO REPETIDO',
    prompt: 'Atrapa con un fantasma todas las llamadas **fib(2)** del árbol. ¡Mira cuánto **trabajo se repite**!',
    hint: 'Busca cajitas con el mismo letrero: **fib(2)**.',
    explanation:
      'fib(2) se calcula **tres veces** desde cero. La recursión sin memoria **repite trabajo**: por eso fib(40) tarda tanto.',
    data: { mode: 'count', root: fibTree(5), target: 'fib(2)' },
  },
  {
    id: 'demo-rec-tree-3',
    day: 2,
    tier: 2,
    type: 'rec-tree',
    topic: 'Recursividad',
    title: 'SUMA POR MITADES',
    prompt: 'Para a = [3, 1, 4, 2], suma(ini,fin) **parte el arreglo a la mitad**. Calcula el valor de **TODAS** las llamadas.',
    hint: 'suma(0,0) es **a[0] = 3**. Cada padre suma lo que regresan sus dos hijas.',
    explanation:
      '**Divide y vencerás**: la llamada se parte en mitades hasta tener un solo elemento (**caso base**) y luego los resultados se suman al subir.',
    data: { mode: 'fill', root: sumaMitades, given: 'none' },
  },
]

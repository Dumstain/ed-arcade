/** Ejemplos CORRECTOS para la SALA DE PRUEBAS (?demo=1). */
import type { Exercise } from '../../engine/types'
import type { SearchSimData } from '../schemas'

// Arreglo del curso (Dia1.java): secuencial(47) = 10 comparaciones, binaria(47) = 4, binaria(50) = -1
const D = [4, 9, 13, 18, 22, 27, 31, 36, 42, 47, 53, 58]

export const examples: Exercise<SearchSimData>[] = [
  {
    id: 'demo-search-sim-1',
    day: 2,
    tier: 1,
    type: 'search-sim',
    topic: 'Búsqueda secuencial',
    title: 'LAS LLAVES PERDIDAS',
    prompt: 'Busca el 22 como buscas tus llaves: bolsillo por bolsillo. Toca las celdas **en orden**, empezando por la 0.',
    hint: 'Empieza en la celda 0 y avanza de una en una hasta ver el 22.',
    explanation:
      'La **búsqueda secuencial** revisa **uno por uno**. El 22 está en el índice 4, así que fueron **5 comparaciones** (índices 0, 1, 2, 3 y 4).',
    data: { algorithm: 'sequential', mode: 'play', values: D, target: 22 },
  },
  {
    id: 'demo-search-sim-2',
    day: 2,
    tier: 2,
    type: 'search-sim',
    topic: 'Búsqueda binaria',
    title: 'ADIVINA EL NÚMERO',
    prompt:
      'Busca el 50 con **búsqueda binaria**. En cada paso toca la celda del **MEDIO**. Si el número no está, avisa con **NO ESTÁ**.',
    hint: '**medio = (inicio + fin) / 2**, sin decimales. Si a[medio] es menor, **inicio = medio + 1**; si es mayor, **fin = medio - 1**.',
    explanation:
      'Como adivinar un número con "más alto / más bajo": cada comparación **descarta la mitad**. Revisaste 27, 42, 53 y 47 (**4 comparaciones**) y al final **inicio (10) > fin (9)**: **caso base**, devuelve **-1**.',
    data: { algorithm: 'binary', mode: 'play', values: D, target: 50, showCallStack: true },
  },
  {
    id: 'demo-search-sim-3',
    day: 2,
    tier: 3,
    type: 'search-sim',
    topic: 'Comparar búsquedas',
    title: '¿CUÁNTAS COMPARAS?',
    prompt:
      'Con **búsqueda binaria**, ¿cuántas comparaciones se hacen para encontrar el 47? Escribe tu predicción y mira cómo el comecocos lo revisa.',
    hint: 'Calcula cada medio: el primero es **(0 + 11) / 2 = 5**. Descarta una mitad y repite.',
    explanation:
      'Los medios fueron 27, 42, 53 y 47: **4 comparaciones**. La búsqueda secuencial habría hecho **10** para el mismo número.',
    data: { algorithm: 'binary', mode: 'predict', values: D, target: 47 },
  },
]

import type { Exercise } from '../../engine/types'
import type { ClassifyData } from '../schemas'

/** Ejemplos CORRECTOS para la SALA DE PRUEBAS (?demo=1) */
export const examples: Exercise<ClassifyData>[] = [
  {
    id: 'demo-classify-1',
    day: 2,
    tier: 1,
    type: 'classify',
    topic: 'Pilas',
    title: 'PUSH O POP',
    prompt: 'Toca una ficha y luego el casillero donde va: ¿mete algo a la pila (**push**) o saca algo (**pop**)?',
    hint: '**Push** = poner encima. **Pop** = quitar lo de arriba (el **tope**).',
    explanation:
      '**push** agrega al tope de la pila y **pop** quita el tope. Cuando una llamada termina, su marco se desapila, igual que un **pop**.',
    data: {
      bins: [
        { id: 'push', label: 'PUSH', icon: 'inbox' },
        { id: 'pop', label: 'POP', icon: 'outbox' },
      ],
      items: [
        { text: 'Poner un plato **encima**', bin: 'push' },
        { text: 'Quitar el plato de **arriba**', bin: 'pop' },
        { text: 'Meter el 7 al tope', bin: 'push' },
        { text: 'Sacar el tope', bin: 'pop' },
        { text: 'Apilar una llamada nueva', bin: 'push' },
        { text: 'Una llamada termina y se desapila', bin: 'pop' },
      ],
    },
  },
  {
    id: 'demo-classify-2',
    day: 2,
    tier: 3,
    type: 'classify',
    topic: 'Pilas',
    title: 'PILA LLENA O VACÍA',
    prompt: 'Una pila tiene capacidad 5. Manda cada situación al casillero que le toca.',
    hint: '**Push** en pila llena y recursión sin fin llenan la pila. **Pop** o tope sin elementos fallan por pila vacía.',
    explanation:
      'Sin espacio, un push provoca **desbordamiento (overflow)**; una recursión sin caso base apila marcos hasta llenar la pila de llamadas. Sacar o ver el tope sin elementos falla porque la pila está vacía.',
    data: {
      bins: [
        { id: 'ok', label: 'TODO BIEN', icon: 'check' },
        { id: 'llena', label: 'LLENA', icon: 'boom' },
        { id: 'vacia', label: 'VACÍA', icon: 'no' },
      ],
      items: [
        { text: 'push(4) con 2 de 5 espacios usados', bin: 'ok' },
        { text: 'pop() con 1 elemento', bin: 'ok' },
        { text: 'push(9) con la pila **llena**', bin: 'llena' },
        { text: 'Recursión sin caso base', bin: 'llena' },
        { text: 'pop() con la pila **vacía**', bin: 'vacia' },
        { text: 'tope() sin elementos', bin: 'vacia' },
      ],
    },
  },
  {
    id: 'demo-classify-3',
    day: 2,
    tier: 4,
    type: 'classify',
    topic: 'Pilas y recursión',
    title: 'JEFE: ¿DE QUÉ TEMA?',
    prompt: 'Manda cada ficha al tema del día 2 al que pertenece.',
    hint: 'Piensa en una palabra clave de cada tema: pila, llamadas, discos y ramas.',
    explanation:
      'push y tope son de la pila. Cada llamada recursiva crea un marco en la pila de llamadas. Hanói usa discos y necesita **2^n - 1 pasos**. En el árbol de llamadas, las hojas son los casos base y fib(2) aparece repetido.',
    data: {
      bins: [
        { id: 'pila', label: 'PILA', icon: 'plates' },
        { id: 'llamadas', label: 'LLAMADAS', icon: 'book' },
        { id: 'hanoi', label: 'HANÓI', icon: 'tower' },
        { id: 'arbol', label: 'ÁRBOL', icon: 'tree' },
      ],
      items: [
        { text: 'push', bin: 'pila' },
        { text: 'tope', bin: 'pila' },
        { text: 'un marco por llamada', bin: 'llamadas' },
        { text: 'regresa al que llamó', bin: 'llamadas' },
        { text: 'discos', bin: 'hanoi' },
        { text: '**2^n - 1** pasos', bin: 'hanoi' },
        { text: 'hojas', bin: 'arbol' },
        { text: 'fib(2) repetido', bin: 'arbol' },
      ],
    },
  },
]

import type { Exercise } from '../../engine/types'
import type { RefCardsData } from '../schemas'

export const examples: Exercise<RefCardsData>[] = [
  {
    id: 'demo-ref-cards-1',
    day: 2,
    tier: 1,
    type: 'ref-cards',
    topic: 'Referencias y null',
    title: 'UNA TARJETA EN BLANCO',
    prompt: 'La variable a es una **tarjeta con la dirección** de una casa. Ejecuta el programa línea por línea y apunta la tarjeta.',
    hint: 'Con **null** la tarjeta queda en blanco: no lleva a ninguna casa.',
    explanation: 'a no ES el arreglo: es una **tarjeta con su dirección**. Con **a = null** la tarjeta queda en blanco y, si intentas ir, truena.',
    data: {
      vars: ['a'],
      objects: [{ id: 'arr1', label: '[1, 2, 3]' }],
      steps: [
        {
          code: 'int[] a = {1, 2, 3};',
          expect: { a: 'arr1' },
          explain: 'Se construye la casa [1, 2, 3] y a guarda su **dirección**.',
        },
        {
          code: 'a = null;',
          expect: { a: null },
          explain: 'La tarjeta quedó **en blanco**. La casa sigue ahí, pero a ya no sabe llegar.',
        },
      ],
      finalQuestion: {
        text: '¿Qué pasa si ahora ejecutas a[0]?',
        choices: ['Truena (**NullPointerException**)', 'Regresa 1', 'Regresa 0'],
        answer: 0,
      },
    },
  },
  {
    id: 'demo-ref-cards-2',
    day: 2,
    tier: 2,
    type: 'ref-cards',
    topic: 'Referencias y null',
    title: 'COPIAR LA TARJETA',
    prompt: 'Sigue el programa. Ojo: b = a **copia la tarjeta, no la casa**.',
    hint: 'Después de int[] b = a; las **dos tarjetas llevan a la misma casa**.',
    explanation: 'b = a **copia la dirección, no el arreglo**. Hay **UNA sola casa** y dos tarjetas: lo que cambie b se ve desde a.',
    data: {
      vars: ['a', 'b'],
      objects: [{ id: 'arr1', label: '[1, 2, 3]' }],
      steps: [
        { code: 'int[] a = {1, 2, 3};', expect: { a: 'arr1' } },
        {
          code: 'int[] b = a;',
          expect: { a: 'arr1', b: 'arr1' },
          explain: 'b copió la tarjeta de a: **misma dirección, misma casa**.',
        },
        {
          code: 'b[0] = 9;',
          expect: { a: 'arr1', b: 'arr1' },
          labels: { arr1: '[9, 2, 3]' },
          explain: 'Cambiaste el **contenido de la casa**. Las dos tarjetas lo ven.',
        },
      ],
      finalQuestion: { text: '¿Cuánto vale a[0]?', choices: ['1', '9', 'null'], answer: 1 },
    },
  },
  {
    id: 'demo-ref-cards-3',
    day: 2,
    tier: 3,
    type: 'ref-cards',
    topic: 'Referencias y null',
    title: 'DOS CASAS, 2 TARJETAS',
    prompt: '**new** construye una **casa nueva**. Sigue las tarjetas paso a paso y decide a qué apunta cada una.',
    explanation: '**new** crea otra casa y b se muda a ella; a conserva la dirección vieja. Al poner a en **null**, nadie más sabe llegar a la primera casa.',
    data: {
      vars: ['a', 'b'],
      objects: [
        { id: 'arr1', label: '[1, 2, 3]' },
        { id: 'arr2', label: '[7, 8]', appearsAt: 2 },
      ],
      steps: [
        { code: 'int[] a = {1, 2, 3};', expect: { a: 'arr1' } },
        { code: 'int[] b = a;', expect: { a: 'arr1', b: 'arr1' }, explain: '**Dos tarjetas, una sola casa.**' },
        {
          code: 'b = new int[]{7, 8};',
          expect: { a: 'arr1', b: 'arr2' },
          explain: '**new** levantó una casa nueva. Solo **b** cambió de dirección; a sigue igual.',
        },
        {
          code: 'a = null;',
          expect: { a: null, b: 'arr2' },
          explain: 'a quedó en blanco. La casa [1, 2, 3] **ya no tiene ninguna tarjeta** que lleve a ella.',
        },
      ],
      finalQuestion: {
        text: '¿Qué casa se quedó sin ninguna tarjeta que llegue a ella?',
        choices: ['La de [1, 2, 3]', 'La de [7, 8]', 'Ninguna'],
        answer: 0,
      },
    },
  },
]

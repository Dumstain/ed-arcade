import type { Exercise } from '../../engine/types'
import type { ListSimData } from '../schemas'

/**
 * Ejemplos CORRECTOS para la SALA DE PRUEBAS (?demo=1). Cubren los 2 modos (relink, traverse),
 * las 3 clases de lista (simple, doble, circular), los dos sentidos (sig, ant), la declaración
 * "Nodo q = ..." y los distractores que pierden vagones (el fantasma se los come) o truenan con null.
 * Todos se validan al montar: el simulador busca una solución con el banco (si no hay, sale BadData).
 */
export const examples: Exercise<ListSimData>[] = [
  // relink · simple (tier 1). Solución: nuevo.sig = p.sig;  p.sig = nuevo;
  // Distractores: "p.sig = nuevo;" primero pierde el 9 · "p.sig = nuevo.sig;" pierde el 9 · "nuevo = p.sig;" pierde el 5
  {
    id: 'demo-list-sim-1',
    day: 3,
    tier: 1,
    type: 'list-sim',
    topic: 'Listas enlazadas',
    title: 'ENGANCHA EL VAGÓN',
    prompt: 'Inserta el vagón **nuevo** justo **después de p**. Toca las asignaciones **en orden**: si un vagón se queda sin flecha, el fantasma se lo come.',
    hint: 'Primero que **nuevo** se agarre del resto del tren (**nuevo.sig = p.sig**) y luego engancha **p** con **nuevo**.',
    explanation:
      'El orden importa: si haces **p.sig = nuevo** primero, nadie recuerda dónde estaba el **9** y se pierde. Por eso primero **nuevo.sig = p.sig** y después **p.sig = nuevo**.',
    data: {
      mode: 'relink',
      kind: 'simple',
      nodes: [
        { id: 'n1', value: 3, sig: 'n2' },
        { id: 'n2', value: 7, sig: 'n3' },
        { id: 'n3', value: 9, sig: null },
        { id: 'n9', value: 5, sig: null },
      ],
      vars: { inicio: 'n1', p: 'n2', nuevo: 'n9' },
      op: 'Inserta el **5** después de **p**.',
      bank: ['p.sig = nuevo;', 'nuevo.sig = p.sig;', 'p.sig = nuevo.sig;', 'nuevo = p.sig;'],
      expected: [3, 7, 5, 9],
    },
  },

  // traverse · circular (tier 2). Desde p (8): 8 → 15 → 16 → 4 → y regresa al 8.
  {
    id: 'demo-list-sim-2',
    day: 3,
    tier: 2,
    type: 'list-sim',
    topic: 'Listas circulares',
    title: 'LA VUELTA AL CIRCUITO',
    prompt: 'Recorre la lista **circular** desde **p** siguiendo **sig**. Toca los vagones en orden y termina cuando **regreses** al primero.',
    hint: 'En una lista circular el **último** apunta al **primero**: nunca llegas a null.',
    explanation:
      'Una lista circular **no tiene null al final**: el último vagón se engancha con el primero. Por eso el ciclo se detiene cuando **p vuelve al vagón donde empezó**.',
    data: {
      mode: 'traverse',
      kind: 'circular',
      nodes: [
        { id: 'a', value: 4, sig: 'b' },
        { id: 'b', value: 8, sig: 'c' },
        { id: 'c', value: 15, sig: 'd' },
        { id: 'd', value: 16, sig: 'a' },
      ],
      vars: { inicio: 'a', p: 'b' },
      start: 'p',
    },
  },

  // traverse · doble hacia atrás (tier 3). Desde fin por ant: Son → Rap → Ska → Pop → null (el de la izquierda).
  {
    id: 'demo-list-sim-3',
    day: 3,
    tier: 3,
    type: 'list-sim',
    topic: 'Listas dobles',
    title: 'PLAYLIST AL REVÉS',
    prompt: 'Escucha la playlist **de atrás para adelante**: empieza en **fin** y sigue la flecha **ant** hasta llegar a **null**.',
    hint: 'La flecha **ant** (abajo, en rosa) apunta a la canción **anterior**. El ant de la primera es **null**.',
    explanation:
      'Con una lista **doble** puedes ir en los dos sentidos: **sig** hacia adelante y **ant** hacia atrás, como los botones de una playlist.',
    data: {
      mode: 'traverse',
      kind: 'doble',
      nodes: [
        { id: 'a', value: 'Pop', sig: 'b', ant: null },
        { id: 'b', value: 'Ska', sig: 'c', ant: 'a' },
        { id: 'c', value: 'Rap', sig: 'd', ant: 'b' },
        { id: 'd', value: 'Son', sig: null, ant: 'c' },
      ],
      vars: { inicio: 'a', fin: 'd' },
      start: 'fin',
      dir: 'ant',
    },
  },

  // relink · doble (tier 4). Una solución: nuevo.sig = p.sig; nuevo.ant = p; p.sig.ant = nuevo; p.sig = nuevo;
  // Trampas: "p.sig = nuevo;" antes de tiempo pierde Rap · "p.sig.ant = nuevo;" después de p.sig = nuevo deja mal el ant de Rap
  // · "nuevo.ant = nuevo.sig;" truena con null si nuevo.sig aún es null.
  {
    id: 'demo-list-sim-4',
    day: 3,
    tier: 4,
    type: 'list-sim',
    topic: 'Listas dobles',
    title: 'METE LA CANCIÓN',
    prompt: 'Mete la canción **nuevo** en la playlist **después de p**. En una lista doble hay que arreglar **4 flechas**: dos **sig** y dos **ant**.',
    hint: 'Primero engancha a **nuevo** (sus flechas sig y ant). Luego avisa al de adelante (**p.sig.ant**) y al final a **p.sig**.',
    explanation:
      'Insertar en una lista doble cambia **4 flechas**. Si mueves **p.sig** antes de tiempo, **p.sig.ant** ya no es el vagón que crees y la playlist queda mal enlazada.',
    data: {
      mode: 'relink',
      kind: 'doble',
      nodes: [
        { id: 'a', value: 'Pop', sig: 'b', ant: null },
        { id: 'b', value: 'Ska', sig: 'c', ant: 'a' },
        { id: 'c', value: 'Rap', sig: null, ant: 'b' },
        { id: 'x', value: 'Son', sig: null, ant: null },
      ],
      vars: { inicio: 'a', p: 'b', nuevo: 'x' },
      op: 'Inserta **Son** después de **p** (Ska).',
      bank: ['p.sig = nuevo;', 'nuevo.sig = p.sig;', 'nuevo.ant = p;', 'p.sig.ant = nuevo;', 'nuevo.ant = nuevo.sig.sig;'],
      expected: ['Pop', 'Ska', 'Son', 'Rap'],
    },
  },
]

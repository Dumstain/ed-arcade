/** Ejemplos CORRECTOS para la SALA DE PRUEBAS (?demo=1). Uno por modo. */
import type { Exercise } from '../../engine/types'
import type { BstSimData } from '../schemas'

export const examples: Exercise<BstSimData>[] = [
  {
    id: 'demo-bst-sim-1',
    day: 4,
    tier: 1,
    type: 'bst-sim',
    topic: 'Árboles binarios de búsqueda',
    title: 'ARCHIVA CARPETAS',
    prompt:
      'El árbol está **vacío**. Inserta **40, 20, 60, 30 y 50** en ese orden: toca el **hueco** donde queda cada clave. Menores a la **izquierda**, mayores a la **derecha**.',
    hint: 'Compara siempre **desde la raíz**: si la clave es **menor** baja a la izquierda; si es **mayor**, a la derecha. Repite hasta llegar a un hueco.',
    explanation:
      'Cada clave **baja comparando** desde la raíz hasta un hueco vacío. El primero en llegar (40) se queda como **raíz**. Lee el árbol de izquierda a derecha: **20 30 40 50 60**, ¡quedó **ordenado**!',
    data: { mode: 'insert', initial: [], keys: [40, 20, 60, 30, 50] },
  },
  {
    id: 'demo-bst-sim-2',
    day: 4,
    tier: 2,
    type: 'bst-sim',
    topic: 'Búsqueda en BST',
    title: '¿DÓNDE ESTÁ EL 42?',
    prompt:
      'Busca el **42**. Toca, desde la **raíz**, cada carpeta con la que se compara. Si caes en un **hueco vacío**, toca **NO ESTÁ**.',
    hint: '42 < 50 → izquierda. 42 > 30 → derecha. Sigue así hasta encontrarlo o caer en un hueco.',
    explanation:
      'Se compara con **50, 30, 40 y 45** (**4 comparaciones**) y luego hay un **hueco vacío**: el 42 **no está**. Como la búsqueda binaria del día 1, cada comparación **descarta un lado completo**.',
    data: { mode: 'search', initial: [50, 30, 70, 20, 40, 60, 80, 35, 45], target: 42 },
  },
  {
    id: 'demo-bst-sim-3',
    day: 4,
    tier: 3,
    type: 'bst-sim',
    topic: 'Recorridos de árboles',
    title: 'VACÍA LAS CARPETAS',
    prompt:
      'Recorre el árbol en **postorden** (**IZQ → DER → RAÍZ**): toca **todas** las carpetas en el orden en que se visitan.',
    hint: 'Una carpeta sale **hasta que salieron sus dos hijas**. Empieza por la más profunda de la izquierda.',
    explanation:
      'Postorden: **20 40 30 60 80 70 50**. Como **borrar una carpeta**: primero vacías lo de adentro y al final la carpeta. Por eso la **raíz sale al último**.',
    data: { mode: 'traversal', initial: [50, 30, 70, 20, 40, 60, 80], traversal: 'postorden' },
  },
  {
    id: 'demo-bst-sim-4',
    day: 4,
    tier: 4,
    type: 'bst-sim',
    topic: 'Eliminar en BST',
    title: 'ADIÓS A LA RAÍZ',
    prompt:
      'Elimina el **50** (la raíz). Toca la carpeta que **ocupa su lugar**, o **NADIE** si nadie lo ocupa.',
    hint: 'El 50 tiene **dos hijos**: sube su **sucesor**, el **menor del lado derecho**. Baja una vez a la derecha y luego **siempre a la izquierda**.',
    explanation:
      'Con dos hijos sube el **sucesor (60)**: es el menor de los mayores, así todo sigue **ordenado**. Y como el 60 tenía un hijo derecho, el **65 sube** a donde estaba el 60.',
    data: { mode: 'delete', initial: [50, 30, 70, 20, 40, 60, 80, 65, 35], target: 50 },
  },
]

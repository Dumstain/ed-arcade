/**
 * DÍA 5 — ORDENAMIENTO (viernes 16-oct-2026) · candado manual del profesor
 * Orden de juego: tier 1 (CALENTAMIENTO) → tier 2 (RETO) → tier 3 (COMBO) → tier 4 (JEFE FINAL DEL CURSO).
 * Analogías del curso: burbuja = formarse por estatura comparando con el de al lado (el más alto
 * burbujea al final; «todos saludan a todos», O(n²)); quicksort = el PIVOTE es el capitán (chicos a
 * su izquierda, grandes a su derecha; se repite en cada lado: recursión); mezclar = dos montones de
 * exámenes ya ordenados (tomas el de arriba más chico; empate → izquierda); merge sort = partir a la
 * mitad hasta montoncitos de 1 y mezclar de regreso, O(n log n); radix = el cartero con casilleros
 * 0–9 (recoge del 0 al 9 en orden de llegada); externo = exámenes que no caben en el escritorio.
 * Java: Arrays.sort con primitivos = quicksort de doble pivote; con objetos = TimSort (estable).
 * Convenciones (sort-sim): de MENOR a MAYOR; burbuja compara [j, j+1] con j = 0 … n−2−pasada e
 * intercambia si el izquierdo es MAYOR; partición con pivote = ÚLTIMO, cada lado conserva su orden y
 * el pivote queda en el índice = cuántos son menores; mezcla: la cabeza menor, empate → izquierda;
 * radix: unidades y luego decenas, recogiendo del casillero 0 al 9 en orden de llegada.
 * Los datos de la presentación del día 5 NO se usan aquí. Respuestas verificadas con un script
 * (burbuja por pares, partición, mezcla con empates, radix estable, binaria, ABB, quicksort recursivo).
 */
import type { Exercise } from '../engine/types'
import type {
  BstSimData,
  ClassifyData,
  NumberData,
  OrderData,
  QuizData,
  SearchSimData,
  SortSimData,
} from '../exercises/schemas'

const day5: Exercise[] = [
  // ═════════════════════ TIER 1 · CALENTAMIENTO (conceptos tal cual se vieron en clase) ═════════════════════
  {
    id: 'd5-burbuja-pasada',
    day: 5,
    tier: 1,
    type: 'sort-sim',
    topic: 'Burbuja',
    title: 'FORMADOS POR ESTATURA',
    prompt:
      'Burbuja = formarse por estatura **comparando solo con el de al lado**. En cada par marcado elige **INTERCAMBIAR** si el de la izquierda es mayor, o **DEJAR**. Juega una pasada.',
    hint: 'Solo importan **los dos del marco**: si el de la izquierda es más alto, se cambian de lugar.',
    explanation:
      'Tras una pasada el **8 burbujeó hasta el final** y ahí se queda fijo: fueron 4 comparaciones y 3 intercambios. Cada pasada lleva al final al más alto que falta, así que con n datos bastan **n − 1 pasadas**.',
    data: {
      mode: 'bubble',
      values: [6, 3, 8, 2, 5],
      passes: 1,
    } satisfies SortSimData,
  },
  {
    id: 'd5-pivote',
    day: 5,
    tier: 1,
    type: 'sort-sim',
    topic: 'Quicksort',
    title: 'EL CAPITÁN PIVOTE',
    prompt:
      'Quicksort elige un **pivote** (el capitán): aquí es el último, el 7. Para cada número elige **MENOR o MAYOR** que el pivote: los menores se forman a su izquierda y los mayores a su derecha.',
    hint: 'Compara cada número **solo contra el 7**, no contra sus vecinos.',
    explanation:
      'Quedó 5, 1, 3 · 7 · 12, 10: el pivote cayó en el **índice 3** porque 3 números son menores que él, y ese ya es **su lugar final**. Los lados todavía están revueltos: quicksort **repite lo mismo en cada lado**.',
    data: {
      mode: 'partition',
      values: [5, 12, 1, 10, 3, 7],
      pivot: 'last',
    } satisfies SortSimData,
  },
  {
    id: 'd5-analogias',
    day: 5,
    tier: 1,
    type: 'classify',
    topic: 'Algoritmos de ordenamiento',
    title: '¿QUÉ ALGORITMO ES?',
    prompt:
      'Cada ficha es una **analogía** o una pista de la clase. Mándala al casillero del algoritmo que describe.',
    hint: 'Recuerda la imagen de cada algoritmo: la fila por estatura, el **capitán**, los montones de exámenes y el **cartero**.',
    explanation:
      '**Burbuja** compara vecinos y el más alto burbujea al final. **Quicksort** acomoda a todos alrededor del pivote. **Merge sort** parte en montoncitos y los mezcla, igual que el ordenamiento externo; y radix ni siquiera compara: reparte por dígito, como el cartero.',
    data: {
      bins: [
        { id: 'burbuja', label: 'BURBUJA', icon: 'people' },
        { id: 'quick', label: 'QUICKSORT', icon: 'crown' },
        { id: 'merge', label: 'MERGE SORT (MEZCLA)', icon: 'clipboard' },
        { id: 'radix', label: 'RADIX', icon: 'inbox' },
      ],
      items: [
        { text: 'Formarse por estatura comparando solo con el de al lado', bin: 'burbuja' },
        { text: 'Dos montones ya ordenados: tomas el de arriba más chico', bin: 'merge' },
        { text: 'El capitán: los chicos a su izquierda y los grandes a su derecha', bin: 'quick' },
        { text: 'El cartero reparte por el último dígito en casilleros del 0 al 9', bin: 'radix' },
        { text: 'En cada pasada, el más alto avanza hasta el final', bin: 'burbuja' },
        { text: 'Partir a la mitad hasta tener montoncitos de 1', bin: 'merge' },
        { text: 'El pivote ya quedó en su lugar final; se repite en cada lado', bin: 'quick' },
        { text: 'Nunca compara dos números entre sí: solo mira sus dígitos', bin: 'radix' },
        { text: 'No caben en el escritorio: ordenas montones chicos y los mezclas', bin: 'merge' },
      ],
    } satisfies ClassifyData,
  },
  {
    id: 'd5-mezcla',
    day: 5,
    tier: 1,
    type: 'sort-sim',
    topic: 'Merge sort (mezcla)',
    title: 'MEZCLA LOS MONTONES',
    prompt:
      'Dos montones de exámenes **ya ordenados**. Toca el de arriba (el primero) del montón que pasa a la salida: siempre **el más chico** de los dos.',
    hint: 'Solo compara **los dos de arriba**: los de abajo de cada montón nunca son más chicos.',
    explanation:
      'Salió 1, 3, 5, 6, 8, 9: cada toque compara solo dos exámenes, y cuando un montón se vacía el resto **pasa solo**. Mezclar n datos cuesta **O(n)**: es el corazón de **merge sort**.',
    data: {
      mode: 'merge',
      left: [3, 6, 8],
      right: [1, 5, 9],
    } satisfies SortSimData,
  },
  {
    id: 'd5-merge-niveles',
    day: 5,
    tier: 1,
    type: 'order',
    topic: 'Merge sort',
    title: 'PARTE Y MEZCLA',
    prompt:
      'Merge sort **parte a la mitad** hasta tener montoncitos de 1 y luego **mezcla de regreso**. Toca los **niveles** de [7, 3, 9, 5] en orden: primero bajando (partir) y luego subiendo (mezclar).',
    hint: 'Mientras **solo se parte**, nadie cambia de lugar: los números se reacomodan hasta que **se mezclan**.',
    explanation:
      'Bajando se parte: [7, 3] [9, 5] y luego montoncitos de 1, que ya están ordenados. Subiendo se mezcla: [3, 7] [5, 9] y al final [3, 5, 7, 9]. Son **log n niveles** y en cada uno se mezclan los n datos: **O(n log n)**, ordenar exámenes por montoncitos.',
    data: {
      items: ['[7, 3, 9, 5]', '[7, 3] [9, 5]', '[7] [3] [9] [5]', '[3, 7] [5, 9]', '[3, 5, 7, 9]'],
      layout: 'list',
    } satisfies OrderData,
  },

  // ═════════════════════ TIER 2 · RETO (el mismo concepto, más complicado) ═════════════════════
  {
    id: 'd5-particion-larga',
    day: 5,
    tier: 2,
    type: 'sort-sim',
    topic: 'Quicksort',
    title: 'PARTICIÓN DE 8',
    prompt:
      'Ahora son 8 y el pivote es el **último**, el 14. Para cada número elige **MENOR o MAYOR**; al final el pivote baja a **su lugar definitivo**.',
    hint: 'Fíjate bien en los que están **cerca del 14**: uno es menor y otro es mayor.',
    explanation:
      'Menores: 13, 4, 9, 2 · pivote 14 · mayores: 17, 21, 15. El 14 quedó en el **índice 4** (4 números son menores) y ya no se moverá. Cada número se comparó **una sola vez** con el pivote: partir n datos cuesta **O(n)**.',
    data: {
      mode: 'partition',
      values: [13, 4, 17, 9, 21, 2, 15, 14],
      pivot: 'last',
    } satisfies SortSimData,
  },
  {
    id: 'd5-burbuja-completa',
    day: 5,
    tier: 2,
    type: 'sort-sim',
    topic: 'Burbuja',
    title: 'BURBUJA COMPLETA',
    prompt:
      'Ordena los 6 con burbuja **completa**: pasada tras pasada, **INTERCAMBIAR** si el de la izquierda es mayor, o **DEJAR**. Los que ya quedaron fijos al final no se comparan.',
    hint: 'Cada pasada es **una comparación más corta**: el último que burbujeó ya no entra al marco.',
    explanation:
      '5 pasadas y 5 + 4 + 3 + 2 + 1 = **15 comparaciones** (11 intercambios). El 2 empezó al final y solo avanza **un lugar por pasada** hacia la izquierda: por eso hicieron falta todas. Así crece burbuja: **O(n²)**.',
    data: {
      mode: 'bubble',
      values: [6, 4, 7, 3, 5, 2],
      passes: 5,
    } satisfies SortSimData,
  },
  {
    id: 'd5-contar-burbuja',
    day: 5,
    tier: 2,
    type: 'number',
    topic: 'Burbuja y Big-O',
    title: 'TODOS SALUDAN A TODOS',
    prompt:
      'Con 6 datos la burbuja completa hizo 15 comparaciones. ¿Cuántas hace con **100 datos**?',
    hint: 'Suma 99 + 98 + … + 1 **por parejas**: 99 + 1, 98 + 2… cada pareja da 100.',
    explanation:
      '**4,950** = 100 × 99 / 2. Los datos crecieron 10 veces (de 10 a 100) y las comparaciones unas **100 veces** (de 45 a 4,950): eso es **O(n²)**, como cuando todos se saludan con todos.',
    data: {
      context: {
        table: {
          caption: 'Burbuja completa · comparaciones',
          headers: ['n', 'suma', 'comparaciones'],
          rows: [
            ['6', '5 + 4 + 3 + 2 + 1', '15'],
            ['10', '9 + 8 + … + 1', '45'],
            ['100', '99 + 98 + … + 1', '?'],
          ],
        },
        note: 'Cada pasada compara **una vez menos** que la anterior.',
      },
      answer: 4950,
      unit: 'comparaciones',
    } satisfies NumberData,
  },
  {
    id: 'd5-mezcla-empates',
    day: 5,
    tier: 2,
    type: 'sort-sim',
    topic: 'Merge sort (mezcla)',
    title: 'EMPATES EN LA MEZCLA',
    prompt:
      'Mezcla los dos montones ordenados tocando siempre la cabeza **más chica**. Hay **empates**: si las dos cabezas valen lo mismo, pasa primero **la de la izquierda**.',
    hint: 'Tras un empate, **el de la derecha sigue arriba** de su montón: compáralo otra vez con la nueva cabeza izquierda.',
    explanation:
      'Salió 2, 3, 4, 4, 7, 7, 8, 9: en cada empate pasó primero **el de la izquierda**, así los iguales conservan su orden original. Eso hace a merge sort **estable**, y por eso Java usa una variante suya (TimSort) para ordenar **objetos**.',
    data: {
      mode: 'merge',
      left: [2, 4, 7, 8],
      right: [3, 4, 7, 9],
    } satisfies SortSimData,
  },
  {
    id: 'd5-radix-unidades',
    day: 5,
    tier: 2,
    type: 'sort-sim',
    topic: 'Radix',
    title: 'CASILLEROS DEL CARTERO',
    prompt:
      'Eres el cartero de **radix**: para cada número, en orden, toca el casillero de su **dígito de las unidades**. Al final toca RECOGER: salen del casillero 0 al 9, en **orden de llegada**.',
    hint: 'Solo mira **el último dígito**; varios números pueden compartir casillero y se forman en el orden en que llegan.',
    explanation:
      'Salió 81, 72, 62, 34, 54, 14, 19, 29: **ordenado por unidades** y, dentro de cada casillero, en orden de llegada (34, 54, 14). Radix **nunca compara** dos números entre sí: solo reparte. Falta la vuelta de las decenas para que **quede ordenado**.',
    data: {
      mode: 'radix',
      values: [34, 72, 19, 54, 81, 29, 62, 14],
      digit: 'units',
      rounds: 1,
    } satisfies SortSimData,
  },

  // ═════════════════════ TIER 3 · COMBO (combina con los días anteriores de forma simple) ═════════════════════
  {
    id: 'd5-binaria-ordenada',
    day: 5,
    tier: 3,
    type: 'search-sim',
    topic: 'Ordenar y buscar',
    title: 'ORDENA Y BUSCA',
    prompt:
      'La **búsqueda binaria** del lunes solo funciona con datos **ordenados**. Estos 12 ya lo están: busca el 88 tocando la celda del MEDIO en cada paso.',
    hint: '**medio = (inicio + fin) / 2**, sin decimales. Si el medio es menor que 88, descarta toda la mitad izquierda.',
    explanation:
      '**4 comparaciones** (44, 66, 80 y 88) contra 12 de la secuencial: el 88 era la llave del último bolsillo. Ordenar cuesta O(n log n) una sola vez y después cada búsqueda es **O(log n)**. Por eso Arrays.binarySearch pide el arreglo **ya ordenado**.',
    data: {
      algorithm: 'binary',
      mode: 'play',
      values: [12, 17, 23, 31, 38, 44, 52, 59, 66, 73, 80, 88],
      target: 88,
    } satisfies SearchSimData,
  },
  {
    id: 'd5-quicksort-rec',
    day: 5,
    tier: 3,
    type: 'order',
    topic: 'Quicksort y recursividad',
    title: 'QUICKSORT RECURSIVO',
    prompt:
      'qs(a) parte con pivote = **último** y se llama a sí mismo con los menores y luego con los mayores. Toca las llamadas en el **orden en que se ejecutan**.',
    hint: 'Cada llamada **termina por completo** (con todas sus llamadas de adentro) antes de que empiece la siguiente de su mismo nivel.',
    explanation:
      'Orden: qs(6, 3, 9, 1, 7, 2, 5), qs(3, 1, 2), qs(1), qs(3), qs(6, 9, 7), qs(6) y qs(9). Es la **pila de llamadas** del martes: el lado izquierdo baja hasta sus **casos base** de un dato antes de que arranque el derecho. El mismo problema, cada vez más chico, como las **muñecas rusas**.',
    data: {
      context: {
        code: [
          'void qs(int[] a) {',
          '  if (a.length <= 1) return;',
          '  partir(a);    // pivote = último',
          '  qs(menores);  // lado izquierdo',
          '  qs(mayores);  // lado derecho',
          '}',
        ].join('\n'),
        note: 'Al partir, cada lado **conserva el orden** en que estaban sus números.',
      },
      items: ['qs(6, 3, 9, 1, 7, 2, 5)', 'qs(3, 1, 2)', 'qs(1)', 'qs(3)', 'qs(6, 9, 7)', 'qs(6)', 'qs(9)'],
      layout: 'list',
    } satisfies OrderData,
  },
  {
    id: 'd5-radix-colas',
    day: 5,
    tier: 3,
    type: 'sort-sim',
    topic: 'Radix y colas',
    title: 'RADIX EN DOS VUELTAS',
    prompt:
      'Radix completo: primera vuelta por **unidades**, segunda por **decenas**. Cada casillero es una **cola** (FIFO): al recoger, sale primero el que llegó primero.',
    hint: 'En la segunda vuelta reparte en el orden en que **quedaron tras la primera**, no en el original.',
    explanation:
      'Tras las unidades: 61, 42, 12, 65, 45, 17, 87; tras las decenas: **12, 17, 42, 45, 61, 65, 87**. La **cola** de cada casillero respeta el orden de la vuelta anterior: por eso el 42 sale antes que el 45 y todo queda ordenado **sin comparar** nunca dos números.',
    data: {
      mode: 'radix',
      values: [42, 17, 65, 12, 87, 45, 61],
      rounds: 2,
    } satisfies SortSimData,
  },
  {
    id: 'd5-abb-inorden',
    day: 5,
    tier: 3,
    type: 'bst-sim',
    topic: 'Ordenar con un ABB',
    title: 'ORDENA CON UN ÁRBOL',
    prompt:
      'Estos datos llegaron revueltos (35, 18, 52, 9, 27, 44, 61, 22) y se insertaron en un **ABB**. Recórrelo en **inorden** (izquierda, raíz, derecha) tocando todos los nodos.',
    hint: 'Baja por la izquierda hasta el fondo: ahí está **el más chico**.',
    explanation:
      'Salió 9, 18, 22, 27, 35, 44, 52, 61: **¡ordenado!** Insertar en un ABB y recorrer en inorden también ordena, y así TreeMap te da sus claves en orden. Ojo: si los datos llegan ya ordenados, el árbol se **acuesta** y insertar todo cuesta O(n²), como quicksort con mal pivote.',
    data: {
      mode: 'traversal',
      traversal: 'inorden',
      initial: [35, 18, 52, 9, 27, 44, 61, 22],
    } satisfies BstSimData,
  },

  // ═════════════════════ TIER 4 · JEFE FINAL DEL CURSO (combina toda la semana) ═════════════════════
  {
    id: 'd5-peor-quicksort',
    day: 5,
    tier: 4,
    type: 'number',
    topic: 'Quicksort (peor caso)',
    title: 'JEFE: MAL PIVOTE',
    prompt:
      'Quicksort con pivote = **último** recibe 1,000 datos **YA ordenados**. Si cada dato se compara una vez con su pivote, ¿cuántas comparaciones hace en total?',
    hint: 'Cada partición deja un lado **vacío**: el problema solo se achica de uno en uno. Suma 999 + 998 + … + 1 por parejas.',
    explanation:
      '**499,500**: ¡lo mismo que burbuja! Con datos ya ordenados y pivote = último, cada partición deja un lado vacío y hay unos 1,000 niveles de llamadas: **O(n²)**. Con pivotes que parten a la mitad serían unas 10,000 (n log n); por eso Arrays.sort elige mejor sus pivotes y usa **doble pivote**.',
    data: {
      context: {
        array: { name: 'a', values: [10, 20, 30, 40, 50, 60, 70, 80], pointers: [{ label: 'pivote', index: 7 }] },
        table: {
          caption: 'Primeras llamadas',
          headers: ['datos', 'comparaciones', 'mayores'],
          rows: [
            ['1,000', '999', '0'],
            ['999', '998', '0'],
            ['…', '…', '…'],
          ],
        },
        note: 'El arreglo es un **ejemplo chico** (8 datos): ya ordenado, el pivote es el **mayor** y nadie queda a su derecha. Una llamada con **un solo dato** es caso base: ya no compara.',
      },
      answer: 499500,
      unit: 'comparaciones',
    } satisfies NumberData,
  },
  {
    id: 'd5-arrays-sort',
    day: 5,
    tier: 4,
    type: 'quiz',
    topic: 'Arrays.sort y estabilidad',
    title: 'JEFE: ARRAYS.SORT',
    prompt:
      'El arreglo de objetos Alumno ya está **en orden alfabético**. Lo ordenas por calificación, de menor a mayor, con Arrays.sort. ¿Cómo queda?',
    hint: 'Con **objetos**, Java usa TimSort, que mezcla como merge sort. ¿Qué pasaba en un **empate**?',
    explanation:
      'Con objetos, Arrays.sort usa **TimSort** (mezcla natural + inserción), que es **estable**: los empatados conservan su orden original, Ana antes que Carla y Beto antes que Eva, como en la mezcla, donde el empate pasa por la izquierda. Con primitivos (int[]) usa **quicksort de doble pivote**: no es estable, pero dos 85 sueltos son idénticos y nadie lo nota.',
    data: {
      context: {
        code: ['// Alumno[]: objetos, no int', 'Arrays.sort(alumnos, porCalif);'].join('\n'),
        table: {
          headers: ['alumno', 'calificación'],
          rows: [
            ['Ana', 90],
            ['Beto', 85],
            ['Carla', 90],
            ['Diego', 70],
            ['Eva', 85],
          ],
        },
      },
      choices: [
        'Diego, Beto, Eva, Ana, Carla',
        'Diego, Eva, Beto, Carla, Ana',
        'Diego, Beto, Eva, Carla, Ana',
        'Cualquiera: depende del pivote que elija',
      ],
      answer: 0,
    } satisfies QuizData,
  },
  {
    id: 'd5-complejidades',
    day: 5,
    tier: 4,
    type: 'order',
    topic: 'Big-O de todo el curso',
    title: 'JEFE: CARRERA BIG-O',
    prompt:
      'Todas trabajan con **n = 1,000**. Ordénalas de **menos a más pasos**: de la más rápida a la más lenta.',
    hint: 'Ponle a cada una su Big-O y recuerda la **escalera**: O(1) < O(log n) < O(n) < O(n log n) < O(n²) < O(2ⁿ).',
    explanation:
      'pop() es **1 paso**; TreeMap, unas 10 comparaciones (O(log n)); la lista, 1,000 (O(n)); merge sort, unas 10,000 (**O(n log n)**); burbuja, casi medio millón (O(n²)); y Hanói, 2 a la 1,000 menos 1 movimientos: **O(2ⁿ)**, más que los átomos del universo.',
    data: {
      context: {
        note: 'Big-O cuenta **pasos, no segundos**.',
      },
      items: [
        'pop() en una pila',
        'Buscar una clave en un TreeMap',
        'Buscar un dato que no está en una lista enlazada',
        'Ordenar con merge sort',
        'Ordenar con burbuja',
        'Resolver Hanói con 1,000 discos',
      ],
      layout: 'list',
    } satisfies OrderData,
  },
  {
    id: 'd5-jefe-estructuras',
    day: 5,
    tier: 4,
    type: 'classify',
    topic: 'Estructuras de todo el curso',
    title: 'JEFE FINAL DEL CURSO',
    prompt:
      'El jefe final de la semana: para cada situación elige la **estructura** que mejor la resuelve.',
    hint: 'Pregúntate qué pide cada situación: ¿el último que llegó, el primero que llegó, buscar al instante o tener todo **en orden**?',
    explanation:
      'Lo último primero (atrás, Ctrl+Z, paréntesis) es **pila**; en orden de llegada (impresora, BFS, casilleros de radix) es **cola**; buscar al instante es la **tabla hash**, y buscar manteniendo el orden es el ABB (TreeMap). ¡Cerraste el curso: elegir bien la estructura es la mitad del algoritmo!',
    data: {
      bins: [
        { id: 'pila', label: 'PILA', icon: 'plates' },
        { id: 'cola', label: 'COLA', icon: 'tortilla' },
        { id: 'hash', label: 'TABLA HASH', icon: 'locker' },
        { id: 'abb', label: 'ABB (TREEMAP)', icon: 'tree' },
      ],
      items: [
        { text: 'Botón «atrás» del navegador', bin: 'pila' },
        { text: 'Imprimir documentos en el orden en que llegaron', bin: 'cola' },
        { text: 'Revisar al instante si un número de control ya existe', bin: 'hash' },
        { text: 'Listar alumnos ordenados y además buscar en O(log n)', bin: 'abb' },
        { text: 'Deshacer con Ctrl+Z', bin: 'pila' },
        { text: 'Recorrer un mapa por niveles (BFS)', bin: 'cola' },
        { text: 'Buscar un producto por su código, sin importar el orden', bin: 'hash' },
        { text: 'Revisar que los paréntesis cierren bien', bin: 'pila' },
        { text: 'Cada casillero de radix: sale primero el que llegó primero', bin: 'cola' },
        { text: 'Mantener los datos ordenados mientras van llegando', bin: 'abb' },
      ],
    } satisfies ClassifyData,
  },
]

export default day5

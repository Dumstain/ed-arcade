/**
 * DÍA 4 — ÁRBOLES Y GRAFOS (jueves 15-oct-2026) · candado manual del profesor
 * Orden de juego: tier 1 (CALENTAMIENTO) → tier 2 (RETO) → tier 3 (COMBO) → tier 4 (JEFE FINAL).
 * Analogías del curso: árbol = carpetas de la computadora (raíz, hijos, hojas); ABB = «más alto o
 * más bajo»; grafo = mapa de carreteras de Michoacán; matriz de adyacencia = tabla de distancias de
 * un atlas; lista de adyacencia = contactos del teléfono; BFS = onda en el agua (usa COLA, la fila de
 * las tortillas); DFS = laberinto (usa PILA / recursión, las muñecas rusas); Dijkstra = GPS.
 * Convenciones: ABB sin repetidos, menores a la izquierda; eliminar con dos hijos = SUCESOR inorden
 * (el menor del subárbol derecho); recorridos: preorden raíz-izq-der, inorden izq-raíz-der,
 * postorden izq-der-raíz, niveles de izquierda a derecha.
 * Grafo de clase (página de analogías): 7 ciudades y 8 carreteras en este orden, que define la lista
 * de adyacencia: MOR-QUI 45, MOR-PAT 57, MOR-HID 100, QUI-PAT 24, QUI-ZAC 38, ZAC-ZAM 72,
 * PAT-URU 62, URU-ZAM 115 (km aproximados).
 * Respuestas verificadas con un script (BST, recorridos, borrado con sucesor, BFS/DFS, caminos).
 */
import type { Exercise } from '../engine/types'
import type {
  BstSimData,
  ClassifyData,
  GraphSimData,
  OrderData,
  QuizData,
  RecNode,
  RecTreeData,
} from '../exercises/schemas'

// ───────────── Mapa de Michoacán (mismo de la clase) ─────────────
type CityId = 'MOR' | 'QUI' | 'PAT' | 'HID' | 'ZAC' | 'URU' | 'ZAM'

const CITIES: { id: CityId; label: string; x: number; y: number }[] = [
  { id: 'MOR', label: 'Morelia', x: 75, y: 40 },
  { id: 'QUI', label: 'Quiroga', x: 50, y: 35 },
  { id: 'PAT', label: 'Pátzcuaro', x: 50, y: 70 },
  { id: 'HID', label: 'Cd. Hidalgo', x: 90, y: 65 },
  { id: 'ZAC', label: 'Zacapu', x: 30, y: 20 },
  { id: 'URU', label: 'Uruapan', x: 22, y: 75 },
  { id: 'ZAM', label: 'Zamora', x: 10, y: 35 },
]

/** El orden de esta lista decide el orden de las vecinas en la lista de adyacencia (empates de BFS/DFS). */
const ROADS: { a: CityId; b: CityId; w: number }[] = [
  { a: 'MOR', b: 'QUI', w: 45 },
  { a: 'MOR', b: 'PAT', w: 57 },
  { a: 'MOR', b: 'HID', w: 100 },
  { a: 'QUI', b: 'PAT', w: 24 },
  { a: 'QUI', b: 'ZAC', w: 38 },
  { a: 'ZAC', b: 'ZAM', w: 72 },
  { a: 'PAT', b: 'URU', w: 62 },
  { a: 'URU', b: 'ZAM', w: 115 },
]

/** Copias frescas del mapa; `without` quita ciudades (y sus carreteras). */
const cities = (without: CityId[] = []) => CITIES.filter((c) => !without.includes(c.id)).map((c) => ({ ...c }))
const roads = (without: CityId[] = []) =>
  ROADS.filter((r) => !without.includes(r.a) && !without.includes(r.b)).map((r) => ({ ...r }))

// ───────────── Árbol de llamadas de alt(n) (altura recursiva; una hoja mide 1) ─────────────
const alt = (key: number, value: number, children?: RecNode[]): RecNode =>
  children ? { label: `alt(${key})`, value, children } : { label: `alt(${key})`, value }

const day4: Exercise[] = [
  // ═════════════════════ TIER 1 · CALENTAMIENTO (conceptos tal cual se vieron en clase) ═════════════════════
  {
    id: 'd4-raiz-hojas',
    day: 4,
    tier: 1,
    type: 'classify',
    topic: 'Árboles',
    title: 'RAÍZ, RAMAS Y HOJAS',
    prompt:
      'Cada ruta es un nodo del árbol de carpetas de tu compu. Mándala a su casillero: ¿es la **raíz** (sin padre), una **rama** (con padre e hijos) o una **hoja** (sin hijos)?',
    hint: 'Para saber si una carpeta **tiene hijos**, busca otra ruta que empiece con su nombre.',
    explanation:
      '**C:\\ es la raíz**: no tiene padre. Escuela, ED y Fotos son **ramas**: tienen padre y también hijos (Escuela es padre de ED y de horario.pdf). Los archivos son **hojas**: ya no contienen nada. Como en tus carpetas, a cada nodo se llega por un solo camino desde la raíz.',
    data: {
      bins: [
        { id: 'raiz', label: 'RAÍZ (SIN PADRE)', icon: 'crown' },
        { id: 'interno', label: 'RAMA (PADRE E HIJOS)', icon: 'folder' },
        { id: 'hoja', label: 'HOJA (SIN HIJOS)', icon: 'clipboard' },
      ],
      items: [
        { text: 'C:\\', bin: 'raiz' },
        { text: 'C:\\Escuela', bin: 'interno' },
        { text: 'C:\\Escuela\\ED', bin: 'interno' },
        { text: 'C:\\Fotos', bin: 'interno' },
        { text: 'C:\\Escuela\\ED\\arbol.java', bin: 'hoja' },
        { text: 'C:\\Escuela\\ED\\grafo.java', bin: 'hoja' },
        { text: 'C:\\Escuela\\horario.pdf', bin: 'hoja' },
        { text: 'C:\\Fotos\\playa.jpg', bin: 'hoja' },
      ],
    } satisfies ClassifyData,
  },
  {
    id: 'd4-abb-insertar',
    day: 4,
    tier: 1,
    type: 'bst-sim',
    topic: 'Árbol binario de búsqueda',
    title: 'PLANTA EL ÁRBOL',
    prompt:
      'Regla del **árbol binario de búsqueda** (ABB): **menores a la izquierda, mayores a la derecha**. Toca el hueco donde se queda cada número nuevo.',
    hint: 'Empieza siempre en la **raíz** y baja comparando: ¿es menor o mayor? Repite hasta topar con un hueco.',
    explanation:
      'Cada número **baja comparando desde la raíz** y se queda como **hoja** en el primer hueco libre: el 45 pasó por 50, 30 y 40. Es el juego de **«más alto o más bajo»**: cada comparación te manda a una sola rama.',
    data: {
      mode: 'insert',
      initial: [50, 30, 70, 20, 40, 60, 80],
      keys: [45, 65, 10],
    } satisfies BstSimData,
  },
  {
    id: 'd4-inorden',
    day: 4,
    tier: 1,
    type: 'bst-sim',
    topic: 'Recorridos de árboles',
    title: 'RECORRIDO INORDEN',
    prompt:
      '**Inorden** = izquierda, raíz, derecha: antes de tocar un nodo, recorre **todo su lado izquierdo**. Toca los 7 nodos en ese orden.',
    hint: 'Baja por la izquierda hasta el fondo: ese va primero. Luego su padre y después **el lado derecho** de ese padre.',
    explanation:
      'Salió 8, 17, 29, 41, 52, 63, 77: ¡**ordenado de menor a mayor**! En un ABB todo lo de la izquierda es menor y todo lo de la derecha es mayor, así que **inorden siempre sale ordenado**. Por eso **TreeMap** te entrega sus claves en orden.',
    data: {
      mode: 'traversal',
      traversal: 'inorden',
      initial: [41, 17, 63, 8, 29, 52, 77],
    } satisfies BstSimData,
  },
  {
    id: 'd4-bfs-morelia',
    day: 4,
    tier: 1,
    type: 'graph-sim',
    topic: 'Grafos (BFS)',
    title: 'ONDA EN EL AGUA',
    prompt:
      'Ciudades = **vértices**, carreteras = **aristas**. Recorre en anchura (**BFS**) desde Morelia: toca las ciudades en el orden en que salen de la cola (vecinas en el orden de la lista de adyacencia).',
    hint: 'Primero salen **todas las vecinas de Morelia**; después, las vecinas de ellas, en el orden en que se formaron.',
    explanation:
      'Morelia, Quiroga, Pátzcuaro, Cd. Hidalgo, Zacapu, Uruapan y Zamora: **primero las vecinas y luego las vecinas de las vecinas**, como **la onda de una piedra en el agua**. La **cola** (la fila de las tortillas) da ese orden: se atiende primero a quien se formó primero.',
    data: {
      mode: 'bfs',
      nodes: cities(),
      edges: roads(),
      start: 'MOR',
      showStructure: true,
      showWeights: false,
    } satisfies GraphSimData,
  },

  // ═════════════════════ TIER 2 · RETO (el mismo concepto, más complicado) ═════════════════════
  {
    id: 'd4-preorden',
    day: 4,
    tier: 2,
    type: 'bst-sim',
    topic: 'Recorridos de árboles',
    title: 'RAÍZ PRIMERO',
    prompt:
      '**Preorden** = raíz, izquierda, derecha: tocas cada nodo **en cuanto llegas** y recorres completo su lado izquierdo antes que el derecho. Toca los 9 nodos.',
    hint: 'Cuando termines **todo el lado izquierdo** de un nodo, regresa a él y sigue con su lado derecho.',
    explanation:
      'Preorden: **40, 20, 10, 30, 25, 65, 55, 80, 70**. Cada nodo va **antes que sus hijos**, como al **copiar una carpeta**: primero creas la carpeta y luego copias lo de adentro. Ojo: ya no sale ordenado; eso solo lo hace inorden.',
    data: {
      mode: 'traversal',
      traversal: 'preorden',
      initial: [40, 20, 65, 10, 30, 55, 80, 25, 70],
    } satisfies BstSimData,
  },
  {
    id: 'd4-matriz',
    day: 4,
    tier: 2,
    type: 'graph-sim',
    topic: 'Grafos (representación)',
    title: 'TABLA DEL ATLAS',
    prompt:
      'Llena la **matriz de adyacencia**: pon un 1 en cada par de ciudades unidas por carretera. Es **no dirigido**: al marcar [i][j] se marca también [j][i].',
    hint: 'Ve **carretera por carretera** en el mapa: un solo toque pone los **dos 1**. Si una casilla ya tiene 1, no la vuelvas a tocar (se borraría).',
    explanation:
      '7 carreteras = **14 unos** en 36 casillas, y la matriz queda **simétrica** porque se puede ir y volver. Saber si dos ciudades se conectan es inmediato, como en la tabla de distancias de un atlas, pero gasta n × n casillas. La **lista de adyacencia** solo guarda las vecinas de cada ciudad, como los contactos de tu teléfono.',
    data: {
      mode: 'matrix',
      nodes: cities(['HID']),
      edges: roads(['HID']),
      showWeights: false,
    } satisfies GraphSimData,
  },
  {
    id: 'd4-sucesor',
    day: 4,
    tier: 2,
    type: 'bst-sim',
    topic: 'Árbol binario de búsqueda',
    title: 'SUCESOR INORDEN',
    prompt:
      'Elimina el **30**. Como tiene **dos hijos**, su lugar lo ocupa su **sucesor inorden**: el menor de su lado derecho. Toca quién sube.',
    hint: 'Desde el 30 da un paso a la **derecha** y luego baja por la **izquierda** hasta que ya no se pueda.',
    explanation:
      'Sube el **35**: es el que sigue al 30 en inorden (20, 30, 35, 40…). Con él en ese lugar, a su izquierda todo sigue siendo menor y a su derecha mayor: **la regla se conserva**. Si el 30 fuera **hoja** solo se cortaría, y si tuviera un hijo, ese hijo subiría.',
    data: {
      mode: 'delete',
      initial: [50, 30, 80, 20, 40, 35, 45, 70, 90],
      target: 30,
    } satisfies BstSimData,
  },
  {
    id: 'd4-dfs-morelia',
    day: 4,
    tier: 2,
    type: 'graph-sim',
    topic: 'Grafos (DFS)',
    title: 'EL LABERINTO',
    prompt:
      'Recorre en profundidad (**DFS**) desde Morelia: sigue un camino **hasta el fondo** y regresa cuando ya no haya ciudades nuevas. Vecinas en el orden de la lista de adyacencia.',
    hint: 'En cada ciudad ve a su **primera vecina sin visitar**; si ya no queda ninguna, **regresa** a la anterior.',
    explanation:
      'Morelia, Quiroga, Pátzcuaro, Uruapan, Zamora y Zacapu… ahí ya no hay salida: regresa hasta Morelia y apenas entonces visita Cd. Hidalgo. Como en un **laberinto**: avanzas hasta topar y retrocedes. Ese regreso lo lleva la **pila de llamadas** de la recursión, como las **muñecas rusas** del martes.',
    data: {
      mode: 'dfs',
      nodes: cities(),
      edges: roads(),
      start: 'MOR',
      showStructure: true,
      showWeights: false,
    } satisfies GraphSimData,
  },

  // ═════════════════════ TIER 3 · COMBO (combina conceptos de forma simple) ═════════════════════
  {
    id: 'd4-abb-binaria',
    day: 4,
    tier: 3,
    type: 'bst-sim',
    topic: 'ABB y búsqueda binaria',
    title: 'LA BINARIA EN ÁRBOL',
    prompt:
      'Los 12 datos del lunes, ahora en un **ABB**. Busca el **47**: toca, desde la raíz, cada nodo con el que se compara.',
    hint: 'Como en **«más alto o más bajo»**: si el 47 es mayor que el nodo, baja a la derecha; si es menor, a la izquierda.',
    explanation:
      '**4 comparaciones**: 27, 42, 53 y 47… ¡los mismos medios que revisó la **búsqueda binaria** del lunes! Un ABB balanceado es la binaria ya armada: cada comparación descarta una rama entera, por eso buscar es **O(log n)**.',
    data: {
      mode: 'search',
      initial: [27, 13, 42, 4, 18, 31, 53, 9, 22, 36, 47, 58],
      target: 47,
    } satisfies BstSimData,
  },
  {
    id: 'd4-degenerado',
    day: 4,
    tier: 3,
    type: 'bst-sim',
    topic: 'ABB degenerado y listas',
    title: 'ÁRBOL ACOSTADO',
    prompt:
      'Ahora los datos llegan **ya ordenados**: 20, 30, 40, 50 y 60. Insértalos en el árbol (que solo tiene el 10) y fíjate qué forma toma.',
    hint: 'Compara desde la **raíz**, como siempre: cada número nuevo es mayor que todos los que ya están.',
    explanation:
      'Quedó una fila inclinada: cada nodo tiene **un solo hijo**. ¡Es una **lista enlazada**, el tren del miércoles! Buscar el 60 cuesta 6 comparaciones, bolsillo por bolsillo: **O(n)** en lugar de O(log n). Por eso TreeMap se reacomoda solo para no quedar chueco.',
    data: {
      mode: 'insert',
      initial: [10],
      keys: [20, 30, 40, 50, 60],
    } satisfies BstSimData,
  },
  {
    id: 'd4-borrar-carpetas',
    day: 4,
    tier: 3,
    type: 'order',
    topic: 'Recorridos y recursividad',
    title: 'BORRA LA CARPETA',
    prompt:
      'borrar(c) vacía cada carpeta **antes** de borrarla. Si llamas borrar(Escuela/), ¿en qué orden se borra todo? Toca los nombres en ese orden.',
    hint: 'Sigue la recursión: borrar(ED/) **termina por completo** antes de pasar a POO/. Una carpeta solo se borra **ya vacía**.',
    explanation:
      'Eso es **postorden**: primero los hijos y **la raíz al final**. Escuela/ espera en la **pila de llamadas** (como la muñeca de afuera) hasta que ED/, POO/ y horario.pdf ya no existen. Así borra tu compu una carpeta con todo su contenido.',
    data: {
      context: {
        code: [
          'void borrar(Nodo c) {',
          '  for (Nodo h : c.hijos)',
          '    borrar(h);    // primero su contenido',
          '  c.eliminar();   // ya está vacía',
          '}',
        ].join('\n'),
        table: {
          headers: ['carpeta', 'hijos (en orden)'],
          rows: [
            ['Escuela/', 'ED/, POO/, horario.pdf'],
            ['ED/', 'pila.java, cola.java'],
            ['POO/', 'Main.java'],
          ],
        },
        note: 'Los archivos no contienen nada: son **hojas**.',
      },
      items: ['pila.java', 'cola.java', 'ED/', 'Main.java', 'POO/', 'horario.pdf', 'Escuela/'],
      layout: 'list',
    } satisfies OrderData,
  },
  {
    id: 'd4-niveles-cola',
    day: 4,
    tier: 3,
    type: 'bst-sim',
    topic: 'Recorridos y colas',
    title: 'LA FILA POR NIVELES',
    prompt:
      'Recorre **por niveles** con la **cola** del miércoles: formas a la raíz en la fila; cada vez que atiendes a uno, formas a su hijo izquierdo y luego al derecho. Toca los nodos en el orden en que se atienden.',
    hint: 'Quien se forma primero se atiende primero (**FIFO**): termina un nivel completo, de izquierda a derecha, antes de bajar.',
    explanation:
      '52 · 24, 78 · 13, 37, 61, 90 · 30, 44, 85: **nivel por nivel**, de arriba hacia abajo. La **cola** lo logra sola: los hijos se forman atrás y esperan su turno, como en la fila de las tortillas. ¡Es el mismo truco del **BFS** en el mapa de Michoacán!',
    data: {
      mode: 'traversal',
      traversal: 'niveles',
      initial: [52, 24, 78, 13, 37, 61, 90, 30, 44, 85],
    } satisfies BstSimData,
  },

  // ═════════════════════ TIER 4 · JEFE FINAL (combinaciones más complicadas) ═════════════════════
  {
    id: 'd4-altura-rec',
    day: 4,
    tier: 4,
    type: 'rec-tree',
    topic: 'Árboles y recursividad',
    title: 'ALTURA RECURSIVA',
    prompt:
      'Cada caja es una llamada **alt(n)** sobre un ABB: **alt(n) = 1 + la altura de su hijo más alto**, y una hoja mide 1. Llena los nodos vacíos.',
    hint: 'Ojo con los nodos de **un solo hijo**: el lado vacío mide 0, así que alt(n) = 1 + alt(ese hijo).',
    explanation:
      'La raíz mide **5**: la rama 50 → 30 → 40 → 45 → 42 es la más larga. La altura es el **peor caso** al buscar (una comparación por nivel); con 10 nodos bien balanceados bastarían 4. Y para medir un nodo primero se miden sus hijos: es **postorden** con muñecas rusas.',
    data: {
      mode: 'fill',
      given: 'leaves',
      // ABB: 50 → izq 30 (20, 40 (35, 45 (42))), der 70 (der 80 (der 90))
      root: alt(50, 5, [
        alt(30, 4, [alt(20, 1), alt(40, 3, [alt(35, 1), alt(45, 2, [alt(42, 1)])])]),
        alt(70, 3, [alt(80, 2, [alt(90, 1)])]),
      ]),
    } satisfies RecTreeData,
  },
  {
    id: 'd4-borrar-raiz',
    day: 4,
    tier: 4,
    type: 'bst-sim',
    topic: 'Árbol binario de búsqueda',
    title: 'JEFE: BORRA LA RAÍZ',
    prompt:
      'Elimina la **raíz (60)**: tiene dos hijos. ¿Quién ocupa su lugar? Usa la regla del curso: el **sucesor inorden**.',
    hint: 'No te detengas antes de tiempo… ni te pases: el sucesor **nunca tiene hijo izquierdo**, aunque sí puede tener derecho.',
    explanation:
      'Sube el **64**, el menor del lado derecho (85 → 70 → 64). El 67 no puede ser: es mayor que 64. Al subir el 64, **su hijo 67 toma su lugar** (el caso de un hijo), y el inorden sigue **ordenado**: …50, 64, 67, 70…',
    data: {
      mode: 'delete',
      initial: [60, 30, 85, 15, 45, 70, 95, 40, 50, 64, 78, 67],
      target: 60,
    } satisfies BstSimData,
  },
  {
    id: 'd4-treemap',
    day: 4,
    tier: 4,
    type: 'quiz',
    topic: 'TreeMap y tablas hash',
    title: 'TREEMAP O HASHMAP',
    prompt:
      'Guardarás 1,000,000 de alumnos por **número de control**. Necesitas **buscar rápido** y también **listarlos ordenados**. ¿Qué usas?',
    hint: 'Revisa las dos condiciones en cada opción: ¿**qué tan rápido busca**? ¿**en qué orden** quedan sus claves?',
    explanation:
      '**TreeMap**: es un ABB que se mantiene balanceado, así que busca en **O(log n)** (unas 20 comparaciones, como la binaria del lunes) y su **inorden** sale ordenado. HashMap busca en O(1) promedio, pero sus casilleros revuelven las claves; la lista y el arreglo desordenado buscan bolsillo por bolsillo, O(n).',
    data: {
      choices: [
        'HashMap (casilleros de paquetería)',
        'TreeMap (ABB balanceado)',
        'LinkedList (tren de vagones)',
        'Arreglo desordenado + búsqueda secuencial',
      ],
      answer: 1,
    } satisfies QuizData,
  },
  {
    id: 'd4-gps',
    day: 4,
    tier: 4,
    type: 'graph-sim',
    topic: 'Grafos (caminos)',
    title: 'CARRETERAS CONTRA KM',
    prompt:
      'Toca un camino de **Zamora a Pátzcuaro** con el **menor número de carreteras** (el que encuentra **BFS**). Los km se ven, pero aquí no cuentan.',
    hint: 'Piensa en la onda en el agua desde Zamora: ¿a cuántas carreteras de distancia queda cada ciudad?',
    explanation:
      'Zamora → Uruapan → Pátzcuaro: **2 carreteras** (177 km). Por Zacapu y Quiroga son 3 carreteras pero solo 134 km: **menos carreteras no siempre es menos kilómetros**. Para los km, el GPS usa **Dijkstra**: va fijando la ciudad más cercana que falta.',
    data: {
      mode: 'path',
      nodes: cities(),
      edges: roads(),
      start: 'ZAM',
      goal: 'PAT',
      showWeights: true,
    } satisfies GraphSimData,
  },
]

export default day4

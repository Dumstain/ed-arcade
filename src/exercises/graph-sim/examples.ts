import type { Exercise } from '../../engine/types'
import type { GraphSimData } from '../schemas'

/**
 * Ejemplos CORRECTOS para la SALA DE PRUEBAS (?demo=1): los 4 modos, cola (BFS) y pila (DFS),
 * orden de la lista vs alfabético, grafo dirigido (con ida y vuelta encimadas) y km como distractor.
 * Mapa aproximado de Michoacán: x = oeste → este, y = norte → sur (0..100). Km aproximados.
 */
export const examples: Exercise<GraphSimData>[] = [
  // bfs · tier 1 · cola visible · vecinos en el orden de `edges`
  // adyacencia: MOR → CUI, PAT, ZIT · CUI → MOR, ZAM · PAT → MOR, URU · ZAM → CUI, URU
  // BFS desde MOR: MOR, CUI, PAT, ZIT (capa 1), ZAM, URU (capa 2)
  {
    id: 'demo-graph-sim-1',
    day: 4,
    tier: 1,
    type: 'graph-sim',
    topic: 'Grafos',
    title: 'ONDA EN MICHOACÁN',
    prompt:
      'Recorre el mapa con **BFS** desde **Morelia (MOR)**. Toca las ciudades en el orden en que **salen de la cola**. Los empates los decide el **orden de la lista de adyacencia**.',
    hint: 'Primero salen **todas** las vecinas de MOR (capa 1) en el orden de su lista; luego las de la **capa 2**.',
    explanation:
      'BFS es una **onda en el agua**: visita por **capas** (ciudades a 1 carretera, luego a 2…). La **cola** (FIFO, la fila de las tortillas) garantiza ese orden.',
    data: {
      mode: 'bfs',
      start: 'MOR',
      nodes: [
        { id: 'MOR', label: 'Morelia', x: 62, y: 40 },
        { id: 'CUI', label: 'Cuitzeo', x: 66, y: 6 },
        { id: 'PAT', label: 'Pátzcuaro', x: 40, y: 58 },
        { id: 'ZIT', label: 'Zitácuaro', x: 96, y: 52 },
        { id: 'ZAM', label: 'Zamora', x: 10, y: 14 },
        { id: 'URU', label: 'Uruapan', x: 14, y: 80 },
      ],
      edges: [
        { a: 'MOR', b: 'CUI', w: 35 },
        { a: 'MOR', b: 'PAT', w: 56 },
        { a: 'MOR', b: 'ZIT', w: 150 },
        { a: 'PAT', b: 'URU', w: 62 },
        { a: 'CUI', b: 'ZAM', w: 160 },
        { a: 'ZAM', b: 'URU', w: 110 },
      ],
    },
  },

  // matrix · tier 2 · DIRIGIDO (corridas de autobús de ida) · MOR⇄CUI tiene ida y vuelta
  // filas = salida: MOR → PAT, CUI · PAT → URU · URU → ZAM · ZAM → MOR · CUI → MOR  (6 unos)
  {
    id: 'demo-graph-sim-2',
    day: 4,
    tier: 2,
    type: 'graph-sim',
    topic: 'Grafos',
    title: 'MATRIZ DE CORRIDAS',
    prompt:
      'Las flechas son **corridas de autobús de un solo sentido**. Llena la **matriz de adyacencia**: pon **1** en [fila][columna] si hay corrida **de la fila hacia la columna**.',
    hint: 'Revisa una ciudad a la vez: cada **flecha que SALE** de ella es un **1** en **su fila**.',
    explanation:
      'En un grafo **dirigido** la matriz **no es simétrica**: [MOR][PAT] = 1 pero [PAT][MOR] = 0. Entre MOR y CUI hay **ida y vuelta**, por eso hay dos unos.',
    data: {
      mode: 'matrix',
      directed: true,
      nodes: [
        { id: 'MOR', label: 'Morelia', x: 62, y: 25 },
        { id: 'PAT', label: 'Pátzcuaro', x: 42, y: 62 },
        { id: 'URU', label: 'Uruapan', x: 8, y: 84 },
        { id: 'ZAM', label: 'Zamora', x: 10, y: 10 },
        { id: 'CUI', label: 'Cuitzeo', x: 94, y: 78 },
      ],
      edges: [
        { a: 'MOR', b: 'PAT' },
        { a: 'PAT', b: 'URU' },
        { a: 'URU', b: 'ZAM' },
        { a: 'ZAM', b: 'MOR' },
        { a: 'MOR', b: 'CUI' },
        { a: 'CUI', b: 'MOR' },
      ],
    },
  },

  // dfs · tier 3 · pila visible · vecinos en ORDEN ALFABÉTICO (sortNeighbors)
  // adyacencia: MOR → CUI, HID, PAT · CUI → MOR, ZAM · URU → APA, PAT, ZAM · ZAM → CUI, URU · HID → MOR, ZIT
  // DFS desde MOR: MOR, CUI, ZAM, URU, APA, (regresa) PAT, (regresa hasta MOR) HID, ZIT
  {
    id: 'demo-graph-sim-3',
    day: 4,
    tier: 3,
    type: 'graph-sim',
    topic: 'Grafos',
    title: 'LABERINTO DFS',
    prompt:
      'Recorre con **DFS** (recursivo) desde **Morelia (MOR)**. Cada ciudad revisa a sus vecinas en **orden alfabético**. Toca las ciudades en el orden en que se **visitan**.',
    hint: 'Entra siempre a la **primera vecina sin visitar**. Si una ciudad ya no tiene salida, **regresa** a la llamada anterior.',
    explanation:
      'DFS es el **laberinto**: sigue un camino **hasta el fondo** y luego **regresa**; la **pila de llamadas** recuerda por dónde venías. Por eso llega hasta APA antes de conocer HID, que estaba a una carretera de MOR.',
    data: {
      mode: 'dfs',
      start: 'MOR',
      sortNeighbors: true,
      nodes: [
        { id: 'MOR', label: 'Morelia', x: 60, y: 38 },
        { id: 'CUI', label: 'Cuitzeo', x: 64, y: 6 },
        { id: 'HID', label: 'Hidalgo', x: 90, y: 22 },
        { id: 'ZIT', label: 'Zitácuaro', x: 96, y: 56 },
        { id: 'PAT', label: 'Pátzcuaro', x: 38, y: 60 },
        { id: 'URU', label: 'Uruapan', x: 10, y: 70 },
        { id: 'ZAM', label: 'Zamora', x: 6, y: 16 },
        { id: 'APA', label: 'Apatzingán', x: 22, y: 98 },
      ],
      edges: [
        { a: 'MOR', b: 'PAT' },
        { a: 'MOR', b: 'HID' },
        { a: 'MOR', b: 'CUI' },
        { a: 'HID', b: 'ZIT' },
        { a: 'PAT', b: 'URU' },
        { a: 'URU', b: 'ZAM' },
        { a: 'ZAM', b: 'CUI' },
        { a: 'URU', b: 'APA' },
      ],
    },
  },

  // path · tier 4 · km visibles como DISTRACTOR
  // URU → ZIT: mínimo 3 carreteras = URU, ZAM, CUI, ZIT (420 km, única)
  // la de menos km (URU, PAT, MOR, HID, ZIT = 268 km) usa 4 carreteras → no es la que pide BFS
  {
    id: 'demo-graph-sim-4',
    day: 4,
    tier: 4,
    type: 'graph-sim',
    topic: 'Grafos',
    title: 'RUTA CON MENOS TRAMOS',
    prompt:
      'Traza una ruta de **Uruapan (URU)** a **Zitácuaro (ZIT)** que use el **menor número de carreteras** (no de km). Toca ciudades vecinas una por una y luego **COMPROBAR**.',
    hint: 'Piensa como **BFS**: ¿qué ciudades están a 1 carretera de URU? ¿Y a 2? Los **km no cuentan** aquí.',
    explanation:
      'BFS mide la distancia en **número de aristas**: URU → ZAM → CUI → ZIT son **3 carreteras** aunque sumen más km. Para el camino de **menos km** se usa otro algoritmo (**Dijkstra**).',
    data: {
      mode: 'path',
      start: 'URU',
      goal: 'ZIT',
      showWeights: true,
      nodes: [
        { id: 'ZAM', label: 'Zamora', x: 4, y: 6 },
        { id: 'CUI', label: 'Cuitzeo', x: 60, y: 4 },
        { id: 'MOR', label: 'Morelia', x: 60, y: 38 },
        { id: 'HID', label: 'Hidalgo', x: 84, y: 64 },
        { id: 'ZIT', label: 'Zitácuaro', x: 97, y: 26 },
        { id: 'PAT', label: 'Pátzcuaro', x: 32, y: 62 },
        { id: 'URU', label: 'Uruapan', x: 4, y: 40 },
        { id: 'APA', label: 'Apatzingán', x: 4, y: 96 },
        { id: 'TAC', label: 'Tacámbaro', x: 52, y: 96 },
      ],
      edges: [
        { a: 'URU', b: 'PAT', w: 62 },
        { a: 'PAT', b: 'MOR', w: 56 },
        { a: 'MOR', b: 'HID', w: 100 },
        { a: 'HID', b: 'ZIT', w: 50 },
        { a: 'URU', b: 'ZAM', w: 110 },
        { a: 'ZAM', b: 'CUI', w: 150 },
        { a: 'CUI', b: 'ZIT', w: 160 },
        { a: 'MOR', b: 'CUI', w: 35 },
        { a: 'URU', b: 'APA', w: 85 },
        { a: 'PAT', b: 'TAC', w: 50 },
      ],
    },
  },
]

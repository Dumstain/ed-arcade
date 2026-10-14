/**
 * ESQUEMAS DE DATOS Y COMPORTAMIENTO de cada tipo de ejercicio.
 * Fuente de verdad compartida: los componentes (src/exercises/<tipo>/) los
 * implementan EXACTAMENTE así y el contenido (src/content/dayN.ts) los usa.
 * Todo es por TOQUE (tap) — nada de arrastrar obligatorio — y funciona a 360px.
 * Convenciones del curso (CONTEXTO.md): Java, medio = (inicio + fin) / 2 entero,
 * "comparación" = cada elemento revisado.
 * TEXTO DESTACADO: en prompt, hint, explanation, notas y explicaciones de pasos se puede
 * marcar información clave con **así** (se renderiza con <RichText>, src/ui/RichText.tsx).
 * SIN EMOJIS en ningún texto ni ícono: usar PixelIcon.
 */

export type Val = number | string

// ───────────── Bloques visuales reutilizables (src/exercises/_shared/ContextView.tsx) ─────────────
export interface ArrayView {
  values: (Val | null)[]          // null = celda vacía
  name?: string                   // "a"
  showIndex?: boolean             // default true
  highlight?: number[]            // índices resaltados (amarillo)
  dim?: number[]                  // índices atenuados (descartados)
  pointers?: { label: string; index: number }[] // flechitas debajo: {label:'medio', index:5}
}
export interface StackView { values: Val[]; label?: string }          // fondo → tope (se dibuja como platos)
export interface ChainView { values: Val[]; head?: string; showNull?: boolean } // inicio → 3 → 7 → 5 → null
export interface TableView { headers: string[]; rows: Val[][]; caption?: string }
export interface ContextBlock {
  code?: string       // Java MUY corto (≤ 8 líneas), solo lectura, opcional. Preferir visuales.
  array?: ArrayView
  stack?: StackView
  chain?: ChainView
  table?: TableView
  note?: string       // analogía o aclaración breve
}

// ───────────── quiz — opción múltiple ─────────────
// Muestra context (si hay) + opciones como botones grandes. Tocar una opción la
// selecciona; botón COMPROBAR → onCheck(i === answer). Si showSolution, marca la correcta.
export interface QuizData {
  context?: ContextBlock
  choices: string[]               // 2..5 opciones
  answer: number                  // índice de la correcta
  shuffle?: boolean               // default true
}

// ───────────── number — respuesta numérica ─────────────
// context + teclado numérico en pantalla (0-9, borrar, signo -) + COMPROBAR.
export interface NumberData {
  context?: ContextBlock
  answer: number | number[]       // valores aceptados
  unit?: string                   // "comparaciones", "movimientos", "llamadas"
}

// ───────────── order — tocar en orden ─────────────
// Fichas revueltas; tocar una la manda a la "fila de respuesta" (tocarla ahí la regresa).
// Cuando todas están colocadas → COMPROBAR → correcto si el orden es idéntico a `items`.
export interface OrderData {
  context?: ContextBlock
  items: string[]                 // en el ORDEN CORRECTO; el componente revuelve (determinista por id)
  layout?: 'list' | 'row'         // row = fichas cortas en línea (números, llamadas)
}

// ───────────── classify — mandar cada ficha a su casillero ─────────────
// Tocar ficha → tocar casillero. Tocar ficha ya colocada la regresa.
// Con todas colocadas → COMPROBAR → correcto si todas están en su bin; marca las incorrectas.
export interface ClassifyData {
  bins: { id: string; label: string; icon?: string }[]   // 2..4 casilleros (icon = nombre de PixelIcon, src/ui/PixelIcon.tsx — NUNCA emojis)
  items: { text: string; bin: string }[]                 // 4..10 fichas
}

// ───────────── memory-street — la calle de la memoria (Día 1) ─────────────
// Una calle de casas numeradas: casa i tiene dirección baseAddress + i * houseSize.
// mode 'address': un arreglo ocupa casas contiguas desde startHouse. Pregunta: ¿dónde vive name[ask]?
//   answerMode 'tap'  → el alumno toca la casa (COMPROBAR).
//   answerMode 'type' → el alumno escribe la dirección numérica (teclado) (COMPROBAR).
// mode 'chain': nodos dispersos en casas (búsqueda del tesoro). El alumno sigue la cadena
//   tocando las casas en orden desde headHouse y al final toca el letrero "null".
//   Cada casa correcta = onStep(); casa incorrecta = onCheck(false); llegar a null = onCheck(true).
export interface MemoryStreetData {
  mode: 'address' | 'chain'
  houses: number                  // casas visibles (8..16)
  baseAddress: number             // dirección de la casa 0, p.ej. 100
  houseSize?: number              // bytes por casa (default 4)
  answerMode?: 'tap' | 'type'     // solo mode 'address' (default 'tap')
  array?: { name: string; startHouse: number; values: Val[]; ask: number }
  nodes?: { house: number; value: Val; next: number | null }[]   // next = índice de casa o null
  headHouse?: number
}

// ───────────── ref-cards — tarjetas con dirección (Día 1, referencias) ─────────────
// Variables = tarjetas; objetos = casas con contenido. Se ejecuta el código línea por línea.
// En cada paso el alumno apunta cada tarjeta declarada a un objeto (tocar tarjeta → tocar objeto)
// o a "tarjeta en blanco" (null). COMPROBAR paso: bien → onStep() y avanza; mal → onCheck(false).
// Tras el último paso, si hay finalQuestion se responde como quiz; al acertarla → onCheck(true).
// Si no hay finalQuestion, completar el último paso → onCheck(true).
export interface RefCardsData {
  vars: string[]                  // tarjetas en orden de aparición: ["a","b"]
  objects: { id: string; label: string; appearsAt?: number }[] // appearsAt = índice de paso donde aparece (default 0)
  steps: {
    code: string                  // UNA línea Java: "int[] b = a;"
    expect: Record<string, string | null>   // var → id de objeto | null (solo vars ya declaradas)
    labels?: Record<string, string>         // nuevas etiquetas de objetos tras el paso: {arr1: "[9, 2, 3]"}
    explain?: string              // aparece tras acertar el paso
  }[]
  finalQuestion?: { text: string; choices: string[]; answer: number }
}

// ───────────── search-sim — búsqueda con comecocos (Día 1 / Día 2) ─────────────
// mode 'play':
//   binary: en cada paso el alumno toca la celda MEDIO correcta (medio = floor((inicio+fin)/2)).
//     Correcta → se "come" la comparación (onStep), la mitad descartada se atenúa.
//     Incorrecta → onCheck(false) y pista con inicio/fin. Al encontrarla → onCheck(true).
//     Si target no está: cuando inicio > fin el alumno debe tocar el botón "NO ESTÁ (-1)".
//   sequential: el alumno toca las celdas en orden 0,1,2…; el comecocos avanza; al llegar → onCheck(true).
//   showCallStack (binary): junto al arreglo se apilan marcos "binaria(a, x, inicio, fin)" (recursiva).
// mode 'predict': el alumno escribe cuántas comparaciones hará el algoritmo → COMPROBAR →
//   se anima la búsqueda (comecocos comiéndose las celdas revisadas) y se evalúa.
export interface SearchSimData {
  algorithm: 'sequential' | 'binary'
  mode: 'play' | 'predict'
  values: number[]                // ordenado si binary
  target: number
  showCallStack?: boolean
}

// ───────────── stack-sim — pila de platos (Día 2) ─────────────
// view: 'plates' (default, platos apilados) | 'array' (celdas fijas + índice "tope") | 'nodes' (tope → nodo → … → null)
// mode 'build': se muestra el programa `ops` (solo lectura). El alumno arma la pila final con
//   las fichas de `palette` (tocar ficha = push; botón POP quita el tope; botón REINICIAR).
//   COMPROBAR → correcto si la pila (fondo→tope) === expected.
// mode 'popped': mismo programa; el alumno toca fichas de `palette` en el ORDEN en que salen
//   con pop() (bandeja de salida) → COMPROBAR → correcto si === expected.
// mode 'trace': recorre `tokens` uno por uno (p.ej. paréntesis, letras); para cada token el
//   alumno elige PUSH / POP / IGNORAR / ¡ERROR!. Correcto → onStep() y la pila se actualiza;
//   incorrecto → onCheck(false). Terminar los tokens → onCheck(true).
// capacity (view 'array'): tamaño fijo; un push con la pila llena es "desbordamiento" (overflow).
export interface StackSimData {
  mode: 'build' | 'popped' | 'trace'
  view?: 'plates' | 'array' | 'nodes'
  capacity?: number
  initial?: Val[]                 // fondo → tope
  ops?: string[]                  // build/popped: ["push(3)", "push(7)", "pop()", "push(5)"]
  palette?: Val[]                 // build/popped: fichas disponibles
  expected?: Val[]                // build: pila final fondo→tope | popped: valores en orden de salida
  tokens?: { text: string; action: 'push' | 'pop' | 'skip' | 'error' }[]  // trace
}

// ───────────── call-stack — pila de llamadas / muñecas rusas (Día 2) ─────────────
// Fase 1 BAJAR: se muestra el marco de arriba (call + expr). El alumno elige
//   "LLAMAR <siguiente>" o "¡CASO BASE! REGRESAR". Acierto → onStep() y se apila el siguiente
//   marco (una muñeca más pequeña adentro); error → onCheck(false).
// Fase 2 SUBIR (si askReturns, default true): para el marco del tope el alumno escribe el
//   valor que regresa (teclado). Acierto → onStep() y se desapila; error → onCheck(false).
//   Al desapilar el primer marco → onCheck(true). Si askReturns=false, se desapila animado y onCheck(true).
// overflow=true: no hay caso base; tras frames.length marcos el alumno debe tocar
//   "¡STACK OVERFLOW!" (seguir llamando = error). Acierto → onCheck(true).
export interface CallStackData {
  frames: { call: string; expr: string; returns: Val; base?: boolean }[]
  // de la llamada inicial al caso base, p.ej.
  // {call:'factorial(3)', expr:'3 * factorial(2)', returns:6}, …, {call:'factorial(1)', expr:'return 1', returns:1, base:true}
  askReturns?: boolean
  overflow?: boolean
}

// ───────────── rec-tree — árbol de llamadas recursivas (Día 2) ─────────────
// mode 'fill': árbol dibujado (raíz arriba). Las hojas ya traen su valor si given='leaves'
//   (default). El alumno toca un nodo vacío y escribe su valor (teclado). Con todos llenos →
//   COMPROBAR → correcto si todos coinciden; marca los incorrectos (los correctos se quedan).
// mode 'count': el alumno toca TODOS los nodos cuyo label === target (p.ej. "fib(2)") para
//   ver el trabajo repetido → COMPROBAR → correcto si marcó exactamente esos.
export interface RecNode { label: string; value: Val; children?: RecNode[] }
export interface RecTreeData {
  mode: 'fill' | 'count'
  root: RecNode
  given?: 'leaves' | 'none'
  target?: string
}

// ───────────── hanoi — torres de Hanói (Día 2) ─────────────
// Tocar torre origen → tocar torre destino. Movimiento ilegal (grande sobre chico) se bloquea
// con aviso (no cuesta vida). Cada movimiento legal → onStep(). Resolver en ≤ maxMoves →
// onCheck(true). Pasarse de maxMoves → onCheck(false) y se reinicia el tablero.
export interface HanoiData {
  disks: number                   // 2..5
  from?: 0 | 1 | 2                // default 0
  to?: 0 | 1 | 2                  // default 2
  maxMoves?: number               // default 2^disks - 1 (óptimo)
}

// ───────────── queue-sim — la fila de las tortillas / el carrusel (Día 3) ─────────────
// FIFO: se forma ATRÁS (enqueue) y se atiende al de ADELANTE (dequeue).
// view: 'line' (personitas en fila; frente a la izquierda) | 'ring' (cola circular: carrusel de `capacity`
//   casillas con índices y flechas FRENTE / FINAL) | 'array' (celdas fijas en línea con índices y flechas).
// Convención circular (la del curso): frente = índice del PRIMER elemento; final = índice del ÚLTIMO.
//   enqueue: final = (final + 1) % capacity y ahí se guarda; dequeue: frente = (frente + 1) % capacity.
//   Cola vacía al inicio: frente = initialFront (default 0) y final = frente − 1 (con vuelta).
// ops: "enqueue(5)", "dequeue()"; bicola (deque=true): "addFirst(5)", "addLast(5)", "removeFirst()", "removeLast()".
// mode 'build': programa `ops` en solo lectura; el alumno arma la cola final con fichas de `palette`
//   (tocar ficha = ENCOLAR atrás; botón ATENDER saca la del frente; REINICIAR). Con deque hay botones por ambos
//   lados. En vista ring/array las fichas caen en su índice real (se ve la vuelta). COMPROBAR → frente→final === expected.
// mode 'served': el alumno toca fichas de `palette` en el ORDEN en que salen (bandeja de atendidos) → === expected.
// mode 'pointers' (ring/array): estado inicial (`initial` colocado desde initialFront) + programa; el alumno toca la
//   casilla donde termina FRENTE y luego la de FINAL (puede corregir) → COMPROBAR → correcto si === expectedFront y
//   expectedRear. Con showSolution se muestra el estado final completo.
// capacity: encolar con la cola llena muestra "¡COLA LLENA!" y no se permite.
export interface QueueSimData {
  mode: 'build' | 'served' | 'pointers'
  view?: 'line' | 'ring' | 'array'
  deque?: boolean
  capacity?: number
  initial?: Val[]                 // frente → final
  initialFront?: number           // ring/array: índice del frente al inicio (default 0)
  ops?: string[]
  palette?: Val[]                 // build/served: fichas disponibles (necesarias + 1-2 distractores)
  expected?: Val[]                // build: frente → final | served: orden de salida
  expectedFront?: number          // pointers
  expectedRear?: number           // pointers
}

// ───────────── list-sim — tren de vagones / playlist (Día 3) ─────────────
// Nodos como vagones [dato | sig] (simple) o [ant | dato | sig] (doble) con flechas; variables (inicio, fin, p,
// nuevo…) como tarjetas que apuntan a nodos (igual que ref-cards del día 1). kind 'circular': el último apunta al primero.
// mode 'relink': se muestra la operación `op` (p.ej. "Inserta el 5 después de p"). El alumno toca asignaciones de
//   `bank` en ORDEN; cada una se ejecuta y se anima. Si un nodo queda INALCANZABLE (ninguna variable ni flecha
//   llega a él), un fantasma se lo come → onCheck(false) y ese paso se deshace. REINICIAR vuelve al inicio.
//   COMPROBAR → correcto si recorrer desde la variable `head` por sig (circular: una vuelta) da === expected
//   y, en doble, cada ant es consistente con sig.
//   Sintaxis que entiende el simulador: "<lado> = <valor>"; lado: var | var.sig | var.ant | var.sig.sig |
//   var.sig.ant | var.ant.sig; valor: var | var.sig | var.ant | var.sig.sig | null.
// mode 'traverse': el alumno toca los nodos en el orden en que los visita un recorrido desde `start` (variable o
//   id) siguiendo `dir` ('sig' adelante | 'ant' atrás); al final toca "null" (en circular: el nodo inicial otra vez).
//   Acierto onStep(); error onCheck(false); terminar onCheck(true).
export interface ListSimData {
  mode: 'relink' | 'traverse'
  kind?: 'simple' | 'doble' | 'circular'
  nodes: { id: string; value: Val; sig: string | null; ant?: string | null }[]
  vars: Record<string, string | null>   // { inicio: 'n1', p: 'n2', nuevo: 'n9' }
  head?: string                         // variable que marca el inicio (default 'inicio')
  op?: string                           // relink: texto de la operación
  bank?: string[]                       // relink: asignaciones disponibles (correctas + 1-3 distractores)
  maxSteps?: number                     // relink: tope de asignaciones (default bank.length)
  expected?: Val[]                      // relink: valores desde head siguiendo sig
  start?: string                        // traverse
  dir?: 'sig' | 'ant'                   // traverse (default 'sig')
}

// ───────────── hash-sim — casilleros de paquetería (Día 3) ─────────────
// Tabla de `size` casilleros 0..size−1. Función hash visible:
//   'mod'     → h(k) = k % size (claves numéricas)
//   'initial' → h(palabra) = (posición de su primera letra: A=0, B=1, …, Z=25; Ñ cuenta como N) % size
// strategy 'chaining': cada casillero guarda una lista enlazada; la clave nueva va AL FINAL de su cadena.
// strategy 'linear': prueba lineal; si h(k) está ocupado se prueba (h+1) % size, (h+2) % size… hasta uno libre.
// mode 'insert': se insertan `keys` en orden. Para la clave actual el alumno toca el casillero donde termina.
//   Correcto → onStep() y se anima; incorrecto → onCheck(false) con pista que muestra h(k). Al final onCheck(true).
//   Calculadora visible con la cuenta de la clave actual si showMath (default true).
// mode 'search': la tabla ya trae `initial` y luego se insertan solas las `keys`. Se busca `target`: el alumno toca
//   EN ORDEN cada clave que se revisa (cadena de h(target), o casilleros desde h(target) en prueba lineal) hasta
//   encontrarla, o toca "NO ESTÁ" (cadena terminada / casillero vacío). Contador de COMPARACIONES (= claves
//   revisadas). Acierto onStep(); error onCheck(false); terminar onCheck(true).
export interface HashSimData {
  mode: 'insert' | 'search'
  size: number                    // 5..11
  strategy: 'chaining' | 'linear'
  hash: 'mod' | 'initial'
  keys: Val[]
  initial?: Val[][]               // contenido inicial por casillero (chaining: cadena; linear: [k] o [])
  target?: Val                    // search
  showMath?: boolean
}

// ───────────── bst-sim — árbol binario de búsqueda (Día 4) ─────────────
// Árbol dibujado (raíz arriba; analogía: carpetas de la computadora). Regla: menores a la IZQUIERDA, mayores a la
// DERECHA, sin duplicados. El árbol inicial se arma insertando `initial` en ese orden. Responsivo a 360 px.
// mode 'insert': para cada clave de `keys` (en orden) se muestran los huecos (hijos vacíos); el alumno toca el hueco
//   donde queda. Correcto → la clave baja animada comparando ("<" / ">") y onStep(); incorrecto → onCheck(false)
//   con pista del camino. Al terminar todas → onCheck(true).
// mode 'search': buscar `target`: el alumno toca, desde la raíz, cada nodo que se compara; si no está, al llegar a un
//   hueco toca "NO ESTÁ". Contador de comparaciones. onStep / onCheck(false) / onCheck(true).
// mode 'traversal': el alumno toca TODOS los nodos en el orden de `traversal` (preorden: raíz-izq-der; inorden:
//   izq-raíz-der; postorden: izq-der-raíz; niveles: nivel por nivel, de izquierda a derecha). Cada toque correcto
//   se numera (onStep); incorrecto onCheck(false); completo onCheck(true).
// mode 'delete': eliminar `target`. El alumno toca el nodo que OCUPA SU LUGAR: hoja → botón "NADIE (null)";
//   un hijo → ese hijo; dos hijos → el SUCESOR inorden (el menor del subárbol derecho). Correcto → se anima la
//   reestructuración → onCheck(true); incorrecto → onCheck(false).
export interface BstSimData {
  mode: 'insert' | 'search' | 'traversal' | 'delete'
  initial?: number[]
  keys?: number[]
  target?: number
  traversal?: 'preorden' | 'inorden' | 'postorden' | 'niveles'
}

// ───────────── graph-sim — mapa de carreteras de Michoacán (Día 4) ─────────────
// Vértices = ciudades (x, y en 0..100 sobre un mapa pixel), aristas = carreteras (w = km, opcional).
// Panel con la LISTA DE ADYACENCIA visible: vecinos en el ORDEN en que aparecen en `edges` (o alfabético si
//   sortNeighbors). Ese orden decide los empates en BFS/DFS (el prompt debe decirlo).
// mode 'bfs': desde `start`, el alumno toca los vértices en el orden en que BFS los VISITA (al sacarlos de la cola).
//   Con showStructure (default true) se ve la COLA (la fila del día 3). BFS = onda en el agua.
// mode 'dfs': igual con DFS recursivo (vecinos en el orden de la lista); se ve la PILA de llamadas (día 2).
//   DFS = laberinto. En ambos: acierto onStep(); error onCheck(false); completar onCheck(true).
// mode 'matrix': matriz de adyacencia n×n en blanco; tocar [i][j] alterna 0/1 (no dirigido: también [j][i]) →
//   COMPROBAR → correcto si coincide con las aristas.
// mode 'path': el alumno toca, de `start` a `goal`, un camino con el MENOR NÚMERO DE CARRETERAS (el que encuentra
//   BFS; si hay empate cualquiera mínimo vale) → COMPROBAR → correcto si es camino válido y mínimo.
export interface GraphSimData {
  mode: 'bfs' | 'dfs' | 'matrix' | 'path'
  nodes: { id: string; label: string; x: number; y: number }[]
  edges: { a: string; b: string; w?: number }[]
  directed?: boolean
  start?: string
  goal?: string
  sortNeighbors?: boolean
  showStructure?: boolean
  showWeights?: boolean
}

/** Catálogo de tipos válidos (el contenido solo puede usar estos) */
export type ExerciseType =
  | 'quiz' | 'number' | 'order' | 'classify'
  | 'memory-street' | 'ref-cards' | 'search-sim'
  | 'stack-sim' | 'call-stack' | 'rec-tree' | 'hanoi'
  | 'queue-sim' | 'list-sim' | 'hash-sim'
  | 'bst-sim' | 'graph-sim'

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

/** Catálogo de tipos válidos (el contenido solo puede usar estos) */
export type ExerciseType =
  | 'quiz' | 'number' | 'order' | 'classify'
  | 'memory-street' | 'ref-cards' | 'search-sim'
  | 'stack-sim' | 'call-stack' | 'rec-tree' | 'hanoi'

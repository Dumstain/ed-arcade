/**
 * DÍA 3 — COLAS, LISTAS Y HASH (miércoles 14-oct-2026)
 * Orden de juego: tier 1 (CALENTAMIENTO) → tier 2 (RETO) → tier 3 (COMBO) → tier 4 (JEFE FINAL).
 * Analogías del curso: fila de las tortillas (cola), carrusel (cola circular), vagón del metro con
 * dos puertas (bicola), vagones de tren (lista), playlist con siguiente/anterior y en repetición
 * (lista doble / circular), casilleros de paquetería (hash), fila del cine contra tren (arreglo vs nodos).
 * Convenciones: cola circular con frente = índice del PRIMERO y final = índice del ÚLTIMO;
 * enqueue hace final = (final + 1) % capacidad; nodos con campos sig / ant (Java del día 1);
 * hash 'mod' → h(k) = k % m; 'initial' → (posición de la inicial, A = 0) % m.
 */
import type { Exercise } from '../engine/types'
import type {
  ClassifyData,
  HashSimData,
  ListSimData,
  NumberData,
  OrderData,
  QueueSimData,
  QuizData,
} from '../exercises/schemas'

const day3: Exercise[] = [
  // ═════════════════════ TIER 1 · CALENTAMIENTO (conceptos tal cual se vieron en clase) ═════════════════════
  {
    id: 'd3-que-estructura',
    day: 3,
    tier: 1,
    type: 'classify',
    topic: 'Colas, listas y hash',
    title: '¿QUÉ ESTRUCTURA ES?',
    prompt: 'Manda cada ficha a su casillero: ¿funciona como una **cola**, una **lista enlazada** o una **tabla hash**?',
    hint: 'Cola: **el primero que llega sale primero**. Lista: cada uno **sabe quién sigue**. Hash: **una fórmula** te dice el lugar.',
    explanation:
      'La **cola** es la fila de las tortillas (FIFO: nadie se mete), la **lista enlazada** son vagones donde cada uno sabe quién sigue y la **tabla hash** son los casilleros de paquetería: una fórmula te manda directo al tuyo, sin revisar los demás.',
    data: {
      bins: [
        { id: 'cola', label: 'COLA (FIFO)', icon: 'queue' },
        { id: 'lista', label: 'LISTA ENLAZADA', icon: 'train' },
        { id: 'hash', label: 'TABLA HASH', icon: 'locker' },
      ],
      items: [
        { text: 'Fila de las tortillas', bin: 'cola' },
        { text: 'Vagones de tren enganchados', bin: 'lista' },
        { text: 'Paquetería: tu clave dice qué casillero abrir', bin: 'hash' },
        { text: 'Cola de impresión del laboratorio', bin: 'cola' },
        { text: 'Playlist con «siguiente» y «anterior»', bin: 'lista' },
        { text: 'Casillero = clave % 7', bin: 'hash' },
        { text: 'Turnos del banco: pasa el que llegó primero', bin: 'cola' },
        { text: 'Búsqueda del tesoro: cada pista dice dónde está la siguiente', bin: 'lista' },
        { text: 'Estacionamiento: el último dígito de tu placa es tu cajón', bin: 'hash' },
      ],
    } satisfies ClassifyData,
  },
  {
    id: 'd3-cola-tortillas',
    day: 3,
    tier: 1,
    type: 'queue-sim',
    topic: 'Colas',
    title: 'LA FILA DE TORTILLAS',
    prompt:
      'En la **cola**, enqueue forma al que llega al **final** y dequeue() atiende al del **frente**. Arma la fila que deja este programa con las fichas y el botón ATENDER.',
    hint: 'dequeue() no elige: siempre atiende **al que lleva más tiempo formado**.',
    explanation:
      'Quedan **7, 5 y 9**: dequeue() atendió al 3 porque **llegó primero**. Es el mismo programa de la pila de platos del martes (ahí quedaban 3, 7, 9), pero la fila es **FIFO**: nadie se mete. Y peek() solo mira al del frente, sin atenderlo.',
    data: {
      mode: 'build',
      view: 'line',
      ops: ['enqueue(3)', 'enqueue(7)', 'enqueue(5)', 'dequeue()', 'enqueue(9)'],
      palette: [9, 3, 1, 7, 5],
      expected: [7, 5, 9],
    } satisfies QueueSimData,
  },
  {
    id: 'd3-carrusel',
    day: 3,
    tier: 1,
    type: 'queue-sim',
    topic: 'Colas circulares',
    title: 'EL CARRUSEL',
    prompt:
      '**Cola circular**: un carrusel de **5 lugares** (0 a 4) que ya trae 3, 8, 6 y 2. Corre el programa: ATENDER despacha al del **frente** y cada ficha se forma al final.',
    hint: 'Después del lugar 4 no hay lugar 5: **(4 + 1) % 5** te dice a dónde va el siguiente.',
    explanation:
      'El 4 quedó en el **lugar 0**: final = (4 + 1) **% 5** = 0. El lugar que dejó el 3 **se reutilizó** (y el del 8 espera al siguiente), como las sillas del carrusel. Del frente al final: 6, 2, 9, 4.',
    data: {
      mode: 'build',
      view: 'ring',
      capacity: 5,
      initial: [3, 8, 6, 2],
      initialFront: 0,
      ops: ['dequeue()', 'dequeue()', 'enqueue(9)', 'enqueue(4)'],
      palette: [7, 4, 9],
      expected: [6, 2, 9, 4],
    } satisfies QueueSimData,
  },
  {
    id: 'd3-vagon-frente',
    day: 3,
    tier: 1,
    type: 'list-sim',
    topic: 'Listas enlazadas',
    title: 'VAGÓN AL FRENTE',
    prompt:
      'Engancha el vagón **1** al **inicio** del tren: toca las asignaciones en el orden correcto **sin soltar ningún vagón**.',
    hint: 'Si mueves la tarjeta inicio antes de tiempo, **nadie recuerda dónde estaba el 3**.',
    explanation:
      'Primero **nuevo.sig = inicio** (el 1 se agarra del 3) y luego **inicio = nuevo**. Al revés, el 3 queda suelto y el fantasma se come el tren. Son **2 enganches** aunque el tren tenga mil vagones; en un arreglo (la fila del cine) todos tendrían que recorrerse un lugar.',
    data: {
      mode: 'relink',
      kind: 'simple',
      nodes: [
        { id: 'n1', value: 3, sig: 'n2' },
        { id: 'n2', value: 7, sig: 'n3' },
        { id: 'n3', value: 5, sig: null },
        { id: 'nv', value: 1, sig: null },
      ],
      vars: { inicio: 'n1', nuevo: 'nv' },
      head: 'inicio',
      op: 'Inserta el 1 al inicio del tren',
      bank: ['inicio = nuevo', 'nuevo.sig = inicio', 'inicio.sig = nuevo', 'nuevo = inicio'],
      expected: [1, 3, 7, 5],
    } satisfies ListSimData,
  },
  {
    id: 'd3-casilleros',
    day: 3,
    tier: 1,
    type: 'hash-sim',
    topic: 'Tablas hash',
    title: 'CASILLEROS DE PAQUETES',
    prompt:
      'Cada paquete va al casillero **h(k) = k % 7**. Toca dónde queda cada clave; si el casillero ya tiene paquetes, la nueva se **encadena al final** de su lista.',
    hint: 'k % 7 es el **residuo** de dividir entre 7. Por ejemplo, 20 % 7 = 6 porque 20 = 2 × 7 + 6.',
    explanation:
      '15, 8 y 29 dan residuo 1: hubo **colisión** y se formaron en la **lista del casillero 1**. Para encontrar un paquete no revisas los 7 casilleros: la fórmula te manda **directo** al tuyo y solo revisas su lista. Si las claves se reparten bien, buscar es **O(1) en promedio**; en el **peor caso** (todas al mismo casillero) queda una sola lista: **O(n)**.',
    data: {
      mode: 'insert',
      size: 7,
      strategy: 'chaining',
      hash: 'mod',
      keys: [15, 23, 8, 12, 29],
      // false: el alumno hace la cuenta (la pista enseña el residuo); si falla, la pista del juego muestra h(k)
      showMath: false,
    } satisfies HashSimData,
  },

  // ═════════════════════ TIER 2 · RETO (el mismo concepto, más complicado) ═════════════════════
  {
    id: 'd3-playlist-repite',
    day: 3,
    tier: 2,
    type: 'list-sim',
    topic: 'Listas circulares',
    title: 'PLAYLIST EN REPETICIÓN',
    prompt:
      'Playlist en repetición (**lista circular**). Empieza tocando la canción de **p** y sigue en el orden en que suenan **siguiendo sig**; termina tocando otra vez la canción donde empezaste.',
    hint: 'En la lista circular **no hay null**: después de la última canción viene **la primera**.',
    explanation:
      'Sonó Jazz, Pop, Rap, Ska, Rock… y otra vez Jazz: el último nodo apunta **al primero**, así que **no hay null** que te detenga. El recorrido termina cuando **vuelves al nodo donde empezaste**.',
    data: {
      mode: 'traverse',
      kind: 'circular',
      nodes: [
        { id: 'c1', value: 'Ska', sig: 'c2' },
        { id: 'c2', value: 'Rock', sig: 'c3' },
        { id: 'c3', value: 'Jazz', sig: 'c4' },
        { id: 'c4', value: 'Pop', sig: 'c5' },
        { id: 'c5', value: 'Rap', sig: 'c1' },
      ],
      vars: { inicio: 'c1', p: 'c3' },
      start: 'p',
      dir: 'sig',
    } satisfies ListSimData,
  },
  {
    id: 'd3-cola-llena',
    day: 3,
    tier: 2,
    type: 'quiz',
    topic: 'Colas simples y circulares',
    title: '¿COLA LLENA?',
    prompt:
      'Ya atendieron a 3 personas y llega el 9. ¿Qué pasa con **enqueue(9)** en una cola **SIMPLE** (el final solo avanza) y en una **CIRCULAR** (el final da la vuelta)?',
    hint: 'Pregúntate: ¿la cola simple **vuelve a usar** los lugares que dejaron los atendidos?',
    explanation:
      'La **cola simple** desperdicia los lugares del frente: grita ¡LLENA! con 3 casillas vacías. La **circular** calcula final = (5 + 1) **% 6** = 0 y reutiliza la casilla 0, como las sillas del carrusel.',
    data: {
      context: {
        array: {
          name: 'datos',
          values: [null, null, null, 5, 8, 2],
          showIndex: true,
          pointers: [
            { label: 'frente', index: 3 },
            { label: 'final', index: 5 },
          ],
        },
        note: 'Arreglo de **6 casillas**. Las casillas 0, 1 y 2 quedaron libres cuando atendieron a los primeros.',
      },
      choices: [
        'Simple: ¡LLENA!, aunque hay 3 casillas libres. Circular: el 9 entra en la casilla 0.',
        'En las dos, el 9 entra en la casilla 0.',
        'En las dos, ¡LLENA!: después de la casilla 5 ya no hay lugar.',
        'Simple: el 9 entra en la casilla 0. Circular: ¡LLENA!',
      ],
      answer: 0,
    } satisfies QuizData,
  },
  {
    id: 'd3-frente-final',
    day: 3,
    tier: 2,
    type: 'queue-sim',
    topic: 'Colas circulares',
    title: 'FRENTE Y FINAL',
    prompt:
      'Cola circular en un **arreglo de 6** (0 a 5). **FRENTE** = casilla del **primero** de la fila y **FINAL** = casilla del **último** (no la siguiente libre). Corre el programa y toca dónde termina **FRENTE** y después **FINAL**.',
    hint: 'enqueue: **final = (final + 1) % 6**. dequeue: frente = (frente + 1) % 6. Después de la casilla 5 sigue la 0.',
    explanation:
      'FRENTE = **5** y FINAL = **2**: el final dio la vuelta (5 → 0 → 1 → 2) gracias a **% capacidad**. En el arreglo parece que el final quedó «antes» del frente, pero en el carrusel solo siguió girando: del frente al final van 2, 7, 1, 6.',
    data: {
      mode: 'pointers',
      view: 'array',
      capacity: 6,
      initial: [5, 8, 2],
      initialFront: 3,
      ops: ['enqueue(7)', 'dequeue()', 'enqueue(1)', 'dequeue()', 'enqueue(6)'],
      expectedFront: 5,
      expectedRear: 2,
    } satisfies QueueSimData,
  },
  {
    id: 'd3-prueba-lineal',
    day: 3,
    tier: 2,
    type: 'hash-sim',
    topic: 'Tablas hash',
    title: 'PRUEBA LINEAL',
    prompt:
      '**Prueba lineal**: cada casillero guarda **UNA sola clave**. Si h(k) = k % 7 está ocupado, se prueba el **siguiente** hasta hallar uno libre. Toca dónde queda cada clave.',
    hint: 'La tabla también da la vuelta: el siguiente del casillero 6 es el **(6 + 1) % 7 = 0**.',
    explanation:
      '5 y 20 chocaron y tuvieron que **dar la vuelta** hasta los casilleros 0 y 1. Las claves se amontonan en racimos y cada choque alarga la búsqueda; por eso con prueba lineal la tabla **no debe llenarse**. Con encadenamiento, en cambio, cada casillero guarda **su propia lista**.',
    data: {
      mode: 'insert',
      size: 7,
      strategy: 'linear',
      hash: 'mod',
      keys: [9, 12, 19, 5, 20],
      showMath: true,
    } satisfies HashSimData,
  },
  {
    id: 'd3-playlist-doble',
    day: 3,
    tier: 2,
    type: 'list-sim',
    topic: 'Listas dobles',
    title: 'PLAYLIST: 4 ENGANCHES',
    prompt:
      '**Lista doble**: cada canción sabe cuál **sigue** (sig) y cuál va **antes** (ant). Mete Jazz después de p, entre Pop y Rap, sin perder ninguna canción.',
    hint: 'p.sig es tu único camino a Rap: **no lo cambies hasta el final**.',
    explanation:
      'Los 4 enganches: **nuevo.sig = p.sig**, nuevo.ant = p, **p.sig.ant = nuevo** y al último p.sig = nuevo. Si cambias p.sig antes, pierdes a Rap. Es el doble de enganches que en la lista simple, pero a cambio la playlist puede ir **hacia atrás**.',
    data: {
      mode: 'relink',
      kind: 'doble',
      nodes: [
        { id: 's1', value: 'Rock', ant: null, sig: 's2' },
        { id: 's2', value: 'Pop', ant: 's1', sig: 's3' },
        { id: 's3', value: 'Rap', ant: 's2', sig: null },
        { id: 'sn', value: 'Jazz', ant: null, sig: null },
      ],
      vars: { inicio: 's1', p: 's2', nuevo: 'sn' },
      head: 'inicio',
      op: 'Inserta Jazz después de p',
      bank: ['p.sig = nuevo', 'nuevo.ant = p', 'p.ant = nuevo', 'nuevo.sig = p.sig', 'p.sig.ant = nuevo', 'nuevo.ant = p.sig'],
      expected: ['Rock', 'Pop', 'Jazz', 'Rap'],
    } satisfies ListSimData,
  },

  // ═════════════════════ TIER 3 · COMBO (combina conceptos de forma simple) ═════════════════════
  {
    id: 'd3-pila-vs-cola',
    day: 3,
    tier: 3,
    type: 'queue-sim',
    topic: 'Pilas y colas',
    title: 'PILA VS COLA',
    prompt:
      '¿Te suena? Es el programa de «¿QUIÉN SALE PRIMERO?» del martes, pero ahora con una **cola**. Toca los números en el **orden en que los atienden**.',
    hint: 'Con la pila salían 8, 6, 1, 4. En la fila, cada dequeue() atiende al que **lleva más tiempo formado**.',
    explanation:
      'Salen **4, 8, 1, 6**: el mismo orden en que llegaron. La pila (**LIFO**) los volteaba; la cola (**FIFO**) los respeta. Mismo programa, distinta estructura, distinto resultado.',
    data: {
      mode: 'served',
      view: 'line',
      ops: ['enqueue(4)', 'enqueue(8)', 'dequeue()', 'enqueue(1)', 'enqueue(6)', 'dequeue()', 'dequeue()', 'dequeue()'],
      palette: [6, 1, 4, 2, 8],
      expected: [4, 8, 1, 6],
    } satisfies QueueSimData,
  },
  {
    id: 'd3-dos-pilas',
    day: 3,
    tier: 3,
    type: 'number',
    topic: 'Pilas y colas',
    title: 'COLA CON DOS PILAS',
    prompt:
      'Una **cola hecha con dos pilas**: a la pila entrada llegaron 4, 8 y 1, en ese orden. Corre el programa de la nota: ¿qué número regresa el **segundo desencolar()**?',
    hint: 'El primer desencolar() encuentra salida vacía: **pasa TODO** lo de entrada a salida, uno por uno, y luego hace pop() de salida.',
    explanation:
      'Regresa **8**. Al pasar 1, 8 y 4 de entrada a salida, la pila se **voltea**: el 4 quedó en el tope y salió primero; luego el 8. Dos volteretas = el orden de llegada: **FIFO** hecho con dos pilas LIFO, como el r = 472 del ArrayDeque del martes.',
    data: {
      context: {
        code: [
          'void encolar(int x) { entrada.push(x); }',
          'int desencolar() {',
          '  if (salida.isEmpty())',
          '    while (!entrada.isEmpty())',
          '      salida.push(entrada.pop());',
          '  return salida.pop();',
          '}',
        ].join('\n'),
        stack: { values: [4, 8, 1], label: 'entrada' },
        note: 'salida empieza vacía. Programa: **desencolar(); encolar(6); desencolar();**',
      },
      answer: 8,
    } satisfies NumberData,
  },
  {
    id: 'd3-hash-listas',
    day: 3,
    tier: 3,
    type: 'hash-sim',
    topic: 'Tablas hash y búsqueda',
    title: 'ARREGLO DE LISTAS',
    prompt:
      'Paquetería por nombre: **h(nombre) = (posición de su inicial) % 7**, con A = 0, B = 1… Busca a **Luis**: toca en orden cada nombre que revisas hasta encontrarlo.',
    hint: 'L es la letra número 11 (contando desde A = 0). Solo revisas **la lista de UN casillero**, en orden.',
    explanation:
      'h(Luis) = 11 % 7 = **4**: solo revisaste la lista del casillero 4 (Eva, Sara, Luis), **3 comparaciones**. En una sola lista con los 14 nombres podrías hacer hasta 14, como buscar las llaves bolsillo por bolsillo. Una tabla hash es un **arreglo de listas**: el arreglo te lleva directo y la lista guarda las colisiones.',
    data: {
      mode: 'search',
      size: 7,
      strategy: 'chaining',
      hash: 'initial',
      initial: [['Ana', 'Hugo'], ['Beto', 'Iván'], ['Caro'], ['Dani', 'Rosa'], ['Eva', 'Sara'], ['Fer', 'Mia'], ['Nora']],
      keys: ['Tere', 'Luis'],
      target: 'Luis',
      // false: la calculadora no resuelve h(Luis); la pista (L = 11) y la ayuda A=0…Z=25 sí se ven
      showMath: false,
    } satisfies HashSimData,
  },
  {
    id: 'd3-cola-vagones',
    day: 3,
    tier: 3,
    type: 'list-sim',
    topic: 'Colas con nodos',
    title: 'COLA CON VAGONES',
    prompt:
      '**Cola con nodos**: frente señala al primero de la fila y **fin** al último. Encola el **8** y luego el 2 tocando las asignaciones en orden, sin recorrer el tren; al terminar, fin debe quedar en el 2.',
    hint: 'Si fin no se mueve después de encolar el 8, **¿de qué vagón se colgaría el 2?**',
    explanation:
      'fin.sig = nuevo; **fin = nuevo**; fin.sig = otro; fin = otro. Gracias a la tarjeta **fin** no recorres la fila para encolar: es **O(1)**, como en la fila de las tortillas, donde el que llega solo busca al último. Desencolar es igual que el pop de la pila con nodos: frente = frente.sig.',
    data: {
      mode: 'relink',
      kind: 'simple',
      nodes: [
        { id: 'n1', value: 5, sig: 'n2' },
        { id: 'n2', value: 3, sig: 'n3' },
        { id: 'n3', value: 9, sig: null },
        { id: 'nv', value: 8, sig: null },
        { id: 'no', value: 2, sig: null },
      ],
      vars: { frente: 'n1', fin: 'n3', nuevo: 'nv', otro: 'no' },
      head: 'frente',
      op: 'encolar(8) y luego encolar(2)',
      bank: ['fin = nuevo', 'frente.sig = nuevo', 'fin.sig = otro', 'fin.sig = nuevo', 'frente = nuevo', 'fin = otro'],
      expected: [5, 3, 9, 8, 2],
    } satisfies ListSimData,
  },

  // ═════════════════════ TIER 4 · JEFE FINAL (combinaciones más complicadas) ═════════════════════
  {
    id: 'd3-metro',
    day: 3,
    tier: 4,
    type: 'queue-sim',
    topic: 'Bicolas',
    title: 'METRO DE DOS PUERTAS',
    prompt:
      '**Bicola**: el vagón del metro con **puerta en cada punta**; se entra y se sale por las dos. Corre el programa y arma cómo queda el vagón, del frente al final.',
    hint: 'First = la puerta del **frente**; Last = la puerta del **final**. Dibuja el vagón después de cada línea.',
    explanation:
      'Queda **8, 5, 6**. Si solo usas addLast y removeFirst, la bicola es una **cola**; si solo usas addFirst y removeFirst, es una **pila**. Por eso Java usa la misma ArrayDeque para las dos cosas.',
    data: {
      mode: 'build',
      view: 'line',
      deque: true,
      ops: ['addLast(5)', 'addLast(3)', 'addFirst(8)', 'removeLast()', 'addFirst(1)', 'addLast(6)', 'removeFirst()'],
      palette: [3, 6, 1, 8, 2, 5],
      expected: [8, 5, 6],
    } satisfies QueueSimData,
  },
  {
    id: 'd3-arraydeque',
    day: 3,
    tier: 4,
    type: 'order',
    topic: 'Bicolas (ArrayDeque)',
    title: 'ARRAYDEQUE BICOLA',
    prompt:
      '**ArrayDeque**, la bicola profesional de Java: ¿qué imprime este código? Toca los nombres en el **orden en que se imprimen**.',
    hint: 'Dibuja la fila después de cada línea: **push** no forma al final, se mete **por la puerta de adelante**.',
    explanation:
      'Imprime **Dani Ana Beto Caro**. push metió a Caro y a Dani por el frente (como platos: pila), offer formó a los demás al final (cola) y poll siempre atiende al de adelante: **d.offer(d.poll())** sacó a Caro del frente y la volvió a formar al final. Una sola ArrayDeque hace de pila y de cola: es una **bicola**, igual que el metro.',
    data: {
      context: {
        code: [
          'ArrayDeque<String> d = new ArrayDeque<>();',
          'd.offer("Ana");',
          'd.offer("Beto");',
          'd.push("Caro");',
          'd.offer(d.poll());',
          'd.push("Dani");',
          'while (!d.isEmpty())',
          '  System.out.print(d.poll() + " ");',
        ].join('\n'),
        note: '**offer** forma al final, **push** mete por el frente y **poll** saca del frente.',
      },
      items: ['Dani', 'Ana', 'Beto', 'Caro'],
      layout: 'row',
    } satisfies OrderData,
  },
  {
    id: 'd3-ultimo-vagon',
    day: 3,
    tier: 4,
    type: 'list-sim',
    topic: 'Listas dobles y bicolas',
    title: 'EL ÚLTIMO VAGÓN',
    prompt:
      '**Bicola con nodos dobles**. Haz **removeLast()**: x tiene que quedarse con el último vagón (para devolver su dato) y el tren debe terminar en el 2.',
    hint: 'Antes de soltar al 6, **alguien tiene que agarrarlo**. Y pregúntate: ¿a quién le pones sig = null si fin **todavía no se mueve**?',
    explanation:
      'x = fin; **fin = fin.ant**; fin.sig = null. Gracias a **ant**, removeLast() es **O(1)**: fin.ant te lleva al penúltimo sin recorrer. En una lista simple tendrías que caminar desde inicio hasta el penúltimo (O(n)); por eso la LinkedList de Java es doble.',
    data: {
      mode: 'relink',
      kind: 'doble',
      nodes: [
        { id: 'v1', value: 4, ant: null, sig: 'v2' },
        { id: 'v2', value: 7, ant: 'v1', sig: 'v3' },
        { id: 'v3', value: 2, ant: 'v2', sig: 'v4' },
        { id: 'v4', value: 6, ant: 'v3', sig: null },
      ],
      vars: { inicio: 'v1', fin: 'v4', x: null },
      head: 'inicio',
      op: 'removeLast(): x se queda con el último vagón',
      bank: ['fin.sig = null', 'x = fin.ant', 'fin = fin.ant', 'inicio = inicio.sig', 'x = fin'],
      expected: [4, 7, 2],
    } satisfies ListSimData,
  },
  {
    id: 'd3-jefe-hash',
    day: 3,
    tier: 4,
    type: 'hash-sim',
    topic: 'Tablas hash',
    title: 'JEFE: CASILLERO VACÍO',
    prompt:
      'Tabla con **prueba lineal**. Busca el **33**: toca en orden cada clave que revisas; si llegas a un casillero **vacío**, toca NO ESTÁ.',
    hint: 'Empieza en h(33) = 33 % 7 y avanza de uno en uno (después del 6 sigue el 0). Mientras el casillero esté **ocupado**, el 33 todavía podría estar más adelante.',
    explanation:
      'h(33) = **5**: revisaste 12, 20, 14, 26 y 5 (**5 comparaciones**) hasta topar con el casillero 3 vacío; si el 33 existiera, la prueba lineal lo habría dejado antes de ese hueco. La tabla está casi llena (**factor de carga** = 5 claves entre 7 casilleros, unos **0.71**) y la búsqueda ya se acerca a **O(n)**: por eso una tabla hash se agranda antes de llenarse (el HashMap de Java duplica su arreglo cuando el factor de carga pasa de **0.75**).',
    data: {
      mode: 'search',
      size: 7,
      strategy: 'linear',
      hash: 'mod',
      initial: [[14], [], [], [], [], [12], [20]],
      keys: [26, 5],
      target: 33,
      // false: en el jefe el alumno calcula h(33) (la pista le dice cómo)
      showMath: false,
    } satisfies HashSimData,
  },
]

export default day3

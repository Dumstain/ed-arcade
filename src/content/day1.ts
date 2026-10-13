/**
 * DÍA 1 — MEMORIA Y EFICIENCIA (lunes 12-oct-2026) · repaso jugable
 * Orden de juego: tier 1 (CALENTAMIENTO) → tier 2 (RETO) → tier 3 (COMBO) → tier 4 (JEFE FINAL).
 * Analogías del curso: memoria = calle de casas con dirección; arreglo = butacas juntas;
 * nodos = búsqueda del tesoro / vagones; referencia = tarjeta con la dirección; null = tarjeta
 * en blanco; Big-O = contar pasos (cajón 5, diccionario, pasar lista, todos saludan a todos);
 * peor caso = llaves en el último bolsillo; binaria = adivinar con «más alto / más bajo».
 * Datos de clase (Dia1.java): {4, 9, 13, 18, 22, 27, 31, 36, 42, 47, 53, 58};
 * 47 → secuencial 10 comparaciones, binaria 4; binaria(50) = -1.
 * Experimento.java (dato ausente): secuencial 10 / 1,000 / 1,000,000; binaria 4 / 10 / 20.
 * Convenciones: medio = (inicio + fin) / 2 entero; cada elemento revisado = 1 comparación;
 * dirección de a[i] = dirección de a[0] + i × tamaño (int = 4 bytes).
 */
import type { Exercise } from '../engine/types'
import type {
  ClassifyData,
  MemoryStreetData,
  NumberData,
  OrderData,
  RefCardsData,
  SearchSimData,
} from '../exercises/schemas'

/** Arreglo ordenado de Dia1.java */
const D = [4, 9, 13, 18, 22, 27, 31, 36, 42, 47, 53, 58]

const day1: Exercise[] = [
  // ═════════════════════ TIER 1 · CALENTAMIENTO (conceptos tal cual se vieron en clase) ═════════════════════
  {
    id: 'd1-calle-butacas',
    day: 1,
    tier: 1,
    type: 'memory-street',
    topic: 'Memoria y arreglos',
    title: 'BUTACAS JUNTAS',
    prompt:
      'La memoria es una calle de casas con número. El arreglo a apartó 6 casas juntas, como butacas en el cine. Toca la casa donde vive a[4].',
    hint: 'Cuenta desde a[0], no desde la primera casa de la calle.',
    explanation:
      'a[4] vive 4 casas después de a[0]: la casa 6, dirección 108 + 4 × 4 = 124. Como las butacas están juntas y son del mismo tamaño, llegas directo sin tocar las demás puertas.',
    data: {
      mode: 'address',
      houses: 10,
      baseAddress: 100,
      houseSize: 4,
      answerMode: 'tap',
      array: { name: 'a', startHouse: 2, values: [3, 7, 5, 1, 8, 6], ask: 4 },
    } satisfies MemoryStreetData,
  },
  {
    id: 'd1-sec-llaves',
    day: 1,
    tier: 1,
    type: 'search-sim',
    topic: 'Búsqueda secuencial',
    title: 'BOLSILLO POR BOLSILLO',
    prompt:
      'Busca el 47 como buscas tus llaves: bolsillo por bolsillo. Toca las celdas en orden, desde la 0, hasta encontrarlo.',
    hint: 'Sin brincarte ninguna: 0, 1, 2… Cada celda que revisas es una comparación.',
    explanation:
      'El 47 está en el índice 9: revisaste 10 celdas, 10 comparaciones. La secuencial funciona aunque los datos estén revueltos, pero en el peor caso (llaves en el último bolsillo) revisa las n: O(n).',
    data: {
      algorithm: 'sequential',
      mode: 'play',
      values: D,
      target: 47,
    } satisfies SearchSimData,
  },
  {
    id: 'd1-bigo-analogias',
    day: 1,
    tier: 1,
    type: 'classify',
    topic: 'Big-O',
    title: '¿CUÁNTOS PASOS?',
    prompt:
      'Big-O cuenta pasos, no segundos. Manda cada situación al casillero que dice cómo crecen sus pasos cuando hay más datos.',
    hint: 'Si llegan el doble de datos, ¿los pasos no cambian, suben poquito, se duplican o se multiplican por 4?',
    explanation:
      'Abrir el cajón 5 o leer a[4] es ir directo: O(1). El diccionario y el «más alto / más bajo» parten a la mitad: O(log n). Pasar lista y las llaves van uno por uno: O(n), y saludar a todos es cada quien con cada quien: O(n²).',
    data: {
      bins: [
        { id: 'o1', label: 'O(1)', icon: '🗄️' },
        { id: 'ologn', label: 'O(log n)', icon: '📖' },
        { id: 'on', label: 'O(n)', icon: '📋' },
        { id: 'on2', label: 'O(n²)', icon: '🤝' },
      ],
      items: [
        { text: 'Abrir el cajón 5 de la cajonera', bin: 'o1' },
        { text: 'Pasar lista: un alumno, un paso', bin: 'on' },
        { text: 'Buscar en el diccionario abriéndolo a la mitad', bin: 'ologn' },
        { text: 'Que todos se saluden de mano con todos', bin: 'on2' },
        { text: 'Leer a[4] de un arreglo', bin: 'o1' },
        { text: 'Buscar tus llaves bolsillo por bolsillo', bin: 'on' },
        { text: 'Adivinar un número del 1 al 100 con «más alto / más bajo»', bin: 'ologn' },
        { text: 'Cada invitado prueba el plato de todos los demás', bin: 'on2' },
      ],
    } satisfies ClassifyData,
  },
  {
    id: 'd1-ref-tarjeta',
    day: 1,
    tier: 1,
    type: 'ref-cards',
    topic: 'Referencias',
    title: 'COPIA LA TARJETA',
    prompt:
      'Una variable de arreglo es una tarjeta con la dirección de la casa, no la casa. Ejecuta línea por línea: toca cada tarjeta y luego la casa a la que lleva.',
    hint: 'b = a no construye otra casa: solo copia la dirección escrita en la tarjeta.',
    explanation:
      'a[0] vale 9: a y b son dos tarjetas con la MISMA dirección. Si pintas la puerta usando b, a también la ve pintada.',
    data: {
      vars: ['a', 'b'],
      objects: [{ id: 'arr', label: '[1, 2, 3]' }],
      steps: [
        {
          code: 'int[] a = {1, 2, 3};',
          expect: { a: 'arr' },
        },
        {
          code: 'int[] b = a;',
          expect: { a: 'arr', b: 'arr' },
          explain: 'b = a copió la tarjeta, no la casa: dos tarjetas, una sola casa.',
        },
        {
          code: 'b[0] = 9;',
          expect: { a: 'arr', b: 'arr' },
          labels: { arr: '[9, 2, 3]' },
          explain: 'Pintaste la puerta usando b… y es la misma casa a la que lleva a.',
        },
      ],
      finalQuestion: {
        text: '¿Cuánto vale a[0] ahora?',
        choices: ['1', '9', '0', 'Truena (error)'],
        answer: 1,
      },
    } satisfies RefCardsData,
  },

  // ═════════════════════ TIER 2 · RETO (el mismo concepto, más complicado) ═════════════════════
  {
    id: 'd1-calle-direccion',
    day: 1,
    tier: 2,
    type: 'memory-street',
    topic: 'Memoria y arreglos',
    title: 'CALCULA LA DIRECCIÓN',
    prompt:
      'Ahora sin contar casas: los letreros del arreglo están tapados, menos el de a[0]. Cada int mide 4 bytes. Escribe la dirección de a[5].',
    hint: 'Lee la dirección de a[0] en su letrero y usa la fórmula de la pantalla. Ojo: i es el índice, no el dato que guarda la casa.',
    explanation:
      'dir(a[5]) = 212 + 5 × 4 = 232. Es una suma y una multiplicación, tenga el arreglo 7 casillas o un millón: por eso a[i] es O(1), como ir directo a la butaca 5.',
    data: {
      mode: 'address',
      houses: 10,
      baseAddress: 200,
      houseSize: 4,
      answerMode: 'type',
      array: { name: 'a', startHouse: 3, values: [15, 8, 42, 4, 23, 16, 9], ask: 5 },
    } satisfies MemoryStreetData,
  },
  {
    id: 'd1-bin-47',
    day: 1,
    tier: 2,
    type: 'search-sim',
    topic: 'Búsqueda binaria',
    title: 'MÁS ALTO, MÁS BAJO',
    prompt:
      'Mismo arreglo, mismo 47, pero con búsqueda binaria. En cada paso toca la celda del MEDIO: el comecocos se la come y la mitad que ya no sirve se apaga.',
    hint: 'medio = (inicio + fin) / 2, sin decimales. Al principio: (0 + 11) / 2 = 5.',
    explanation:
      'Revisaste 27, 42, 53 y 47: 4 comparaciones contra las 10 de la secuencial. Es el juego de adivinar el número: cada «más alto / más bajo» descarta la mitad, O(log n), y solo funciona porque los datos están ordenados.',
    data: {
      algorithm: 'binary',
      mode: 'play',
      values: D,
      target: 47,
    } satisfies SearchSimData,
  },
  {
    id: 'd1-ref-nodos',
    day: 1,
    tier: 2,
    type: 'ref-cards',
    topic: 'Referencias y nodos',
    title: 'DOS TARJETAS, UN NODO',
    prompt:
      'El ejercicio 1 de Dia1.java, ahora con nodos. Cada casa muestra [dato | sig]. Sigue las tarjetas n1 y n2 línea por línea. ¡Ojo con new!',
    hint: 'new siempre construye una casa nueva. «n2 = …» mueve la tarjeta n2; «n2.dato = …» cambia lo que hay DENTRO de su casa.',
    explanation:
      'n1.dato vale 7: n2.dato = 7 se hizo cuando las dos tarjetas llevaban a la misma casa. Después new Nodo(10) construyó otra casa y solo n2 se mudó; la casa de n1 conserva su 7.',
    data: {
      vars: ['n1', 'n2'],
      objects: [
        { id: 'nA', label: '[3 | null]' },
        { id: 'nB', label: '[10 | null]', appearsAt: 3 },
      ],
      steps: [
        {
          code: 'Nodo n1 = new Nodo(3);',
          expect: { n1: 'nA' },
        },
        {
          code: 'Nodo n2 = n1;',
          expect: { n1: 'nA', n2: 'nA' },
          explain: 'Igual que con el arreglo: n2 copió la tarjeta. Sigue habiendo un solo nodo.',
        },
        {
          code: 'n2.dato = 7;',
          expect: { n1: 'nA', n2: 'nA' },
          labels: { nA: '[7 | null]' },
          explain: 'Cambiaste el dato DENTRO de la casa; las tarjetas no se movieron.',
        },
        {
          code: 'n2 = new Nodo(10);',
          expect: { n1: 'nA', n2: 'nB' },
          explain: 'new levantó OTRA casa y solo n2 se mudó a ella; n1 se quedó donde estaba.',
        },
      ],
      finalQuestion: {
        text: '¿Cuánto vale n1.dato al final?',
        choices: ['3', '7', '10', 'null'],
        answer: 1,
      },
    } satisfies RefCardsData,
  },
  {
    id: 'd1-bigo-tarea',
    day: 1,
    tier: 2,
    type: 'classify',
    topic: 'Big-O',
    title: 'DETECTIVE DE PASOS',
    prompt:
      'Como en Tarea1.java: cada ficha son los pasos medidos con n = 8, 16, 32 y 64. Fíjate cómo crecen cada vez que n se duplica y mándala a su complejidad.',
    hint: 'Compara cada número con el anterior: ¿se queda igual, suma poquito, se duplica o se multiplica por 4?',
    explanation:
      'Importa cómo crecen, no el número exacto: 16 → 32 → 64 → 128 se duplica igual que 8 → 16 → 32 → 64, así que también es O(n) (las constantes se quitan). Con el doble de alumnos, pasar lista cuesta el doble; que todos se saluden cuesta 4 veces más. Y si al duplicar n solo se suma un poquito (3 → 4 → 5 → 6, o 6 → 8 → 10 → 12), es O(log n): como partir el diccionario a la mitad, el doble de datos solo agrega uno o dos pasos.',
    data: {
      bins: [
        { id: 'o1', label: 'O(1)' },
        { id: 'ologn', label: 'O(log n)' },
        { id: 'on', label: 'O(n)' },
        { id: 'on2', label: 'O(n²)' },
      ],
      items: [
        { text: '1 → 1 → 1 → 1', bin: 'o1' },
        { text: '8 → 16 → 32 → 64', bin: 'on' },
        { text: '64 → 256 → 1,024 → 4,096', bin: 'on2' },
        { text: '3 → 4 → 5 → 6', bin: 'ologn' },
        { text: '16 → 32 → 64 → 128', bin: 'on' },
        { text: '5 → 5 → 5 → 5', bin: 'o1' },
        { text: '6 → 8 → 10 → 12', bin: 'ologn' },
        { text: '128 → 512 → 2,048 → 8,192', bin: 'on2' },
      ],
    } satisfies ClassifyData,
  },

  // ═════════════════════ TIER 3 · COMBO (combina conceptos de forma simple) ═════════════════════
  {
    id: 'd1-tesoro',
    day: 1,
    tier: 3,
    type: 'memory-street',
    topic: 'Nodos y referencias',
    title: 'BÚSQUEDA DEL TESORO',
    prompt:
      'Cada nodo guarda su dato y la dirección del siguiente, como una pista. Sigue la cadena desde INICIO tocando las casas en orden y termina en el letrero NULL.',
    hint: 'No avances a la casa de al lado: lee la pista (→ dirección) de la casa donde estás y busca ese letrero.',
    explanation:
      'Recorriste 3 → 7 → 5 → 9 → null siguiendo direcciones, igual que actual = actual.sig. Los vagones no están en orden en la calle: para llegar al cuarto hay que pasar por los tres primeros, O(n).',
    data: {
      mode: 'chain',
      houses: 12,
      baseAddress: 100,
      houseSize: 4,
      headHouse: 7,
      nodes: [
        { house: 7, value: 3, next: 2 },
        { house: 2, value: 7, next: 10 },
        { house: 10, value: 5, next: 4 },
        { house: 4, value: 9, next: null },
        { house: 8, value: 4, next: 0 },
        { house: 0, value: 6, next: null },
        { house: 5, value: 1, next: 11 },
        { house: 11, value: 2, next: 8 },
      ],
    } satisfies MemoryStreetData,
  },
  {
    id: 'd1-experimento',
    day: 1,
    tier: 3,
    type: 'number',
    topic: 'Secuencial vs binaria',
    title: 'EL EXPERIMENTO',
    prompt:
      'El profe corrió Experimento.java: busca un dato que NO está (el peor caso) en arreglos de 10, 1,000 y 1,000,000. ¿Cuántas comparaciones hace la binaria con 1,000,000 de datos?',
    hint: 'La binaria revisa tantas veces como puedes partir los datos a la mitad: con 1,000 (1,000 → 500 → 250 → …) fueron 10. Y 1,000,000 es 1,000 × 1,000.',
    explanation:
      'Con 1,000,000 la binaria hace 20. De 1,000 a 1,000,000 los datos se multiplicaron por 1,000: la secuencial también se multiplicó por 1,000, pero la binaria solo sumó 10, porque 10 mitades dividen entre 1,024 ≈ 1,000. Así se ve O(n) contra O(log n): pasar lista contra partir el diccionario a la mitad.',
    data: {
      context: {
        table: {
          caption: 'Experimento.java · comparaciones en el peor caso',
          headers: ['n', 'secuencial', 'binaria'],
          rows: [
            ['10', '10', '4'],
            ['1,000', '1,000', '10'],
            ['1,000,000', '1,000,000', '?'],
          ],
        },
        note: 'Binaria = adivinar el número con «más alto / más bajo»: cada pregunta parte los datos a la mitad.',
      },
      answer: 20,
      unit: 'comparaciones',
    } satisfies NumberData,
  },
  {
    id: 'd1-tren-insertar',
    day: 1,
    tier: 3,
    type: 'order',
    topic: 'Nodos: insertar en medio',
    title: 'ENGANCHA EL VAGÓN',
    prompt:
      'b ya apunta al vagón 7. Ordena las 3 líneas para meter un vagón con 9 entre el 7 y el 5 sin perder el resto del tren.',
    hint: 'Antes de soltar el enganche del 7, alguien tiene que agarrar la dirección del 5.',
    explanation:
      'Primero x se engancha al 5 (x.sig = b.sig) y luego el 7 se engancha a x. Si haces b.sig = x primero, pierdes la dirección del 5 y el resto del tren. Solo cambian dos enganches, haya 4 vagones o mil; en la fila del cine todos se tendrían que recorrer.',
    data: {
      context: {
        chain: { values: [3, 7, 5], head: 'inicio', showNull: true },
        note: 'Meta: inicio → 3 → 7 → 9 → 5 → null. La tarjeta b lleva al vagón 7.',
      },
      items: ['Nodo x = new Nodo(9);', 'x.sig = b.sig;', 'b.sig = x;'],
      layout: 'list',
    } satisfies OrderData,
  },

  // ═════════════════════ TIER 4 · JEFE FINAL (combinaciones más complicadas) ═════════════════════
  {
    id: 'd1-butacas-vs-vagones',
    day: 1,
    tier: 4,
    type: 'classify',
    topic: 'Arreglos vs nodos',
    title: 'BUTACAS VS VAGONES',
    prompt:
      '¿Quién lo hace en menos pasos: el arreglo (butacas juntas) o los nodos (vagones enganchados)? Si los dos tienen que revisar uno por uno, es EMPATE.',
    hint: 'Para cada ficha pregúntate: ¿el arreglo tiene que recorrer a todos? ¿Los nodos tienen que seguir flechas desde el inicio?',
    explanation:
      'El arreglo gana cuando hay que ir directo a una posición (dirección = a[0] + i × tamaño); por eso la binaria necesita arreglo. Los nodos ganan al meter vagones o crecer: dos enganches y listo, mientras en el arreglo todos se recorren o se mudan a uno más grande. Para revisar todos, los dos dan n pasos.',
    data: {
      bins: [
        { id: 'arr', label: 'GANA EL ARREGLO', icon: '💺' },
        { id: 'nod', label: 'GANAN LOS NODOS', icon: '🚂' },
        { id: 'emp', label: 'EMPATE', icon: '⚖️' },
      ],
      items: [
        { text: 'Leer el elemento 500', bin: 'arr' },
        { text: 'Meter un dato en medio (ya estás parado ahí)', bin: 'nod' },
        { text: 'Buscar un dato en datos desordenados', bin: 'emp' },
        { text: 'Búsqueda binaria: saltar al medio', bin: 'arr' },
        { text: 'Hacerle lugar a un séptimo cuando el arreglo de 6 ya está lleno', bin: 'nod' },
        { text: 'Imprimir todos los datos', bin: 'emp' },
        { text: 'Cambiar el dato de la posición 3', bin: 'arr' },
        { text: 'Meter un dato al inicio', bin: 'nod' },
      ],
    } satisfies ClassifyData,
  },
  {
    id: 'd1-tarjeta-blanco',
    day: 1,
    tier: 4,
    type: 'ref-cards',
    topic: 'Referencias y null',
    title: 'TARJETA EN BLANCO',
    prompt:
      'Sigue las tarjetas a y b por el tren. Cada casa muestra [dato | sig]. Si una tarjeta ya no lleva a ninguna casa, apúntala a la tarjeta en blanco (null).',
    hint: 'a.sig = … no mueve la tarjeta a: cambia lo escrito DENTRO de su casa. Y el sig del último vagón es null.',
    explanation:
      'b quedó en blanco porque el sig del último vagón es null, y ir a la casa de una tarjeta en blanco truena: NullPointerException. Por eso al recorrer se pregunta actual != null antes de usar actual.dato.',
    data: {
      vars: ['a', 'b'],
      objects: [
        { id: 'n3', label: '[3 | null]' },
        { id: 'n7', label: '[7 | null]', appearsAt: 1 },
      ],
      steps: [
        {
          code: 'Nodo a = new Nodo(3);',
          expect: { a: 'n3' },
        },
        {
          code: 'a.sig = new Nodo(7);',
          expect: { a: 'n3' },
          labels: { n3: '[3 | #112]' },
          explain: 'a no se movió: se llenó el sig DENTRO de la casa del 3 con la dirección del 7 (#112).',
        },
        {
          code: 'Nodo b = a.sig;',
          expect: { a: 'n3', b: 'n7' },
          explain: 'b copió la dirección que estaba en el sig del 3: ahora lleva al vagón 7.',
        },
        {
          code: 'b = b.sig;',
          expect: { a: 'n3', b: null },
          explain: 'El sig del 7 es null: b quedó en blanco, como actual al final de la cadena.',
        },
      ],
      finalQuestion: {
        text: 'Ahora se ejecuta b.dato = 5; ¿qué pasa?',
        choices: ['El 7 cambia a 5', 'Se crea un nodo nuevo con 5', 'Truena: NullPointerException', 'a.dato cambia a 5'],
        answer: 2,
      },
    } satisfies RefCardsData,
  },
  {
    id: 'd1-ultima-puerta',
    day: 1,
    tier: 4,
    type: 'number',
    topic: 'Binaria y direcciones',
    title: 'JEFE: LA ÚLTIMA PUERTA',
    prompt:
      'La binaria busca el 50, que NO está. a[0] vive en la dirección 200 y cada int mide 4. ¿En qué dirección vive la ÚLTIMA casilla que revisa antes de rendirse?',
    hint: 'Juega la binaria: el primer medio es (0 + 11) / 2 = 5. Cuando inicio > fin se rinde; aplica la fórmula al último medio.',
    explanation:
      'Revisa a[5] = 27, a[8] = 42, a[10] = 53 y a[9] = 47; luego inicio (10) > fin (9) y devuelve -1. La última fue a[9]: 200 + 9 × 4 = 236. La binaria puede saltar así porque en el arreglo cada dirección se calcula en un paso.',
    data: {
      context: {
        array: { name: 'a', values: D },
        note: 'medio = (inicio + fin) / 2 · dir(a[i]) = 200 + i × 4',
      },
      answer: 236,
    } satisfies NumberData,
  },
]

export default day1

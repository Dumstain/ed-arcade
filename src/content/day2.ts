/**
 * DÍA 2 — RECURSIVIDAD Y PILAS (martes 13-oct-2026)
 * Orden de juego: tier 1 (CALENTAMIENTO) → tier 2 (RETO) → tier 3 (COMBO) → tier 4 (JEFE FINAL).
 * Analogías del curso: muñecas rusas (recursión), pila de platos y Ctrl+Z (pila),
 * calle de casas / butacas (arreglo), búsqueda del tesoro / vagones (nodos).
 * Convenciones: medio = (inicio + fin) / 2 entero; fib(0) = 0, fib(1) = 1;
 * pila con arreglo: tope empieza en -1 y pop() solo baja tope.
 */
import type { Exercise } from '../engine/types'
import type {
  CallStackData,
  ClassifyData,
  HanoiData,
  NumberData,
  OrderData,
  QuizData,
  RecNode,
  RecTreeData,
  SearchSimData,
  StackSimData,
} from '../exercises/schemas'

// ───────────── Árboles de Fibonacci (fib(n) = fib(n-1) + fib(n-2); fib(0)=0, fib(1)=1) ─────────────
const fib0 = (): RecNode => ({ label: 'fib(0)', value: 0 })
const fib1 = (): RecNode => ({ label: 'fib(1)', value: 1 })
const fib2 = (): RecNode => ({ label: 'fib(2)', value: 1, children: [fib1(), fib0()] })
const fib3 = (): RecNode => ({ label: 'fib(3)', value: 2, children: [fib2(), fib1()] })
const fib4 = (): RecNode => ({ label: 'fib(4)', value: 3, children: [fib3(), fib2()] })
const fib5 = (): RecNode => ({ label: 'fib(5)', value: 5, children: [fib4(), fib3()] })

const day2: Exercise[] = [
  // ═════════════════════ TIER 1 · CALENTAMIENTO (conceptos tal cual se vieron en clase) ═════════════════════
  {
    id: 'd2-pila-usos',
    day: 2,
    tier: 1,
    type: 'classify',
    topic: 'Pilas',
    title: '¿ES PILA O NO?',
    prompt: 'Manda cada ficha a su casillero: ¿funciona como pila (lo último que entra es lo primero que sale) o no?',
    hint: 'Pregúntate: ¿lo primero que sale es lo ÚLTIMO que entró?',
    explanation:
      'Pila = LIFO, como los platos de la alacena: solo tomas el de arriba. La fila de las tortillas es al revés (el primero que llega sale primero: eso es una cola, la verás el día 3) y las butacas o los cajones son arreglos: vas directo al lugar.',
    data: {
      bins: [
        { id: 'pila', label: 'ES PILA (LIFO)', icon: '🍽️' },
        { id: 'no', label: 'NO ES PILA', icon: '🚫' },
      ],
      items: [
        { text: 'Ctrl+Z: deshacer lo último', bin: 'pila' },
        { text: 'Botón «atrás» del navegador', bin: 'pila' },
        { text: 'Platos limpios en la alacena', bin: 'pila' },
        { text: 'Pila de llamadas de la recursión', bin: 'pila' },
        { text: 'Fila de las tortillas', bin: 'no' },
        { text: 'Turnos del banco: pasa el que llegó primero', bin: 'no' },
        { text: 'Butacas del cine: ir directo a la 7', bin: 'no' },
        { text: 'Cajonera: abrir el cajón 5', bin: 'no' },
      ],
    } satisfies ClassifyData,
  },
  {
    id: 'd2-pila-platos',
    day: 2,
    tier: 1,
    type: 'stack-sim',
    topic: 'Pilas',
    title: 'PILA DE PLATOS',
    prompt: 'Cada push pone un plato hasta arriba y pop() quita el de hasta arriba. Arma la pila final de este programa con las fichas.',
    hint: 'pop() no elige: siempre se lleva el último plato que pusiste.',
    explanation:
      'Quedan 3, 7 y 9: el pop() se llevó el 5 porque fue el último en entrar. LIFO: como en la alacena, solo puedes tocar el plato de arriba.',
    data: {
      mode: 'build',
      view: 'plates',
      ops: ['push(3)', 'push(7)', 'push(5)', 'pop()', 'push(9)'],
      palette: [9, 3, 1, 7, 5],
      expected: [3, 7, 9],
    } satisfies StackSimData,
  },
  {
    id: 'd2-rec-munecas',
    day: 2,
    tier: 1,
    type: 'call-stack',
    topic: 'Recursividad',
    title: 'MUÑECAS RUSAS',
    prompt:
      'fact(n): si n ≤ 1 regresa 1 (caso base); si no, regresa n * fact(n − 1). Abre las muñecas hasta el caso base y luego ciérralas escribiendo lo que regresa cada una.',
    hint: 'Al cerrar, usa lo que regresó la muñeca de adentro: fact(2) = 2 * fact(1).',
    explanation:
      'fact(3) no puede terminar hasta que terminen fact(2) y fact(1): se apilan como muñecas. fact(1) es la muñeca que ya no se abre (caso base) y al cerrarlas se calcula 1 → 2 → 6.',
    data: {
      frames: [
        { call: 'fact(3)', expr: '3 * fact(2)', returns: 6 },
        { call: 'fact(2)', expr: '2 * fact(1)', returns: 2 },
        { call: 'fact(1)', expr: 'return 1', returns: 1, base: true },
      ],
      askReturns: true,
    } satisfies CallStackData,
  },
  {
    id: 'd2-fib-arbol',
    day: 2,
    tier: 1,
    type: 'rec-tree',
    topic: 'Recursividad',
    title: 'ÁRBOL DE FIBONACCI',
    prompt:
      'fib(n) = fib(n − 1) + fib(n − 2), con fib(1) = 1 y fib(0) = 0. Las hojas ya traen su valor: toca cada nodo vacío y escribe cuánto regresa.',
    hint: 'Empieza desde abajo: cada nodo es la suma de sus dos hijos.',
    explanation:
      'fib(4) = 3. Los valores suben de las hojas (casos base) a la raíz, igual que las muñecas se cierran de adentro hacia afuera. ¿Notaste que fib(2) se calculó dos veces?',
    data: {
      mode: 'fill',
      given: 'leaves',
      root: fib4(),
    } satisfies RecTreeData,
  },
  {
    id: 'd2-hanoi-3',
    day: 2,
    tier: 1,
    type: 'hanoi',
    topic: 'Recursividad',
    title: 'TORRES DE HANÓI',
    prompt: 'Pasa los 3 discos a la torre de la derecha en 7 movimientos. Uno a la vez y nunca un disco grande sobre uno chico.',
    hint: 'Primero lleva los 2 discos de arriba a la torre del medio. Truco: el disco chico empieza yendo a la DERECHA.',
    explanation:
      'Mover 3 discos = mover 2 al medio + mover el grande + mover los 2 encima. Es el mismo problema con un disco menos: recursión pura. Total: 2³ − 1 = 7.',
    data: {
      disks: 3,
      from: 0,
      to: 2,
      maxMoves: 7,
    } satisfies HanoiData,
  },

  // ═════════════════════ TIER 2 · RETO (el mismo concepto, más complicado) ═════════════════════
  {
    id: 'd2-pila-salida',
    day: 2,
    tier: 2,
    type: 'stack-sim',
    topic: 'Pilas',
    title: '¿QUIÉN SALE PRIMERO?',
    prompt: 'Lee el programa y toca los números en el ORDEN en que salen con pop().',
    hint: 'Antes de cada pop(), fíjate quién quedó hasta arriba en ese momento.',
    explanation:
      'Salen 8, 6, 1 y 4: cada pop() se lleva el último que entró y no ha salido. Así funciona Ctrl+Z: deshace primero lo más reciente.',
    data: {
      mode: 'popped',
      view: 'plates',
      ops: ['push(4)', 'push(8)', 'pop()', 'push(1)', 'push(6)', 'pop()', 'pop()', 'pop()'],
      palette: [6, 1, 4, 2, 8],
      expected: [8, 6, 1, 4],
    } satisfies StackSimData,
  },
  {
    id: 'd2-fib-repetido',
    day: 2,
    tier: 2,
    type: 'rec-tree',
    topic: 'Recursividad',
    title: 'TRABAJO REPETIDO',
    prompt: 'Este es el árbol de llamadas de fib(5). Toca TODOS los fib(2): cada uno es trabajo que se repite.',
    hint: 'Cada fib(3) esconde un fib(2) adentro… y fib(4) tiene otro más. Revisa ambos lados.',
    explanation:
      'fib(2) se calcula 3 veces y fib(3) 2 veces: fib(5) hace 15 llamadas para llegar a un 5. Por eso Fibonacci recursivo es lentísimo: fib(30) hace cerca de 2.7 millones de llamadas.',
    data: {
      mode: 'count',
      root: fib5(),
      target: 'fib(2)',
    } satisfies RecTreeData,
  },
  {
    id: 'd2-rec-suma',
    day: 2,
    tier: 2,
    type: 'call-stack',
    topic: 'Recursividad',
    title: 'SUMA DE 1 A N',
    prompt:
      'suma(n) suma de 1 a n: si n == 1 regresa 1; si no, regresa n + suma(n − 1). Baja hasta el caso base y sube escribiendo lo que regresa cada llamada.',
    hint: 'Al subir, cada llamada suma su n a lo que regresó la llamada de adentro.',
    explanation:
      'suma(5) = 5 + 4 + 3 + 2 + 1 = 15. Se apilaron 5 marcos (5 muñecas) y se resolvieron de la última a la primera: 1, 3, 6, 10 y 15.',
    data: {
      frames: [
        { call: 'suma(5)', expr: '5 + suma(4)', returns: 15 },
        { call: 'suma(4)', expr: '4 + suma(3)', returns: 10 },
        { call: 'suma(3)', expr: '3 + suma(2)', returns: 6 },
        { call: 'suma(2)', expr: '2 + suma(1)', returns: 3 },
        { call: 'suma(1)', expr: 'return 1', returns: 1, base: true },
      ],
      askReturns: true,
    } satisfies CallStackData,
  },
  {
    id: 'd2-pila-arreglo',
    day: 2,
    tier: 2,
    type: 'number',
    topic: 'Pilas',
    title: 'FANTASMA EN EL ARREGLO',
    prompt: 'Pila con arreglo de tamaño fijo. Corre el programa de la nota: al final, ¿qué número queda guardado en datos[2]?',
    hint: 'Lleva la cuenta de tope (empieza en -1). Fíjate qué hace pop() con el arreglo… ¿lo modifica?',
    explanation:
      'Queda 6: pop() solo baja tope y el valor viejo se queda ahí como fantasma que ya no cuenta; el siguiente push lo pisa. Por eso pop() con arreglo es O(1): no borra nada, solo mueve el índice.',
    data: {
      context: {
        code: [
          'int[] datos = new int[4];',
          'int tope = -1;',
          'void push(int x) {',
          '  tope++; datos[tope] = x;',
          '}',
          'int pop() {',
          '  int x = datos[tope]; tope--; return x;',
          '}',
        ].join('\n'),
        array: { name: 'datos', values: [0, 0, 0, 0], showIndex: true },
        note: 'Así empieza datos (Java lo llena con 0). Programa: push(4); push(8); push(1); pop(); push(6); pop();',
      },
      answer: 6,
    } satisfies NumberData,
  },
  {
    id: 'd2-pila-llena',
    day: 2,
    tier: 2,
    type: 'stack-sim',
    topic: 'Pilas',
    title: '¡PILA LLENA!',
    prompt:
      'Pila con arreglo de 3 lugares. Número = PUSH, * = POP. Si llega un número y ya no cabe, toca ¡ERROR! (desbordamiento).',
    hint: 'Cuenta cuántos datos hay antes de cada número: con 3, ya no cabe otro.',
    explanation:
      'Al llegar el 1 ya había 3 datos (4, 2 y 5): el arreglo es de tamaño fijo y no puede crecer, así que truena por desbordamiento. Fíjate que cada * solo bajó tope: el dato viejo se quedó en su celda hasta que el siguiente push lo pisó (el 2 pisó al 8 y el 5 al 6).',
    data: {
      mode: 'trace',
      view: 'array',
      capacity: 3,
      initial: [],
      tokens: [
        { text: '4', action: 'push' },
        { text: '8', action: 'push' },
        { text: '*', action: 'pop' },
        { text: '2', action: 'push' },
        { text: '6', action: 'push' },
        { text: '*', action: 'pop' },
        { text: '5', action: 'push' },
        { text: '1', action: 'error' },
      ],
    } satisfies StackSimData,
  },

  // ═════════════════════ TIER 3 · COMBO (combina conceptos de forma simple) ═════════════════════
  {
    id: 'd2-stack-overflow',
    day: 2,
    tier: 3,
    type: 'call-stack',
    topic: 'Recursividad y pilas',
    title: 'STACK OVERFLOW',
    prompt:
      'cuenta(n) imprime n y llama a cuenta(n − 1)… pero NADIE le escribió caso base. Aquí la pila de llamadas aguanta 5 marcos: síguela hasta que truene.',
    hint: 'Que n llegue a 0 no detiene nada: solo un if con return detiene la recursión.',
    explanation:
      'Sin caso base nadie regresa: cada llamada apila un marco más hasta llenar la pila de llamadas y Java lanza StackOverflowError. Es la misma pila llena del arreglo, pero con llamadas en lugar de platos.',
    data: {
      frames: [
        { call: 'cuenta(3)', expr: 'print(3); cuenta(2)', returns: '?' },
        { call: 'cuenta(2)', expr: 'print(2); cuenta(1)', returns: '?' },
        { call: 'cuenta(1)', expr: 'print(1); cuenta(0)', returns: '?' },
        { call: 'cuenta(0)', expr: 'print(0); cuenta(-1)', returns: '?' },
        { call: 'cuenta(-1)', expr: 'print(-1); cuenta(-2)', returns: '?' },
      ],
      askReturns: false,
      overflow: true,
    } satisfies CallStackData,
  },
  {
    id: 'd2-hanoi-bigo',
    day: 2,
    tier: 3,
    type: 'quiz',
    topic: 'Recursividad y Big-O',
    title: 'HANÓI VS BIG-O',
    prompt: 'Así crecen los movimientos mínimos de Hanói. Como el lunes, cuenta pasos: ¿qué complejidad tiene?',
    hint: 'Compara cada fila con la anterior: ¿suma 1, se duplica o se eleva al cuadrado?',
    explanation:
      'Cada disco extra duplica los movimientos (2ⁿ − 1): es O(2ⁿ), exponencial. Con 64 discos, a un movimiento por segundo, tardarías unos 585 mil millones de años.',
    data: {
      context: {
        table: {
          headers: ['discos (n)', 'movimientos'],
          rows: [
            [1, 1],
            [2, 3],
            [3, 7],
            [4, 15],
            [5, 31],
            [10, '1,023'],
          ],
        },
        note: 'Big-O cuenta pasos, no segundos: receta para 4, 40 y 400 invitados.',
      },
      choices: ['O(n)', 'O(n²)', 'O(log n)', 'O(2ⁿ)'],
      answer: 3,
    } satisfies QuizData,
  },
  {
    id: 'd2-binaria-rec',
    day: 2,
    tier: 3,
    type: 'search-sim',
    topic: 'Recursividad y búsqueda',
    title: 'BINARIA RECURSIVA',
    prompt:
      'La binaria del lunes, ahora recursiva: cada mitad es una nueva llamada. Toca el MEDIO en cada paso hasta encontrar el 22 y mira cómo se apilan las llamadas.',
    hint: 'medio = (inicio + fin) / 2, sin decimales. Si a[medio] es mayor que 22, la siguiente llamada usa fin = medio − 1.',
    explanation:
      '4 llamadas: binaria(0, 11) → (0, 4) → (3, 4) → (4, 4) y ahí está el 22. Cada llamada es la misma búsqueda con la mitad del arreglo, como adivinar un número del 1 al 100 con «más alto / más bajo»; el caso base es encontrarlo (o que inicio > fin).',
    data: {
      algorithm: 'binary',
      mode: 'play',
      values: [4, 9, 13, 18, 22, 27, 31, 36, 42, 47, 53, 58],
      target: 22,
      showCallStack: true,
    } satisfies SearchSimData,
  },
  {
    id: 'd2-pila-nodos',
    day: 2,
    tier: 3,
    type: 'stack-sim',
    topic: 'Pilas y nodos',
    title: 'PILA CON NODOS',
    prompt:
      '¿Te suena? Es la cadena 3 → 7 → 5 del lunes, pero ahora inicio se llama tope. push crea un nodo cuyo sig es el viejo tope y pop() hace tope = tope.sig: arma la pila final.',
    hint: 'Todo pasa al inicio de la cadena: pop() suelta el primer vagón y push engancha uno nuevo adelante.',
    explanation:
      'Queda tope → 4 → 9 → 7 → 5 → null. push y pop solo cambian enganches al inicio del tren, sin recorrer nada: por eso son O(1). Y como cada nodo se crea con new, la pila no tiene tamaño fijo como el arreglo.',
    data: {
      mode: 'build',
      view: 'nodes',
      initial: [5, 7, 3],
      ops: ['pop()', 'push(9)', 'push(4)'],
      palette: [4, 3, 9, 7, 1, 5],
      expected: [5, 7, 9, 4],
    } satisfies StackSimData,
  },

  // ═════════════════════ TIER 4 · JEFE FINAL (combinaciones más complicadas) ═════════════════════
  {
    id: 'd2-ida-vuelta',
    day: 2,
    tier: 4,
    type: 'order',
    topic: 'Recursividad y pila de llamadas',
    title: 'IDA Y VUELTA',
    prompt: '¿Qué imprime f(3)? Toca los números en el orden en que aparecen en pantalla.',
    hint: 'Lo que está ANTES de la llamada se imprime de ida; lo que está DESPUÉS espera en la pila y sale de regreso.',
    explanation:
      'Imprime 3 2 1 10 20 30. De ida, cada muñeca imprime n antes de abrir la siguiente; el segundo print queda pendiente en la pila de llamadas y se ejecuta al cerrar, de la última a la primera (LIFO).',
    data: {
      context: {
        code: [
          'void f(int n) {',
          '  if (n == 0) return;',
          '  System.out.print(n + " ");',
          '  f(n - 1);',
          '  System.out.print(n * 10 + " ");',
          '}',
        ].join('\n'),
      },
      items: ['3', '2', '1', '10', '20', '30'],
      layout: 'row',
    } satisfies OrderData,
  },
  {
    id: 'd2-arraydeque',
    day: 2,
    tier: 4,
    type: 'number',
    topic: 'Pilas (ArrayDeque)',
    title: 'ARRAYDEQUE PRO',
    prompt: 'La pila profesional de Java: ArrayDeque, con push, pop e isEmpty. ¿Cuánto vale r al terminar?',
    hint: 'x % 10 saca el ÚLTIMO dígito: entran 2, luego 7, luego 4. ¿Cuál queda en el tope?',
    explanation:
      'r = 472. Los dígitos entraron al revés (2, 7, 4) y la pila los volteó otra vez al sacarlos (4, 7, 2): dos inversiones = el número original. ArrayDeque hace push y pop en O(1), igual que tu pila de platos.',
    data: {
      context: {
        code: [
          'ArrayDeque<Integer> pila = new ArrayDeque<>();',
          'int x = 472, r = 0;',
          'while (x > 0) {',
          '  pila.push(x % 10);',
          '  x = x / 10;',
          '}',
          'while (!pila.isEmpty())',
          '  r = r * 10 + pila.pop();',
        ].join('\n'),
      },
      answer: 472,
    } satisfies NumberData,
  },
  {
    id: 'd2-parentesis',
    day: 2,
    tier: 4,
    type: 'stack-sim',
    topic: 'Pilas (aplicaciones)',
    title: 'CAZA DE PARÉNTESIS',
    prompt:
      'Revisa si cierran bien: lo que abre = PUSH, lo que cierra a su pareja del tope = POP, letra = IGNORAR. Si cierra y el tope no es su pareja (o está vacía), ¡ERROR!',
    hint: 'Un ] solo puede cerrar a un [ que esté hasta arriba de la pila.',
    explanation:
      'El ] final encontró un ( en el tope: ese paréntesis nunca se cerró, así que la expresión está mal. Los editores y compiladores revisan tu código con una pila igualita.',
    data: {
      mode: 'trace',
      view: 'plates',
      initial: [],
      tokens: [
        { text: '(', action: 'push' },
        { text: 'a', action: 'skip' },
        { text: '[', action: 'push' },
        { text: 'b', action: 'skip' },
        { text: ']', action: 'pop' },
        { text: '{', action: 'push' },
        { text: '(', action: 'push' },
        { text: 'c', action: 'skip' },
        { text: ')', action: 'pop' },
        { text: '}', action: 'pop' },
        { text: ']', action: 'error' },
      ],
    } satisfies StackSimData,
  },
  {
    id: 'd2-hanoi-4',
    day: 2,
    tier: 4,
    type: 'hanoi',
    topic: 'Recursividad',
    title: 'JEFE FINAL: HANÓI',
    prompt: '4 discos a la torre de la derecha en 15 movimientos, ni uno más. Es Hanói de 3 discos… dos veces, con el disco grande en medio.',
    hint: 'Con 4 discos el chico empieza yendo a la torre del MEDIO. Plan: 3 discos al medio, el grande a la derecha y los 3 encima.',
    explanation:
      'hanoi(4) = hanoi(3) + 1 + hanoi(3) = 7 + 1 + 7 = 15 = 2⁴ − 1. Resolviste el problema grande con dos copias del chico: eso es recursión.',
    data: {
      disks: 4,
      from: 0,
      to: 2,
      maxMoves: 15,
    } satisfies HanoiData,
  },
]

export default day2

/** Ejemplos CORRECTOS para la SALA DE PRUEBAS (?demo=1). Cubren insert/search, chaining/linear, mod/initial. */
import type { Exercise } from '../../engine/types'
import type { HashSimData } from '../schemas'

export const examples: Exercise<HashSimData>[] = [
  // insert + chaining + mod: 23→2, 14→0, 9→2 (colisión), 12→5, 21→0 (colisión)
  {
    id: 'demo-hash-sim-1',
    day: 3,
    tier: 1,
    type: 'hash-sim',
    topic: 'Tabla hash',
    title: 'CASILLEROS',
    prompt:
      'La paquetería tiene **7 casilleros** (0 al 6). Con la calculadora saca el casillero de cada paquete y tócalo. Si ya hay paquetes, el nuevo se cuelga **al final de la fila**.',
    hint: 'El casillero es el **sobrante** de dividir la clave entre 7: **h(k) = k % 7**.',
    explanation:
      'La **función hash** convierte la clave en un casillero con una cuenta rápida. Cuando dos claves caen en el mismo casillero hay una **colisión**; con **encadenamiento** cada casillero guarda una **lista** y la clave nueva va **al final**.',
    data: { mode: 'insert', size: 7, strategy: 'chaining', hash: 'mod', keys: [23, 14, 9, 12, 21], showMath: true },
  },
  // insert + linear + initial (palabras) con vuelta al 0: Juan 9%5=4→ocupado→0 · Óscar 14%5=4→4,0 ocupados→1 · Beto 1→ocupado→2
  {
    id: 'demo-hash-sim-2',
    day: 3,
    tier: 2,
    type: 'hash-sim',
    topic: 'Prueba lineal',
    title: 'EL SIGUIENTE LIBRE',
    prompt:
      'Aquí el casillero sale de la **letra inicial** del nombre (A=0, B=1…) entre 5. Si está **ocupado**, prueba el siguiente casillero; después del último **se vuelve al 0**.',
    hint: 'Primero calcula h(nombre). Si ese casillero ya tiene paquete, avanza **de uno en uno** hasta el primero **libre**.',
    explanation:
      'En **prueba lineal** la colisión se resuelve buscando el **siguiente casillero libre**, dando la vuelta al llegar al final. Los paquetes se van **agrupando** y cada vez cuesta más encontrar un lugar libre.',
    data: {
      mode: 'insert',
      size: 5,
      strategy: 'linear',
      hash: 'initial',
      keys: ['Juan', 'Óscar', 'Beto'],
      initial: [[], [], [], [], ['Elena']],
      showMath: true,
    },
  },
  // search + chaining + initial: Rosa → R=17 % 5 = 2 → fila [Carla, Hugo, Rosa] = 3 comparaciones
  {
    id: 'demo-hash-sim-3',
    day: 3,
    tier: 3,
    type: 'hash-sim',
    topic: 'Búsqueda en tabla hash',
    title: 'BUSCA A ROSA',
    prompt:
      'Busca el paquete de **Rosa**. Calcula su casillero y toca, **en orden**, cada nombre de esa fila con el que se compara. ¡Cuenta las **comparaciones**!',
    hint: 'No hace falta revisar toda la tabla: **h(Rosa)** te lleva directo a **un solo casillero**.',
    explanation:
      'Buscar en una tabla hash es **casi inmediato**: la cuenta te manda a **un solo casillero** y solo comparas su fila. Aquí fueron **3 comparaciones** en vez de revisar los 9 paquetes.',
    data: {
      mode: 'search',
      size: 5,
      strategy: 'chaining',
      hash: 'initial',
      initial: [['Ana', 'Fer'], ['Beto'], ['Carla', 'Hugo'], ['Diego'], ['Elena']],
      keys: ['Karla', 'Rosa'],
      target: 'Rosa',
      showMath: true,
    },
  },
  // search + linear + mod, NO ESTÁ: tabla [14,8,21,15,10,_,_] ; 35 % 7 = 0 → 14,8,21,15,10 y el 5 está vacío = 5 comparaciones
  {
    id: 'demo-hash-sim-4',
    day: 3,
    tier: 4,
    type: 'hash-sim',
    topic: 'Búsqueda en tabla hash',
    title: 'EL QUE NO ESTÁ',
    prompt:
      'Busca el **35** con prueba lineal. Haz **tú** la cuenta, toca los casilleros que se revisan **en orden** y, si llegas a uno **vacío**, toca **NO ESTÁ**.',
    hint: 'Empieza en **35 % 7** y avanza de uno en uno. Un casillero **vacío** te dice que el paquete no puede estar más adelante.',
    explanation:
      'Con prueba lineal se sigue el camino de la colisión hasta un casillero **vacío**. Los paquetes **agrupados** alargan la búsqueda: aquí fueron **5 comparaciones** para descubrir que el 35 **no está**.',
    data: {
      mode: 'search',
      size: 7,
      strategy: 'linear',
      hash: 'mod',
      initial: [[14], [8], [], [], [], [], []],
      keys: [21, 15, 10],
      target: 35,
      showMath: false,
    },
  },
]

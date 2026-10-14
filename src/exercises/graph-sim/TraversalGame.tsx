/**
 * Modos 'bfs' y 'dfs': el alumno toca las ciudades en el orden en que el recorrido las VISITA.
 * BFS = onda en el agua (por capas, con la COLA). DFS = laberinto (hasta el fondo y regresa, con la PILA).
 * Acierto → onStep(); error → onCheck(false) (el mismo error en el mismo paso no cobra otra vida);
 * completar → onCheck(true) una sola vez.
 */
import { useMemo, useRef, useState } from 'react'
import type { ExerciseProps } from '../../engine/types'
import type { GraphSimData } from '../schemas'
import { Pellets, sfx } from '../../ui'
import { useAttemptFlash } from '../_shared/useAttemptFlash'
import { bfsTrace, dfsRoute, dfsTrace, type Cfg, type GNode } from './logic'
import { MapView, type EdgeView, type NodeView, type Walk } from './MapView'
import { AdjPanel, QueuePanel, StackPanel } from './Panels'
import { DEBOUNCE_MS, Hud, NoteBar, SEG_MS, Win, cx, fxAt, layerColor, useGhostAt, useLater, useNote } from './kit'

type Props = ExerciseProps<GraphSimData> & { cfg: Cfg }

const em = (s: string) => `**${s}**`

export function TraversalGame({ cfg, onCheck, onStep, locked, showSolution, attempt }: Props) {
  const isBfs = cfg.mode === 'bfs'
  const bfs = useMemo(() => (isBfs ? bfsTrace(cfg.adj, cfg.start) : null), [isBfs, cfg.adj, cfg.start])
  const dfs = useMemo(() => (isBfs ? null : dfsTrace(cfg.adj, cfg.start)), [isBfs, cfg.adj, cfg.start])
  const order = (bfs ?? dfs)!.order
  const parent = (bfs ?? dfs)!.parent
  const orderIdx = useMemo(() => new Map(order.map((id, i) => [id, i])), [order])
  const code = (id: string | null | undefined) => (id ? (cfg.byId.get(id)?.code ?? id) : '')
  const S = code(cfg.start)
  const structure = cfg.showStructure

  const later = useLater()
  const { note, say } = useNote()
  const { ghost, showGhost } = useGhostAt(later)
  const flash = useAttemptFlash(attempt)

  const [idx, setIdx] = useState(0)
  const idxRef = useRef(0)
  const doneRef = useRef(false)
  const [solved, setSolved] = useState(false)
  const [walk, setWalk] = useState<Walk | null>(null)
  const [leaving, setLeaving] = useState<{ id: string; k: number } | null>(null)
  /** pellets por carretera: desde qué ciudad y con qué retraso se comen (fijo al momento de comerlos) */
  const eatRef = useRef(new Map<string, { from: string; delay: number }>())
  /** errores ya cobrados ("paso:ciudad") */
  const tried = useRef(new Set<string>())
  const advancedAt = useRef(0)

  const done = idx >= order.length
  const visited = useMemo(() => new Set(order.slice(0, idx)), [order, idx])
  const current = idx > 0 ? order[idx - 1] : null

  // ── estructura auxiliar en el paso actual ──
  const queue: string[] = isBfs ? (idx === 0 ? [cfg.start] : (bfs!.steps[idx - 1]?.queueAfter ?? [])) : []
  const queued = new Set(queue)
  const stack: string[] = !isBfs && idx > 0 && !done ? (dfs!.steps[idx - 1]?.stack ?? []) : []
  const onStack = new Set(stack)
  const returnedIds: string[] =
    !isBfs && idx > 0 ? (done ? [...(dfs!.steps[idx - 1]?.returned ?? []), ...dfs!.finalReturned] : (dfs!.steps[idx - 1]?.returned ?? [])) : []

  const layerOf = (id: string) => bfs?.layer.get(id) ?? 0

  // ── pista según el error (ayuda sin regalar la respuesta) ──
  function hintFor(id: string): string {
    const i = idxRef.current
    if (i === 0) return `El recorrido empieza en el **inicio**: ${em(S)}.`
    if (!orderIdx.has(id))
      return `A ${em(code(id))} no se llega desde ${em(S)} por ninguna carretera${cfg.directed ? ' (ojo con los **sentidos**)' : ''}.`
    if (isBfs) {
      if (structure) return 'En BFS sale de la cola el que está al **FRENTE** (el que se formó primero).'
      const lExp = layerOf(order[i])
      if (layerOf(id) > lExp)
        return `Todavía no: ${em(code(id))} está más lejos. BFS termina primero la **capa ${lExp}**, como la onda en el agua.`
      return 'Es de la misma capa, pero el orden lo decide la **cola**: se formaron según la **lista de adyacencia**.'
    }
    const cur = order[i - 1]
    const seen = new Set(order.slice(0, i))
    const free = (cfg.adj.get(cur) ?? []).some((u) => !seen.has(u))
    if (free) return `DFS va **hasta el fondo**: sigue con el **primer vecino sin visitar** de ${em(code(cur))} en su lista.`
    return `${em(code(cur))} ya no tiene vecinos sin visitar: DFS **regresa** (return) a la llamada anterior y sigue con su lista.`
  }

  function tap(id: string, el: HTMLElement) {
    if (locked || doneRef.current) return
    if (performance.now() - advancedAt.current < DEBOUNCE_MS) return
    sfx.click()
    const i = idxRef.current
    const at = orderIdx.get(id)
    if (at !== undefined && at < i) {
      say('warn', '¡YA VISITADA!', `${em(code(id))} ya tiene su número (**${at + 1}**). Cada ciudad se visita **una sola vez**.`)
      return
    }
    if (id === order[i]) return advance(id, el)

    // error
    showGhost(id)
    const sig = `${i}:${id}`
    if (tried.current.has(sig)) {
      say('warn', 'ESA YA LA PROBASTE', `No cuesta otra vida. ${hintFor(id)}`)
      return
    }
    tried.current.add(sig)
    say('bad', '¡FANTASMA!', hintFor(id))
    onCheck(false, id)
  }

  function advance(id: string, el: HTMLElement) {
    const i = idxRef.current
    const next = i + 1
    advancedAt.current = performance.now()
    idxRef.current = next
    setIdx(next)
    tried.current.clear()

    // ruta del comecocos
    const prev = i > 0 ? order[i - 1] : null
    let route: string[]
    if (isBfs) {
      const p = parent.get(id) ?? null
      route = p ? [p, id] : [id]
    } else {
      route = dfsRoute(parent, prev, id)
    }
    const p = parent.get(id) ?? null
    if (p) {
      const e = cfg.edges.find((x) => (x.a === p && x.b === id) || (!cfg.directed && x.a === id && x.b === p))
      if (e) eatRef.current.set(e.key, { from: p, delay: Math.max(0, route.length - 2) * SEG_MS })
    }
    const finished = next >= order.length
    if (finished && !isBfs) {
      // DFS: al terminar, todas las llamadas regresan y el comecocos vuelve a casa
      let cur: string | null = parent.get(id) ?? null
      let guard = 0
      while (cur !== null && guard++ < 64) {
        route.push(cur)
        cur = parent.get(cur) ?? null
      }
    }
    setWalk({ seq: next, route })
    if (isBfs) setLeaving({ id, k: next })
    fxAt(el, String(next), isBfs ? LAYER_FX[layerOf(id) % LAYER_FX.length] : '--pac', 10)

    // aviso de acierto
    if (isBfs) {
      const st = bfs!.steps[i]
      if (structure)
        say(
          'ok',
          `¡${code(id)} SALE DE LA COLA!`,
          st.enqueued.length
            ? `Se forman al final: ${st.enqueued.map((u) => em(code(u))).join(', ')}.`
            : 'No tiene vecinos nuevos: nadie se forma.',
        )
      else say('ok', '¡WAKA!', `${em(code(id))} es la visita **${next}**.`)
    } else {
      const st = dfs!.steps[i]
      if (structure && st.returned.length)
        say('ok', `¡dfs(${code(id)})!`, `Antes regresaron ${st.returned.map((u) => em(`dfs(${code(u)})`)).join(', ')}: ya no tenían salida.`)
      else if (structure) say('ok', `¡dfs(${code(id)})!`, i === 0 ? 'Primera llamada: empieza el laberinto.' : 'Una llamada **más profunda**.')
      else say('ok', '¡WAKA!', `${em(code(id))} es la visita **${next}**.`)
    }

    if (finished) {
      if (isBfs) say('ok', '¡COLA VACÍA!', `Ya no queda nadie en la fila: visitaste las **${order.length}** ciudades que se alcanzan.`)
      else say('ok', '¡LABERINTO COMPLETO!', `Todas las llamadas regresaron hasta **dfs(${S})** y la pila quedó **vacía**.`)
      doneRef.current = true
      setSolved(true)
      onCheck(true, order)
    } else {
      onStep?.()
    }
  }

  // ── vista de cada ciudad ──
  const unreachable = cfg.nodes.filter((n) => !orderIdx.has(n.id))
  const nodeView = (n: GNode): NodeView => {
    const at = orderIdx.get(n.id)
    const isVisited = at !== undefined && at < idx
    const cls: string[] = []
    let badge: string | number | null = null
    let badgeCls: string | undefined
    let ring: string | undefined
    if (isVisited) {
      cls.push('is-visited')
      badge = (at as number) + 1
      if (!isBfs && structure && !onStack.has(n.id) && !done) cls.push('is-finished')
      if (!isBfs && structure && onStack.has(n.id)) cls.push('is-onstack')
    } else if (showSolution && at !== undefined) {
      cls.push('is-sol')
      badge = at + 1
      badgeCls = 'is-sol'
    } else if (isBfs && structure && queued.has(n.id)) {
      cls.push('is-queued')
    }
    if (isBfs && (isVisited || (structure && queued.has(n.id)) || (showSolution && at !== undefined))) ring = layerColor(layerOf(n.id))
    if (current === n.id && !done) cls.push('is-current')
    if (at === undefined && (done || showSolution)) cls.push('is-unreach')
    const state = isVisited
      ? `, visitada ${(at as number) + 1}`
      : at === undefined && (done || showSolution)
        ? ', no se alcanza'
        : isBfs && structure && queued.has(n.id)
          ? ', en la cola'
          : ''
    return {
      cls: cls.join(' '),
      badge,
      badgeCls,
      ring,
      here: n.id === (done && !isBfs ? cfg.start : current),
      ripple: isBfs && current === n.id ? idx : null,
      aria: `${n.label} (${n.code})${n.id === cfg.start ? ', inicio' : ''}${state}`,
      pressed: isVisited,
    }
  }

  const edgeView = (e: { a: string; b: string; key: string }): EdgeView | null => {
    const child = parent.get(e.b) === e.a ? e.b : !cfg.directed && parent.get(e.a) === e.b ? e.a : null
    if (!child || child === cfg.start) return null
    const at = orderIdx.get(child) ?? Infinity
    if (at < idx) {
      const m = eatRef.current.get(e.key)
      return { state: 'eaten', from: m?.from ?? parent.get(child) ?? undefined, delay: m?.delay ?? 0 }
    }
    if (showSolution) return { state: 'sol' }
    return null
  }

  // ── textos ──
  const title = isBfs ? 'BFS · ONDA EN EL AGUA' : 'DFS · LABERINTO'
  const hudSub = showSolution
    ? 'Así era el recorrido.'
    : solved
      ? '¡Recorrido completo!'
      : isBfs
        ? structure && current
          ? `Visitando la **capa ${layerOf(current)}**.`
          : 'Primero lo **más cercano**, capa por capa.'
        : 'Sigue un camino **hasta el fondo** y **regresa**.'
  const idle =
    idx === 0
      ? isBfs
        ? `Toca ${em(S)} para empezar: es el primero en **salir de la cola**.`
        : `Toca ${em(S)}: la primera llamada es **dfs(${S})**.`
      : isBfs
        ? structure
          ? 'Toca la ciudad que **sale de la cola** ahora.'
          : 'Toca la siguiente ciudad que visita **BFS**.'
        : 'Toca la siguiente ciudad que visita **DFS**.'
  const winText = isBfs
    ? `¡Onda completa! **BFS** visitó por **capas**: ${order.map(code).join(' → ')}.`
    : `¡Saliste del laberinto! **DFS** llegó **hasta el fondo** y **regresó**: ${order.map(code).join(' → ')}.`

  const chips = (
    <>
      <span className="gs-chip">{isBfs ? 'COLA' : 'PILA'}</span>
      {cfg.directed && <span className="gs-chip">UN SENTIDO</span>}
      {cfg.showWeights && <span className="gs-chip">KM</span>}
    </>
  )
  const footer = (
    <p className="gs-cap gs-analogy">
      {isBfs ? (
        <>
          <b className="hl">BFS</b> = onda en el agua: primero las ciudades a <b className="hl">1 carretera</b>, luego a 2…
        </>
      ) : (
        <>
          <b className="hl">DFS</b> = laberinto: sigue un camino <b className="hl">hasta el fondo</b> y luego regresa.
        </>
      )}
      {cfg.showWeights && ' Los km no cambian el orden.'}
    </p>
  )

  return (
    <div className={cx('gs-root', flash && 'is-bad')} data-mode={cfg.mode}>
      <Hud
        title={title}
        sub={hudSub}
        chomp={!solved && !showSolution}
        progress
        right={<Pellets total={order.length} done={showSolution ? order.length : idx} />}
      />
      <NoteBar note={showSolution && !solved ? null : note} idle={showSolution && !solved ? 'Los números verdes son el orden correcto.' : idle} />

      <div className="gs-board">
        <div className="gs-mapcol">
          <MapView
            cfg={cfg}
            nodeView={nodeView}
            edgeView={edgeView}
            onTap={tap}
            disabled={locked || solved}
            walk={walk}
            ghost={ghost}
            bad={flash}
            solved={solved}
            chips={chips}
            footer={footer}
          />
        </div>
        <div className="gs-sidecol">
          {structure &&
            (isBfs ? (
              <QueuePanel cfg={cfg} queue={done ? [] : queue} leaving={leaving} colorOf={(id) => layerColor(layerOf(id))} />
            ) : (
              <StackPanel cfg={cfg} stack={stack} returned={returnedIds.length ? { ids: returnedIds, k: idx } : null} />
            ))}
          <AdjPanel cfg={cfg} current={done ? null : current} visited={visited} queued={isBfs ? queued : undefined} marks={structure} />
        </div>
      </div>

      {showSolution && !solved && (
        <section className="px-panel gs-solution" aria-label="Respuesta correcta">
          <h3 className="gs-h">RESPUESTA · ORDEN DE {isBfs ? 'BFS' : 'DFS'}</h3>
          <ol className="gs-sol-order">
            {order.map((id, i) => (
              <li key={id} className={cx(i < idx && 'is-done')}>
                <span className="gs-sol-n">{i + 1}</span>
                {code(id)}
              </li>
            ))}
          </ol>
          {unreachable.length > 0 && (
            <p className="gs-cap">
              No se alcanzan desde {S}: {unreachable.map((n) => n.code).join(', ')}.
            </p>
          )}
        </section>
      )}
      {solved && !showSolution && <Win text={winText} />}
    </div>
  )
}

/** Variables de color para las partículas (no se pueden pasar var(...) a burst) */
const LAYER_FX = ['--pac', '--ghost-cyan', '--ghost-pink', '--ghost-orange', '--ok', '--ghost-red']

/**
 * Modo 'path': el alumno traza, tocando ciudades VECINAS, una ruta de `start` a `goal` con el
 * MENOR NÚMERO DE CARRETERAS (el que encuentra BFS; cualquier empate mínimo vale) → COMPROBAR.
 * Tocar la última ciudad deshace; tocar una ciudad anterior de la ruta regresa hasta ella.
 * Un salto sin carretera directa se bloquea con aviso (no cuesta vida).
 */
import { useMemo, useRef, useState } from 'react'
import type { ExerciseProps } from '../../engine/types'
import type { GraphSimData } from '../schemas'
import { sfx } from '../../ui'
import { useAttemptFlash } from '../_shared/useAttemptFlash'
import { checkPath, edgeKey, isNeighbor, pathKm, shortestPath, type Cfg, type GNode } from './logic'
import { MapView, type EdgeView, type NodeView, type Walk } from './MapView'
import { DEBOUNCE_MS, Hud, NoteBar, Win, cx, fxAt, useNote } from './kit'

type Props = ExerciseProps<GraphSimData> & { cfg: Cfg }
const em = (s: string) => `**${s}**`

export function PathGame({ cfg, onCheck, locked, showSolution, attempt }: Props) {
  const goal = cfg.goal as string
  const best = useMemo(() => shortestPath(cfg.adj, cfg.start, goal) ?? [cfg.start], [cfg.adj, cfg.start, goal])
  const code = (id: string) => cfg.byId.get(id)?.code ?? id
  const S = code(cfg.start)
  const G = code(goal)

  const { note, say, clear } = useNote()
  const flash = useAttemptFlash(attempt)

  const [path, setPathState] = useState<string[]>([cfg.start])
  const pathRef = useRef<string[]>([cfg.start])
  const [walk, setWalk] = useState<Walk | null>(null)
  const walkSeq = useRef(0)
  const [solved, setSolved] = useState(false)
  const doneRef = useRef(false)
  const changedAt = useRef(0)
  const lastWrongSig = useRef<string | null>(null)
  const checkRef = useRef<HTMLButtonElement>(null)

  const interactive = !locked && !solved

  function setPath(next: string[], route: string[] | null) {
    pathRef.current = next
    setPathState(next)
    changedAt.current = performance.now()
    if (route && route.length > 1) {
      walkSeq.current += 1
      setWalk({ seq: walkSeq.current, route })
    }
  }

  function tap(id: string, el: HTMLElement) {
    if (!interactive || doneRef.current) return
    if (performance.now() - changedAt.current < DEBOUNCE_MS) return
    sfx.click()
    const p = pathRef.current
    const end = p[p.length - 1]
    if (id === end) {
      if (p.length > 1) return undo()
      say('info', 'AQUÍ EMPIEZAS', `Desde ${em(S)} toca una ciudad **vecina** (unida por carretera).`)
      return
    }
    const at = p.indexOf(id)
    if (at >= 0) {
      setPath(p.slice(0, at + 1), p.slice(at).reverse())
      say('info', `DE VUELTA EN ${code(id)}`, 'Quitaste el final de la ruta. Sigue desde aquí.')
      return
    }
    if (end === goal) {
      say('warn', '¡YA LLEGASTE!', `La ruta ya termina en ${em(G)}. Toca **COMPROBAR** o deshaz.`)
      return
    }
    if (!isNeighbor(cfg.adj, end, id)) {
      if (cfg.directed && isNeighbor(cfg.adj, id, end))
        say('warn', 'UN SOLO SENTIDO', `Esa carretera va de ${em(code(id))} **hacia** ${em(code(end))}, no al revés.`)
      else say('warn', 'SIN CARRETERA', `No hay carretera **directa** de ${em(code(end))} a ${em(code(id))}. Busca una ciudad **vecina**.`)
      return
    }
    const next = [...p, id]
    setPath(next, [end, id])
    fxAt(el, String(next.length - 1), '--pac', 8)
    if (id === goal) say('ok', '¡LLEGASTE A LA META!', `Ruta de **${next.length - 1}** carreteras. ¿Es la de **menos**? Toca **COMPROBAR**.`)
    else clear()
  }

  function undo() {
    if (!interactive || doneRef.current) return
    const p = pathRef.current
    if (p.length <= 1) return
    sfx.click()
    setPath(p.slice(0, -1), [p[p.length - 1], p[p.length - 2]])
    clear()
  }

  function reset() {
    if (!interactive || doneRef.current) return
    const p = pathRef.current
    if (p.length <= 1) return
    sfx.click()
    setPath([cfg.start], [...p].reverse())
    clear()
  }

  function check() {
    if (!interactive || doneRef.current) return
    const p = pathRef.current
    if (p[p.length - 1] !== goal) return
    sfx.click()
    const res = checkPath(cfg.adj, p, cfg.start, goal)
    if (res.valid && res.minimal) {
      doneRef.current = true
      setSolved(true)
      say('ok', '¡RUTA MÍNIMA!', `**${res.edges}** carreteras: no hay ruta con menos.`)
      fxAt(checkRef.current, '¡RUTA!', '--ok', 16)
      onCheck(true, p)
      return
    }
    const sig = p.join('\u0001')
    if (lastWrongSig.current === sig) {
      say('warn', '¡ES LA MISMA RUTA!', 'Esa ya la probaste: no cuesta otra vida. Cambia algo antes de comprobar.')
      return
    }
    lastWrongSig.current = sig
    say(
      'bad',
      '¡HAY UNA MÁS CORTA!',
      res.valid
        ? `Tu ruta usa **${res.edges}** carreteras y hay una con **menos**. Piensa como **BFS**: capa por capa desde ${em(S)}.`
        : 'Esa ruta no es válida. Sigue solo carreteras directas.',
    )
    onCheck(false, p)
  }

  // ── vistas ──
  const inPath = new Map(path.map((id, i) => [id, i]))
  const inBest = new Map(best.map((id, i) => [id, i]))
  const end = path[path.length - 1]
  const pathEdges = new Map<string, string>() // key → ciudad desde donde se recorrió
  for (let i = 1; i < path.length; i++) pathEdges.set(edgeKey(path[i - 1], path[i], cfg.directed), path[i - 1])
  const bestEdges = new Set<string>()
  for (let i = 1; i < best.length; i++) bestEdges.add(edgeKey(best[i - 1], best[i], cfg.directed))

  const nodeView = (n: GNode): NodeView => {
    const at = inPath.get(n.id)
    const cls: string[] = []
    let badge: number | null = null
    let badgeCls: string | undefined
    const sol = showSolution && !solved
    if (sol && inBest.has(n.id)) {
      // sin vidas: la ruta mínima manda; la del alumno queda atenuada
      cls.push('is-sol')
      const k = inBest.get(n.id) as number
      if (k > 0) {
        badge = k
        badgeCls = 'is-sol'
      }
    } else if (at !== undefined) {
      cls.push('is-visited')
      if (sol) cls.push('is-faded')
      else if (at > 0) badge = at
    }
    if (n.id === end && !solved) cls.push('is-current')
    if (!solved && !showSolution && at === undefined && end !== goal && isNeighbor(cfg.adj, end, n.id)) cls.push('is-option')
    return {
      cls: cls.join(' '),
      badge,
      badgeCls,
      here: n.id === end,
      aria:
        `${n.label} (${n.code})` +
        (n.id === cfg.start ? ', inicio' : n.id === goal ? ', meta' : '') +
        (at !== undefined && at > 0 ? `, paso ${at} de tu ruta` : ''),
      pressed: at !== undefined,
    }
  }
  const edgeView = (e: { key: string }): EdgeView | null => {
    if (showSolution && !solved && bestEdges.has(e.key)) return { state: 'sol' }
    const from = pathEdges.get(e.key)
    if (from) return { state: showSolution && !solved ? 'old' : 'eaten', from }
    return null
  }

  const roads = path.length - 1
  const km = cfg.showWeights ? pathKm(cfg.edges, cfg.directed, path) : null
  const atGoal = end === goal

  return (
    <div className={cx('gs-root', flash && 'is-bad')} data-mode="path">
      <Hud
        title="RUTA MÁS CORTA"
        sub={showSolution ? 'Así era una ruta mínima.' : solved ? '¡Ruta mínima!' : `De ${em(S)} a ${em(G)} con **menos carreteras**.`}
        chomp={!solved && !showSolution}
        right={
          <span className="gs-counts">
            <span className="gs-count" aria-label={`Carreteras: ${roads}`}>
              CARRETERAS <b>{roads}</b>
            </span>
            {km !== null && (
              <span className="gs-count is-km" aria-label={`Kilómetros: ${km}`}>
                KM <b>{km}</b>
              </span>
            )}
          </span>
        }
      />
      <NoteBar
        note={showSolution && !solved ? null : note}
        idle={
          showSolution && !solved
            ? 'La ruta verde usa el **mínimo** de carreteras.'
            : 'Toca ciudades **vecinas** para trazar la ruta. Tocar la última la **deshace**.'
        }
      />

      <div className="gs-board">
        <div className="gs-mapcol">
          <MapView
            cfg={cfg}
            nodeView={nodeView}
            edgeView={edgeView}
            onTap={tap}
            disabled={!interactive}
            walk={walk}
            ghost={null}
            bad={flash}
            solved={solved}
            chips={
              <>
                <span className="gs-chip gs-ico-t">INICIO {S}</span>
                <span className="gs-chip gs-ico-t">META {G}</span>
                {cfg.directed && <span className="gs-chip">UN SENTIDO</span>}
              </>
            }
            footer={
              <p className="gs-cap gs-analogy">
                Cuenta <b className="hl">carreteras</b>, no km: así mide <b className="hl">BFS</b> la distancia.
              </p>
            }
          />
        </div>
        <div className="gs-sidecol">
          <section className="px-panel gs-side gs-route" aria-label="Tu ruta">
            <h3 className="gs-h">TU RUTA</h3>
            <ol className="gs-route-list">
              {path.map((id, i) => (
                <li key={`${id}${i}`} className={cx('gs-route-stop', id === goal && 'is-goal')}>
                  {i > 0 && <i className="gs-arrow-r" aria-hidden="true" />}
                  <span className="gs-route-chip">{code(id)}</span>
                </li>
              ))}
              {!atGoal && (
                <li className="gs-route-stop is-next" aria-hidden="true">
                  <i className="gs-arrow-r" />
                  <span className="gs-route-chip is-empty">?</span>
                </li>
              )}
            </ol>
            {!solved && !showSolution && (
              <>
                <div className="gs-btns">
                  <button type="button" className="px-btn px-btn--ghost" disabled={!interactive || path.length <= 1} onClick={undo}>
                    DESHACER
                  </button>
                  <button type="button" className="px-btn px-btn--ghost" disabled={!interactive || path.length <= 1} onClick={reset}>
                    BORRAR
                  </button>
                </div>
                <button
                  ref={checkRef}
                  type="button"
                  className="px-btn px-btn--primary px-btn--block"
                  disabled={!interactive || !atGoal}
                  onClick={check}
                >
                  COMPROBAR
                </button>
                {!atGoal && <p className="gs-cap">La ruta debe terminar en {G}.</p>}
              </>
            )}
          </section>
        </div>
      </div>

      {showSolution && !solved && (
        <section className="px-panel gs-solution" aria-label="Respuesta correcta">
          <h3 className="gs-h">RESPUESTA · RUTA MÍNIMA ({best.length - 1} CARRETERAS)</h3>
          <ol className="gs-route-list">
            {best.map((id, i) => (
              <li key={id} className="gs-route-stop">
                {i > 0 && <i className="gs-arrow-r" aria-hidden="true" />}
                <span className="gs-route-chip is-sol">{code(id)}</span>
              </li>
            ))}
          </ol>
          <p className="gs-cap">Es la que encuentra BFS; si hay empate, cualquier ruta con {best.length - 1} carreteras valía.</p>
        </section>
      )}
      {solved && !showSolution && (
        <Win text={`¡Ruta mínima! **${roads} carreteras**: lo mismo que encuentra **BFS** de ${S} a ${G}.`} />
      )}
    </div>
  )
}

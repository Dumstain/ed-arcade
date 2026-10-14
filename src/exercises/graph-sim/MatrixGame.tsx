/**
 * Modo 'matrix': matriz de adyacencia n×n en blanco. Tocar [i][j] alterna 0/1
 * (no dirigido: también [j][i]). COMPROBAR → correcto si coincide con las carreteras.
 * Repetir la MISMA matriz equivocada no cobra otra vida.
 */
import { useMemo, useRef, useState } from 'react'
import type { ExerciseProps } from '../../engine/types'
import type { GraphSimData } from '../schemas'
import { RichText, sfx } from '../../ui'
import { useAttemptFlash } from '../_shared/useAttemptFlash'
import { adjacencyMatrix, countOnes, emptyMatrix, matrixDiff, matrixSig, toggleCell, type Cfg, type GNode } from './logic'
import { MapView, type NodeView } from './MapView'
import { MatrixTable } from './Panels'
import { Hud, NoteBar, Win, cx, fxAt, useNote } from './kit'

type Props = ExerciseProps<GraphSimData> & { cfg: Cfg }

export function MatrixGame({ cfg, onCheck, locked, showSolution, attempt }: Props) {
  const n = cfg.nodes.length
  const expected = useMemo(() => adjacencyMatrix(cfg.nodes, cfg.edges, cfg.directed), [cfg.nodes, cfg.edges, cfg.directed])
  const flash = useAttemptFlash(attempt)
  const { note, say, clear } = useNote()

  const [m, setM] = useState<number[][]>(() => emptyMatrix(n))
  const mRef = useRef(m)
  const [focus, setFocus] = useState<[number, number] | null>(null)
  const [wrongRows, setWrongRows] = useState<Set<number>>(() => new Set())
  const [solved, setSolved] = useState(false)
  const doneRef = useRef(false)
  const lastWrongSig = useRef<string | null>(null)
  const checkRef = useRef<HTMLButtonElement>(null)

  const interactive = !locked && !solved

  function toggle(i: number, j: number) {
    if (!interactive || doneRef.current) return
    sfx.click()
    const next = toggleCell(mRef.current, i, j, cfg.directed)
    mRef.current = next
    setM(next)
    setFocus([i, j])
    if (wrongRows.has(i) || (!cfg.directed && wrongRows.has(j))) {
      const w = new Set(wrongRows)
      w.delete(i)
      if (!cfg.directed) w.delete(j)
      setWrongRows(w)
    }
    clear()
  }

  function reset() {
    if (!interactive || doneRef.current) return
    sfx.click()
    const z = emptyMatrix(n)
    mRef.current = z
    setM(z)
    setWrongRows(new Set())
    setFocus(null)
    clear()
  }

  function check() {
    if (!interactive || doneRef.current) return
    sfx.click()
    const cur = mRef.current
    const diff = matrixDiff(cur, expected)
    if (diff.length === 0) {
      doneRef.current = true
      setSolved(true)
      setWrongRows(new Set())
      setFocus(null)
      say('ok', '¡MATRIZ CORRECTA!', `Encontraste los **${countOnes(expected)}** unos: ${cfg.directed ? 'una flecha = un 1' : 'cada carretera = dos 1'}.`)
      fxAt(checkRef.current, '¡MATRIZ!', '--ok', 16)
      onCheck(true, cur)
      return
    }
    const sig = matrixSig(cur)
    const rows = new Set(diff.map((k) => Number(k.split(',')[0])))
    setWrongRows(rows)
    const rowNames = [...rows].sort((a, b) => a - b).map((i) => `**${cfg.nodes[i].code}**`).join(', ')
    if (lastWrongSig.current === sig) {
      say('warn', '¡ES LA MISMA MATRIZ!', `Esa ya la probaste: no cuesta otra vida. Revisa las filas ${rowNames}.`)
      return
    }
    lastWrongSig.current = sig
    const extra = diff.filter((k) => {
      const [i, j] = k.split(',').map(Number)
      return cur[i][j] === 1
    }).length
    const missing = diff.length - extra
    const parts: string[] = []
    if (missing) parts.push(`faltan **${missing}** unos`)
    if (extra) parts.push(`sobran **${extra}** unos`)
    say(
      'bad',
      '¡FANTASMA EN LA MATRIZ!',
      `${parts.join(' y ').replace(/^./, (c) => c.toUpperCase())}. Revisa ${rows.size === 1 ? 'la fila' : 'las filas'} ${rowNames} (en rojo).`,
    )
    onCheck(false, cur)
  }

  // ciudades resaltadas: la de la fila y la de la columna tocadas
  const nodeView = (node: GNode): NodeView => {
    const isRow = !!focus && cfg.nodes[focus[0]]?.id === node.id
    const isCol = !!focus && cfg.nodes[focus[1]]?.id === node.id
    const on = !showSolution && !solved && (isRow || isCol)
    return {
      cls: on ? 'is-focus' : undefined,
      mark: on && cfg.directed ? (isRow && isCol ? 'DE·A' : isRow ? 'DE' : 'A') : undefined,
      aria: `${node.label} (${node.code})${on ? ', seleccionada' : ''}`,
    }
  }

  const ones = countOnes(m)
  const fr = focus ? cfg.nodes[focus[0]] : null
  const fc = focus ? cfg.nodes[focus[1]] : null
  const readout =
    fr && fc
      ? fr.id === fc.id
        ? `[${fr.code}][${fc.code}] = **${m[focus![0]][focus![1]]}** · una ciudad no tiene carretera a sí misma.`
        : cfg.directed
          ? `[${fr.code}][${fc.code}] = **${m[focus![0]][focus![1]]}** · ¿hay carretera de ${fr.code} **hacia** ${fc.code}?`
          : `[${fr.code}][${fc.code}] = [${fc.code}][${fr.code}] = **${m[focus![0]][focus![1]]}** · ¿hay carretera directa?`
      : cfg.directed
        ? 'Fila = ciudad de **salida**; columna = ciudad de **llegada**.'
        : 'Toca una casilla: **1** = hay carretera directa; **0** = no hay.'

  const idle = cfg.directed
    ? 'Lee el mapa: cada **flecha** es un **1** en la fila de donde sale.'
    : 'Lee el mapa: cada carretera son **dos 1** (la matriz es **simétrica**).'

  return (
    <div className={cx('gs-root', flash && 'is-bad')} data-mode="matrix">
      <Hud
        title="MATRIZ DE ADYACENCIA"
        sub={showSolution ? 'Así era la matriz.' : solved ? '¡Matriz correcta!' : `Tabla de **${n}×${n}**: una fila y una columna por ciudad.`}
        chomp={!solved && !showSolution}
        right={
          <span className="gs-count" aria-label={`Unos marcados: ${ones}`}>
            UNOS <b>{ones}</b>
          </span>
        }
      />
      <NoteBar note={showSolution && !solved ? null : note} idle={showSolution && !solved ? 'Abajo está la matriz correcta.' : idle} />

      <div className="gs-board">
        <div className="gs-mapcol">
          <MapView
            cfg={cfg}
            nodeView={nodeView}
            edgeView={() => null}
            disabled
            walk={null}
            ghost={null}
            bad={flash}
            solved={solved}
            chips={
              <>
                {cfg.directed && <span className="gs-chip">UN SENTIDO</span>}
                {cfg.showWeights && <span className="gs-chip">KM</span>}
              </>
            }
            footer={
              <p className="gs-cap gs-analogy">
                La matriz solo dice <b className="hl">si hay</b> carretera directa{cfg.showWeights ? ' (los km no van aquí)' : ''}.
              </p>
            }
          />
        </div>
        <div className="gs-sidecol">
          <section className="px-panel gs-side gs-mxpanel" aria-label="Matriz de adyacencia">
            <h3 className="gs-h">MATRIZ {cfg.directed ? '· DIRIGIDA' : '· NO DIRIGIDA'}</h3>
            <MatrixTable
              cfg={cfg}
              values={solved ? expected : m}
              onToggle={interactive ? (i, j) => toggle(i, j) : undefined}
              disabled={!interactive}
              wrongRows={interactive ? wrongRows : undefined}
              focus={interactive ? focus : null}
              caption="Matriz de adyacencia: toca una casilla para alternar entre 0 y 1"
            />
            {interactive && (
              <p className="gs-cap gs-readout" aria-live="polite">
                <RichText text={readout} />
              </p>
            )}
            {!solved && !showSolution && (
              <div className="gs-btns">
                <button type="button" className="px-btn px-btn--ghost" disabled={!interactive} onClick={reset}>
                  BORRAR
                </button>
                <button ref={checkRef} type="button" className="px-btn px-btn--primary" disabled={!interactive} onClick={check}>
                  COMPROBAR
                </button>
              </div>
            )}
          </section>
        </div>
      </div>

      {showSolution && !solved && (
        <section className="px-panel gs-solution" aria-label="Respuesta correcta">
          <h3 className="gs-h">RESPUESTA · MATRIZ CORRECTA</h3>
          <MatrixTable cfg={cfg} values={expected} compareTo={m} caption="Matriz de adyacencia correcta" />
          <p className="gs-cap">Las casillas con borde rojo eran distintas en tu matriz.</p>
        </section>
      )}
      {solved && !showSolution && (
        <Win text={`¡Matriz correcta! Cada **1** es una carretera directa${cfg.directed ? ' (de la fila **hacia** la columna)' : ' y aparece **dos veces**'}.`} />
      )}
    </div>
  )
}

/**
 * mode 'traversal': el alumno toca TODOS los nodos en el orden del recorrido
 * (preorden / inorden / postorden / niveles). Cada acierto se numera sobre la carpeta y
 * aparece en la tira de SALIDA; error → onCheck(false) con pista del recorrido.
 */
import { Fragment, useMemo, useState } from 'react'
import { PixelIcon, sfx } from '../../ui'
import { EatStrip } from '../_shared/EatStrip'
import { Board } from './Board'
import type { NodeLook } from './Board'
import { BoardPanel, Hud, Stat, Status, cx, useCore } from './core'
import type { GameProps } from './core'
import { depthOf, find, parentOf, traverse, values } from './logic'
import type { TraversalKind, Tree } from './logic'

const KIND_TITLE: Record<TraversalKind, string> = {
  preorden: 'PREORDEN',
  inorden: 'INORDEN',
  postorden: 'POSTORDEN',
  niveles: 'POR NIVELES',
}
const RECIPE: Record<TraversalKind, string[]> = {
  preorden: ['RAÍZ', 'IZQ', 'DER'],
  inorden: ['IZQ', 'RAÍZ', 'DER'],
  postorden: ['IZQ', 'DER', 'RAÍZ'],
  niveles: ['ARRIBA', 'ABAJO'],
}
const ANALOGY: Record<TraversalKind, string> = {
  preorden: 'Como **imprimir el índice** de carpetas: primero la carpeta y **después** lo que tiene adentro.',
  inorden: 'Todo el lado **izquierdo**, luego la carpeta, luego el lado **derecho**. Fíjate en la salida…',
  postorden: 'Como **borrar una carpeta**: primero vacías lo de adentro y **al final** la carpeta.',
  niveles: 'Como la **fila** del día 3: piso por piso, cada piso de **izquierda a derecha**.',
}
const WIN: Record<TraversalKind, string> = {
  preorden: '¡Recorrido completo! **Preorden**: cada carpeta **antes** que su contenido (así se **copia** un árbol).',
  inorden: '¡Recorrido completo! Mira la salida: quedó **ordenada de menor a mayor**. Eso hace el **inorden** en un BST.',
  postorden: '¡Recorrido completo! **Postorden**: el contenido **antes** que la carpeta (así se **borra** un árbol).',
  niveles: '¡Recorrido completo! **Por niveles** se hace con una **cola**: la fila de las tortillas del día 3.',
}

/** Pista según el recorrido: por qué el nodo tocado todavía no toca. */
function hintFor(kind: TraversalKind, tree: Tree, tapped: number, expected: number, visited: Set<number>): string {
  const node = find(tree, tapped)
  const pending = (vals: number[]) => vals.some((v) => !visited.has(v))
  switch (kind) {
    case 'preorden': {
      const p = parentOf(tree, tapped)
      if (p && p.parent !== null && !visited.has(p.parent))
        return `En **preorden** cada carpeta sale **antes** que sus hijas: el **${tapped}** todavía espera a su carpeta de **arriba**.`
      return 'En **preorden**: **RAÍZ → IZQ → DER**. Termina **todo el lado izquierdo** antes de pasar a la derecha.'
    }
    case 'inorden':
      if (node && pending(values(node.l)))
        return `En **inorden** primero va **todo el lado izquierdo** del **${tapped}**.`
      return `En **inorden**: **IZQ → RAÍZ → DER**. Antes del **${tapped}** todavía faltan carpetas de **más arriba a la izquierda**.`
    case 'postorden':
      if (node && (pending(values(node.l)) || pending(values(node.r))))
        return `En **postorden** la carpeta sale **al final**: antes van **todas sus hijas**.`
      return 'En **postorden**: **IZQ → DER → RAÍZ**. Termina primero el lado **izquierdo** completo.'
    case 'niveles': {
      const dt = depthOf(tree, tapped)
      const de = depthOf(tree, expected)
      if (dt > de) {
        if (de === 0) return '**Por niveles**: termina primero el piso de la **raíz** (el de hasta arriba).'
        return `**Por niveles**: termina primero el piso **${de + 1}** contando desde arriba (la raíz es el piso 1).`
      }
      return 'En el mismo piso se va de **izquierda a derecha**.'
    }
  }
}

export function TraversalGame(props: GameProps) {
  const { cfg, locked, showSolution } = props
  const core = useCore(props)
  const tree = cfg.tree
  const kind = cfg.traversal
  const seq = useMemo(() => traverse(tree, kind), [tree, kind])
  const n = seq.length

  const [k, setK] = useState(0)
  const [wrongNode, setWrongNode] = useState<number | null>(null)

  const effK = showSolution ? n : k
  const interactive = !locked && !showSolution && !core.won && !core.busy

  const onNode = (v: number, el: HTMLElement) => {
    if (!core.canAct()) return
    sfx.click()
    const idx = seq.indexOf(v)
    if (idx >= 0 && idx < k) {
      core.setMsg({ tone: 'info', text: `El **${v}** ya salió (es el número **${idx + 1}**).` })
      return
    }
    if (v === seq[k]) {
      const nk = k + 1
      setK(nk)
      // antirrebote corto: el tablero no se mueve tras un acierto y tocar de nuevo el mismo nodo es gratis
      core.advanced(150)
      core.fx(el, String(nk), nk === n ? '--ok' : '--pac', nk === n ? 16 : 8)
      if (nk === n) {
        core.setMsg({ tone: 'ok', text: WIN[kind] })
        core.win(seq, 650)
      } else {
        core.setMsg({ tone: 'info', text: `El **${v}** sale en el lugar **${nk}**. ¿Quién sigue?` })
        core.step()
      }
      return
    }
    setWrongNode(v)
    core.later(() => setWrongNode((w) => (w === v ? null : w)), 800)
    const visited = new Set(seq.slice(0, k))
    core.miss(`t${k}:${v}`, hintFor(kind, tree, v, seq[k], visited), v)
  }

  const looks = new Map<number, NodeLook>()
  for (let i = 0; i < effK; i++) looks.set(seq[i], { tone: showSolution && i >= k ? 'sol' : 'visited', order: i + 1 })
  if (wrongNode !== null && !looks.has(wrongNode)) looks.set(wrongNode, { tone: 'wrong' })

  const idle = `Toca **todas** las carpetas en el orden del recorrido **${KIND_TITLE[kind].toLowerCase()}**.`
  const solution = showSolution ? `Así era (${KIND_TITLE[kind].toLowerCase()}): **${seq.join(' ')}**` : null

  return (
    <section className={cx('bst', core.hit && 'bst--hit')} aria-label={`Recorrido ${kind} de un árbol binario de búsqueda`}>
      <Hud
        title={showSolution ? 'RESPUESTA' : core.won ? '¡RECORRIDO!' : `RECORRIDO ${KIND_TITLE[kind]}`}
        sub={ANALOGY[kind]}
        chomp={!core.won && !showSolution}
        right={<Stat label="VISITAS" value={`${effK}/${n}`} tone={core.won ? 'ok' : undefined} />}
      />

      <p className="bst-recipe">
        {RECIPE[kind].map((r, i) => (
          <Fragment key={r}>
            {i > 0 && <PixelIcon name="arrow-right" size={14} />}
            <span className="bst-recipe__step">{r}</span>
          </Fragment>
        ))}
        {kind === 'niveles' && <span className="bst-recipe__note">cada piso: IZQ → DER</span>}
      </p>

      <BoardPanel hit={core.hit} ghostKey={core.ghostKey}>
        <Board
          tree={tree}
          looks={looks}
          onNode={onNode}
          interactive={interactive}
          label={`Árbol binario de búsqueda: toca las carpetas en ${kind}`}
          nodeRefs={core.nodeRefs}
        />
      </BoardPanel>

      <Status msg={core.msg} idle={idle} solution={solution} />

      <div className="bst-out" role="group" aria-label={`Salida: ${seq.slice(0, effK).join(', ') || 'vacía'}`}>
        <span className="bst-out__label">SALIDA</span>
        <ol className="bst-out__list" aria-hidden="true">
          {seq.map((v, i) => (
            <li key={i} className={cx('bst-out__slot', i < effK && 'is-full', showSolution && i >= k && 'is-sol')}>
              {i < effK ? v : ''}
            </li>
          ))}
        </ol>
      </div>
      {core.won && !showSolution && <EatStrip pellets={Math.min(20, n + 4)} />}
    </section>
  )
}

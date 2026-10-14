/**
 * mode 'search': el alumno toca, desde la raíz, cada carpeta que se compara con target.
 * Si no está, al caer en un hueco vacío toca "NO ESTÁ". Contador de comparaciones.
 * Lo descartado se atenúa (como la mitad que descarta la búsqueda binaria del día 1).
 */
import { useMemo, useState } from 'react'
import { sfx } from '../../ui'
import { EatStrip } from '../_shared/EatStrip'
import { Board } from './Board'
import type { NodeLook } from './Board'
import { BoardPanel, Hud, Stat, Status, cmpSign, cx, useCore } from './core'
import type { GameProps } from './core'
import { discarded, find, searchPath } from './logic'

const plural = (n: number) => `${n} ${n === 1 ? 'comparación' : 'comparaciones'}`

export function SearchGame(props: GameProps) {
  const { cfg, locked, showSolution } = props
  const core = useCore(props)
  const tree = cfg.tree
  const target = cfg.target as number
  const res = useMemo(() => searchPath(tree, target), [tree, target])
  const total = res.path.length

  const [k, setK] = useState(0)
  const [wrongNode, setWrongNode] = useState<number | null>(null)
  const [wrongNone, setWrongNone] = useState(false)

  const effK = showSolution ? total : k
  const fell = !res.found && effK >= total
  const interactive = !locked && !showSolution && !core.won && !core.busy
  const gone = useMemo(() => discarded(tree, target, effK), [tree, target, effK])

  const flashNode = (v: number) => {
    setWrongNode(v)
    core.later(() => setWrongNode((w) => (w === v ? null : w)), 800)
  }

  const nextHint = (): string => {
    if (k === 0) return 'Toda búsqueda empieza en la **raíz** (la carpeta de hasta arriba).'
    const prev = res.path[k - 1]
    const s = cmpSign(target, prev)
    return `Compara con el **${prev}**: **${target} ${s} ${prev}** → baja por la **${s === '<' ? 'IZQUIERDA' : 'DERECHA'}**.`
  }

  const onNode = (v: number, el: HTMLElement) => {
    if (!core.canAct()) return
    sfx.click()
    const idx = res.path.indexOf(v)
    if (idx >= 0 && idx < k) {
      core.setMsg({ tone: 'info', text: `Ya comparaste el **${v}**. Sigue bajando.` })
      return
    }
    if (k < total && v === res.path[k]) {
      const nk = k + 1
      setK(nk)
      core.advanced()
      if (v === target) {
        core.setMsg({ tone: 'ok', text: `**${target} = ${v}**: ¡lo encontraste con **${plural(nk)}**! Solo revisaste **un camino**, no todo el árbol.` })
        core.fx(el, '¡AQUÍ ESTÁ!', '--ok', 18)
        core.win({ comparisons: nk, found: true }, 650)
        return
      }
      const s = cmpSign(target, v)
      const node = find(tree, v)
      const next = node ? (s === '<' ? node.l : node.r) : null
      const dir = s === '<' ? 'IZQUIERDA' : 'DERECHA'
      core.setMsg({
        tone: 'info',
        text: next
          ? `**${target} ${s} ${v}** → baja por la **${dir}**. Lo del otro lado ya **no se revisa**.`
          : `**${target} ${s} ${v}** → a la **${dir}**… ¡pero ahí hay un **hueco vacío** (null)! Toca **NO ESTÁ**.`,
      })
      core.fx(el, '+1', '--pac', 8)
      core.step()
      return
    }
    flashNode(v)
    let text: string
    if (k >= total) text = `Ya no hay a dónde bajar: el hueco está **vacío**. El ${target} **no está**: toca **NO ESTÁ**.`
    else text = (gone.has(v) ? 'Esa carpeta ya se **descartó**. ' : '') + nextHint()
    core.miss(`s${k}:${v}`, text, v)
  }

  const onNone = () => {
    if (!core.canAct()) return
    sfx.click()
    if (!res.found && k >= total) {
      core.advanced()
      core.setMsg({ tone: 'ok', text: `¡Exacto! El **${target}** no está: **${plural(total)}** y caíste en un **hueco vacío** (null).` })
      core.fx(core.nodeRefs.current.get(res.path[total - 1]), 'null', '--ok', 14)
      core.win({ comparisons: total, found: false }, 650)
      return
    }
    setWrongNone(true)
    core.later(() => setWrongNone(false), 800)
    core.miss(`s${k}:none`, `Todavía no termina la búsqueda. ${nextHint()}`, 'no-esta')
  }

  // ── apariencia ──
  const looks = new Map<number, NodeLook>()
  for (const v of gone) looks.set(v, { dim: true })
  for (let i = 0; i < effK; i++) {
    const pv = res.path[i]
    const isFound = res.found && pv === target
    looks.set(pv, { tone: isFound ? 'found' : 'path', order: i + 1, cmp: cmpSign(target, pv) })
  }
  if (wrongNode !== null && !looks.get(wrongNode)?.tone) looks.set(wrongNode, { ...looks.get(wrongNode), tone: 'wrong' })
  const litEdges = new Set<string>()
  for (let i = 1; i < effK; i++) litEdges.add(`e${res.path[i]}`)
  const stub = fell && res.endSide ? { parent: res.path[total - 1], side: res.endSide } : null

  const idle = `Toca, desde la **raíz**, cada carpeta que se compara con el **${target}**. Si caes en un hueco vacío, toca **NO ESTÁ**.`
  const solution = showSolution
    ? `Así era: ${res.path.join(' → ')}${res.found ? ` = ¡lo encuentra! **${plural(total)}**.` : ` → hueco vacío: el ${target} **no está** (**${plural(total)}**).`}`
    : null
  const pulseNone = interactive && fell && !core.won

  return (
    <section className={cx('bst', core.hit && 'bst--hit')} aria-label="Buscar en un árbol binario de búsqueda">
      <Hud
        title={showSolution ? 'RESPUESTA' : core.won ? (res.found ? '¡ENCONTRADO!' : '¡NO ESTÁ!') : 'BUSCAR'}
        sub="Como buscar una palabra en el **diccionario**: en cada carpeta decides **izquierda** o **derecha**."
        chomp={!core.won && !showSolution}
        right={
          <div className="bst-stats">
            <Stat label="BUSCO" value={target} tone="hl" />
            <Stat label="COMPARA" value={effK} tone={core.won ? 'ok' : undefined} />
          </div>
        }
      />

      <BoardPanel hit={core.hit} ghostKey={core.ghostKey}>
        <Board
          tree={tree}
          looks={looks}
          litEdges={litEdges}
          stub={stub}
          onNode={onNode}
          interactive={interactive}
          label={`Árbol binario de búsqueda: busca el ${target} desde la raíz`}
          nodeRefs={core.nodeRefs}
        />
      </BoardPanel>

      <Status msg={core.msg} idle={idle} solution={solution} />

      <button
        type="button"
        className={cx('px-btn px-btn--block bst-none', pulseNone && 'px-btn--primary is-pulse', wrongNone && 'is-wrong')}
        disabled={!interactive}
        onClick={onNone}
      >
        NO ESTÁ (null)
      </button>
      {core.won && !showSolution && <EatStrip pellets={Math.max(4, total * 2)} />}
    </section>
  )
}

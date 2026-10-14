/**
 * mode 'insert': para cada clave (en orden) el alumno toca el HUECO donde queda.
 * Acierto → la clave baja comparando ("<" / ">") hasta el hueco y onStep(); la última → onCheck(true).
 * Error → onCheck(false) con pista: el primer nodo del camino donde se fue por el lado equivocado.
 */
import { useMemo, useState } from 'react'
import { sfx } from '../../ui'
import { EatStrip } from '../_shared/EatStrip'
import { Board } from './Board'
import type { ChipSpec, HoleLook, NodeLook } from './Board'
import { BoardPanel, Hud, Stat, Status, cmpSign, cx, useCore } from './core'
import type { GameProps } from './core'
import { divergence, inorder, insert, insertSlot, slotId } from './logic'
import type { LHole, Side, Slot, Tree } from './logic'

interface Anim {
  key: number
  path: number[]
  slot: string
  /** -1 = esperando arriba; 0..path.length-1 = comparando con path[hop]; path.length = en el hueco */
  hop: number
}

const sideWord = (s: Side | null) => (s === 'L' ? 'izquierdo' : 'derecho')

function landText(key: number, slot: Slot): string {
  if (slot.parent === null) return `¡El **${key}** es la **raíz**! El árbol ya tiene su primera carpeta.`
  return `¡El **${key}** quedó como hijo **${sideWord(slot.side)}** del **${slot.parent}**!`
}

function cmpText(key: number, v: number): string {
  const s = cmpSign(key, v)
  return `**${key} ${s} ${v}** → ${s === '<' ? 'baja a la **IZQUIERDA**' : 'baja a la **DERECHA**'}`
}

export function InsertGame(props: GameProps) {
  const { cfg, locked, showSolution } = props
  const core = useCore(props)
  const keys = cfg.keys

  const [tree, setTree] = useState<Tree>(cfg.tree)
  const [ki, setKi] = useState(0)
  const [anim, setAnim] = useState<Anim | null>(null)
  const [wrongHole, setWrongHole] = useState<string | null>(null)
  const [hint, setHint] = useState<{ at: number; side: Side } | null>(null)

  const key: number | undefined = ki < keys.length ? keys[ki] : undefined
  const done = key === undefined
  const interactive = !locked && !showSolution && !core.won && !core.busy && !done

  // pasos de la solución (para mostrarla si se acaban las vidas)
  const solSteps = useMemo(() => {
    let t = cfg.tree
    return keys.map((k) => {
      const s = insertSlot(t, k)
      t = insert(t, k)
      return { k, s }
    })
  }, [cfg.tree, keys])

  const onHole = (h: LHole, el: HTMLElement) => {
    if (!core.canAct() || key === undefined) return
    sfx.click()
    const slot = insertSlot(tree, key)
    if (!slot) return
    const right = slotId(slot.parent, slot.side)
    if (h.id !== right) {
      const dv = divergence(tree, key, h.parent, h.side)
      setWrongHole(h.id)
      core.later(() => setWrongHole((w) => (w === h.id ? null : w)), 800)
      setHint(dv)
      const text = dv
        ? `Ahí no. En el **${dv.at}**: **${key} ${cmpSign(key, dv.at)} ${dv.at}** → tenías que ir a la **${dv.side === 'L' ? 'IZQUIERDA' : 'DERECHA'}**.`
        : 'Ese hueco no es. Compara desde la **raíz**.'
      core.miss(`i${ki}:${h.id}`, text, { key, hole: h.id })
      return
    }

    // ── acierto: la clave baja comparando hasta el hueco ──
    core.setBusy(true)
    setHint(null)
    setWrongHole(null)
    const last = ki === keys.length - 1
    if (!last) core.step()
    core.fx(el, undefined, '--pac', 8)
    const per = core.reduced ? 170 : 430
    const base = tree
    const myKey = key
    setAnim({ key: myKey, path: slot.path, slot: right, hop: -1 })
    core.setMsg({ tone: 'info', text: `¡Bien! Mira cómo baja el **${myKey}** comparando…` })
    slot.path.forEach((pv, i) => {
      core.later(() => {
        setAnim((a) => (a ? { ...a, hop: i } : a))
        core.setMsg({ tone: 'info', text: cmpText(myKey, pv) })
        sfx.click()
      }, per * (i + 1))
    })
    const landAt = per * (slot.path.length + 1)
    core.later(() => {
      setAnim((a) => (a ? { ...a, hop: slot.path.length } : a))
      sfx.waka()
    }, landAt)
    core.later(() => {
      const nt = insert(base, myKey)
      setTree(nt)
      setAnim(null)
      setKi(ki + 1)
      core.setBusy(false)
      core.advanced()
      if (last) {
        core.setMsg({
          tone: 'ok',
          text: `¡Todas las claves en su carpeta! Léelo de izquierda a derecha: **${inorder(nt).join(' ')}**. ¡Quedó **ordenado**!`,
        })
        core.win(inorder(nt), 700)
      } else {
        core.setMsg({ tone: 'ok', text: landText(myKey, slot) })
      }
      core.later(() => core.fx(core.nodeRefs.current.get(myKey), last ? '¡LISTO!' : `+${myKey}`, '--ok', 12), 60)
    }, landAt + per + 80)
  }

  // ── apariencia ──
  const looks = new Map<number, NodeLook>()
  if (showSolution) {
    keys.forEach((k, i) => looks.set(k, { tone: 'sol', order: i + 1, note: `insertado en el lugar ${i + 1}` }))
  } else {
    for (const k of keys.slice(0, ki)) looks.set(k, { tone: 'new' })
    if (anim) {
      anim.path.forEach((pv, i) => {
        if (i <= anim.hop) looks.set(pv, { tone: 'path', cmp: cmpSign(anim.key, pv) as '<' | '>' })
      })
    } else if (hint) {
      looks.set(hint.at, { ...looks.get(hint.at), tone: 'hint', cmp: hint.side === 'L' ? '<' : '>' })
    }
  }
  const litEdges = new Set<string>()
  if (anim) {
    for (let i = 1; i < anim.path.length && i <= anim.hop; i++) litEdges.add(`e${anim.path[i]}`)
    if (anim.hop >= anim.path.length) litEdges.add(`h${anim.slot}`)
  }
  const holeLooks = new Map<string, HoleLook>()
  if (wrongHole) holeLooks.set(wrongHole, 'wrong')
  if (anim && anim.hop >= anim.path.length) holeLooks.set(anim.slot, 'land')

  let chip: ChipSpec | null = null
  if (!showSolution) {
    if (anim) {
      const at = anim.hop < 0 ? 'top' : anim.hop < anim.path.length ? { node: anim.path[anim.hop] } : { hole: anim.slot }
      chip = { v: anim.key, at }
    } else if (key !== undefined) {
      chip = { v: key, at: 'top' }
    }
  }

  // ── textos ──
  const idle =
    key === undefined
      ? ''
      : tree === null
        ? `El árbol está **vacío**: el **${key}** será la **raíz**. Toca el hueco.`
        : `Toca el **hueco** donde queda el **${key}**. Compara desde la **raíz**: menor → **izquierda**, mayor → **derecha**.`
  const solution = showSolution
    ? 'Así quedaba: ' +
      solSteps
        .map(({ k, s }) =>
          !s || s.parent === null ? `**${k}** → raíz` : `**${k}** → hijo ${sideWord(s.side)} del ${s.parent}`,
        )
        .join(' · ')
    : null
  const insertedCount = showSolution ? keys.length : ki

  return (
    <section className={cx('bst', core.hit && 'bst--hit')} aria-label="Insertar en un árbol binario de búsqueda">
      <Hud
        title={showSolution ? 'RESPUESTA' : core.won ? '¡ÁRBOL COMPLETO!' : 'INSERTAR'}
        sub="Como las **carpetas** de tu compu: a la izquierda las **menores**, a la derecha las **mayores**."
        chomp={!core.won && !showSolution}
        right={<Stat label="CLAVES" value={`${insertedCount}/${keys.length}`} tone={core.won ? 'ok' : undefined} />}
      />

      <div className="bst-queue" role="group" aria-label="Claves por insertar, en orden">
        <span className="bst-queue__label">EN FILA</span>
        <ol className="bst-queue__list">
          {keys.map((k, i) => {
            const isDone = i < insertedCount
            const isCur = !showSolution && i === ki
            return (
              <li
                key={i}
                className={cx('bst-qchip', isDone && 'is-done', isCur && 'is-cur')}
                aria-current={isCur ? 'step' : undefined}
              >
                {k}
                {(isDone || isCur) && <span className="bst-sr">{isDone ? ', ya insertada' : ', la que sigue'}</span>}
              </li>
            )
          })}
        </ol>
      </div>

      <BoardPanel hit={core.hit} ghostKey={core.ghostKey}>
        <Board
          tree={showSolution ? cfg.finalTree : tree}
          holes={!showSolution && !done}
          looks={looks}
          holeLooks={holeLooks}
          litEdges={litEdges}
          chip={chip}
          onHole={onHole}
          interactive={interactive}
          label="Árbol binario de búsqueda: toca el hueco donde queda la clave"
          nodeRefs={core.nodeRefs}
          holeRefs={core.holeRefs}
        />
      </BoardPanel>

      <Status msg={core.msg} idle={idle} solution={solution} />
      {core.won && !showSolution && <EatStrip pellets={12} />}
    </section>
  )
}

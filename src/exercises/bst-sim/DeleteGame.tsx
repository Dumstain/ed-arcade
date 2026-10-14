/**
 * mode 'delete': eliminar target. El alumno toca la carpeta que OCUPA SU LUGAR:
 * hoja → "NADIE (null)"; un hijo → ese hijo; dos hijos → el SUCESOR inorden (menor del subárbol derecho).
 * Acierto → el comecocos se come el nodo, el reemplazo sube animado y el árbol se reacomoda → onCheck(true).
 */
import { useMemo, useState } from 'react'
import { RichText, sfx } from '../../ui'
import { EatStrip } from '../_shared/EatStrip'
import { Board } from './Board'
import type { NodeLook } from './Board'
import { BoardPanel, Hud, Stat, Status, cx, useCore } from './core'
import type { GameProps } from './core'
import { deleteInfo, find, remove, values } from './logic'

type Phase = 'ask' | 'eat' | 'settle'

const RULES = [
  '**Hoja** (sin hijos) → **nadie**: su papá ahora apunta a **null**.',
  '**Un hijo** → ese hijo **sube** con todo lo que cuelga de él.',
  '**Dos hijos** → sube el **SUCESOR**: el **menor del lado derecho**.',
]

export function DeleteGame(props: GameProps) {
  const { cfg, locked, showSolution } = props
  const core = useCore(props)
  const tree = cfg.tree
  const target = cfg.target as number
  const info = useMemo(() => deleteInfo(tree, target), [tree, target])
  const after = useMemo(() => remove(tree, target), [tree, target])
  const node = useMemo(() => find(tree, target), [tree, target])
  const leftVals = useMemo(() => new Set(values(node?.l ?? null)), [node])
  const rightVals = useMemo(() => new Set(values(node?.r ?? null)), [node])

  const [phase, setPhase] = useState<Phase>('ask')
  const [wrongNode, setWrongNode] = useState<number | null>(null)
  const [wrongNone, setWrongNone] = useState(false)

  const interactive = !locked && !showSolution && !core.won && !core.busy && phase === 'ask'
  if (!info) return null // normalize() garantiza que target está en el árbol
  const rep = info.replacement

  const hintFor = (v: number | null): string => {
    const T = `**${target}**`
    if (info.kind === 'leaf')
      return `Cuenta los **hijos** del ${T}. Si no tiene ninguno, ¿quién podría subir a su lugar?`
    if (info.kind === 'one') {
      if (v === null) return `El ${T} **sí tiene un hijo**: si nadie ocupa su lugar, **se pierde** todo lo que cuelga de él.`
      if (leftVals.has(v) || rightVals.has(v)) return `El ${T} tiene **un solo hijo**: sube su hijo **directo** (con todo lo suyo).`
      return `Esa carpeta no cuelga del ${T}. Con **un solo hijo**, ese hijo es el que sube.`
    }
    // dos hijos
    if (v === null) return `El ${T} tiene **dos hijos**: si nadie ocupa su lugar, se pierden. Busca su **sucesor**.`
    if (v === info.predecessor)
      return 'Ese es el **predecesor** (el mayor de la izquierda). En el curso usamos el **sucesor**: el **menor del lado derecho**.'
    if (leftVals.has(v)) return `Del lado izquierdo están los **menores** que el ${T}. El sucesor está del lado **derecho**.`
    if (v === info.right)
      return 'Ese es su hijo derecho, pero ¿es el **menor** de ese lado? Desde ahí baja siempre a la **izquierda**.'
    if (rightVals.has(v)) return 'Vas del lado correcto, pero no es el **menor**: baja a la **izquierda** hasta el fondo.'
    return `Esa carpeta no cuelga del ${T}. El reemplazo sale de **su subárbol derecho**: el **menor** de ahí.`
  }

  const successText = (): string => {
    if (info.kind === 'leaf') return `¡Bien! El **${target}** era **hoja**: se quita y su papá ahora apunta a **null**.`
    if (info.kind === 'one') return `¡Bien! El **${target}** tenía **un hijo**: el **${rep}** sube a su lugar con todo su subárbol.`
    const sNode = rep !== null ? find(tree, rep) : null
    const extra = sNode?.r ? ` Y el **${sNode.r.v}** sube a donde estaba el ${rep}.` : ''
    return `¡Bien! El **${target}** tenía **dos hijos**: su **sucesor** (**${rep}**, el menor de la derecha) sube a su lugar.${extra}`
  }

  const choose = (v: number | null, el: HTMLElement) => {
    if (!core.canAct()) return
    sfx.click()
    if (v === target) {
      core.setMsg({ tone: 'info', text: `El **${target}** es el que **se va**. Toca quién **ocupa su lugar**.` })
      return
    }
    if (v !== rep) {
      if (v === null) {
        setWrongNone(true)
        core.later(() => setWrongNone(false), 800)
      } else {
        setWrongNode(v)
        core.later(() => setWrongNode((w) => (w === v ? null : w)), 800)
      }
      core.miss(`d:${v ?? 'null'}`, hintFor(v), v)
      return
    }
    // ── acierto: comer, subir y reacomodar ──
    core.setBusy(true)
    core.advanced()
    core.fx(el, v === null ? 'null' : 'SUBE', '--ok', 12)
    core.setMsg({ tone: 'ok', text: successText() })
    setPhase('eat')
    const eat = core.reduced ? 300 : 950
    const settle = core.reduced ? 300 : 800
    core.later(() => {
      setPhase('settle')
      sfx.waka()
    }, eat)
    core.later(() => {
      core.setBusy(false)
      core.win({ replacement: rep }, 200)
    }, eat + settle)
  }

  // ── apariencia ──
  const showAfter = phase === 'settle'
  const looks = new Map<number, NodeLook>()
  const moves = new Map<number, number>()
  const hideEdges = new Set<string>()
  if (showSolution) {
    looks.set(target, { tone: 'target', ghost: 'red' })
    if (rep !== null) looks.set(rep, { tone: 'sol', tag: 'SUBE' })
  } else if (phase === 'ask') {
    looks.set(target, { tone: 'target', ghost: 'red' })
    if (wrongNode !== null) looks.set(wrongNode, { tone: 'wrong' })
  } else if (phase === 'eat') {
    looks.set(target, { tone: 'target', gone: true, pac: true })
    if (rep !== null) looks.set(rep, { tone: 'replace', tag: 'SUBE' })
    if (info.kind === 'two' && rep !== null) {
      moves.set(rep, target)
      hideEdges.add(`e${rep}`)
    } else {
      hideEdges.add(`e${target}`)
      if (rep !== null) hideEdges.add(`e${rep}`)
    }
  } else if (rep !== null) {
    looks.set(rep, { tone: 'replace' })
  }

  const kindName = info.kind === 'leaf' ? 'hoja' : info.kind === 'one' ? 'un hijo' : 'dos hijos'
  const idle = `Se va el **${target}**. ¿Quién **ocupa su lugar**? Toca esa carpeta (o **NADIE**).`
  const solution = showSolution
    ? rep === null
      ? `El **${target}** es **hoja**: nadie ocupa su lugar → **NADIE (null)**.`
      : info.kind === 'one'
        ? `El **${target}** tiene **un hijo**: sube el **${rep}**.`
        : `El **${target}** tiene **dos hijos**: sube su **sucesor**, el **${rep}** (el menor del lado derecho).`
    : null

  return (
    <section className={cx('bst', core.hit && 'bst--hit')} aria-label="Eliminar de un árbol binario de búsqueda">
      <Hud
        title={showSolution ? 'RESPUESTA' : core.won ? '¡ELIMINADO!' : 'ELIMINAR'}
        sub="Sacar una carpeta sin perder lo que tiene adentro: alguien debe **ocupar su lugar**."
        chomp={!core.won && !showSolution}
        right={<Stat label="BORRAR" value={target} tone="hl" />}
      />

      <ul className="px-panel bst-rules" aria-label="Reglas para eliminar">
        {RULES.map((r, i) => (
          <li key={i}>
            <RichText text={r} />
          </li>
        ))}
      </ul>

      <BoardPanel hit={core.hit} ghostKey={core.ghostKey}>
        <Board
          tree={showAfter ? after : tree}
          looks={looks}
          moves={moves}
          hideEdges={hideEdges}
          onNode={(v, el) => choose(v, el)}
          interactive={interactive}
          label={`Árbol binario de búsqueda: se elimina el ${target}`}
          nodeRefs={core.nodeRefs}
        />
      </BoardPanel>

      <Status msg={core.msg} idle={idle} solution={solution} />

      <button
        type="button"
        className={cx(
          'px-btn px-btn--block bst-none',
          wrongNone && 'is-wrong',
          showSolution && rep === null && 'is-answer',
        )}
        disabled={!interactive}
        onClick={(e) => choose(null, e.currentTarget)}
      >
        NADIE (null)
      </button>

      {showSolution && (
        <section className="px-panel bst-after" aria-label="Así queda el árbol">
          <h3 className="bst-after__title">ASÍ QUEDA · {kindName.toUpperCase()}</h3>
          {after ? (
            <Board
              tree={after}
              looks={rep !== null ? new Map([[rep, { tone: 'replace' } as NodeLook]]) : undefined}
              interactive={false}
              label={`Árbol después de eliminar el ${target}`}
              maxCol={40}
            />
          ) : (
            <p className="bst-after__empty">
              <RichText text="El árbol queda **vacío** (raíz = null)." />
            </p>
          )}
        </section>
      )}
      {core.won && !showSolution && <EatStrip pellets={10} />}
    </section>
  )
}

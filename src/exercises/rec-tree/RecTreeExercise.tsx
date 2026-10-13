import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { ExerciseProps } from '../../engine/types'
import type { RecTreeData } from '../schemas'
import { Keypad } from '../_shared/Keypad'
import { Ghost, PacMan, Pellets, RichText, sfx, type GhostColor } from '../../ui'
import { Feast } from './Feast'
import { fxAt } from './fx'
import { NODE_H, buildLayout, type LNode, type Layout } from './layout'
import { cx, isNumericVal, sameVal } from './values'
import './rec-tree.css'

interface Msg {
  text: string
  tone: 'ok' | 'bad' | 'info'
}
type GameProps = ExerciseProps<RecTreeData> & { layout: Layout }

const GHOST_COLORS: GhostColor[] = ['red', 'pink', 'cyan', 'orange']

/** Resalta (marcado **) un dato dinámico, salvo que ya traiga asteriscos. */
const em = (x: unknown): string => {
  const t = String(x)
  return t === '' || t.includes('*') ? t : `**${t}**`
}

export function RecTreeExercise(props: ExerciseProps<RecTreeData>) {
  const root = props.exercise.data?.root
  const layout = useMemo(() => buildLayout(root), [root])
  if (!layout) {
    return (
      <div className="px-panel rt-warn" role="alert">
        <Ghost color="orange" size={40} float />
        <p>Este ejercicio no trae árbol para dibujar. Avísale a tu profe.</p>
      </div>
    )
  }
  return <Game key={props.exercise.id} {...props} layout={layout} />
}

function Game({ exercise, onCheck, locked, showSolution, attempt, layout }: GameProps) {
  const data = exercise.data
  const mode = data.mode === 'count' ? 'count' : 'fill'
  const target = data.target == null ? '' : String(data.target).trim()
  const { nodes, byId } = layout

  // Nodos que el alumno debe rellenar (fill): post-orden = de abajo hacia arriba
  const fillIds = useMemo(() => {
    if (mode !== 'fill') return []
    let list = nodes.filter((n) => data.given === 'none' || !n.leaf)
    if (list.length === 0) list = nodes
    return [...list].sort((a, b) => a.order - b.order).map((n) => n.id)
  }, [mode, nodes, data.given])
  const fillSet = useMemo(() => new Set(fillIds), [fillIds])
  const targetIds = useMemo(
    () => (mode === 'count' ? nodes.filter((n) => n.label.trim() === target).map((n) => n.id) : []),
    [mode, nodes, target],
  )
  const targetSet = useMemo(() => new Set(targetIds), [targetIds])
  const textMode = useMemo(
    () => mode === 'fill' && fillIds.some((id) => !isNumericVal(byId.get(id)?.value ?? 0)),
    [mode, fillIds, byId],
  )

  // ── estado ──
  const [values, setValues] = useState<Record<string, string>>({})
  const [okSet, setOkSet] = useState<Set<string>>(() => new Set())
  const [badSet, setBadSet] = useState<Set<string>>(() => new Set())
  const [selected, setSelected] = useState<string | null>(() => (mode === 'fill' ? (fillIds[0] ?? null) : null))
  const [input, setInput] = useState('')
  const [marks, setMarks] = useState<Set<string>>(() => new Set())
  const [failedSig, setFailedSig] = useState<string | null>(null)
  const [win, setWin] = useState(false)
  const [msg, setMsg] = useState<Msg | null>(null)
  const [flash, setFlash] = useState(false)
  const [ghostKey, setGhostKey] = useState(0)

  const nodeRefs = useRef<Record<string, HTMLElement | null>>({})

  // Error (attempt sube): fantasma cruza el árbol + sacudida roja breve
  const firstAttempt = useRef(attempt)
  useEffect(() => {
    if (attempt === firstAttempt.current) return
    setFlash(true)
    setGhostKey((k) => k + 1)
    const t = setTimeout(() => setFlash(false), 650)
    return () => clearTimeout(t)
  }, [attempt])

  // ── tamaño: escalar para caber (mín. 0.75) y, si no, scroll interno del árbol ──
  const scrollRef = useRef<HTMLDivElement>(null)
  const [cw, setCw] = useState(336)
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const update = () => setCw(el.clientWidth || 336)
    update()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const scale = Math.max(0.75, Math.min(1, cw / layout.width))
  const needsScroll = layout.width * scale > cw + 1
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollLeft = Math.max(0, layout.rootX * scale - cw / 2)
  }, [cw, scale, layout.rootX])

  const interactive = !locked && !showSolution && !win

  // ───────────── fill ─────────────
  const remaining = fillIds.filter((id) => !okSet.has(id) && values[id] === undefined).length
  const filledCount = fillIds.filter((id) => okSet.has(id) || values[id] !== undefined).length
  const selNode = selected ? byId.get(selected) : undefined

  function selectNode(id: string) {
    if (!interactive) return
    sfx.click()
    setMsg(null)
    setInput('')
    setSelected((cur) => (cur === id ? null : id))
  }

  function place() {
    if (!interactive || mode !== 'fill' || !selected) return
    const v = input.trim()
    if (v === '') return
    sfx.click()
    const nv = { ...values, [selected]: v }
    const nb = new Set(badSet)
    nb.delete(selected)
    setValues(nv)
    setBadSet(nb)
    setInput('')
    setMsg(null)
    fxAt(nodeRefs.current[selected], undefined, '--pac', 6)
    // siguiente nodo pendiente (sin valor o en rojo), dando la vuelta
    const start = fillIds.indexOf(selected)
    let next: string | null = null
    for (let k = 1; k <= fillIds.length; k++) {
      const id = fillIds[(start + k) % fillIds.length]
      if (id === selected || okSet.has(id)) continue
      if (nv[id] === undefined || nb.has(id)) {
        next = id
        break
      }
    }
    setSelected(next)
  }

  function checkFill() {
    if (!interactive || remaining > 0 || badSet.size > 0) return
    sfx.click()
    const good = new Set(okSet)
    const wrong: string[] = []
    for (const id of fillIds) {
      if (good.has(id)) continue
      const node = byId.get(id)
      if (node && sameVal(values[id] ?? '', node.value)) good.add(id)
      else wrong.push(id)
    }
    setOkSet(good)
    if (wrong.length === 0) {
      setSelected(null)
      setMsg(null)
      setWin(true)
      fxAt(nodeRefs.current['0'], '¡ÁRBOL!', '--ok', 14)
      onCheck(true)
    } else {
      setBadSet(new Set(wrong))
      setSelected(wrong[0])
      setInput('')
      setMsg({
        text:
          wrong.length === 1
            ? 'Ese **nodo rojo** está mal. Tócalo y corrígelo.'
            : `**${wrong.length} nodos rojos** están mal. Tócalos y corrígelos.`,
        tone: 'bad',
      })
      onCheck(false)
    }
  }

  // ───────────── count ─────────────
  const marksSig = [...marks].sort().join('|')

  function toggleMark(id: string) {
    if (!interactive || okSet.has(id)) return
    sfx.click()
    const nm = new Set(marks)
    const had = nm.has(id)
    if (had) nm.delete(id)
    else nm.add(id)
    setMarks(nm)
    if (badSet.has(id)) {
      const nb = new Set(badSet)
      nb.delete(id)
      setBadSet(nb)
    }
    setMsg(null)
    if (!had) fxAt(nodeRefs.current[id], undefined, '--ghost-red', 6)
  }

  function checkCount() {
    if (!interactive) return
    sfx.click()
    const wrongMarks = [...marks].filter((id) => !targetSet.has(id))
    const missed = targetIds.filter((id) => !marks.has(id))
    const good = new Set(okSet)
    marks.forEach((id) => {
      if (targetSet.has(id)) good.add(id)
    })
    setOkSet(good)
    if (wrongMarks.length === 0 && missed.length === 0) {
      setWin(true)
      setMsg(null)
      fxAt(nodeRefs.current[targetIds[0] ?? '0'], '¡ATRAPADOS!', '--ok', 14)
      onCheck(true)
    } else {
      setBadSet(new Set(wrongMarks))
      setFailedSig(marksSig)
      setMsg({
        text:
          wrongMarks.length > 0 && missed.length > 0
            ? 'Hay **fantasmas mal puestos** (rojos) y todavía **faltan otros**.'
            : wrongMarks.length > 0
              ? 'Hay **fantasmas mal puestos** (rojos). Quítalos.'
              : needsScroll
                ? 'Vas bien, pero **faltan fantasmas**. Desliza el árbol: hay llamadas fuera de la vista.'
                : 'Vas bien, pero todavía **faltan fantasmas** por atrapar.',
        tone: 'bad',
      })
      onCheck(false)
    }
  }

  // ───────────── pintar un nodo ─────────────
  function renderNode(n: LNode) {
    const style = {
      left: n.x - n.w / 2,
      top: n.y,
      width: n.w,
      height: NODE_H,
      '--lv': n.depth,
      '--d': n.order,
    } as CSSProperties
    let text: string = String(n.value)
    let state = ''
    let canTap = false
    let ghost: GhostColor | null = null
    let pressed: boolean | undefined
    let aria = `${n.label}: ${String(n.value)}`

    if (mode === 'fill') {
      const fillable = fillSet.has(n.id)
      const ok = okSet.has(n.id)
      const bad = badSet.has(n.id)
      const typed = values[n.id]
      if (!fillable) {
        state = 'is-given'
      } else if (ok) {
        state = 'is-ok'
      } else if (showSolution) {
        state = 'is-solution'
      } else {
        text = typed ?? '?'
        state = bad ? 'is-bad' : typed !== undefined ? 'is-filled' : 'is-empty'
        canTap = interactive
        aria = `${n.label}: ${typed ?? 'sin valor'}${bad ? ', incorrecto' : ''}`
      }
      if (selected === n.id && !showSolution) state += ' is-selected'
    } else {
      const marked = marks.has(n.id)
      const ok = okSet.has(n.id)
      const bad = badSet.has(n.id)
      const isTarget = targetSet.has(n.id)
      if (showSolution && isTarget) {
        state = 'is-solution'
        ghost = 'scared'
      } else if (win && isTarget) {
        state = 'is-ok'
        ghost = 'scared'
      } else if (ok) {
        state = 'is-ok'
        ghost = 'scared'
      } else if (bad) {
        state = 'is-bad'
        ghost = 'red'
      } else if (marked) {
        state = 'is-marked'
        ghost = GHOST_COLORS[n.order % GHOST_COLORS.length]
      } else {
        state = 'is-given'
      }
      canTap = interactive && !ok
      pressed = marked || ok
      aria = `${n.label}: ${String(n.value)}${marked || ok ? ', con fantasma' : ''}`
    }

    const cls = cx('rt-node', state, win && 'is-win')
    const inner = (
      <>
        {mode === 'fill' && selected === n.id && !showSolution && (
          <PacMan className="rt-node__pac" size={24} dir="down" chomp />
        )}
        {ghost && <Ghost className="rt-node__ghost" color={ghost} size={24} float={ghost !== 'scared'} />}
        <span className="rt-node__label" title={n.label}>
          {n.label}
        </span>
        <span className="rt-node__value">{text}</span>
      </>
    )
    const setRef = (el: HTMLElement | null) => {
      nodeRefs.current[n.id] = el
    }
    return canTap ? (
      <button
        key={n.id}
        type="button"
        ref={setRef}
        className={cls}
        style={style}
        aria-label={aria}
        aria-pressed={pressed}
        onClick={(e) => {
          if (mode === 'fill') {
            // Sin foco en el nodo: así el Enter del teclado físico va a PONER y no re-clica el nodo
            e.currentTarget.blur()
            selectNode(n.id)
          } else toggleMark(n.id)
        }}
      >
        {inner}
      </button>
    ) : (
      <div key={n.id} ref={setRef} className={cls} style={style} role="img" aria-label={aria}>
        {inner}
      </div>
    )
  }

  // ───────────── textos ─────────────
  const title = showSolution ? 'RESPUESTA' : win ? '¡LISTO!' : mode === 'fill' ? 'RELLENA EL ÁRBOL' : 'CAZA FANTASMAS'
  const sub = showSolution
    ? mode === 'fill'
      ? 'Estos eran los valores.'
      : 'Estas llamadas se repetían.'
    : win
      ? mode === 'fill'
        ? 'Todas las llamadas regresaron.'
        : 'Atrapaste todas las repetidas.'
      : mode === 'fill'
        ? data.given === 'none'
          ? 'Calcula cada llamada, **de abajo hacia arriba**.'
          : 'Las **hojas** ya saben su valor. Sube por el árbol.'
        : 'Cada fantasma es una **llamada repetida**.'
  const canCheckFill = remaining === 0 && badSet.size === 0
  const canCheckCount = marks.size > 0 && badSet.size === 0 && marksSig !== failedSig
  const checkHint =
    mode === 'fill'
      ? badSet.size > 0
        ? 'Corrige los **nodos rojos** para comprobar.'
        : remaining > 0
          ? `Faltan **${remaining} ${remaining === 1 ? 'nodo' : 'nodos'}** por llenar.`
          : ''
      : badSet.size > 0
        ? 'Quita los **fantasmas rojos** para comprobar.'
        : marks.size === 0
          ? 'Toca las **llamadas repetidas** para ponerles un fantasma.'
          : marksSig === failedSig
          ? 'Cambia algo antes de comprobar otra vez.'
          : ''
  const winText =
    mode === 'fill'
      ? '¡Árbol completo! Cada llamada **espera a que sus hijas regresen**.'
      : `¡Atrapados! ${em(target)} se calculó **${targetIds.length} ${targetIds.length === 1 ? 'vez' : 'veces'}**: **trabajo repetido**.`

  return (
    <section className={cx('rt-root', flash && 'rt-flash')} aria-label="Árbol de llamadas recursivas">
      <div className="rt-hud">
        <PacMan size={30} dir="right" chomp={!win && !showSolution} />
        <div className="rt-hud__text">
          <div className="rt-hud__title">{title}</div>
          <div className="rt-hud__sub">
            <RichText text={sub} />
          </div>
        </div>
        {mode === 'fill' && fillIds.length > 0 && (
          <div className="rt-hud__pellets">
            <Pellets total={fillIds.length} done={win || showSolution ? fillIds.length : filledCount} />
          </div>
        )}
      </div>

      {mode === 'count' && (
        <div className="px-panel rt-goal">
          <Ghost color="red" size={32} float />
          <div className="rt-goal__text">
            <div className="rt-goal__lbl">ATRAPA TODAS LAS</div>
            <div className="rt-goal__target">{target || '???'}</div>
          </div>
          <div className="rt-goal__count" aria-label={`Fantasmas puestos: ${marks.size}`}>
            <Ghost color="scared" size={20} />
            <span>{marks.size}</span>
          </div>
        </div>
      )}
      {mode === 'count' && !target && (
        <p className="rt-msg rt-msg--bad" role="alert">
          Aviso: a este ejercicio le falta el objetivo.
        </p>
      )}

      <div className="px-panel rt-board">
        <div className="rt-scroller" ref={scrollRef}>
          <div className="rt-sizer" style={{ width: layout.width * scale, height: layout.height * scale }}>
            <div
              className="rt-stage"
              role="group"
              aria-label="Árbol de llamadas: la raíz arriba"
              style={{ width: layout.width, height: layout.height, transform: `scale(${scale})` }}
            >
              <svg className="rt-lines" width={layout.width} height={layout.height} aria-hidden="true" focusable="false">
                {nodes.flatMap((n) =>
                  n.kids.map((k) => {
                    const y1 = n.y + NODE_H
                    const ym = y1 + (k.y - y1) / 2
                    return <path key={k.id} d={`M${n.x} ${y1} V${ym} H${k.x} V${k.y}`} />
                  }),
                )}
              </svg>
              {nodes.map(renderNode)}
            </div>
          </div>
        </div>
        {needsScroll && <p className="rt-scrollhint">← Desliza el árbol →</p>}
        {ghostKey > 0 && (
          <span key={ghostKey} className="rt-ghostrun" aria-hidden="true">
            <Ghost color="red" size={40} />
          </span>
        )}
      </div>

      <p className={cx('rt-msg', msg && `rt-msg--${msg.tone}`)} role="status" aria-live="polite">
        {!showSolution && msg ? <RichText text={msg.text} /> : ''}
      </p>

      {mode === 'fill' && interactive && selNode && (
        <div className="px-panel rt-ask">
          <p className="rt-ask__q">
            ¿Cuánto vale <span className="rt-chip">{selNode.label}</span>?
          </p>
          {textMode ? (
            <form
              className="rt-ask__text"
              onSubmit={(e) => {
                e.preventDefault()
                place()
              }}
            >
              <input
                className="px-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                aria-label={`Valor de ${selNode.label}`}
                autoComplete="off"
                autoFocus
              />
              <button type="submit" className="px-btn" disabled={input.trim() === ''}>
                PONER
              </button>
            </form>
          ) : (
            <Keypad
              value={input}
              onChange={setInput}
              onSubmit={place}
              allowNegative
              maxLength={7}
              submitLabel="PONER"
            />
          )}
        </div>
      )}

      {mode === 'fill' && !win && !showSolution && (
        <div className="rt-check">
          <button type="button" className="px-btn px-btn--primary px-btn--block" disabled={!interactive || !canCheckFill} onClick={checkFill}>
            COMPROBAR
          </button>
          {checkHint && (
            <p className="rt-check__hint">
              <RichText text={checkHint} />
            </p>
          )}
        </div>
      )}
      {mode === 'count' && !win && !showSolution && (
        <div className="rt-check">
          <button type="button" className="px-btn px-btn--primary px-btn--block" disabled={!interactive || !canCheckCount} onClick={checkCount}>
            COMPROBAR
          </button>
          {checkHint && (
            <p className="rt-check__hint">
              <RichText text={checkHint} />
            </p>
          )}
        </div>
      )}

      {win && !showSolution && <Feast text={winText} />}
    </section>
  )
}

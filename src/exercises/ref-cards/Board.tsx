import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { Ghost } from '../../ui'

export type Sel = { k: 'card'; v: string } | { k: 'target'; t: string | null }

export interface BoardObj {
  id: string
  label: string
  base: string
  addr: number
}

interface Arrow {
  key: string
  d: string
  head: string
  ci: number
}

/** Posición de `el` dentro de `root` ignorando transformaciones (animaciones de entrada). */
function offsetIn(el: HTMLElement, root: HTMLElement) {
  let x = 0
  let y = 0
  let cur: HTMLElement | null = el
  while (cur && cur !== root) {
    x += cur.offsetLeft
    y += cur.offsetTop
    cur = cur.offsetParent as HTMLElement | null
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight }
}

interface BoardProps {
  boardRef: RefObject<HTMLDivElement | null>
  /** variables declaradas, en orden */
  vars: string[]
  /** índice de color por variable (según su lugar en data.vars) */
  colorOf: (v: string) => number
  objs: BoardObj[]
  /** a qué apunta cada tarjeta (undefined = sin asignar, null = en blanco) */
  shown: Record<string, string | null | undefined>
  sel: Sel | null
  wrong: string[]
  interactive: boolean
  onCard: (v: string) => void
  onTarget: (t: string | null) => void
}

export function Board({ boardRef, vars, colorOf, objs, shown, sel, wrong, interactive, onCard, onTarget }: BoardProps) {
  const cardEls = useRef<Record<string, HTMLElement | null>>({})
  const houseEls = useRef<Record<string, HTMLElement | null>>({})
  const [arrows, setArrows] = useState<Arrow[]>([])
  const lastSig = useRef('')

  const compute = useCallback(() => {
    const board = boardRef.current
    if (!board) return
    const group: Record<string, string[]> = {}
    for (const v of vars) {
      const t = shown[v]
      if (t) (group[t] ??= []).push(v)
    }
    const list: Arrow[] = []
    for (const v of vars) {
      const t = shown[v]
      if (!t) continue
      const c = cardEls.current[v]
      const h = houseEls.current[t]
      if (!c || !h) continue
      const co = offsetIn(c, board)
      const ho = offsetIn(h, board)
      const mates = group[t]
      const gi = mates.indexOf(v)
      const x1 = co.x + co.w
      const y1 = Math.round(co.y + co.h / 2)
      const x2 = ho.x
      const y2 = Math.round(ho.y + ho.h / 2 + (gi - (mates.length - 1) / 2) * 12)
      const ci = colorOf(v)
      const xm = x1 + 10 + (ci % 4) * 8
      const hx = x2 - 10
      list.push({
        key: `${v}>${t}`,
        d: `M${x1} ${y1} H${xm} V${y2} H${hx}`,
        head: `${x2},${y2} ${hx},${y2 - 7} ${hx},${y2 + 7}`,
        ci,
      })
    }
    const sig = JSON.stringify(list)
    if (sig !== lastSig.current) {
      lastSig.current = sig
      setArrows(list)
    }
  }, [boardRef, vars, shown, colorOf])

  // En cada render (barato): solo hace setState si cambió la geometría.
  useLayoutEffect(() => {
    compute()
  })

  useEffect(() => {
    const el = boardRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => compute())
    ro.observe(el)
    // las fuentes web cambian el tamaño del texto al cargar: volver a medir
    document.fonts?.ready.then(() => compute()).catch(() => {})
    return () => ro.disconnect()
  }, [boardRef, compute])

  const cardSel = sel?.k === 'card' ? sel.v : null
  const targetsLit = interactive && cardSel !== null

  return (
    <div className="rc-board" ref={boardRef}>
      <div className="rc-col">
        <p className="rc-colhead">TARJETAS</p>
        {vars.map((v) => {
          const t = shown[v]
          const obj = t ? objs.find((o) => o.id === t) : undefined
          const cls = [
            'rc-card',
            `rc-c${colorOf(v) % 4}`,
            t === undefined ? 'is-unset' : t === null ? 'is-blank' : 'is-set',
            cardSel === v ? 'is-sel' : '',
            wrong.includes(v) ? 'is-wrong' : '',
          ]
            .filter(Boolean)
            .join(' ')
          const said =
            t === undefined ? 'sin asignar' : t === null ? 'en blanco (null)' : `apunta a la casa ${obj?.label ?? t}`
          return (
            <button
              key={v}
              type="button"
              ref={(el) => {
                cardEls.current[v] = el
              }}
              className={cls}
              disabled={!interactive}
              aria-pressed={cardSel === v}
              aria-label={`Tarjeta ${v}: ${said}`}
              onClick={() => onCard(v)}
            >
              {wrong.includes(v) && <Ghost color="red" size={26} float className="rc-ghost" />}
              <span className="rc-card-name">{v}</span>
              <span className="rc-card-addr">{t === undefined ? '?' : t === null ? 'null' : `#${obj?.addr ?? ''}`}</span>
            </button>
          )
        })}
      </div>

      <div className="rc-col">
        <p className="rc-colhead">CASAS</p>
        {objs.map((o) => {
          const chosen = sel?.k === 'target' && sel.t === o.id
          const cls = ['rc-house', targetsLit ? 'is-target' : '', chosen ? 'is-sel' : ''].filter(Boolean).join(' ')
          return (
            <button
              key={o.id}
              type="button"
              ref={(el) => {
                houseEls.current[o.id] = el
              }}
              className={cls}
              disabled={!interactive}
              aria-label={`Casa ${o.label}, dirección ${o.addr}`}
              onClick={() => onTarget(o.id)}
            >
              <span className="rc-roof" aria-hidden="true" />
              <span className="rc-hbody">
                <span key={o.label} className={`rc-hlabel${o.label !== o.base ? ' is-changed' : ''}`}>
                  {o.label}
                </span>
              </span>
              <span className="rc-hsign">#{o.addr}</span>
            </button>
          )
        })}
        <button
          type="button"
          className={['rc-blank', targetsLit ? 'is-target' : '', sel?.k === 'target' && sel.t === null ? 'is-sel' : ''].filter(Boolean).join(' ')}
          disabled={!interactive}
          aria-label="Tarjeta en blanco, null"
          onClick={() => onTarget(null)}
        >
          <b>EN BLANCO</b>
          <span>null</span>
        </button>
      </div>

      <svg className="rc-arrows" aria-hidden="true" focusable="false">
        {arrows.map((a) => (
          <g key={a.key} className={`rc-a${a.ci % 4}`}>
            <path className="rc-arrow" d={a.d} pathLength={1} />
            <polygon className="rc-ahead" points={a.head} />
          </g>
        ))}
      </svg>
    </div>
  )
}

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Ghost, PacMan, burst, floatText } from '../../ui'

export type Dir = 'right' | 'left' | 'up' | 'down'

/** Posición de `el` dentro de `root` sin contar transformaciones (animaciones). */
export function offsetIn(el: HTMLElement, root: HTMLElement) {
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

/** Registro de elementos "carril" (la calle por donde camina el comecocos). */
export function useLanes() {
  const lanes = useRef<Record<string, HTMLElement | null>>({})
  const ref = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      lanes.current[key] = el
    },
    [],
  )
  return { lanes, ref }
}

/** Calcula dónde está el carril objetivo y hacia dónde mira el comecocos al caminar. */
export function useWalker(
  stageRef: RefObject<HTMLElement | null>,
  lanes: RefObject<Record<string, HTMLElement | null>>,
  target: string,
) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [dir, setDir] = useState<Dir>('right')
  const [moving, setMoving] = useState(false)
  const last = useRef<{ x: number; y: number } | null>(null)

  const measure = useCallback(() => {
    const stage = stageRef.current
    const lane = lanes.current?.[target]
    if (!stage || !lane) return
    const o = offsetIn(lane, stage)
    const p = { x: Math.round(o.x + o.w / 2), y: Math.round(o.y + o.h / 2) }
    const prev = last.current
    if (prev && prev.x === p.x && prev.y === p.y) return
    if (prev) {
      const dx = p.x - prev.x
      const dy = p.y - prev.y
      setDir(Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 'right' : 'left') : dy >= 0 ? 'down' : 'up')
      setMoving(true)
    }
    last.current = p
    setPos(p)
  }, [stageRef, lanes, target])

  // En cada render (barato): solo hace setState si cambió la posición.
  useLayoutEffect(() => {
    measure()
  })

  useEffect(() => {
    const st = stageRef.current
    if (!st || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => measure())
    ro.observe(st)
    // las fuentes web cambian el tamaño del texto al cargar: volver a medir
    document.fonts?.ready.then(() => measure()).catch(() => {})
    return () => ro.disconnect()
  }, [measure, stageRef])

  useEffect(() => {
    if (!moving) return
    const t = setTimeout(() => setMoving(false), 700)
    return () => clearTimeout(t)
  }, [moving, pos])

  return { pos, dir, moving }
}

export function Walker({ pos, dir, moving, size = 30 }: { pos: { x: number; y: number } | null; dir: Dir; moving: boolean; size?: number }) {
  if (!pos) return null
  return (
    <div
      className="ms-pac"
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)`, marginLeft: -size / 2, marginTop: -size / 2, width: size, height: size }}
      aria-hidden="true"
    >
      <PacMan size={size} dir={dir} chomp={moving} />
    </div>
  )
}

/** true durante ~0.6 s cada vez que `attempt` sube (respuesta incorrecta). */
export function useShake(attempt: number) {
  const [on, setOn] = useState(false)
  const prev = useRef(attempt)
  useEffect(() => {
    if (attempt === prev.current) return
    prev.current = attempt
    setOn(true)
    const t = setTimeout(() => setOn(false), 650)
    return () => clearTimeout(t)
  }, [attempt])
  return on
}

/** Marca temporal (1.1 s) de "aquí falló" — para el fantasma y el destello rojo. */
export function useFlash<K>() {
  const [flash, setFlash] = useState<{ key: K; id: number } | null>(null)
  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 1100)
    return () => clearTimeout(t)
  }, [flash])
  const trigger = useCallback((key: K) => setFlash({ key, id: Date.now() }), [])
  return [flash, trigger] as const
}

/** Partículas + texto flotante sobre un elemento (coordenadas de pantalla). */
export function fxAt(el: HTMLElement | null | undefined, text?: string) {
  if (!el || typeof el.getBoundingClientRect !== 'function') return
  const r = el.getBoundingClientRect()
  const x = r.left + r.width / 2
  const y = r.top + r.height / 2
  burst(x, y, { count: 14 })
  if (text) floatText(x, y - 18, text)
}

export interface HouseProps {
  tone: 'empty' | 'array' | 'node' | 'null'
  /** is-selected | is-correct | is-wrong | is-visited | is-current | is-dim | is-solution */
  states?: string[]
  tag?: string
  sign: string
  signHidden?: boolean
  body?: ReactNode
  label: string
  onTap?: () => void
  disabled?: boolean
  ghost?: boolean
  laneRef?: (el: HTMLElement | null) => void
}

export function House(p: HouseProps) {
  const cls = ['ms-house', `is-${p.tone}`, ...(p.states ?? []).map((s) => `is-${s}`)].join(' ')
  const inner = (
    <>
      {p.tag && <span className="ms-tag">{p.tag}</span>}
      {p.ghost && <Ghost color="red" size={30} float className="ms-ghost" />}
      <span className="ms-roof" aria-hidden="true" />
      <span className="ms-body">{p.body ?? <span className="ms-door" aria-hidden="true" />}</span>
      <span className={`ms-sign${p.signHidden ? ' is-hidden' : ''}`}>{p.signHidden ? '???' : p.sign}</span>
      <span className="ms-lane" ref={p.laneRef} aria-hidden="true" />
    </>
  )
  if (p.onTap) {
    return (
      <button type="button" className={cls} onClick={p.onTap} disabled={p.disabled} aria-label={p.label}>
        {inner}
      </button>
    )
  }
  return (
    <div className={cls} role="img" aria-label={p.label}>
      {inner}
    </div>
  )
}

export function Warn({ items }: { items: string[] }) {
  return (
    <div className="px-panel ms-warn" role="alert">
      <p className="ms-warn-title">AVISO</p>
      <p>Este ejercicio tiene datos que no se pueden jugar:</p>
      <ul>
        {items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </div>
  )
}

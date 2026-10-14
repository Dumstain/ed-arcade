/**
 * Tres vistas de la misma cola (solo presentación, sin estado propio):
 *  - line : personitas pixel en fila (frente a la izquierda); el comecocos atiende en la ventanilla
 *  - ring : carrusel circular (SVG) con índices y flechas FRENTE (afuera) / FINAL (adentro)
 *  - array: celdas fijas en línea con índices y flechas debajo
 * El dato que sale NO se borra de su celda en ring/array: queda atenuado (obsoleto).
 */
import type { CSSProperties } from 'react'
import { PacMan, plainText } from '../../ui'
import { isLiveIndex, itemsOf, rearIndex, slotsOf } from './logic'
import type { End, Item, QModel, View } from './logic'
import './queue-sim.css'

export interface Leaving { key: number; item: Item; index: number; end: End }
/** pointers: dónde están dibujadas las flechas (el alumno las va moviendo) */
export interface PtrState { front: number; rear: number; frontSet: boolean; rearSet: boolean; wrongFront?: boolean; wrongRear?: boolean }
export interface TapState { onPick: (i: number, el: HTMLElement) => void; disabled: boolean; active: End }

export interface QueueVisualProps {
  view: View
  model: QModel
  deque?: boolean
  leaving?: Leaving[]
  /** id de ficha → por qué lado entró (para animar solo las que acaban de llegar) */
  fresh?: Record<number, End>
  flash?: 'full' | 'ok' | null
  ptr?: PtrState
  tap?: TapState
}

const txt = (v: unknown) => plainText(String(v))
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const LABEL: Record<End, string> = { front: 'FRENTE', rear: 'FINAL' }

export function describeQueue(view: View, model: QModel, ptr?: PtrState): string {
  const vals = itemsOf(model).map((i) => txt(i.v))
  const list = vals.length ? `De frente a final: ${vals.join(', ')}.` : 'Está vacía.'
  if (view === 'line') return `Fila de ${vals.length} ${vals.length === 1 ? 'persona' : 'personas'}. ${list}`
  const n = slotsOf(model)
  const f = ptr ? ptr.front : model.front
  const r = ptr ? ptr.rear : rearIndex(model)
  const what = view === 'ring' ? 'Cola circular' : 'Cola en arreglo circular'
  return `${what} de ${n} casillas. Frente en la casilla ${f}, final en la casilla ${r}. ${list}`
}

export function QueueVisual({ view, model, deque = false, leaving = [], fresh = {}, flash = null, ptr, tap }: QueueVisualProps) {
  const cls = 'qs-visual' + (flash ? ` is-${flash}` : '')
  const aria = describeQueue(view, model, ptr)
  const a11y = tap ? { role: 'group', 'aria-label': aria } : { role: 'img', 'aria-label': aria }
  return (
    <div className={cls} {...a11y}>
      {view === 'line' && <LineView model={model} deque={deque} leaving={leaving} fresh={fresh} />}
      {view === 'ring' && <RingView model={model} leaving={leaving} fresh={fresh} ptr={ptr} tap={tap} />}
      {view === 'array' && <ArrayView model={model} leaving={leaving} fresh={fresh} ptr={ptr} tap={tap} />}
    </div>
  )
}

// ───────────────────────── Persona pixel ─────────────────────────
const PERSON = [
  '....XXXX....',
  '...XXXXXX...',
  '...XKXXKX...',
  '...XXXXXX...',
  '....XXXX....',
  '..XXXXXXXX..',
  '.XXXXXXXXXX.',
  'XX.XXXXXX.XX',
  'XX.XXXXXX.XX',
  '...XXXXXX...',
  '...XX..XX...',
  '...XX..XX...',
  '...XX..XX...',
]
const PERSON_RECTS = (() => {
  const out: { x: number; y: number; w: number; eye: boolean }[] = []
  PERSON.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const ch = row[x]
      if (ch === '.') {
        x++
        continue
      }
      let w = 1
      while (x + w < row.length && row[x + w] === ch) w++
      out.push({ x, y, w, eye: ch === 'K' })
      x += w
    }
  })
  return out
})()
const PERSON_COLORS = ['--ghost-cyan', '--ghost-pink', '--ghost-orange', '--ok', '--pac']

function PixelPerson({ size = 30 }: { size?: number }) {
  return (
    <svg
      className="qs-sprite"
      width={size}
      height={(size * PERSON.length) / PERSON[0].length}
      viewBox={`0 0 ${PERSON[0].length} ${PERSON.length}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {PERSON_RECTS.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} className={r.eye ? 'qs-eye' : 'qs-body'} />
      ))}
    </svg>
  )
}

// ───────────────────────── Fila (line) ─────────────────────────
function Tag({ end, up }: { end: End; up?: boolean }) {
  return (
    <span className={`qs-tag qs-tag--${end === 'front' ? 'f' : 'r'}${up ? ' is-up' : ''}`}>{LABEL[end]}</span>
  )
}

function Person({
  item,
  isFront,
  isRear,
  enter,
  out,
}: {
  item: Item
  isFront?: boolean
  isRear?: boolean
  enter?: End
  out?: End
}) {
  const cls = 'qs-person' + (enter ? ` is-in-${enter}` : '') + (out ? ` is-out-${out}` : '')
  const style = { '--pc': `var(${PERSON_COLORS[item.id % PERSON_COLORS.length]})` } as CSSProperties
  return (
    <div className={cls} style={style} aria-hidden={out ? 'true' : undefined}>
      <div className="qs-band qs-band--top">{isFront && <Tag end="front" />}</div>
      <PixelPerson />
      <div className="qs-ficha">{txt(item.v)}</div>
      <div className="qs-band qs-band--bot">{isRear && <Tag end="rear" up />}</div>
    </div>
  )
}

/** Ventanilla: ahí atienden (el comecocos se come la ficha del que sale) */
function Gate({ end, eating }: { end: End; eating: boolean }) {
  return (
    <div className={`qs-gate qs-gate--${end === 'front' ? 'f' : 'r'}${eating ? ' is-eating' : ''}`} aria-hidden="true">
      <PacMan size={28} dir={end === 'front' ? 'right' : 'left'} chomp={eating} />
    </div>
  )
}

function LineView({
  model,
  deque,
  leaving,
  fresh,
}: {
  model: QModel
  deque: boolean
  leaving: Leaving[]
  fresh: Record<number, End>
}) {
  const items = itemsOf(model)
  const outFront = leaving.filter((l) => l.end === 'front')
  const outRear = leaving.filter((l) => l.end === 'rear').reverse()
  const nothing = items.length === 0 && outFront.length === 0 && outRear.length === 0
  // la ficha crece con textos largos (nombres); hasta 6 letras, luego se recorta
  const maxLen = Math.max(1, ...[...items, ...leaving.map((l) => l.item)].map((i) => txt(i.v).length))
  const pw = clamp(maxLen * 12 + 16, 46, 72)
  return (
    <div className={'qs-lane' + (deque ? ' is-deque' : '')} style={{ '--qs-pw': `${pw}px` } as CSSProperties}>
      <Gate end="front" eating={outFront.length > 0} />
      <div className="qs-people">
        {outFront.map((l) => (
          <Person key={`o${l.key}`} item={l.item} out="front" />
        ))}
        {items.map((it, i) => (
          <Person
            key={it.id}
            item={it}
            isFront={i === 0}
            isRear={i === items.length - 1}
            enter={fresh[it.id]}
          />
        ))}
        {outRear.map((l) => (
          <Person key={`o${l.key}`} item={l.item} out="rear" />
        ))}
        {nothing && <div className="qs-vacia">FILA VACÍA</div>}
        {deque && <Gate end="rear" eating={outRear.length > 0} />}
      </div>
    </div>
  )
}

// ───────────────────────── Carrusel (ring) ─────────────────────────
const VBW = 320
const VBH = 284
const CX = 160
const CY = 142
const HALF = 22
const ARROW_LEN = 16
const HEAD = 7

function RingArrow({ i, n, R, end, unset, wrong }: { i: number; n: number; R: number; end: End; unset: boolean; wrong: boolean }) {
  const th = ((-90 + (i * 360) / n) * Math.PI) / 180
  const c = Math.cos(th)
  const s = Math.sin(th)
  const edge = HALF / Math.max(Math.abs(c), Math.abs(s))
  const outer = end === 'front'
  const tip = outer ? R + edge + 3 : R - edge - 3
  const label = LABEL[end]
  const hw = label.length * 5
  const e = hw * Math.abs(c) + 5 * Math.abs(s)
  const rot = (th * 180) / Math.PI + (outer ? 180 : 0)
  const tx = CX + tip * c
  const ty = CY + tip * s
  let lx: number
  let ly: number
  if (outer && Math.abs(c) > 0.72) {
    // a los lados no cabe después de la flecha: la etiqueta va encima de ella
    const tailX = CX + (tip + ARROW_LEN) * c
    lx = clamp(tailX + c * 22, hw + 1, VBW - hw - 1)
    ly = ty - 15
  } else {
    const dist = outer ? tip + ARROW_LEN + 3 + e : tip - ARROW_LEN - 3 - e
    lx = clamp(CX + dist * c, hw + 1, VBW - hw - 1)
    ly = clamp(CY + dist * s, 8, VBH - 8)
  }
  return (
    <g className={`qs-rarrow qs-rarrow--${end}${unset ? ' is-unset' : ''}${wrong ? ' is-wrong' : ''}`}>
      <g transform={`translate(${tx.toFixed(1)} ${ty.toFixed(1)}) rotate(${rot.toFixed(1)})`}>
        <polygon points={`0,0 ${-HEAD},-6 ${-HEAD},6`} />
        <rect x={-ARROW_LEN} y={-2.5} width={ARROW_LEN - HEAD + 1} height={5} />
      </g>
      <text x={lx.toFixed(1)} y={ly.toFixed(1)} dy="0.35em" textAnchor="middle" className="qs-rlabel">
        {label}
      </text>
    </g>
  )
}

function ringValueSize(s: string): number {
  return s.length <= 2 ? 14 : s.length === 3 ? 12 : 10
}
function ringValue(s: string): string {
  return s.length > 4 ? s.slice(0, 3) + '.' : s
}

function RingView({
  model,
  leaving,
  fresh,
  ptr,
  tap,
}: {
  model: QModel
  leaving: Leaving[]
  fresh: Record<number, End>
  ptr?: PtrState
  tap?: TapState
}) {
  const n = slotsOf(model)
  const R = Math.max(74, Math.ceil(25 / Math.sin(Math.PI / n)))
  const fi = ptr ? ptr.front : model.front
  const ri = ptr ? ptr.rear : rearIndex(model)
  const pos = (i: number) => {
    const th = ((-90 + (i * 360) / n) * Math.PI) / 180
    return { x: CX + R * Math.cos(th), y: CY + R * Math.sin(th) }
  }
  const eating = new Map(leaving.map((l) => [l.index, l]))
  const both = fi === ri
  const wrap = { '--qs-pick': tap?.active === 'rear' ? 'var(--qs-r)' : 'var(--qs-f)' } as CSSProperties
  return (
    <div className={'qs-ring' + (tap ? ' is-tap' : '')} style={wrap}>
      <svg viewBox={`0 0 ${VBW} ${VBH}`} aria-hidden="true" focusable="false">
        <circle cx={CX} cy={CY} r={R} className="qs-track" />
        {Array.from({ length: n }, (_, i) => {
          const { x, y } = pos(i)
          const it = model.cells[i]
          const live = isLiveIndex(model, i)
          const ate = eating.get(i)
          const stale = !live && it !== null && !ate
          const state = live ? 'is-live' : stale ? 'is-stale' : 'is-empty'
          const v = it ? txt(it.v) : ''
          return (
            <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
              <rect x={-HALF} y={-HALF} width={HALF * 2} height={HALF * 2} className={`qs-rc ${state}`} />
              {i === fi && (
                <rect
                  x={-HALF - 2}
                  y={-HALF - 2}
                  width={HALF * 2 + 4}
                  height={HALF * 2 + 4}
                  className={'qs-ro qs-ro--f' + (ptr && !ptr.frontSet ? ' is-unset' : '') + (ptr?.wrongFront ? ' is-wrong' : '')}
                />
              )}
              {i === ri && (
                <rect
                  x={both ? -HALF + 2 : -HALF - 2}
                  y={both ? -HALF + 2 : -HALF - 2}
                  width={both ? HALF * 2 - 4 : HALF * 2 + 4}
                  height={both ? HALF * 2 - 4 : HALF * 2 + 4}
                  className={'qs-ro qs-ro--r' + (ptr && !ptr.rearSet ? ' is-unset' : '') + (ptr?.wrongRear ? ' is-wrong' : '')}
                />
              )}
              <text x={-HALF + 8} y={-HALF + 15} className="qs-ri">
                {i}
              </text>
              {live && it && (
                <g key={it.id} className={fresh[it.id] ? 'qs-rpop' : undefined}>
                  <text x={0} y={11} className="qs-rv" style={{ fontSize: ringValueSize(v) }}>
                    {ringValue(v)}
                  </text>
                </g>
              )}
              {stale && it && (
                <text x={0} y={11} className="qs-rv is-stale" style={{ fontSize: ringValueSize(v) }}>
                  {ringValue(v)}
                </text>
              )}
              {ate && (
                <>
                  <g className="qs-rleave">
                    <text x={0} y={11} className="qs-rv" style={{ fontSize: ringValueSize(txt(ate.item.v)) }}>
                      {ringValue(txt(ate.item.v))}
                    </text>
                  </g>
                  <g transform="translate(-15 -13)">
                    <g className="qs-reater">
                      <PacMan size={30} dir="right" chomp />
                    </g>
                  </g>
                </>
              )}
            </g>
          )
        })}
        <RingArrow key={`f${fi}`} i={fi} n={n} R={R} end="front" unset={!!ptr && !ptr.frontSet} wrong={!!ptr?.wrongFront} />
        <RingArrow key={`r${ri}`} i={ri} n={n} R={R} end="rear" unset={!!ptr && !ptr.rearSet} wrong={!!ptr?.wrongRear} />
      </svg>
      {tap &&
        Array.from({ length: n }, (_, i) => {
          const { x, y } = pos(i)
          const it = model.cells[i]
          const live = isLiveIndex(model, i)
          const what = live && it ? `contiene ${txt(it.v)}` : 'vacía'
          return (
            <button
              key={i}
              type="button"
              className="qs-rbtn"
              style={{ left: `${(x / VBW) * 100}%`, top: `${(y / VBH) * 100}%` }}
              disabled={tap.disabled}
              onClick={(e) => tap.onPick(i, e.currentTarget)}
              aria-label={`Casilla ${i}, ${what}. Colocar ${tap.active === 'front' ? 'el frente' : 'el final'} aquí`}
            />
          )
        })}
    </div>
  )
}

// ───────────────────────── Arreglo (array) ─────────────────────────
function ArrayView({
  model,
  leaving,
  fresh,
  ptr,
  tap,
}: {
  model: QModel
  leaving: Leaving[]
  fresh: Record<number, End>
  ptr?: PtrState
  tap?: TapState
}) {
  const n = slotsOf(model)
  const cols = n <= 6 ? n : Math.ceil(n / 2)
  const fi = ptr ? ptr.front : model.front
  const ri = ptr ? ptr.rear : rearIndex(model)
  const eating = new Map(leaving.map((l) => [l.index, l]))
  const small = n > 6
  const wrap = { '--cols': cols, '--qs-pick': tap?.active === 'rear' ? 'var(--qs-r)' : 'var(--qs-f)' } as CSSProperties
  return (
    <div className={'qs-array' + (small ? ' is-small' : '') + (tap ? ' is-tap' : '')} style={wrap}>
      {Array.from({ length: n }, (_, i) => {
        const it = model.cells[i]
        const live = isLiveIndex(model, i)
        const ate = eating.get(i)
        const stale = !live && it !== null && !ate
        const isF = i === fi
        const isR = i === ri
        const cellCls =
          'px-cell qs-acell ' +
          (live ? 'is-live' : stale ? 'is-stale' : 'is-empty') +
          (isF ? ' is-front' : '') +
          (isR ? ' is-rear' : '') +
          (isF && ptr?.wrongFront ? ' is-wrong-f' : '') +
          (isR && ptr?.wrongRear ? ' is-wrong-r' : '')
        const inner = (
          <>
            {live && it && (
              <span key={it.id} className={'qs-av' + (fresh[it.id] ? ' qs-vpop' : '')}>
                {txt(it.v)}
              </span>
            )}
            {stale && it && <span className="qs-av is-stale">{txt(it.v)}</span>}
            {ate && <span className="qs-av qs-aleave">{txt(ate.item.v)}</span>}
            {ate && (
              <span className="qs-eater" aria-hidden="true">
                <PacMan size={30} dir="right" chomp />
              </span>
            )}
          </>
        )
        const what = live && it ? `contiene ${txt(it.v)}` : stale && it ? `dato viejo ${txt(it.v)}` : 'vacía'
        return (
          <div className="qs-acol" key={i}>
            {tap ? (
              <button
                type="button"
                className={cellCls}
                disabled={tap.disabled}
                onClick={(e) => tap.onPick(i, e.currentTarget)}
                aria-label={`Casilla ${i}, ${what}. Colocar ${tap.active === 'front' ? 'el frente' : 'el final'} aquí`}
              >
                {inner}
              </button>
            ) : (
              <div className={cellCls} title={stale ? 'Dato viejo: sigue en memoria pero ya no cuenta' : undefined}>
                {inner}
              </div>
            )}
            <div className="qs-aidx">{i}</div>
            <div className="qs-aptr" aria-hidden="true">
              {isF && (
                <span
                  key={`f${i}`}
                  className={'qs-ptag qs-ptag--f' + (ptr && !ptr.frontSet ? ' is-unset' : '') + (ptr?.wrongFront ? ' is-wrong' : '')}
                >
                  <i className="qs-tri-up" />
                  {LABEL.front}
                </span>
              )}
            </div>
            <div className="qs-aptr" aria-hidden="true">
              {isR && (
                <span
                  key={`r${i}`}
                  className={'qs-ptag qs-ptag--r' + (ptr && !ptr.rearSet ? ' is-unset' : '') + (ptr?.wrongRear ? ' is-wrong' : '')}
                >
                  <i className="qs-tri-up" />
                  {LABEL.rear}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default QueueVisual

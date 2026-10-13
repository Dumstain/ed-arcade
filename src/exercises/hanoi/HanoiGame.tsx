/**
 * Torres de Hanói arcade.
 * - Tocar torre origen (el disco de arriba se eleva y parpadea) → tocar torre destino (viaja y cae).
 * - Movimiento ilegal: el disco rebota + aviso, SIN costar vida.
 * - Cada movimiento legal → onStep(); resolver en <= maxMoves → onCheck(true);
 *   llegar a maxMoves sin resolver → onCheck(false) y se reinicia el tablero.
 * - showSolution: reproduce animada la solución óptima.
 */
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { ExerciseProps } from '../../engine/types'
import type { HanoiData } from '../schemas'
import { Fruit, Ghost, PacMan, burst, floatText, sfx } from '../../ui'
import { initialPegs, normalizeConfig, solveMoves } from './logic'
import type { HanoiConfig, PegIdx } from './logic'
import './hanoi.css'

type Status = 'play' | 'won' | 'lost' | 'solution'
type MsgKind = 'info' | 'warn' | 'ok' | 'bad'

interface Game {
  /** Torres fondo → tope */
  pegs: number[][]
  moves: number
  /** Torre seleccionada (su disco de arriba está elevado) */
  selected: PegIdx | null
  /** Disco en vuelo: 'over' = viaja elevado, 'down' = cae */
  fly: { disk: number; to: PegIdx; phase: 'over' | 'down' } | null
  /** Disco que rebota por movimiento ilegal (k reinicia la animación) */
  bounce: { disk: number; dir: 1 | -1; k: number } | null
  /** Último disco que aterrizó (k reinicia la animación de aterrizaje) */
  land: { disk: number; k: number } | null
  /** Torre vacía tocada (sacudida del poste) */
  nudge: { peg: PegIdx; k: number } | null
  status: Status
  /** La reproducción de la solución ya terminó */
  solved: boolean
  msg: { text: string; kind: MsgKind }
}

const LETTERS = ['A', 'B', 'C'] as const
/** Del disco más grande al más chico: Blinky, Clyde, comecocos, Inky, Pinky */
const DISK_COLORS = ['--ghost-red', '--ghost-orange', '--pac', '--ghost-cyan', '--ghost-pink']
const DISK_H = [0, 0, 36, 34, 30, 28] // alto de cada disco según cantidad de discos
const LABEL_PX = 44 // zona de letrero bajo las torres
const FLOOR_PX = 24 // zona de pellets/suelo
const BORDER_PX = 4

const T_OVER = 170 // viaje horizontal (CSS: .16s)
const T_DOWN = 150 // caída (CSS: .14s)
const T_BOUNCE = 520
const T_LOST = 1500
const T_RUN = 1800 // el comecocos cruza el tablero
const PELLETS = 21

const vars = (v: Record<string, string | number>) => v as CSSProperties
const top = (stack: number[]) => stack[stack.length - 1]

function cssColor(name: string, fallback: string) {
  try {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
  } catch {
    return fallback
  }
}

function hintMsg(cfg: HanoiConfig): Game['msg'] {
  return { text: `Toca la torre ${LETTERS[cfg.from]} para levantar su disco de arriba.`, kind: 'info' }
}

function fresh(cfg: HanoiConfig, msg: Game['msg'], status: Status = 'play'): Game {
  return {
    pegs: initialPegs(cfg.disks, cfg.from),
    moves: 0,
    selected: null,
    fly: null,
    bounce: null,
    land: null,
    nudge: null,
    status,
    solved: false,
    msg,
  }
}

/** Entrada: valida datos; si son inutilizables muestra aviso. Se remonta al cambiar exercise.id. */
export default function HanoiExercise(props: ExerciseProps<HanoiData>) {
  return <HanoiGate key={props.exercise.id} {...props} />
}

function HanoiGate(props: ExerciseProps<HanoiData>) {
  const [cfg] = useState(() => normalizeConfig(props.exercise.data))
  if (!cfg) {
    return (
      <div className="px-panel hn-aviso" role="alert">
        <p className="px-title" style={{ fontSize: 12, margin: 0 }}>¡UPS! FALTAN DATOS</p>
        <p style={{ margin: '8px 0 0' }}>Este ejercicio de Torres de Hanói no trae datos válidos.</p>
      </div>
    )
  }
  return <HanoiBoard {...props} cfg={cfg} />
}

function HanoiBoard({ cfg, onCheck, onStep, locked, showSolution, attempt }: ExerciseProps<HanoiData> & { cfg: HanoiConfig }) {
  const n = cfg.disks
  const H = DISK_H[n] ?? 28

  const [g, setG] = useState<Game>(() => fresh(cfg, hintMsg(cfg)))
  const gRef = useRef(g)
  // Los callbacks diferidos leen SIEMPRE de refs (nunca de estado/props capturados).
  const live = useRef({ onCheck, onStep, showSolution })
  live.current = { onCheck, onStep, showSolution }

  const stageRef = useRef<HTMLDivElement>(null)
  const timers = useRef<number[]>([])
  const kLand = useRef(0)
  const kBounce = useRef(0)
  const kNudge = useRef(0)

  const patch = (p: Partial<Game>) => {
    gRef.current = { ...gRef.current, ...p }
    setG(gRef.current)
  }
  const replace = (next: Game) => {
    gRef.current = next
    setG(next)
  }
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }
  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id))
    timers.current = []
  }
  useEffect(() => clearTimers, [])

  /** Punto de pantalla (para partículas) sobre la torre `peg` al nivel `level`. */
  const fxPoint = (peg: number, level: number) => {
    const el = stageRef.current
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.left + (r.width * (2 * peg + 1)) / 6, y: r.bottom - BORDER_PX - LABEL_PX - FLOOR_PX - (level + 0.5) * H }
  }

  // ───────── mover un disco (animado: sube → viaja → cae) ─────────
  const commitMove = (src: PegIdx, dest: PegIdx, onLand: () => void) => {
    const cur = gRef.current
    if (!cur.pegs[src].length) return
    const disk = top(cur.pegs[src])
    const pegs = cur.pegs.map((p) => p.slice())
    pegs[src].pop()
    pegs[dest].push(disk)
    patch({ pegs, moves: cur.moves + 1, selected: null, fly: { disk, to: dest, phase: 'over' } })
    later(() => {
      const f = gRef.current.fly
      if (f) patch({ fly: { ...f, phase: 'down' } })
    }, T_OVER)
    later(() => {
      kLand.current += 1
      patch({ fly: null, land: { disk, k: kLand.current } })
      const pt = fxPoint(dest, gRef.current.pegs[dest].length - 1)
      if (pt) burst(pt.x, pt.y, { color: cssColor(DISK_COLORS[n - disk] ?? '--pac', '#ffe600'), count: 6 })
      onLand()
    }, T_OVER + T_DOWN)
  }

  // ───────── fin de juego ─────────
  const win = () => {
    const moves = gRef.current.moves
    const perfect = moves === cfg.optimal
    patch({
      status: 'won',
      msg: {
        text: perfect ? `¡Perfecto! ${moves} movimientos: el mínimo posible.` : `¡Torre completa en ${moves} movimientos!`,
        kind: 'ok',
      },
    })
    const pt = fxPoint(cfg.to, n)
    if (pt) {
      burst(pt.x, pt.y, { color: cssColor('--pac', '#ffe600'), count: 24 })
      floatText(pt.x, pt.y - 20, perfect ? '¡PERFECTO!' : '¡LISTO!', { color: cssColor('--ok', '#3cff6e') })
    }
    for (let i = 0; i < 5; i++) later(() => sfx.waka(), 250 + i * 300)
    live.current.onCheck(true, { moves })
  }

  const startSolution = () => {
    clearTimers()
    const seq = solveMoves(n, cfg.from, cfg.to)
    replace(
      fresh(cfg, { text: `Mira cómo se resuelve en ${seq.length} movimientos.`, kind: 'info' }, 'solution'),
    )
    const fast = seq.length > 15
    const liftMs = fast ? 130 : 260
    const gapMs = fast ? 60 : 240
    let i = 0
    const next = () => {
      if (i >= seq.length) {
        patch({
          solved: true,
          msg: { text: '¡Así! Chicos a un lado, el grande al fondo y chicos encima.', kind: 'ok' },
        })
        return
      }
      const [s, d] = seq[i++]
      patch({ selected: s })
      later(() => commitMove(s, d, () => later(next, gapMs)), liftMs)
    }
    later(next, 450)
  }

  const lose = () => {
    patch({
      status: 'lost',
      msg: { text: '¡Te pasaste de movimientos! Los fantasmas se comieron la torre.', kind: 'bad' },
    })
    live.current.onCheck(false, { moves: gRef.current.moves })
    later(() => {
      if (live.current.showSolution) startSolution()
      else replace(fresh(cfg, { text: 'Otra vez: planea bien tus movimientos.', kind: 'info' }))
    }, T_LOST)
  }

  const afterManualLand = () => {
    const cur = gRef.current
    if (cur.pegs[cfg.to].length === n) return win()
    if (cur.moves >= cfg.maxMoves) return lose()
    const left = cfg.maxMoves - cur.moves
    patch({
      msg:
        left <= 2
          ? { text: `¡Cuidado! Solo te ${left === 1 ? 'queda 1 movimiento' : `quedan ${left} movimientos`}.`, kind: 'warn' }
          : hintMsg(cfg),
    })
    live.current.onStep?.()
  }

  // ───────── toques ─────────
  const tap = (p: PegIdx) => {
    const cur = gRef.current
    if (locked || cur.status !== 'play' || cur.fly || cur.bounce) return
    sfx.click()

    if (cur.selected === null) {
      if (!cur.pegs[p].length) {
        kNudge.current += 1
        patch({
          nudge: { peg: p, k: kNudge.current },
          msg: { text: `La torre ${LETTERS[p]} está vacía. Elige una con discos.`, kind: 'info' },
        })
        return
      }
      patch({ selected: p, msg: { text: `Ahora toca la torre a donde lo quieres llevar.`, kind: 'info' } })
      return
    }
    if (cur.selected === p) {
      patch({ selected: null, msg: hintMsg(cfg) })
      return
    }

    const src = cur.selected
    const disk = top(cur.pegs[src])
    const destTop = cur.pegs[p].length ? top(cur.pegs[p]) : undefined
    if (destTop !== undefined && destTop < disk) {
      // ilegal: grande sobre chico → rebota, sin perder vida
      kBounce.current += 1
      patch({
        bounce: { disk, dir: p > src ? 1 : -1, k: kBounce.current },
        msg: { text: '¡No puedes poner uno grande sobre uno chico!', kind: 'warn' },
      })
      later(() => patch({ bounce: null, selected: null }), T_BOUNCE)
      return
    }
    commitMove(src, p, afterManualLand)
  }

  const restart = () => {
    const cur = gRef.current
    if (locked || cur.status !== 'play' || cur.fly || cur.bounce) return
    sfx.click()
    clearTimers()
    replace(fresh(cfg, { text: 'Tablero reiniciado. ¡Otra vez!', kind: 'info' }))
  }

  // Sin vidas → mostrar la solución animada (si no estamos en la animación de "perdiste", que la dispara sola)
  useEffect(() => {
    if (showSolution && gRef.current.status !== 'lost') startSolution()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSolution])

  // attempt cambió → sacudida + destello rojo breve
  const prevAttempt = useRef(attempt)
  const [flash, setFlash] = useState(false)
  useEffect(() => {
    if (prevAttempt.current === attempt) return
    prevAttempt.current = attempt
    setFlash(true)
    const id = window.setTimeout(() => setFlash(false), 700)
    return () => window.clearTimeout(id)
  }, [attempt])

  // ───────── render ─────────
  const pos: { peg: number; level: number }[] = []
  g.pegs.forEach((stack, pi) => stack.forEach((s, level) => (pos[s] = { peg: pi, level })))

  const blocked = locked || g.status !== 'play'
  const inSolution = g.status === 'solution'
  const maxShown = inSolution ? cfg.optimal : cfg.maxMoves
  const remaining = cfg.maxMoves - g.moves
  const lastCall = g.status === 'play' && remaining <= 1 && g.moves > 0
  const showMeter = cfg.maxMoves <= 48

  const stageClass = [
    'hn-stage',
    g.status === 'won' && 'is-won',
    g.status === 'lost' && 'is-lost',
    flash && 'is-flash anim-shake',
  ]
    .filter(Boolean)
    .join(' ')

  const disks = []
  for (let s = 1; s <= n; s++) {
    const p = pos[s]
    if (!p) continue
    const f = g.fly && g.fly.disk === s ? g.fly : null
    const lifted = (g.selected !== null && !g.fly && top(g.pegs[g.selected]) === s) || f?.phase === 'over'
    const lvl = lifted ? n + 1 : p.level
    const wPct = (0.36 + (0.58 * s) / n) * (100 / 3)
    const bouncing = g.bounce?.disk === s ? g.bounce : null
    const landed = g.land?.disk === s ? g.land : null
    const faceClass = [
      'hn-face',
      lifted && !f && 'is-sel',
      landed && 'is-land',
      bouncing && 'is-bounce',
    ]
      .filter(Boolean)
      .join(' ')
    disks.push(
      <div
        key={s}
        className="hn-disk"
        style={vars({
          '--cx': `${((2 * p.peg + 1) / 6) * 100}%`,
          '--w': `${wPct}%`,
          '--lvl': lvl,
          '--dk': `var(${DISK_COLORS[n - s] ?? '--pac'})`,
          '--i': s,
          '--hn-dir': bouncing ? bouncing.dir : 1,
        })}
      >
        <span key={`${landed?.k ?? 0}-${bouncing?.k ?? 0}`} className={faceClass}>
          {s}
        </span>
      </div>,
    )
  }

  const pegLabel = (i: number) => {
    const st = g.pegs[i]
    const role = i === cfg.from && i === cfg.to ? '' : i === cfg.from ? ', salida' : i === cfg.to ? ', meta' : ''
    const body = st.length ? `${st.length} disco${st.length > 1 ? 's' : ''}, el de arriba es el ${top(st)}` : 'vacía'
    return `Torre ${LETTERS[i]}${role}: ${body}`
  }

  const msgIcon =
    g.msg.kind === 'warn' || g.msg.kind === 'bad' ? (
      <Ghost color="red" size={30} float />
    ) : (
      <PacMan size={30} dir="right" chomp={g.msg.kind === 'ok'} />
    )

  return (
    <div
      className="hn-root"
      style={vars({ '--hn-n': n, '--hn-h': `${H}px`, '--hn-label': `${LABEL_PX}px`, '--hn-floor': `${FLOOR_PX}px` })}
    >
      <p className="hn-mission">
        Lleva los <b>{n}</b> discos de la torre <b>{LETTERS[cfg.from]}</b> a la torre <b>{LETTERS[cfg.to]}</b>.
      </p>
      <p className="hn-rules">De uno en uno. Nunca uno grande sobre uno chico.</p>

      <div className="hn-hud">
        <div className={'hn-counter' + (lastCall ? ' is-last' : '')}>
          <span className="hn-counter-label">MOVIMIENTOS:</span>
          <span className="hn-counter-val">
            <b key={g.moves} className="hn-num">
              {g.moves}
            </b>{' '}
            / {maxShown}
          </span>
        </div>
        {inSolution ? (
          <button type="button" className="px-btn px-btn--sm px-btn--ghost" disabled={!g.solved} onClick={() => { sfx.click(); startSolution() }}>
            REPETIR
          </button>
        ) : (
          <button
            type="button"
            className="px-btn px-btn--sm px-btn--ghost"
            disabled={blocked || (g.moves === 0 && g.selected === null)}
            onClick={restart}
            aria-label="Reiniciar el tablero"
          >
            REINICIAR
          </button>
        )}
      </div>

      {showMeter && (
        <div className="hn-meter" aria-hidden="true">
          {Array.from({ length: maxShown }, (_, i) => (
            <span key={i} className={'hn-seg' + (i < g.moves ? ' is-used' : '')} />
          ))}
        </div>
      )}

      <div ref={stageRef} className={stageClass}>
        <div className="hn-pegs">
          {[0, 1, 2].map((i) => {
            const isGoal = i === cfg.to
            const isFrom = i === cfg.from
            const nudged = g.nudge?.peg === i ? g.nudge.k : 0
            return (
              <button
                key={i}
                type="button"
                className={'hn-peg' + (g.selected === i ? ' is-sel' : '') + (isGoal ? ' is-goal' : '')}
                onClick={() => tap(i as PegIdx)}
                disabled={blocked}
                aria-pressed={g.selected === i}
                aria-label={pegLabel(i)}
              >
                <span key={nudged} className={'hn-pole' + (nudged ? ' is-nudge' : '')} aria-hidden="true" />
                <span className="hn-plate" aria-hidden="true" />
                <span className="hn-plabel" aria-hidden="true">
                  <span className="hn-letter">
                    {isGoal && <Fruit kind="strawberry" size={20} />}
                    {LETTERS[i]}
                  </span>
                  <span className="hn-tag">{isGoal ? 'META' : isFrom ? 'SALIDA' : ' '}</span>
                </span>
              </button>
            )
          })}
        </div>

        <div className={'hn-floor' + (g.status === 'won' ? ' is-run' : '')} aria-hidden="true">
          {Array.from({ length: PELLETS }, (_, i) => (
            <span
              key={i}
              className="hn-pellet"
              style={vars({ '--t': `${Math.max(0, ((((i + 0.5) / PELLETS) * 100 + 4) / 120) * T_RUN)}ms` })}
            />
          ))}
        </div>

        <div className="hn-disks" aria-hidden="true">
          {disks}
        </div>

        {g.status === 'won' && (
          <>
            <div className="hn-run" aria-hidden="true">
              <PacMan size={26} dir="right" chomp />
            </div>
            <div className="hn-banner is-ok" aria-hidden="true">¡LISTO!</div>
          </>
        )}
        {g.status === 'lost' && (
          <>
            <div className="hn-chase" aria-hidden="true">
              <Ghost color="red" size={26} float />
              <Ghost color="pink" size={26} float />
              <Ghost color="cyan" size={26} float />
            </div>
            <div className="hn-banner is-bad" aria-hidden="true">¡TE PASASTE!</div>
          </>
        )}
      </div>

      <div className={'hn-msg is-' + g.msg.kind} role="status" aria-live="polite">
        <span className="hn-msg-icon" aria-hidden="true">{msgIcon}</span>
        <span key={g.msg.text} className={g.msg.kind === 'warn' || g.msg.kind === 'bad' ? 'anim-shake' : undefined}>
          {g.msg.text}
        </span>
      </div>

      {cfg.warnings.length > 0 && (
        <p className="hn-aviso" role="note">
          {cfg.warnings.join(' ')}
        </p>
      )}
    </div>
  )
}

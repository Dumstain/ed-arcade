/**
 * hash-sim — casilleros de paquetería (Día 3). Comportamiento exacto en schemas.ts (HashSimData).
 * mode 'insert': el alumno toca el casillero donde termina cada clave.
 * mode 'search': el alumno toca, EN ORDEN, cada clave que se compara (o NO ESTÁ). Cuenta COMPARACIONES.
 * Protecciones: misma equivocación en el mismo paso no cobra otra vida · tras avanzar se ignoran ~350 ms de
 * toques · onCheck(true) una sola vez · locked bloquea todo · showSolution muestra la respuesta.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ExerciseProps } from '../../engine/types'
import type { HashSimData } from '../schemas'
import { Fruit, Ghost, PacMan, PixelIcon, RichText, burst, floatText, sfx } from '../../ui'
import type { FruitKind } from '../../ui'
import { useAttemptFlash } from '../_shared/useAttemptFlash'
import { cssVar } from '../_shared/dom'
import { Calc } from './Calc'
import { Parcel } from './Parcel'
import { TableView } from './Table'
import type { BucketDeco, NodeDeco } from './Table'
import {
  buildTables,
  capFirst,
  describeHash,
  insertHint,
  keyStr,
  placementText,
  planSearch,
  plural,
  who,
} from './logic'
import type { Cfg, Placement } from './logic'

const LOCK_MS = 350 // tras avanzar de paso se ignoran los toques este tiempo
const PROBE_MS = 180 // cada salto de la prueba lineal
const FRUITS: FruitKind[] = ['cherry', 'strawberry', 'orange', 'apple', 'melon']

type Tone = 'info' | 'ok' | 'bad'
interface Msg {
  tone: Tone
  text: string
}

export interface GameProps extends ExerciseProps<HashSimData> {
  cfg: Cfg
}

export function Game({ exercise, onCheck, onStep, locked, showSolution, attempt, cfg }: GameProps) {
  const { mode, size, strategy, hash, showMath } = cfg
  const isInsert = mode === 'insert'
  const nKeys = cfg.keys.length
  const target = cfg.target
  const fruit = FRUITS[Math.min(Math.max(Number(exercise.day) || 1, 1), 5) - 1] ?? 'cherry'

  const built = useMemo(() => buildTables(cfg), [cfg])
  const plan = useMemo(
    () => (isInsert || target === undefined ? null : planSearch(built.final, target, size, strategy, hash)),
    [isInsert, target, built, size, strategy, hash],
  )
  const tMath = useMemo(() => (target === undefined ? null : describeHash(target, hash, size)), [target, hash, size])
  const wide = useMemo(() => {
    const all = [...cfg.keys, ...cfg.initial.flat()]
    if (target !== undefined) all.push(target)
    return all.some((k) => keyStr(k).length > 5)
  }, [cfg, target])

  // ───────── estado ─────────
  const [idx, setIdx] = useState(0) // insert: claves ya acomodadas
  const [k, setK] = useState(0) // search: comparaciones hechas
  const [declared, setDeclared] = useState(false)
  const [done, setDone] = useState(false)
  const [msg, setMsg] = useState<Msg | null>(null)
  const [wrongB, setWrongB] = useState<number | null>(null)
  const [wrongN, setWrongN] = useState<string | null>(null)
  const [anim, setAnim] = useState<{ p: Placement } | null>(null)
  const shaking = useAttemptFlash(attempt, 700)

  const rootRef = useRef<HTMLDivElement | null>(null)
  const idxRef = useRef(0)
  const kRef = useRef(0)
  const doneRef = useRef(false)
  const lockUntil = useRef(0)
  /** equivocaciones ya cobradas ("paso:toque"): repetir la misma no cuesta otra vida */
  const tried = useRef<Set<string>>(new Set())
  const flashTimer = useRef<number | null>(null)
  const timers = useRef<Set<number>>(new Set())
  const latest = useRef({ onCheck, onStep })
  useLayoutEffect(() => {
    latest.current = { onCheck, onStep }
  })

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id)
      fn()
    }, ms)
    timers.current.add(id)
    return id
  }, [])
  useEffect(() => {
    const all = timers.current
    return () => {
      all.forEach((id) => window.clearTimeout(id))
      all.clear()
      if (flashTimer.current !== null) window.clearTimeout(flashTimer.current)
    }
  }, [])

  // ───────── derivados ─────────
  const idxShown = showSolution ? nKeys : idx
  const tableShown = isInsert ? built.tables[Math.min(idxShown, built.tables.length - 1)] : built.final
  const cur: Placement | undefined = isInsert && !showSolution ? built.placements[idx] : undefined
  const interactive = !locked && !showSolution && !done
  const effK = showSolution && plan ? plan.probes.length : k
  const probeIndex = useMemo(() => {
    const m = new Map<string, number>()
    plan?.probes.forEach((pr, i) => m.set(`${pr.bucket}:${pr.pos}`, i))
    return m
  }, [plan])
  const solSet = useMemo(() => new Set(built.placements.map((p) => `${p.slot}:${p.pos}`)), [built])
  const solBuckets = useMemo(() => new Set(built.placements.map((p) => p.slot)), [built])
  /** search: los paquetes que "se acomodan solos" al abrir el ejercicio */
  const intro = useMemo(() => {
    const m = new Map<string, number>()
    if (isInsert) return m
    const step = Math.max(50, Math.min(150, Math.floor(900 / Math.max(1, built.placements.length))))
    built.placements.forEach((p, i) => m.set(`${p.slot}:${p.pos}`, i * step))
    return m
  }, [isInsert, built])

  // ───────── efectos locales (partículas / texto flotante) ─────────
  const fxAt = (selector: string, text: string, colorVar: string, count = 10) => {
    try {
      const el = rootRef.current?.querySelector<HTMLElement>(selector)
      if (!el) return
      const r = el.getBoundingClientRect()
      const color = cssVar(colorVar)
      const x = r.left + r.width / 2
      burst(x, r.top + r.height / 2, { color, count })
      floatText(x, r.top, text, { color })
    } catch {
      /* los efectos son opcionales: nunca deben romper el ejercicio */
    }
  }

  const canAct = () => interactive && !doneRef.current && performance.now() >= lockUntil.current

  const flashWrong = (b: number | null, n: string | null) => {
    setWrongB(b)
    setWrongN(n)
    if (flashTimer.current !== null) window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => {
      flashTimer.current = null
      setWrongB(null)
      setWrongN(null)
    }, 750)
  }

  /** Equivocación: pista + destello; solo cobra vida la primera vez que se repite ese toque en ese paso. */
  const wrong = (sig: string, text: string, answer: unknown, b: number | null, n: string | null = null) => {
    const repeated = tried.current.has(sig)
    tried.current.add(sig)
    flashWrong(b, n)
    setMsg({ tone: 'bad', text })
    if (repeated) {
      sfx.wrong()
      return
    }
    latest.current.onCheck(false, answer)
  }

  // ───────── INSERT: tocar el casillero ─────────
  const insertTap = (b: number) => {
    const step = idxRef.current
    const p = built.placements[step]
    if (!p) return
    if (b !== p.slot) {
      const hint = insertHint(built.tables[step], p, b, cfg)
      wrong(`${step}:b${b}`, hint, { tapped: b }, b)
      return
    }
    // acierto
    const next = step + 1
    idxRef.current = next
    setIdx(next)
    setAnim({ p })
    setWrongB(null)
    setWrongN(null)
    const extra = Math.min(900, Math.max(0, p.probes.length - 1) * PROBE_MS)
    lockUntil.current = performance.now() + LOCK_MS + extra
    const follow = next < nKeys ? ` Sigue con ${who(cfg.keys[next], hash)}.` : ' ¡Era el **último** paquete!'
    setMsg({ tone: 'ok', text: placementText(p, cfg) + follow })
    fxAt(`[data-hsh-b="${p.slot}"]`, p.collided ? '¡COLISIÓN!' : `#${p.slot}`, p.collided ? '--ghost-orange' : '--ok', p.collided ? 14 : 10)
    if (next >= nKeys) {
      doneRef.current = true
      setDone(true)
      later(() => latest.current.onCheck(true, { table: built.final }), 800 + extra)
    } else {
      latest.current.onStep?.()
    }
  }

  // ───────── SEARCH ─────────
  /** Pista de dónde empieza la búsqueda: la cuenta de h(target). */
  const homeHint = (): string => {
    if (!plan || !tMath) return 'Revisa la cuenta de la calculadora.'
    return strategy === 'chaining'
      ? `Pista: **${tMath.full}** → busca en el casillero **${plan.home}**.`
      : `Pista: **${tMath.full}** → empieza en el casillero **${plan.home}**.`
  }
  /** Pista cuando el casillero es el correcto pero el orden no. */
  const orderHint = (): string => {
    if (!plan) return ''
    const step = kRef.current
    if (strategy === 'chaining') return `¡En orden! Toca primero la clave número **${step + 1}** de la fila.`
    if (step === 0) return homeHint()
    if (step >= plan.probes.length) return 'Ya no hay más casilleros ocupados en el camino. ¿Qué toca ahora?'
    const prev = plan.probes[step - 1]
    return `¡En orden! Después del casillero ${prev.bucket} sigue el **${(prev.bucket + 1) % size}**.`
  }

  const searchTapKey = (b: number, pos: number) => {
    if (!plan || target === undefined) return
    const step = kRef.current
    const nk = `${b}:${pos}`
    const seen = probeIndex.get(nk)
    if (seen !== undefined && seen < step) {
      setMsg({ tone: 'info', text: 'Esa clave ya la comparaste (el comecocos se la comió).' })
      return
    }
    const exp = plan.probes[step]
    if (!exp || exp.bucket !== b || exp.pos !== pos) {
      // encadenamiento: casillero equivocado → cuenta; casillero bueno pero orden malo → orden.
      const text = strategy === 'chaining' && b !== plan.home ? homeHint() : orderHint()
      wrong(`${step}:n${nk}`, text, { tapped: nk }, null, nk)
      return
    }
    // acierto
    const nk1 = step + 1
    kRef.current = nk1
    setK(nk1)
    setWrongB(null)
    setWrongN(null)
    lockUntil.current = performance.now() + LOCK_MS
    const sel = `[data-hsh-n="${nk}"]`
    if (exp.hit) {
      doneRef.current = true
      setDone(true)
      setMsg({
        tone: 'ok',
        text: `¡**LO TENGO**! ${capFirst(who(target, hash))} estaba en el casillero **${b}**: ${plural(nk1, 'comparación', 'comparaciones')}.`,
      })
      fxAt(sel, '¡LO TENGO!', '--ok', 18)
      later(() => latest.current.onCheck(true, { comparisons: nk1, found: true, bucket: b }), 800)
      return
    }
    let tail: string
    if (strategy === 'chaining') {
      tail = nk1 < plan.probes.length ? ' Toca la **siguiente** clave de la fila.' : ' ¿Queda alguna más en esta fila?'
    } else {
      tail =
        nk1 < plan.probes.length || plan.emptyAt !== null
          ? ` Pasa al **siguiente** casillero (el ${(b + 1) % size}).`
          : ' Ya revisaste **todos** los casilleros.'
    }
    setMsg({ tone: 'info', text: `Comparación ${nk1}: **${keyStr(exp.key)}** no es ${who(target, hash)}.${tail}` })
    fxAt(sel, '+1', '--pac')
    latest.current.onStep?.()
  }

  /** Tocar un casillero en modo search (encadenamiento: el casillero; lineal: un casillero vacío). */
  const searchTapBucket = (b: number) => {
    if (!plan) return
    const step = kRef.current
    if (strategy === 'chaining') {
      if (b === plan.home) {
        // es el casillero correcto: confirmarlo no cuesta vida (equivocarse de casillero sí)
        setMsg({
          tone: 'info',
          text:
            plan.probes.length === 0
              ? 'Ese es el casillero correcto y su fila está **vacía**: no hay nada que comparar.'
              : 'Ese es el casillero correcto: compara las claves de su fila, de **izquierda a derecha**.',
        })
        return
      }
      wrong(`${step}:b${b}`, homeHint(), { tapped: b }, b)
      return
    }
    // prueba lineal: aquí solo llegan casilleros vacíos
    if (b === plan.emptyAt && step === plan.probes.length) {
      setMsg({
        tone: 'info',
        text:
          step === 0
            ? `El casillero ${b} está **vacío**: no hay nada que comparar.`
            : `El casillero ${b} está **vacío**: ya no hay nada más que revisar.`,
      })
      return
    }
    wrong(`${step}:b${b}`, step === 0 ? homeHint() : orderHint(), { tapped: b }, b)
  }

  const declareNotFound = () => {
    if (isInsert || !plan || !canAct()) return
    sfx.click()
    const step = kRef.current
    if (!plan.found && step >= plan.probes.length) {
      doneRef.current = true
      setDone(true)
      setDeclared(true)
      setMsg({ tone: 'ok', text: notFoundText() })
      fxAt('.hsh-nofound', 'NO ESTÁ', '--ok', 14)
      later(() => latest.current.onCheck(true, { comparisons: step, found: false }), 800)
    } else {
      wrong(`${step}:no-esta`, 'Todavía no: aún hay claves por comparar en el camino de la búsqueda.', 'no-esta', null)
    }
  }

  const notFoundText = (): string => {
    if (!plan || target === undefined) return ''
    const n = plan.probes.length
    const cmp = plural(n, 'comparación', 'comparaciones')
    if (strategy === 'chaining') {
      return n === 0
        ? `La fila del casillero **${plan.home}** está vacía: ${who(target, hash)} **no está** (**0 comparaciones**).`
        : `Se acabó la fila del casillero **${plan.home}**: ${who(target, hash)} **no está** (${cmp}).`
    }
    return plan.emptyAt !== null
      ? `El casillero **${plan.emptyAt}** está vacío: si ${who(target, hash)} estuviera, ya habría aparecido. **No está** (${cmp}).`
      : `Revisaste **todos** los casilleros: ${who(target, hash)} **no está** (${cmp}).`
  }

  const onBucket = (b: number) => {
    if (!canAct()) return
    sfx.click()
    if (isInsert) insertTap(b)
    else searchTapBucket(b)
  }
  const onKey = (b: number, pos: number) => {
    if (!canAct()) return
    sfx.click()
    searchTapKey(b, pos)
  }

  // ───────── decoraciones de la tabla ─────────
  const nodeDeco = (b: number, pos: number): NodeDeco | undefined => {
    const key = `${b}:${pos}`
    if (isInsert) {
      if (showSolution) return solSet.has(key) ? { solution: true } : undefined
      if (anim && anim.p.slot === b && anim.p.pos === pos) {
        return { placed: true, delay: strategy === 'linear' ? (anim.p.probes.length - 1) * PROBE_MS : 0 }
      }
      return undefined
    }
    const d: NodeDeco = {}
    const iDelay = intro.get(key)
    if (iDelay !== undefined && !showSolution) {
      d.intro = true
      d.delay = iDelay
    }
    const pi = probeIndex.get(key)
    if (plan && pi !== undefined) {
      const probe = plan.probes[pi]
      if (showSolution) {
        d.solution = true
        d.order = pi + 1
        d.eaten = true
        if (probe.hit) d.found = true
      } else if (pi < k) {
        d.order = pi + 1
        d.eaten = true
        if (pi === k - 1) {
          if (probe.hit) d.found = true
          else if (!done) d.pac = true
        }
      }
    }
    if (wrongN === key) d.wrong = true
    return d
  }

  const bucketDeco = (b: number): BucketDeco | undefined => {
    const d: BucketDeco = {}
    if (wrongB === b) d.wrong = true
    if (isInsert) {
      if (showSolution) {
        if (solBuckets.has(b)) d.solution = true
      } else if (anim) {
        const p = anim.p
        if (b === p.home) {
          d.home = true
          if (p.collided) d.collision = true
        }
        if (strategy === 'linear') {
          const i = p.probes.indexOf(b)
          if (i > 0 && b !== p.slot) {
            d.probing = true
            d.delay = i * PROBE_MS
          }
        }
      }
    } else if (plan && b === plan.home && (showSolution || k > 0 || declared)) {
      d.home = true
    }
    return d
  }

  // ───────── textos ─────────
  const keyNow = isInsert ? (cur ? cur.key : null) : (target ?? null)
  const idle = isInsert
    ? cur
      ? showMath
        ? `Toca el casillero que da la calculadora para ${who(cur.key, hash)}.`
        : `Haz la cuenta y toca el casillero donde va ${who(cur.key, hash)}.`
      : '¡Todos los paquetes quedaron acomodados!'
    : target !== undefined
      ? strategy === 'chaining'
        ? `Busca ${who(target, hash)}: toca, **en orden**, cada clave que se compara en su casillero.`
        : `Busca ${who(target, hash)}: toca, **en orden**, cada casillero que se revisa.`
      : ''
  const solutionText = (): string => {
    if (isInsert) return 'Así debía quedar la tabla. Abajo está la cuenta de cada paquete.'
    if (!plan || target === undefined || !tMath) return ''
    const n = plan.probes.length
    if (plan.found) {
      return `**${tMath.full}**. Se compara con ${plan.probes.map((p) => keyStr(p.key)).join(', ')}: lo encuentra en el casillero **${plan.probes[n - 1].bucket}** con ${plural(n, 'comparación', 'comparaciones')}.`
    }
    return `**${tMath.full}**. ` + notFoundText()
  }
  const status: Msg = showSolution ? { tone: 'info', text: solutionText() } : (msg ?? { tone: 'info', text: idle })

  const rule = isInsert
    ? strategy === 'chaining'
      ? 'La tabla hash son **casilleros de paquetería**: el número sale de una **cuenta** con la clave. Si el casillero ya tiene paquetes, el nuevo se **cuelga al final de la fila**.'
      : 'La tabla hash son **casilleros de paquetería**: el número sale de una **cuenta** con la clave. Si está **ocupado**, se **prueba el siguiente** (y después del último se vuelve al **0**).'
    : strategy === 'chaining'
      ? 'Para buscar haces **la misma cuenta**: vas directo a **un solo casillero** y comparas solo las claves de **su fila**.'
      : 'Para buscar haces **la misma cuenta** y avanzas casillero por casillero; si llegas a uno **vacío**, el paquete **no está**.'

  const needsDeclare = interactive && !isInsert && !!plan && !plan.found && k > 0 && k >= plan.probes.length
  const keyText = keyNow === null ? '' : keyStr(keyNow)
  const progress = Math.min(idxShown + (idxShown < nKeys ? 1 : 0), nKeys)

  return (
    <div ref={rootRef} className={`hsh hsh--${strategy} hsh--${mode}${shaking ? ' anim-shake' : ''}`}>
      <div className="hsh-top">
        <div className={`hsh-card${done ? ' is-won' : ''}`}>
          {isInsert ? (
            cur ? (
              <Parcel size={34} className="hsh-card-ico" />
            ) : (
              <PixelIcon name={showSolution ? 'bulb' : 'check'} size={32} />
            )
          ) : (
            <Fruit kind={fruit} size={32} />
          )}
          <div className="hsh-card-col">
            <span className="hsh-tag">{isInsert ? (cur ? 'PAQUETE ACTUAL' : showSolution ? 'RESPUESTA' : 'TABLA LISTA') : 'BUSCANDO'}</span>
            {keyNow !== null && (
              <span key={keyText} className={`hsh-key${keyText.length > 6 ? ' is-long' : keyText.length > 4 ? ' is-md' : ''}`}>
                {keyText}
              </span>
            )}
          </div>
        </div>

        {isInsert ? (
          <div className="hsh-meter">
            <span className="hsh-tag">PAQUETE</span>
            <span className="hsh-meter-val" aria-label={`Paquete ${progress} de ${nKeys}`}>
              {progress}/{nKeys}
            </span>
          </div>
        ) : (
          <div className="hsh-meter">
            <span className="hsh-tag">COMPARACIONES</span>
            <span key={effK} className="hsh-meter-val is-big" aria-live="polite" aria-label={`Comparaciones: ${effK}`}>
              {effK}
            </span>
          </div>
        )}

        <Calc hash={hash} size={size} keyVal={keyNow} showMath={showMath} />
      </div>

      {isInsert && (
        <ol className="hsh-queue" aria-label="Paquetes por acomodar, en orden">
          {cfg.keys.map((key, i) => {
            const state = i < idxShown ? 'done' : i === idxShown ? 'current' : 'next'
            return (
              <li
                key={i}
                className={`hsh-q is-${state}`}
                aria-current={state === 'current' ? 'step' : undefined}
                aria-label={`${keyStr(key)}${state === 'done' ? ', ya acomodado' : ''}`}
              >
                {state === 'current' && <PacMan key={idx} size={26} chomp className="hsh-q-pac" />}
                <span>{keyStr(key)}</span>
              </li>
            )
          })}
        </ol>
      )}

      <section className="hsh-board" aria-label="Tabla hash">
        <TableView
          strategy={strategy}
          table={tableShown}
          disabled={!interactive}
          onBucket={onBucket}
          onKey={isInsert ? undefined : onKey}
          nodeDeco={nodeDeco}
          bucketDeco={bucketDeco}
          wide={wide}
        />
      </section>

      <p className={`hsh-status is-${status.tone}`} role="status" aria-live="polite">
        <span className="hsh-status-ico" aria-hidden="true">
          {status.tone === 'bad' ? (
            <Ghost color="red" size={30} float />
          ) : status.tone === 'ok' ? (
            <PacMan size={30} chomp />
          ) : null}
        </span>
        <span className="hsh-status-txt">
          <RichText text={status.text} />
        </span>
      </p>

      {!isInsert && (
        <button
          type="button"
          className={`px-btn hsh-nofound${needsDeclare ? ' px-btn--primary hsh-pulse' : ''}`}
          disabled={!interactive}
          onClick={declareNotFound}
        >
          <PixelIcon name="no" size={16} /> NO ESTÁ
        </button>
      )}

      <p className="hsh-rule">
        <RichText text={rule} />
      </p>

      {showSolution && isInsert && (
        <section className="px-panel hsh-sol" aria-label="Respuesta correcta">
          <h3 className="hsh-h">RESPUESTA · ASÍ SE ACOMODAN</h3>
          <ol className="hsh-sol-list">
            {built.placements.map((p, i) => (
              <li key={i}>
                <RichText text={placementText(p, cfg)} />
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}

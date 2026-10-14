/**
 * mode 'relink': el alumno arma el programa tocando asignaciones del banco EN ORDEN. Cada una se ejecuta
 * en el tablero. NullPointerException o un vagón perdido (el fantasma se lo come) → onCheck(false) y la
 * línea se deshace. COMPROBAR → onCheck(true) si desde head la lista da expected (doble: ant consistente).
 */
import { useMemo, useRef, useState } from 'react'
import type { ExerciseProps } from '../../engine/types'
import type { ListSimData } from '../schemas'
import { Ghost, PacMan, PixelIcon, RichText, sfx } from '../../ui'
import { EatStrip } from '../_shared/EatStrip'
import { seededShuffle } from '../_shared/shuffle'
import { useAttemptFlash } from '../_shared/useAttemptFlash'
import { Board } from './Board'
import { Goal, Note, fxAt, useTimers, type NoteState, type Tone } from './parts'
import { applySeq, chainText, checkRelink, exec, lostNodes, show, stateKey, type CheckResult, type Cfg, type LState } from './logic'

type Props = ExerciseProps<ListSimData> & { cfg: Cfg; seed: string }

interface Step {
  idx: number
  state: LState
  changed: string
}
interface Fail {
  idx: number
  kind: 'npe' | 'lost' | 'undeclared'
  /** estado "malo" que se muestra mientras el fantasma se come los vagones */
  state?: LState
  lost?: string[]
  changed?: string
  k: number
}

const REPEAT = ' Ese error ya te costó una vida: **no pierdes otra**.'
const GHOST_MS = 1550
const NPE_MS = 1500

export function Relink({ cfg, seed, onCheck, locked, showSolution, attempt }: Props) {
  const [hist, setHist] = useState<Step[]>([])
  const [fail, setFail] = useState<Fail | null>(null)
  const [note, setNote] = useState<NoteState | null>(null)
  const [solved, setSolved] = useState(false)
  const [tick, setTick] = useState(0)
  const later = useTimers()
  const shaking = useAttemptFlash(attempt)

  /** clics ignorados hasta este instante (doble clic, animaciones) */
  const busyUntil = useRef(0)
  const doneRef = useRef(false)
  /** firmas de errores ya cobrados (estado + línea / estado comprobado) */
  const tried = useRef(new Set<string>())
  const seq = useRef(0)

  const cur = hist.length ? hist[hist.length - 1].state : cfg.initial
  const used = useMemo(() => new Set(hist.map((h) => h.idx)), [hist])
  const atMax = hist.length >= cfg.maxSteps
  const canPlay = !locked && !solved && !showSolution
  const order = useMemo(() => seededShuffle(cfg.bank.map((_, i) => i), `${seed}:bank`, true), [cfg, seed])
  const solState = useMemo(() => (cfg.solution ? applySeq(cfg, cfg.solution) : null), [cfg])

  const val = (id: string | null) => (id ? show(cfg.values[id]) : 'null')
  const say = (tone: Tone, title: string, sub?: string) => {
    seq.current += 1
    setNote({ tone, title, sub, k: seq.current })
  }
  /** cobra una vida solo la primera vez que aparece esa firma */
  const punish = (sig: string): boolean => {
    if (tried.current.has(sig)) {
      sfx.wrong()
      return false
    }
    tried.current.add(sig)
    onCheck(false)
    return true
  }

  const describeChange = (changed: string, s: LState): string => {
    if (changed.startsWith('var:')) {
      const v = changed.slice(4)
      return `**${v}** ahora apunta a **${val(s.vars[v])}**.`
    }
    const [id, f] = changed.split('.') as [string, 'sig' | 'ant']
    return `El **${f}** del vagón **${val(id)}** ahora apunta a **${val(s.ptr[id][f])}**.`
  }

  const explain = (r: Exclude<CheckResult, { ok: true }>): string => {
    const w = r.walk
    const last = w.ids.length ? val(w.ids[w.ids.length - 1]) : ''
    if (r.reason === 'shape') {
      if (cfg.kind === 'circular') {
        if (w.end === 'null') return w.ids.length ? `Todavía no es circular: el último vagón (**${last}**) apunta a **null** y debe regresar al **primero**.` : 'La lista quedó vacía.'
        return `El último vagón regresa a **${val(w.loopTo)}**, no al **primero**.`
      }
      return `Hay un **ciclo**: desde **${cfg.head}** nunca se llega a **null**.`
    }
    if (r.reason === 'values') {
      const tail = cfg.kind === 'circular' ? '(regresa)' : 'null'
      return `Desde **${cfg.head}** se lee: ${chainText(r.got, tail)}. Aún no es lo que pide la operación.`
    }
    if (r.reason === 'tail') {
      return `El tren ya va bien, pero **${r.name}** debe señalar al **último** vagón (**${val(r.want)}**) y señala a ${val(r.at)}.`
    }
    return `Por **sig** ya va bien, pero el **ant** de **${val(r.at)}** debe apuntar a **${val(r.want)}**.`
  }

  // ───────── acciones ─────────
  const tapBank = (i: number, el: HTMLElement) => {
    if (!canPlay || doneRef.current || used.has(i) || atMax) return
    const now = performance.now()
    if (now < busyUntil.current) return
    sfx.click()
    const item = cfg.bank[i]
    const r = exec(cur, item.stmt)
    const sig = `x:${stateKey(cur, cfg.ids)}#${i}`
    const first = !tried.current.has(sig)
    const k = ++seq.current
    if (!r.ok) {
      busyUntil.current = now + 700
      setFail({ idx: i, kind: r.kind, k })
      later(() => setFail((f) => (f && f.k === k ? null : f)), NPE_MS)
      if (r.kind === 'npe') {
        say('bad', '¡NullPointerException!', `**${r.nullExpr}** vale **null**: ahí no hay vagón, así que **${r.target}** no existe. La línea no se ejecuta.` + (first ? '' : REPEAT))
      } else {
        say('bad', '¡ESA VARIABLE NO EXISTE!', `**${r.name}** todavía no se declara. La línea no se ejecuta.` + (first ? '' : REPEAT))
      }
      fxAt(el, '¡NULL!', '--bad')
      punish(sig)
      return
    }
    const lost = lostNodes(r.state, cfg.ids, cfg.hasAnt)
    if (lost.length) {
      busyUntil.current = now + GHOST_MS + 50
      setFail({ idx: i, kind: 'lost', state: r.state, lost, changed: r.changed, k })
      setTick((t) => t + 1)
      later(() => {
        setFail((f) => (f && f.k === k ? null : f))
        setTick((t) => t + 1)
      }, GHOST_MS)
      const names = lost.map((id) => `**${val(id)}**`).join(', ')
      say(
        'bad',
        lost.length === 1 ? '¡SE PERDIÓ UN VAGÓN!' : `¡SE PERDIERON ${lost.length} VAGONES!`,
        `Ya nadie apunta a ${names}: el fantasma se ${lost.length === 1 ? 'lo' : 'los'} comió. La línea se deshace.` + (first ? '' : REPEAT),
      )
      punish(sig)
      return
    }
    busyUntil.current = now + 350
    sfx.combo(hist.length)
    fxAt(el, '', '--ok')
    setFail(null)
    setHist((h) => [...h, { idx: i, state: r.state, changed: r.changed }])
    setTick((t) => t + 1)
    say('info', `LÍNEA ${hist.length + 1} EJECUTADA`, describeChange(r.changed, r.state))
  }

  const undo = () => {
    if (!canPlay || hist.length === 0) return
    const now = performance.now()
    if (now < busyUntil.current) return
    busyUntil.current = now + 250
    sfx.click()
    setHist((h) => h.slice(0, -1))
    setFail(null)
    setNote(null)
    setTick((t) => t + 1)
  }

  const reset = () => {
    if (!canPlay) return
    const now = performance.now()
    if (now < busyUntil.current && !fail) return
    busyUntil.current = now + 250
    sfx.click()
    seq.current += 1 // invalida el temporizador del fallo en curso
    setHist([])
    setFail(null)
    setNote(null)
    setTick((t) => t + 1)
  }

  const check = (el: HTMLElement) => {
    if (!canPlay || doneRef.current || hist.length === 0 || fail) return
    const now = performance.now()
    if (now < busyUntil.current) return
    busyUntil.current = now + 400
    sfx.click()
    const res = checkRelink(cfg, cur)
    if (res.ok) {
      doneRef.current = true
      setSolved(true)
      setTick((t) => t + 1)
      const tail = cfg.kind === 'circular' ? '(y regresa al primero)' : 'null'
      say('ok', '¡TREN ARMADO!', `Desde **${cfg.head}**: ${chainText(cfg.expected, tail)}.`)
      fxAt(el, '¡BIEN!', '--ok')
      onCheck(true, hist.map((h) => cfg.bank[h.idx].text))
      return
    }
    const sig = `c:${stateKey(cur, cfg.ids)}`
    const first = !tried.current.has(sig)
    say('bad', first ? '¡TODAVÍA NO!' : '¡ES LA MISMA LISTA!', explain(res) + (first ? '' : REPEAT))
    punish(sig)
  }

  // ───────── qué se dibuja ─────────
  const showSol = showSolution && !solved
  const lostView = !showSol && fail?.kind === 'lost' && fail.state ? fail.state : null
  const view: LState = showSol && solState ? solState : (lostView ?? cur)
  const headNode = Object.prototype.hasOwnProperty.call(view.vars, cfg.head) ? view.vars[cfg.head] : null
  const fresh = showSol ? null : fail?.kind === 'lost' ? (fail.changed ?? null) : hist.length ? hist[hist.length - 1].changed : null
  let focus: string | null = null
  if (fail?.kind === 'lost' && fail.lost?.length) focus = fail.lost[0]
  else if (fresh) focus = fresh.startsWith('var:') ? view.vars[fresh.slice(4)] ?? null : fresh.split('.')[0]

  const lines: string[] = showSol && cfg.solution ? cfg.solution.map((i) => cfg.bank[i].text) : hist.map((h) => cfg.bank[h.idx].text)
  const idle = 'Toca las asignaciones **en orden**: cada una se ejecuta en el tablero. Si un vagón se queda sin flecha, **el fantasma se lo come**.'

  return (
    <div className={'ls-root' + (shaking ? ' is-shaking' : '') + (solved ? ' is-solved' : '')} data-mode="relink" data-kind={cfg.kind}>
      <section className="ls-task" aria-label="Operación">
        {cfg.op && (
          <p className="ls-op">
            <PixelIcon name="clipboard" size={22} />
            <span>
              <RichText text={cfg.op} />
            </span>
          </p>
        )}
        <Goal cfg={cfg} />
      </section>

      <Board
        cfg={cfg}
        state={view}
        headNode={headNode}
        eaten={lostView ? fail?.lost : undefined}
        fresh={fresh}
        tick={tick}
        win={solved}
        focus={focus}
      />
      {solved && <EatStrip pellets={Math.max(4, cfg.expected.length * 3)} />}

      {showSol && (
        <p className="ls-solnote">
          {solState ? 'RESPUESTA: ASÍ QUEDA EL TREN CON ESTAS LÍNEAS' : 'RESPUESTA: ASÍ DEBE QUEDAR (VER META)'}
        </p>
      )}

      <Note note={note} idle={showSol ? 'Revisa el programa correcto y compáralo con el tuyo.' : idle} />

      <div className="ls-cols">
        {!showSol && (
          <section className="px-panel ls-panel ls-bankp" aria-label="Asignaciones disponibles">
            <h3 className="ls-h">ASIGNACIONES · TOCA EN ORDEN</h3>
            <div className="ls-bank">
              {order.map((i) => {
                const u = used.has(i)
                const text = cfg.bank[i].text
                return (
                  <button
                    key={i}
                    type="button"
                    className={'px-chip ls-chip' + (u ? ' is-used' : '') + (fail && fail.idx === i ? ' is-wrong' : '')}
                    disabled={!canPlay || u || atMax}
                    aria-label={`Ejecutar ${text}${u ? ' (ya está en tu programa)' : ''}`}
                    onClick={(e) => tapBank(i, e.currentTarget)}
                  >
                    <code>{text}</code>
                  </button>
                )
              })}
            </div>
            {atMax && canPlay && (
              <p className="ls-sub">
                <RichText text={`Ya usaste **${cfg.maxSteps}** líneas (el máximo): comprueba, deshaz o reinicia.`} />
              </p>
            )}
            <div className="ls-btns">
              <button type="button" className="px-btn" disabled={!canPlay || hist.length === 0} onClick={undo}>
                <PixelIcon name="undo" size={16} /> DESHACER
              </button>
              <button type="button" className="px-btn px-btn--ghost" disabled={!canPlay || (hist.length === 0 && !fail)} onClick={reset}>
                <PixelIcon name="replay" size={16} /> REINICIAR
              </button>
            </div>
            <button
              type="button"
              className="px-btn px-btn--primary px-btn--block"
              disabled={!canPlay || hist.length === 0 || !!fail}
              onClick={(e) => check(e.currentTarget)}
            >
              COMPROBAR
            </button>
          </section>
        )}

        <section className={'px-panel ls-panel ls-prog' + (showSol ? ' is-solution' : '')} aria-label="Programa">
          <header className="ls-head">
            <span className="ls-h">{showSol ? 'PROGRAMA CORRECTO' : 'TU PROGRAMA'}</span>
            {!showSol && (
              <span className="ls-count">
                {hist.length}/{cfg.maxSteps}
              </span>
            )}
          </header>
          <ol className="ls-lines">
            {lines.map((t, i) => (
              <li key={`${i}:${t}`} className={'ls-line is-done' + (showSol ? ' is-ok' : '')}>
                <span className="ls-ln" aria-hidden="true">
                  {i + 1}
                </span>
                <code className="ls-code">{t}</code>
              </li>
            ))}
            {fail && !showSol && (
              <li key={`f${fail.k}`} className="ls-line is-fail" aria-label={`Línea fallida: ${cfg.bank[fail.idx].text}`}>
                <span className="ls-ln" aria-hidden="true">
                  {lines.length + 1}
                </span>
                <code className="ls-code">{cfg.bank[fail.idx].text}</code>
                <span className="ls-failtag" aria-hidden="true">
                  {fail.kind === 'lost' ? <Ghost color="red" size={22} /> : <PixelIcon name="boom" size={22} />}
                </span>
              </li>
            )}
            {canPlay && !fail && !atMax && (
              <li className="ls-line is-next" aria-hidden="true">
                <span className="ls-ln">
                  <PacMan size={20} chomp />
                </span>
                <span className="ls-cursor">_</span>
              </li>
            )}
            {lines.length === 0 && !fail && !canPlay && !showSol && <li className="ls-line is-empty">(sin líneas)</li>}
          </ol>
        </section>
      </div>
    </div>
  )
}

export default Relink

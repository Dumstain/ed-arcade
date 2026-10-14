/**
 * mode 'traverse': el alumno toca los vagones en el orden en que los visita un recorrido desde `start`
 * siguiendo `dir` (sig / ant) y al final toca "null" (circular: el vagón inicial otra vez).
 * Acierto → onStep(); error → onCheck(false) (repetir el mismo error no cobra otra vida); fin → onCheck(true).
 */
import { useRef, useState } from 'react'
import type { ExerciseProps } from '../../engine/types'
import type { ListSimData } from '../schemas'
import { RichText, sfx } from '../../ui'
import { EatStrip } from '../_shared/EatStrip'
import { useAttemptFlash } from '../_shared/useAttemptFlash'
import { Board, type SlotKey } from './Board'
import { NULL_L, NULL_R } from './layout'
import { Note, fxAt, useTimers, type NoteState, type Tone } from './parts'
import { show, type Cfg } from './logic'

type Props = ExerciseProps<ListSimData> & { cfg: Cfg }

const REPEAT = ' Ese error ya te costó una vida: **no pierdes otra**.'

export function Traverse({ cfg, onCheck, onStep, locked, showSolution, attempt }: Props) {
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)
  const [note, setNote] = useState<NoteState | null>(null)
  const [flash, setFlash] = useState<{ key: SlotKey; tone: 'bad' | 'ok' | 'warn'; n: number } | null>(null)
  const [tick, setTick] = useState(0)
  const later = useTimers()
  const shaking = useAttemptFlash(attempt)

  const stepRef = useRef(0)
  const doneRef = useRef(false)
  const tried = useRef(new Set<string>())
  const advancedAt = useRef(0)
  const seq = useRef(0)

  const total = cfg.path.length
  const finalKey: SlotKey = cfg.endsAt === 'start' ? (cfg.startNode as string) : cfg.dir === 'sig' ? NULL_R : NULL_L
  const canPlay = !locked && !done && !showSolution
  const val = (id: string | null) => (id ? show(cfg.values[id]) : 'null')
  const startIsVar = Object.prototype.hasOwnProperty.call(cfg.initial.vars, cfg.startLabel)

  const say = (tone: Tone, title: string, sub?: string) => {
    seq.current += 1
    setNote({ tone, title, sub, k: seq.current })
  }
  const flashAt = (key: SlotKey, tone: 'bad' | 'ok' | 'warn') => {
    seq.current += 1
    const n = seq.current
    setFlash({ key, tone, n })
    later(() => setFlash((f) => (f && f.n === n ? null : f)), 900)
  }

  const tap = (key: SlotKey, el: HTMLElement) => {
    if (!canPlay || doneRef.current) return
    const now = performance.now()
    if (now - advancedAt.current < 350) return
    sfx.click()
    const s = stepRef.current
    const expect: SlotKey = s < total ? cfg.path[s] : finalKey
    const isNull = key === NULL_L || key === NULL_R

    if (key === expect) {
      advancedAt.current = now
      flashAt(key, 'ok')
      setTick((t) => t + 1)
      if (s < total) {
        stepRef.current = s + 1
        setStep(s + 1)
        fxAt(el, String(s + 1), '--pac')
        say('ok', '¡WAKA!', s + 1 < total || cfg.endsAt === 'null' ? `Visitaste el **${val(key)}**. Sigue la flecha **${cfg.dir}**.` : `Visitaste el **${val(key)}**. ¿A dónde lleva su **sig**?`)
        onStep?.()
      } else {
        doneRef.current = true
        setDone(true)
        fxAt(el, 'FIN', '--ok')
        say(
          'ok',
          '¡RECORRIDO COMPLETO!',
          cfg.endsAt === 'null'
            ? `Llegaste a **null**: se acabó la lista (${total} ${total === 1 ? 'vagón' : 'vagones'}).`
            : `Diste **una vuelta completa** y regresaste al **${val(cfg.startNode)}**.`,
        )
        onCheck(true, cfg.path.map((id) => cfg.values[id]))
      }
      return
    }

    // tocar un vagón ya visitado no cuesta (salvo terminar la vuelta antes de tiempo en la circular)
    const vi = isNull ? -1 : cfg.path.indexOf(key)
    const premature = cfg.endsAt === 'start' && key === cfg.startNode && s > 1 && s < total
    if (vi >= 0 && vi < s && !premature) {
      flashAt(key, 'warn')
      say('warn', 'YA PASASTE POR AHÍ', s > 0 ? `Sigue la flecha **${cfg.dir}** desde el **${val(cfg.path[s - 1])}**.` : 'Busca el vagón donde empieza el recorrido.')
      return
    }

    let msg: string
    const prev = s > 0 ? cfg.path[s - 1] : null
    if (s === 0) {
      msg = startIsVar ? `El recorrido empieza en el vagón al que apunta **${cfg.startLabel}**.` : `El recorrido empieza en el vagón **${val(cfg.startNode)}**.`
    } else if (premature) {
      const left = total - s
      msg = `Aún no termina la vuelta: ${left === 1 ? 'falta **1** vagón' : `faltan **${left}** vagones`}.`
    } else if (s < total && isNull) {
      msg = `Todavía no: el **${cfg.dir}** del **${val(prev)}** apunta a otro vagón, no a null.`
    } else if (s === total && cfg.endsAt === 'null') {
      msg = isNull
        ? `Ese null no es: vas por **${cfg.dir}**, y el ${cfg.dir} del **${val(prev)}** es el otro null.`
        : `El **${cfg.dir}** del **${val(prev)}** ya no lleva a ningún vagón: apunta a **null**.`
    } else if (s === total && cfg.endsAt === 'start') {
      msg = isNull ? 'En la circular nunca llegas a null.' : `El **sig** del **${val(prev)}** regresa al vagón donde empezaste.`
    } else {
      msg = `Desde el **${val(prev)}**, la flecha **${cfg.dir}** lleva a otro vagón.`
    }
    const sig = `${s}:${key}`
    const first = !tried.current.has(sig)
    flashAt(key, 'bad')
    setTick((t) => t + 1)
    say('bad', '¡FANTASMA!', msg + (first ? '' : REPEAT))
    if (first) {
      tried.current.add(sig)
      onCheck(false, key)
    } else {
      sfx.wrong()
    }
  }

  // ───────── qué se dibuja ─────────
  const showAll = showSolution || done
  const visits: Record<string, number> = {}
  cfg.path.forEach((id, i) => {
    if (i < step || showSolution) visits[id] = i + 1
  })
  const pacAt: SlotKey | null = done ? finalKey : step > 0 ? cfg.path[step - 1] : null
  const pacDir = cfg.dir === 'ant' ? 'left' : 'right'
  const how =
    cfg.endsAt === 'start'
      ? 'Da **una vuelta**: termina tocando otra vez el vagón donde empezaste.'
      : `Al final toca **null**${cfg.dir === 'ant' ? ' (el de la izquierda)' : ''}.`
  const idle = `Toca los vagones en el orden del recorrido desde **${cfg.startLabel}** siguiendo **${cfg.dir}**${cfg.dir === 'ant' ? ' (hacia atrás)' : ''}. ${how}`
  const endText = cfg.endsAt === 'null' ? 'null' : val(cfg.startNode)

  return (
    <div className={'ls-root' + (shaking ? ' is-shaking' : '') + (done ? ' is-solved' : '')} data-mode="traverse" data-kind={cfg.kind}>
      <Board
        cfg={cfg}
        state={cfg.initial}
        headNode={cfg.layoutHead}
        buttons
        interactive={canPlay}
        onTap={tap}
        visits={visits}
        finalKey={showAll ? finalKey : null}
        pacAt={showSolution && !done ? null : pacAt}
        pacDir={pacDir}
        flash={flash}
        focus={flash?.key ?? pacAt ?? cfg.startNode}
        tick={tick}
      />
      {done && <EatStrip pellets={Math.max(4, total * 3)} />}
      {showSolution && !done && <p className="ls-solnote">RESPUESTA: EL NÚMERO DE CADA VAGÓN ES SU TURNO</p>}

      <Note note={note} idle={showSolution && !done ? 'Así se recorre la lista, vagón por vagón.' : idle} />

      <section className="px-panel ls-panel ls-trail" aria-label="Recorrido">
        <header className="ls-head">
          <span className="ls-h">RECORRIDO</span>
          <code className="ls-mini-code">p = p.{cfg.dir};</code>
        </header>
        <ol className="ls-trail-list">
          {cfg.path.map((id, i) => {
            const full = i < step || showSolution
            return (
              <li key={id} className={'ls-tr' + (full ? ' is-full' : '') + (i === step && canPlay ? ' is-now' : '')} aria-label={full ? `Paso ${i + 1}: ${val(id)}` : `Paso ${i + 1}: pendiente`}>
                {full ? val(id) : i + 1}
              </li>
            )
          })}
          <li
            className={'ls-tr is-end' + (showAll ? ' is-full' : '') + (step === total && canPlay ? ' is-now' : '')}
            aria-label={showAll ? `Final: ${endText}` : 'Final: pendiente'}
          >
            {showAll ? endText : cfg.endsAt === 'null' ? '?' : 'FIN'}
          </li>
        </ol>
        <p className="ls-sub">
          <RichText text={`Vagones visitados: **${Math.min(step, total)}** de **${total}**.`} />
        </p>
      </section>
    </div>
  )
}

export default Traverse

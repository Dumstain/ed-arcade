import { useCallback, useEffect, useRef, useState } from 'react'
import type { ExerciseProps } from '../../engine/types'
import type { RefCardsData } from '../schemas'
import { Ghost, PacMan, burst, floatText, sfx } from '../../ui'
import { Board, type BoardObj, type Sel } from './Board'

type View = 'steps' | 'final' | 'finished'
type Assign = Record<string, string | null | undefined>

/** Direcciones de mentiritas, estables: la 1.ª casa = #100, la 2.ª = #112… */
const addrOfIndex = (i: number) => 100 + 12 * i

function useShake(attempt: number) {
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

export function Game({ exercise, onCheck, onStep, locked, showSolution, attempt }: ExerciseProps<RefCardsData>) {
  const d = exercise.data
  const { vars, objects, steps } = d
  const fq = d.finalQuestion
  const nSteps = steps.length

  const [stepIdx, setStepIdx] = useState(0)
  const [solved, setSolved] = useState(false)
  const [view, setView] = useState<View>(nSteps > 0 ? 'steps' : 'final')
  const [assign, setAssign] = useState<Assign>({})
  const [sel, setSel] = useState<Sel | null>(null)
  const [wrongVars, setWrongVars] = useState<string[]>([])
  const [choice, setChoice] = useState<number | null>(null)
  const [elim, setElim] = useState<number[]>([])
  const shaking = useShake(attempt)
  const boardRef = useRef<HTMLDivElement>(null)
  const finishing = useRef(false)
  /** cuándo se cambió de paso: un doble clic en SIGUIENTE no debe caer en COMPROBAR del paso nuevo */
  const advancedAt = useRef(0)

  const colorOf = useCallback((v: string) => Math.max(0, vars.indexOf(v)), [vars])

  const inSteps = view === 'steps' && nSteps > 0
  const effStep = inSteps ? stepIdx : nSteps - 1
  const step = inSteps ? steps[stepIdx] : null
  const exp = step ? step.expect : null
  const isLast = stepIdx === nSteps - 1

  // ── qué se ve ──
  const declaredSet = new Set<string>()
  for (let i = 0; i <= effStep; i++) for (const k of Object.keys(steps[i].expect)) declaredSet.add(k)
  const declared = vars.filter((v) => declaredSet.has(v))

  const interactive = inSteps && !solved && !locked && !showSolution
  const shown: Assign = showSolution && exp && !solved ? { ...assign, ...exp } : assign

  const curKeys = exp ? Object.keys(exp) : []
  const unassigned = curKeys.filter((k) => assign[k] === undefined)
  const auto = interactive && !sel && unassigned.length > 0 ? unassigned[0] : undefined
  const eff: Sel | null = sel ?? (auto ? { k: 'card', v: auto } : null)
  const canCheck = interactive && unassigned.length === 0

  const appliedUpTo = inSteps ? (solved ? stepIdx : stepIdx - 1) : nSteps - 1
  const refd = new Set<string>()
  for (const t of Object.values(shown)) if (t) refd.add(t)
  if (exp) for (const t of Object.values(exp)) if (t) refd.add(t)
  const objs: BoardObj[] = []
  objects.forEach((o, i) => {
    if ((o.appearsAt ?? 0) > effStep && !refd.has(o.id)) return
    let label = o.label
    for (let s = 0; s <= appliedUpTo && s < nSteps; s++) {
      const L = steps[s].labels?.[o.id]
      if (L !== undefined) label = L
    }
    objs.push({ id: o.id, label, base: o.label, addr: addrOfIndex(i) })
  })

  // ── efectos locales ──
  const fxCards = (text: string) => {
    const els = boardRef.current?.querySelectorAll<HTMLElement>('.rc-card')
    if (!els || els.length === 0) return
    els.forEach((el) => {
      const r = el.getBoundingClientRect()
      burst(r.left + r.width / 2, r.top + r.height / 2, { count: 8 })
    })
    const r = els[0].getBoundingClientRect()
    floatText(r.left + r.width / 2, r.top - 4, text)
  }

  // Pasos sin explicación: avanzan solos (con un respiro para ver la flecha).
  useEffect(() => {
    if (view !== 'steps' || !solved) return
    if (isLast && !fq) return
    if (steps[stepIdx]?.explain) return
    const t = setTimeout(() => {
      advancedAt.current = performance.now()
      if (isLast) {
        setView('final')
        setSolved(false)
      } else {
        setStepIdx((i) => i + 1)
        setSolved(false)
      }
    }, 750)
    return () => clearTimeout(t)
  }, [view, solved, stepIdx, isLast, fq, steps])

  // ── interacción ──
  const assignTo = (v: string, t: string | null) => {
    setAssign((a) => ({ ...a, [v]: t }))
    setWrongVars((w) => w.filter((x) => x !== v))
    setSel(null)
  }
  const tapCard = (v: string) => {
    if (!interactive) return
    sfx.click()
    if (eff && eff.k === 'target') {
      assignTo(v, eff.t)
      return
    }
    setSel(eff && eff.k === 'card' && eff.v === v && sel ? null : { k: 'card', v })
  }
  const tapTarget = (t: string | null) => {
    if (!interactive) return
    sfx.click()
    if (eff && eff.k === 'card') {
      assignTo(eff.v, t)
      return
    }
    setSel(eff && eff.k === 'target' && eff.t === t ? null : { k: 'target', t })
  }

  const checkStep = () => {
    if (performance.now() - advancedAt.current < 500) return
    // wrongVars > 0 = la misma respuesta que ya se marcó mal: no cobrar otra vida por lo mismo
    if (!canCheck || !exp || finishing.current || wrongVars.length > 0) return
    const bad = curKeys.filter((k) => assign[k] !== exp[k])
    if (bad.length > 0) {
      setWrongVars(bad)
      setSel(null)
      onCheck(false, assign)
      return
    }
    setWrongVars([])
    setSel(null)
    setSolved(true)
    fxCards('¡BIEN!')
    if (isLast && !fq) {
      finishing.current = true
      setView('finished')
      onCheck(true, assign)
    } else {
      onStep?.()
    }
  }

  const next = () => {
    if (!solved) return
    advancedAt.current = performance.now()
    sfx.click()
    setSel(null)
    setWrongVars([])
    if (isLast) {
      setView('final')
      setSolved(false)
    } else {
      setStepIdx((i) => i + 1)
      setSolved(false)
    }
  }

  const checkFinal = () => {
    if (!fq || choice === null || elim.includes(choice) || locked || finishing.current) return
    if (choice === fq.answer) {
      finishing.current = true
      setView('finished')
      fxCards('¡BIEN!')
      onCheck(true, choice)
    } else {
      setElim((e) => [...e, choice])
      setChoice(null)
      onCheck(false, choice)
    }
  }

  // ── textos ──
  const hint =
    eff?.k === 'card'
      ? `Toca la casa a la que apunta «${eff.v}» (o la tarjeta en blanco).`
      : eff?.k === 'target'
        ? 'Ahora toca la tarjeta que apunta ahí.'
        : unassigned.length > 0
          ? 'Toca una tarjeta y luego la casa a la que apunta.'
          : wrongVars.length > 0
            ? `${wrongVars.length === 1 ? 'La tarjeta marcada está mal' : 'Las tarjetas marcadas están mal'}: vuelve a apuntarla${wrongVars.length === 1 ? '' : 's'} y comprueba.`
            : '¿A qué apunta cada tarjeta después de esta línea? Corrígelas si hace falta y comprueba.'

  const curLine = inSteps ? stepIdx : nSteps // nSteps = todas comidas
  // en el último paso sin pregunta final el ejercicio ya terminó, pero su explicación se sigue mostrando
  const exShow = step ?? (view === 'finished' && !fq && nSteps > 0 ? steps[nSteps - 1] : null)
  const showExplain = !!exShow?.explain && (solved || showSolution)
  const manualNext = solved && inSteps && !!step?.explain && !(isLast && !fq)
  const finalOpen = view === 'final' || (view === 'finished' && !!fq)

  return (
    <div className={`rc-root${shaking ? ' is-shaking' : ''}`}>
      {nSteps > 0 && (
        <section className="rc-prog" aria-label="Programa">
          <header className="rc-proghead">
            <span>PROGRAMA</span>
            {inSteps && (
              <span className="rc-step">
                PASO {stepIdx + 1}/{nSteps}
              </span>
            )}
          </header>
          <ol className="rc-lines">
            {steps.map((s, i) => {
              const state = i < curLine || (i === curLine && solved) ? 'done' : i === curLine ? 'now' : 'next'
              const ok = i === curLine && solved
              return (
                <li key={i} className={`rc-line is-${state}${ok ? ' is-ok' : ''}`} aria-current={state === 'now' ? 'step' : undefined}>
                  <span className="rc-gut" aria-hidden="true">
                    {state === 'now' ? <PacMan size={24} dir="right" chomp className="rc-pac" /> : state === 'next' ? <i className="rc-dot" /> : null}
                  </span>
                  <span className="rc-lineno" aria-hidden="true">
                    {i + 1}
                  </span>
                  <code className="rc-code">{s.code}</code>
                </li>
              )
            })}
          </ol>
        </section>
      )}

      {inSteps && !solved && !showSolution && (
        <p className="rc-hint" role="status" aria-live="polite">
          {hint}
        </p>
      )}

      <Board
        boardRef={boardRef}
        vars={declared}
        colorOf={colorOf}
        objs={objs}
        shown={shown}
        sel={interactive ? eff : null}
        wrong={wrongVars}
        interactive={interactive}
        onCard={tapCard}
        onTarget={tapTarget}
      />

      {showSolution && inSteps && !solved && <p className="rc-solution">SOLUCIÓN: así quedan las tarjetas en esta línea.</p>}

      {showExplain && (
        <div className="rc-explain anim-pop" role="status">
          {solved && <b>¡BIEN! </b>}
          {exShow!.explain}
        </div>
      )}

      {inSteps && !solved && !showSolution && (
        <button type="button" className="px-btn px-btn--primary px-btn--block" disabled={!canCheck || wrongVars.length > 0} onClick={checkStep}>
          COMPROBAR
        </button>
      )}
      {manualNext && (
        <button type="button" className="px-btn px-btn--primary px-btn--block" onClick={next}>
          {isLast ? 'PREGUNTA FINAL' : 'SIGUIENTE'}
        </button>
      )}

      {finalOpen && fq && (
        <section className="px-panel rc-final" aria-label="Pregunta final">
          <p className="rc-qtext">{fq.text}</p>
          <div className="rc-choices" role="radiogroup" aria-label="Opciones">
            {fq.choices.map((c, i) => {
              const bad = elim.includes(i)
              const good = (showSolution || view === 'finished') && i === fq.answer
              const cls = ['rc-choice', choice === i ? 'is-sel' : '', bad ? 'is-wrong' : '', good ? 'is-correct' : ''].filter(Boolean).join(' ')
              return (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={choice === i}
                  className={cls}
                  disabled={locked || bad || view === 'finished'}
                  onClick={() => {
                    sfx.click()
                    setChoice(i)
                  }}
                >
                  <span className="rc-radio" aria-hidden="true" />
                  <span className="rc-ctext">{c}</span>
                  {bad && <Ghost color="red" size={24} float className="rc-ghost-inline" />}
                </button>
              )
            })}
          </div>
          {view === 'final' && !locked && (
            <button
              type="button"
              className="px-btn px-btn--primary px-btn--block"
              disabled={choice === null || elim.includes(choice)}
              onClick={checkFinal}
            >
              COMPROBAR
            </button>
          )}
        </section>
      )}
    </div>
  )
}

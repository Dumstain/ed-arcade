import { useMemo, useRef, useState } from 'react'
import type { ExerciseProps } from '../../engine/types'
import type { MemoryStreetData } from '../schemas'
import { Ghost, sfx } from '../../ui'
import { House, Walker, fxAt, useFlash, useLanes, useShake, useWalker } from './parts'
import { computePath, houseCount, houseSizeOf } from './validate'

type FlashKey = number | 'null'

/** mode 'chain': búsqueda del tesoro. Seguir las pistas casa por casa y terminar en el letrero NULL. */
export function ChainGame({ exercise, onCheck, onStep, locked, showSolution, attempt }: ExerciseProps<MemoryStreetData>) {
  const d = exercise.data
  const size = houseSizeOf(d)
  const addr = (i: number) => d.baseAddress + i * size
  const n = houseCount(d)
  const byHouse = useMemo(() => new Map((d.nodes ?? []).map((nd) => [nd.house, nd] as const)), [d])
  const path = useMemo(() => computePath(d).path, [d])
  const head = path[0]

  const [step, setStep] = useState(0) // cuántas casas de la cadena ya visitó
  const [done, setDone] = useState(false)
  const [msg, setMsg] = useState('')
  const [flash, triggerFlash] = useFlash<FlashKey>()
  const shaking = useShake(attempt)
  const stepRef = useRef(0)
  const doneRef = useRef(false)
  /** errores ya cobrados en este paso ("paso:casa"): repetir el mismo no cuesta otra vida */
  const triedRef = useRef<Set<string>>(new Set())

  const stageRef = useRef<HTMLDivElement>(null)
  const { lanes, ref: laneRef } = useLanes()

  const walkTarget = done ? 'null' : step === 0 ? 'start' : `h${path[step - 1]}`
  const walker = useWalker(stageRef, lanes, walkTarget)

  const orderOf = (i: number) => path.indexOf(i)
  const disabled = locked || done

  const wrong = (key: FlashKey, text: string) => {
    const sig = `${stepRef.current}:${key}`
    if (triedRef.current.has(sig)) {
      triggerFlash(key)
      setMsg(key === 'null' ? 'Todavía hay pistas que seguir.' : 'Esa ya la probaste: no cuesta otra vida. Busca otra casa.')
      return
    }
    triedRef.current.add(sig)
    triggerFlash(key)
    setMsg(text)
    onCheck(false, key)
  }

  const tapHouse = (i: number) => {
    if (disabled || doneRef.current) return
    sfx.click()
    const cur = stepRef.current
    const ord = orderOf(i)
    if (ord >= 0 && ord < cur) {
      setMsg(ord === cur - 1 ? 'Ya estás en esa casa. Lee su pista.' : 'Ya pasaste por esa casa.')
      return
    }
    if (cur < path.length && i === path[cur]) {
      stepRef.current = cur + 1
      setStep(cur + 1)
      const node = byHouse.get(i)
      setMsg(`¡Waka! Casa ${i}. Sigue su pista.`)
      fxAt(lanes.current[`h${i}`], node ? String(node.value) : undefined)
      onStep?.()
      return
    }
    wrong(i, cur === 0 ? '¡Fantasma! Empieza en la casa del letrero INICIO.' : '¡Fantasma! Esa no es la casa de la pista.')
  }

  const tapNull = () => {
    if (disabled || doneRef.current) return
    sfx.click()
    if (stepRef.current === path.length) {
      doneRef.current = true
      setDone(true)
      setMsg('¡Llegaste a null! Cadena completa.')
      fxAt(lanes.current['null'], 'null')
      onCheck(true, path)
    } else {
      wrong('null', '¡Fantasma! Todavía hay pistas que seguir.')
    }
  }

  // Pista actual (HUD)
  const curNode = step > 0 ? byHouse.get(path[step - 1]) : undefined
  const clueLabel = done ? 'FIN' : step === 0 ? 'INICIO' : 'PISTA'
  const clueIsNull = step > 0 && curNode?.next === null
  const clueValue = step === 0 ? String(addr(head)) : clueIsNull || !curNode || curNode.next === null ? 'null' : String(addr(curNode.next))
  const clueHelp =
    step === 0
      ? 'La cadena empieza en la casa con ese letrero.'
      : clueIsNull
        ? 'null = tarjeta en blanco: ya no hay más casas. Toca el letrero NULL.'
        : 'Busca ese número en un letrero y toca esa casa.'

  const shownCount = showSolution ? path.length : step

  const houses = Array.from({ length: n }, (_, i) => {
    const node = byHouse.get(i)
    const ord = orderOf(i)
    const visited = ord >= 0 && ord < step
    const states: string[] = []
    if (visited) states.push('visited')
    if (visited && ord === step - 1 && !done) states.push('current')
    if (showSolution && ord >= step) states.push('solution')
    if (flash && flash.key === i) states.push('wrong')
    const showOrder = visited || (showSolution && ord >= 0)
    const body = node ? (
      <>
        <span className="ms-val">{String(node.value)}</span>
        <span className={`ms-ptr${node.next === null ? ' is-null' : ''}`}>{node.next === null ? 'null' : `→${addr(node.next)}`}</span>
      </>
    ) : undefined
    const label =
      `Casa ${i}, dirección ${addr(i)}` +
      (node ? `, dato ${String(node.value)}, pista ${node.next === null ? 'null' : addr(node.next)}` : ', vacía') +
      (visited ? ', ya visitada' : '')
    return (
      <House
        key={i}
        tone={node ? 'node' : 'empty'}
        states={states}
        tag={showOrder ? String(ord + 1) : undefined}
        sign={String(addr(i))}
        body={body}
        label={label}
        onTap={() => tapHouse(i)}
        disabled={disabled}
        ghost={!!flash && flash.key === i}
        laneRef={laneRef(`h${i}`)}
      />
    )
  })

  const trail = path.slice(0, shownCount).map((h) => String(byHouse.get(h)?.value ?? ''))

  return (
    <div className="ms-col">
      <div ref={stageRef} className={`ms-stage${shaking ? ' is-shaking' : ''}`}>
        <div className={`ms-clue${done ? ' is-done' : ''}`}>
          <span className="ms-clue-home" ref={laneRef('start')} aria-hidden="true" />
          <div className="ms-clue-text" role="status" aria-live="polite">
            <span className="ms-clue-label">{clueLabel}</span>
            <span className="ms-clue-val">→ {clueValue}</span>
            <span className="ms-clue-help">{clueHelp}</span>
          </div>
        </div>

        <div className="ms-street">
          {houses}
          <House
            tone="null"
            states={[...(showSolution && !done ? ['solution'] : []), ...(done ? ['correct'] : []), ...(flash && flash.key === 'null' ? ['wrong'] : [])]}
            sign="FIN"
            body={<span className="ms-null-word">NULL</span>}
            label="Letrero null: tarjeta en blanco, aquí termina la cadena"
            onTap={tapNull}
            disabled={disabled}
            ghost={!!flash && flash.key === 'null'}
            laneRef={laneRef('null')}
          />
        </div>
        <Walker {...walker} />
      </div>

      <div className="ms-trail" aria-label="Tesoro recogido">
        <span className="ms-trail-label">TESORO</span>
        {trail.length === 0 && <span className="ms-trail-empty">aún vacío</span>}
        {trail.map((v, i) => (
          <span key={i} className="ms-pellet">
            {v}
          </span>
        ))}
        {showSolution && !done && <span className="ms-pellet is-null">null</span>}
      </div>

      <p className="ms-msg" role="status" aria-live="polite">
        {flash && <Ghost color="red" size={26} float />}
        <span>{showSolution && !done ? 'Así era el camino: sigue los números amarillos.' : msg || 'Toca la casa del letrero INICIO y sigue las pistas.'}</span>
      </p>

      {showSolution && !done && (
        <p className="ms-formula">
          Camino correcto: {path.map((h) => addr(h)).join(' → ')} → null
        </p>
      )}
    </div>
  )
}

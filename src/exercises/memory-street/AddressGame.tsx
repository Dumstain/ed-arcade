import { useRef, useState } from 'react'
import type { ExerciseProps } from '../../engine/types'
import type { MemoryStreetData } from '../schemas'
import { Ghost, sfx } from '../../ui'
import { Keypad } from '../_shared/Keypad'
import { House, Walker, fxAt, useFlash, useLanes, useShake, useWalker } from './parts'
import { houseCount, houseSizeOf } from './validate'

/** mode 'address': ¿dónde vive name[ask]? (tocar la casa o escribir la dirección). */
export function AddressGame({ exercise, onCheck, locked, showSolution, attempt }: ExerciseProps<MemoryStreetData>) {
  const d = exercise.data
  const arr = d.array!
  const size = houseSizeOf(d)
  const addr = (i: number) => d.baseAddress + i * size
  const len = arr.values.length
  const n = houseCount(d)
  const mode = d.answerMode ?? 'tap'
  const targetHouse = arr.startHouse + arr.ask
  const targetAddr = addr(targetHouse)
  const a0 = addr(arr.startHouse)
  const name = arr.name || 'a'

  const [sel, setSel] = useState<number | null>(null)
  const [typed, setTyped] = useState('')
  const [tried, setTried] = useState<number[]>([])
  const [done, setDone] = useState(false)
  const [msg, setMsg] = useState('')
  const [flash, triggerFlash] = useFlash<number | null>()
  const shaking = useShake(attempt)
  const busy = useRef(false)

  const stageRef = useRef<HTMLDivElement>(null)
  const { lanes, ref: laneRef } = useLanes()

  const revealed = done || locked || showSolution
  const walkTarget = revealed ? `h${targetHouse}` : mode === 'tap' && sel !== null ? `h${sel}` : 'h0'
  const walker = useWalker(stageRef, lanes, walkTarget)

  const houseAt = (address: number) => {
    for (let i = 0; i < n; i++) if (addr(i) === address) return i
    return null
  }

  const tapHouse = (i: number) => {
    if (locked || done) return
    sfx.click()
    setSel(i)
    setMsg(tried.includes(i) ? 'Esa casa ya la probaste.' : `Casa ${i} · dirección ${addr(i)}`)
  }

  const check = () => {
    if (locked || done || busy.current) return
    let ok: boolean
    let answer: number
    let ghostAt: number | null = null
    if (mode === 'tap') {
      if (sel === null || tried.includes(sel)) return
      ok = sel === targetHouse
      answer = sel
      ghostAt = sel
    } else {
      if (typed.trim() === '' || typed === '-') return
      const v = Number(typed)
      if (!Number.isFinite(v)) return
      ok = v === targetAddr
      answer = v
      ghostAt = houseAt(v)
    }
    if (ok) {
      busy.current = true
      setDone(true)
      setMsg(`¡Eso! ${name}[${arr.ask}] vive en la casa ${targetHouse}.`)
      fxAt(lanes.current[`h${targetHouse}`], `${name}[${arr.ask}]`)
      onCheck(true, answer)
    } else {
      triggerFlash(ghostAt)
      if (mode === 'tap' && sel !== null) setTried((t) => [...t, sel])
      if (mode === 'type') setTyped('') // evita volver a mandar el mismo número (y perder otra vida)
      setMsg(
        mode === 'tap'
          ? `¡Fantasma! Esa no es. Cuenta las casas desde ${name}[0].`
          : `¡Fantasma! ${answer} no es. Usa: dir(${name}[0]) + i × tamaño.`,
      )
      onCheck(false, answer)
    }
  }

  const houses = Array.from({ length: n }, (_, i) => {
    const inArr = i >= arr.startHouse && i < arr.startHouse + len
    const k = i - arr.startHouse
    const states: string[] = []
    if (mode === 'tap' && sel === i && !revealed) states.push('selected')
    if (revealed && i === targetHouse) states.push('correct')
    if (flash && flash.key === i) states.push('wrong')
    else if (!revealed && tried.includes(i)) states.push('dim')
    const showTag = inArr && (k === 0 || revealed)
    const signHidden = mode === 'type' && inArr && k > 0 && !revealed
    const label =
      `Casa ${i}` +
      (signHidden ? '' : `, dirección ${addr(i)}`) +
      (inArr ? `, guarda ${String(arr.values[k])}` : ', vacía') +
      (showTag ? `, es ${name}[${k}]` : '')
    return (
      <House
        key={i}
        tone={inArr ? 'array' : 'empty'}
        states={states}
        tag={showTag ? `${name}[${k}]` : undefined}
        sign={String(addr(i))}
        signHidden={signHidden}
        body={inArr ? <span className="ms-val">{String(arr.values[k])}</span> : undefined}
        label={label}
        onTap={mode === 'tap' ? () => tapHouse(i) : undefined}
        disabled={locked || done}
        ghost={!!flash && flash.key === i}
        laneRef={laneRef(`h${i}`)}
      />
    )
  })

  return (
    <div className="ms-col">
      <div className="ms-hud px-panel">
        <p className="ms-question">
          {mode === 'tap' ? 'Toca la casa donde vive ' : 'Escribe la dirección de '}
          <span className="ms-code">
            {name}[{arr.ask}]
          </span>
        </p>
        <div className="ms-facts">
          <span className="ms-fact">
            <span className="ms-swatch" aria-hidden="true" /> {name} = butacas
          </span>
          <span className="ms-fact">Cada casa mide {size}</span>
        </div>
        {mode === 'type' && (
          <p className="ms-formula">
            dir({name}[i]) = dir({name}[0]) + i × {size}
          </p>
        )}
      </div>

      <div ref={stageRef} className={`ms-stage${shaking ? ' is-shaking' : ''}`}>
        <div className="ms-street">{houses}</div>
        <Walker {...walker} />
      </div>

      <p className="ms-msg" role="status" aria-live="polite">
        {flash && flash.key === null && <Ghost color="red" size={26} float />}
        <span>{msg || (mode === 'tap' ? 'Toca una casa de la calle.' : `Lee la dirección de ${name}[0] en su letrero.`)}</span>
      </p>

      {revealed && (
        <p className="ms-formula anim-pop" role="status">
          {name}[{arr.ask}] → casa {targetHouse} → {a0} + {arr.ask} × {size} = <b>{targetAddr}</b>
        </p>
      )}

      {mode === 'tap' ? (
        <button
          type="button"
          className="px-btn px-btn--primary px-btn--block"
          disabled={locked || done || sel === null || tried.includes(sel)}
          onClick={check}
        >
          COMPROBAR
        </button>
      ) : (
        <Keypad value={typed} onChange={setTyped} onSubmit={check} disabled={locked || done} maxLength={6} submitLabel="COMPROBAR" />
      )}
    </div>
  )
}

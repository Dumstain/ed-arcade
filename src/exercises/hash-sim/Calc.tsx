/**
 * Función hash visible + calculadora con la cuenta de la clave actual ("h(23) = 23 % 7 = 2").
 * La función siempre se ve; la cuenta resuelta solo si showMath (si no, el resultado queda en "?").
 */
import type { Val } from '../schemas'
import { RichText } from '../../ui'
import { describeHash, keyStr } from './logic'
import type { HashKind } from './logic'

export interface CalcProps {
  hash: HashKind
  size: number
  /** clave de la que se muestra la cuenta (null = solo la función) */
  keyVal: Val | null
  showMath: boolean
}

export function Calc({ hash, size, keyVal, showMath }: CalcProps) {
  const m = keyVal === null ? null : describeHash(keyVal, hash, size)
  const fn = hash === 'mod' ? `h(k) = k % ${size}` : `h(palabra) = (letra inicial) % ${size}`
  const help =
    hash === 'mod'
      ? `El **%** es el **sobrante** de dividir entre ${size}: ese sobrante es el número de casillero.`
      : `Cada letra vale su lugar en el abecedario: **A=0, B=1, C=2 … Z=25** (la Ñ cuenta como N).`

  let head = ''
  let res = '?'
  if (m && keyVal !== null) {
    if (showMath) {
      head = m.full.slice(0, m.full.lastIndexOf('= ') + 2)
      res = String(m.result)
    } else {
      head = `h(${keyStr(keyVal)}) = `
    }
  }
  const line = m && showMath && m.note ? m.note : help
  const aria =
    m && keyVal !== null
      ? `Función hash ${fn}. ${showMath ? m.full : `Calcula h(${keyStr(keyVal)})`}`
      : `Función hash ${fn}`

  return (
    <div className="hsh-calc" role="group" aria-label={aria}>
      <span className="hsh-tag">FUNCIÓN HASH</span>
      <p className="hsh-fn">{fn}</p>
      {m && keyVal !== null && (
        <div className="hsh-lcd" key={`${keyStr(keyVal)}-${showMath ? 1 : 0}`} aria-hidden="true">
          <span>{head}</span>
          <span className={`hsh-lcd-res${showMath ? '' : ' is-q'}`}>{res}</span>
        </div>
      )}
      <p className="hsh-calc-note">
        <RichText text={line} />
      </p>
    </div>
  )
}

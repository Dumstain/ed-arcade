import type { CSSProperties } from 'react'
import { PacMan } from '../../ui'

/** Banquete final: el comecocos se come todos los pellets de la fila. */
export function Feast({ text }: { text: string }) {
  return (
    <div className="rt-feast-wrap">
      <div className="rt-feast" aria-hidden="true">
        <div className="rt-feast__row">
          {Array.from({ length: 14 }, (_, k) => (
            <i key={k} className="rt-feast__pellet" style={{ '--k': k } as CSSProperties} />
          ))}
        </div>
        <span className="rt-feast__pac">
          <PacMan size={32} chomp dir="right" />
        </span>
      </div>
      <p className="rt-feast__text" role="status">
        {text}
      </p>
    </div>
  )
}

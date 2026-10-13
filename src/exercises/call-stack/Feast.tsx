import type { CSSProperties } from 'react'
import { Ghost, PacMan, RichText } from '../../ui'

/** Banquete final: el comecocos se come todos los pellets (ok) o el fantasma celebra (bad). */
export function Feast({ text, tone = 'ok' }: { text: string; tone?: 'ok' | 'bad' }) {
  return (
    <div className={`cs-feast-wrap cs-feast-wrap--${tone}`}>
      {tone === 'ok' ? (
        <div className="cs-feast" aria-hidden="true">
          <div className="cs-feast__row">
            {Array.from({ length: 14 }, (_, k) => (
              <i key={k} className="cs-feast__pellet" style={{ '--k': k } as CSSProperties} />
            ))}
          </div>
          <span className="cs-feast__pac">
            <PacMan size={32} chomp dir="right" />
          </span>
        </div>
      ) : (
        <div className="cs-feast cs-feast--bad" aria-hidden="true">
          <Ghost color="red" size={36} float />
          <Ghost color="pink" size={36} float />
          <Ghost color="cyan" size={36} float />
        </div>
      )}
      <p className="cs-feast__text" role="status">
        <RichText text={text} />
      </p>
    </div>
  )
}

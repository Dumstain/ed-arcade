/**
 * Tira decorativa: el comecocos recorre una fila de pellets y se los come (se reproduce al montar).
 * Úsala al acertar. Con prefers-reduced-motion se muestra ya terminada.
 */
import type { CSSProperties } from 'react'
import { PacMan } from '../../ui'
import './shared-misc.css'

export function EatStrip({ pellets = 10, className }: { pellets?: number; className?: string }) {
  const n = Math.max(3, Math.min(24, Math.floor(pellets)))
  const steps: CSSProperties = { animationTimingFunction: `steps(${n})` }
  return (
    <div className={`sm-eat${className ? ' ' + className : ''}`} aria-hidden="true">
      <div className="sm-eat-track">
        <div className="sm-eat-dots" style={steps}>
          {Array.from({ length: n }, (_, i) => (
            <i key={i} className="sm-eat-dot" />
          ))}
        </div>
        <div className="sm-eat-pac" style={steps}>
          <PacMan size={28} chomp />
        </div>
      </div>
    </div>
  )
}
export default EatStrip

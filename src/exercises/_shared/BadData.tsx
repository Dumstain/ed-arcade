/**
 * Aviso amistoso cuando los datos de un ejercicio vienen mal (no truena la app).
 * Si se pasa onSkip se ofrece un botón CONTINUAR para que el alumno no se quede atorado.
 */
import { Ghost } from '../../ui'
import './shared-misc.css'

export function BadData({ message, onSkip, locked }: { message?: string; onSkip?: () => void; locked?: boolean }) {
  return (
    <div className="px-panel sm-bad" role="alert">
      <div className="sm-bad-head">
        <Ghost color="red" size={32} float />
        <span className="sm-bad-title">¡UN FANTASMA SE COMIÓ LOS DATOS!</span>
      </div>
      <p className="sm-bad-text">{message ?? 'Este reto tiene datos incorrectos. Avísale a tu profe.'}</p>
      {onSkip && !locked && (
        <button type="button" className="px-btn px-btn--primary" onClick={onSkip}>
          CONTINUAR
        </button>
      )}
    </div>
  )
}
export default BadData

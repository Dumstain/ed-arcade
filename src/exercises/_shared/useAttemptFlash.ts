import { useEffect, useRef, useState } from 'react'

/**
 * Devuelve true durante `ms` milisegundos cada vez que `attempt` AUMENTA (respuesta incorrecta).
 * No se dispara al montar. Sirve para sacudir / parpadear en rojo de forma local.
 */
export function useAttemptFlash(attempt: number, ms = 700): boolean {
  const [on, setOn] = useState(false)
  const prev = useRef(attempt)
  useEffect(() => {
    if (attempt === prev.current) return
    const rose = attempt > prev.current
    prev.current = attempt
    if (!rose) return
    setOn(true)
    const t = setTimeout(() => setOn(false), ms)
    return () => clearTimeout(t)
  }, [attempt, ms])
  return on
}

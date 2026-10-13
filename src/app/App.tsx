/**
 * ED ARCADE — núcleo del juego. Máquina de pantallas sin router:
 * INICIO → MAPA DE DÍAS → MAPA DEL DÍA → RUNNER → (NIVEL COMPLETADO) → (DÍA COMPLETADO)
 * El botón ATRÁS del navegador/celular se intercepta para navegar dentro de la app.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import './app.css'
import type { Exercise, Tier } from '../engine/types'
import { DEMO_MODE, type DayNum } from '../engine/course'
import { findExercise, getDay, registry } from '../engine/content'
import { nextPending } from '../engine/progress'
import { clearSession, loadSession, saveSession } from '../engine/storage'
import { onQueueChange, pendingCount, remoteEnabled } from '../engine/remote'
import { GameProvider, useGame, type RecordOutcome } from './game'
import { Header } from './Header'
import { ErrorBoundary } from './ErrorBoundary'
import { PixelIcon } from '../ui'
import { StartScreen } from './screens/StartScreen'
import { DaysScreen } from './screens/DaysScreen'
import { DayScreen } from './screens/DayScreen'
import { Runner } from './screens/Runner'
import { TierDoneScreen } from './screens/TierDoneScreen'
import { DayDoneScreen } from './screens/DayDoneScreen'

type Screen =
  | { name: 'start' }
  | { name: 'days' }
  | { name: 'day'; day: DayNum }
  | { name: 'run'; day: DayNum; exId: string; nonce: number }
  | { name: 'tierDone'; day: DayNum; tier: Tier; dayDone: boolean }
  | { name: 'dayDone'; day: DayNum }

export default function App() {
  return (
    <GameProvider>
      <Shell />
    </GameProvider>
  )
}

function Shell() {
  const game = useGame()
  const [screen, setScreen] = useState<Screen>({ name: 'start' })
  const [remembered, setRemembered] = useState<string | null>(() => loadSession())
  const [pending, setPending] = useState(() => pendingCount())
  const nonce = useRef(0)

  useEffect(() => onQueueChange(setPending), [])

  useEffect(() => {
    if (DEMO_MODE) console.info(`[ED] DEMO: ${registry.size} tipos registrados`, [...registry.keys()])
  }, [])

  const go = useCallback((s: Screen) => {
    setScreen(s)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [])

  // ───────── navegación ─────────
  const play = useCallback(
    (day: DayNum, ex: Exercise) => {
      nonce.current += 1
      go({ name: 'run', day, exId: ex.id, nonce: nonce.current })
    },
    [go],
  )

  const continueDay = useCallback(
    (day: DayNum) => {
      const dc = getDay(day)
      if (!dc) return go({ name: 'days' })
      const prog = game.getProg()
      const next = nextPending(dc, prog)
      if (next) return play(day, next)
      // sin pendientes (p.ej. práctica con el día ya completo) → mapa del día
      go({ name: 'day', day })
    },
    [game, go, play],
  )

  const afterRun = (day: DayNum, outcome: RecordOutcome, ex: Exercise) => {
    if (outcome.tierJustCompleted) {
      go({ name: 'tierDone', day, tier: ex.tier, dayDone: outcome.dayJustCompleted })
      return
    }
    continueDay(day)
  }

  const back = useCallback((): boolean => {
    switch (screen.name) {
      case 'run':
      case 'tierDone':
      case 'dayDone':
        go({ name: 'day', day: screen.day })
        return true
      case 'day':
        go({ name: 'days' })
        return true
      case 'days':
        go({ name: 'start' })
        return true
      default:
        return false
    }
  }, [screen, go])

  // botón ATRÁS del navegador / Android: una entrada "trampa" en el historial
  const backRef = useRef(back)
  backRef.current = back
  useEffect(() => {
    try {
      history.pushState({ ed: 1 }, '')
    } catch {
      /* ignorar */
    }
    const onPop = () => {
      if (backRef.current()) {
        try {
          history.pushState({ ed: 1 }, '')
        } catch {
          /* ignorar */
        }
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // ───────── sesión ─────────
  const onPlay = (control: string) => {
    saveSession(control)
    setRemembered(control)
    game.login(control)
    go({ name: 'days' })
  }

  const logout = () => {
    clearSession()
    setRemembered(null)
    game.logout()
    go({ name: 'start' })
  }

  const loggedIn = !!game.control && screen.name !== 'start'

  // ───────── pantalla actual ─────────
  let body: React.ReactNode = null
  if (!loggedIn) {
    body = (
      <StartScreen
        remembered={remembered}
        onPlay={onPlay}
        onForget={() => {
          clearSession()
          setRemembered(null)
        }}
      />
    )
  } else if (screen.name === 'days') {
    body = <DaysScreen onOpenDay={(day) => go({ name: 'day', day })} />
  } else if (screen.name === 'day') {
    const day = screen.day
    body = (
      <DayScreen
        day={day}
        onPlay={(ex) => play(day, ex)}
        onContinue={() => continueDay(day)}
        onScores={() => go({ name: 'dayDone', day })}
        onBack={() => go({ name: 'days' })}
      />
    )
  } else if (screen.name === 'run') {
    const ref = findExercise(screen.exId)
    const day = screen.day
    if (!ref) {
      body = <p className="eda-empty">Ejercicio no encontrado.</p>
    } else {
      const ex = ref.exercise
      body = (
        <Runner
          key={`${ex.id}:${screen.nonce}`}
          day={day}
          exercise={ex}
          onNext={(outcome) => afterRun(day, outcome, ex)}
          onRetry={() => play(day, ex)}
          onExit={() => go({ name: 'day', day })}
        />
      )
    }
  } else if (screen.name === 'tierDone') {
    const { day, tier, dayDone } = screen
    body = (
      <TierDoneScreen
        key={`${day}-${tier}`}
        day={day}
        tier={tier}
        dayDone={dayDone}
        onContinue={() => (dayDone ? go({ name: 'dayDone', day }) : continueDay(day))}
      />
    )
  } else if (screen.name === 'dayDone') {
    const day = screen.day
    body = <DayDoneScreen key={day} day={day} onMap={() => go({ name: 'days' })} onDay={() => go({ name: 'day', day })} />
  }

  return (
    <div className="eda-root">
      <Header control={loggedIn ? game.control : null} onHome={() => go(loggedIn ? { name: 'days' } : { name: 'start' })} onLogout={logout} />
      <main className="eda-main">
        <ErrorBoundary
          resetKey={screen.name + ('day' in screen ? screen.day : '') + ('exId' in screen ? screen.exId : '')}
          fallback={(_e, reset) => (
            <div className="eda-crash px-panel">
              <p>¡Ups! Algo salió mal en esta pantalla.</p>
              <button
                type="button"
                className="px-btn px-btn--primary"
                onClick={() => {
                  reset()
                  go(loggedIn ? { name: 'days' } : { name: 'start' })
                }}
              >
                VOLVER AL MAPA
              </button>
            </div>
          )}
        >
          {body}
        </ErrorBoundary>
      </main>
      <footer className="eda-footer">
        <span>Estructura de Datos · ITM Morelia</span>
        {!remoteEnabled && <span className="eda-tag eda-tag--mode">MODO LOCAL</span>}
        {remoteEnabled && pending > 0 && (
          <span className="eda-tag eda-tag--mode" title="Intentos por sincronizar">
            <PixelIcon name="clock" size={14} /> {pending} POR SUBIR
          </span>
        )}
        {DEMO_MODE && <span className="eda-tag eda-tag--info">DEMO</span>}
      </footer>
    </div>
  )
}

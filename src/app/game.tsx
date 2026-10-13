/**
 * Estado global del juego (jugador, progreso, combo de la sesión, desbloqueo remoto)
 * y la operación central `recordResult` que guarda una partida terminada.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Exercise } from '../engine/types'
import type { DayNum } from '../engine/course'
import { getDay } from '../engine/content'
import { isDayComplete, isTierComplete, type ProgMap } from '../engine/progress'
import { applyResult, computeTotal, loadPlayer, mergeRemote, savePlayer, type ExProgress, type PlayerData } from '../engine/storage'
import { evaluateAchievements, type Achievement } from '../engine/achievements'
import { fetchProgress, fetchUnlockedDay, flushQueue, sendAttempt, startSyncLoop } from '../engine/remote'
import { rankFor } from '../engine/scoring'

export interface RecordInput {
  exercise: Exercise
  day: DayNum
  correct: boolean
  score: number
  stars: number
  mistakes: number
  usedHint: boolean
  timeMs: number
  /** combo vigente tras esta partida */
  combo: number
  skipped?: boolean
}

export interface RecordOutcome {
  prevBest: number
  best: number
  improved: boolean
  wasFinished: boolean
  tierJustCompleted: boolean
  dayJustCompleted: boolean
  achievements: Achievement[]
  rankUp: string | null
  totalBefore: number
  totalAfter: number
}

interface GameCtx {
  control: string | null
  player: PlayerData | null
  /** progreso real + sala de pruebas (en memoria) */
  prog: ProgMap
  /** progreso vigente (síncrono, incluye la partida recién guardada) */
  getProg: () => ProgMap
  total: number
  combo: number
  /** combo vigente (síncrono, sin esperar re-render) */
  getCombo: () => number
  setCombo: (n: number) => void
  remoteUnlocked: number
  login: (control: string) => void
  logout: () => void
  recordResult: (r: RecordInput) => RecordOutcome
}

const Ctx = createContext<GameCtx | null>(null)

export function useGame(): GameCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('useGame fuera de GameProvider')
  return c
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<PlayerData | null>(null)
  const [demoProg, setDemoProg] = useState<Record<string, ExProgress>>({})
  const [combo, setComboState] = useState(0)
  const [remoteUnlocked, setRemoteUnlocked] = useState(0)

  const playerRef = useRef<PlayerData | null>(null)
  const demoRef = useRef<Record<string, ExProgress>>({})
  const comboRef = useRef(0)

  const commitPlayer = useCallback((p: PlayerData | null) => {
    playerRef.current = p
    if (p) savePlayer(p)
    setPlayer(p)
  }, [])

  const getCombo = useCallback(() => comboRef.current, [])
  const getProg = useCallback((): ProgMap => ({ ...(playerRef.current?.progress ?? {}), ...demoRef.current }), [])
  const setCombo = useCallback((n: number) => {
    comboRef.current = n
    setComboState(n)
  }, [])

  // desbloqueo remoto + cola de reintentos
  useEffect(() => {
    startSyncLoop()
    let alive = true
    fetchUnlockedDay().then((n) => {
      if (alive && n != null) setRemoteUnlocked(n)
    })
    return () => {
      alive = false
    }
  }, [])

  const login = useCallback(
    (control: string) => {
      const p = loadPlayer(control)
      commitPlayer(p)
      setCombo(0)
      void flushQueue()
      // fusionar progreso de otra computadora (no bloquea)
      fetchProgress(control).then((rows) => {
        const cur = playerRef.current
        if (!rows || !cur || cur.control !== control) return
        const merged = mergeRemote(cur, rows)
        if (merged !== cur) commitPlayer(merged)
      })
      fetchUnlockedDay().then((n) => {
        if (n != null) setRemoteUnlocked(n)
      })
    },
    [commitPlayer, setCombo],
  )

  const logout = useCallback(() => {
    playerRef.current = null
    setPlayer(null)
    setCombo(0)
    demoRef.current = {}
    setDemoProg({})
  }, [setCombo])

  const recordResult = useCallback(
    (r: RecordInput): RecordOutcome => {
      const p = playerRef.current
      const isDemo = r.day === 0
      const baseProg: ProgMap = { ...(p?.progress ?? {}), ...demoRef.current }
      const dc = getDay(r.day)
      const prev = baseProg[r.exercise.id]
      const tierWas = dc ? isTierComplete(dc, r.exercise.tier, baseProg) : false
      const dayWas = dc ? isDayComplete(dc, baseProg) : false
      const entry = applyResult(prev, r)
      const prog: ProgMap = { ...baseProg, [r.exercise.id]: entry }
      const tierNow = dc ? isTierComplete(dc, r.exercise.tier, prog) : false
      const dayNow = dc ? isDayComplete(dc, prog) : false

      const totalBefore = p?.total ?? 0
      let totalAfter = totalBefore
      let achievements: Achievement[] = []
      let rankUp: string | null = null

      if (isDemo) {
        demoRef.current = { ...demoRef.current, [r.exercise.id]: entry }
        setDemoProg(demoRef.current)
      } else if (p) {
        const progress = { ...p.progress, [r.exercise.id]: entry }
        totalAfter = computeTotal(progress)
        if (dc && !r.skipped) {
          achievements = evaluateAchievements({
            has: new Set(p.achievements),
            exercise: r.exercise,
            correct: r.correct,
            mistakes: r.mistakes,
            combo: r.combo,
            dc,
            prog,
          })
        }
        const before = rankFor(totalBefore)
        const after = rankFor(totalAfter)
        if (after.index > before.index) rankUp = after.rank.name
        commitPlayer({
          ...p,
          progress,
          total: totalAfter,
          achievements: [...p.achievements, ...achievements.map((a) => a.id)],
          updatedAt: Date.now(),
        })
        if (!r.skipped) {
          sendAttempt({
            control: p.control,
            day: r.day,
            exercise_id: r.exercise.id,
            tier: r.exercise.tier,
            correct: r.correct,
            score: r.score,
            stars: r.stars,
            mistakes: r.mistakes,
            used_hint: r.usedHint,
            time_ms: Math.round(r.timeMs),
          })
        }
      }

      const prevBest = prev?.bestScore ?? 0
      return {
        prevBest,
        best: entry.bestScore,
        improved: !!prev && r.score > prevBest,
        wasFinished: !!prev?.finished,
        tierJustCompleted: !tierWas && tierNow,
        dayJustCompleted: !dayWas && dayNow,
        achievements,
        rankUp,
        totalBefore,
        totalAfter,
      }
    },
    [commitPlayer],
  )

  const prog = useMemo<ProgMap>(() => ({ ...(player?.progress ?? {}), ...demoProg }), [player, demoProg])

  const value = useMemo<GameCtx>(
    () => ({
      control: player?.control ?? null,
      player,
      prog,
      getProg,
      total: player?.total ?? 0,
      combo,
      getCombo,
      setCombo,
      remoteUnlocked,
      login,
      logout,
      recordResult,
    }),
    [player, prog, getProg, combo, getCombo, setCombo, remoteUnlocked, login, logout, recordResult],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

import { useEffect, useRef, useState } from 'react'
import { TIER_NAMES, type DayNum } from '../../engine/course'
import { getDay } from '../../engine/content'
import { tierStats } from '../../engine/progress'
import type { Tier } from '../../engine/types'
import { Ghost, Intermission, PacMan, Stars, sfx } from '../../ui'
import { useGame } from '../game'

interface Props {
  day: DayNum
  tier: Tier
  dayDone: boolean
  onContinue: () => void
}

export function TierDoneScreen({ day, tier, dayDone, onContinue }: Props) {
  const game = useGame()
  const dc = getDay(day)
  const [inter, setInter] = useState(true)
  const btnRef = useRef<HTMLButtonElement>(null)
  const st = dc ? tierStats(dc, tier, game.prog) : { stars: 0, maxStars: 0, points: 0, solved: 0, total: 0, finished: 0 }
  const hasNext = !!dc && !dayDone && ([2, 3, 4] as Tier[]).some((t) => t > tier && dc.byTier[t].length > 0)
  const nextTier = dc ? ([2, 3, 4] as Tier[]).find((t) => t > tier && dc.byTier[t].length > 0) : undefined

  // respaldo por si la escena intermedia no termina sola
  useEffect(() => {
    const t = window.setTimeout(() => setInter(false), 6000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (inter) return
    sfx.levelUp()
    btnRef.current?.focus({ preventScroll: true })
  }, [inter])

  const avg = st.total ? Math.round(st.stars / st.total) : 0

  return (
    <div className="eda-celebrate">
      {inter && <Intermission onDone={() => setInter(false)} />}
      <div className={`eda-celebrate__box px-panel${inter ? '' : ' anim-pop'}`}>
        <div className="eda-celebrate__sprites" aria-hidden="true">
          <PacMan size={44} dir="right" chomp />
          <Ghost color="scared" size={40} float />
        </div>
        <h1 className="px-title eda-celebrate__title">
          ¡NIVEL {tier} COMPLETADO!
        </h1>
        <p className="eda-celebrate__sub">{TIER_NAMES[tier]}</p>
        <Stars value={avg} size={40} animate={!inter} />
        <dl className="eda-celebrate__stats">
          <div>
            <dt>ESTRELLAS</dt>
            <dd>
              ★ {st.stars}/{st.maxStars}
            </dd>
          </div>
          <div>
            <dt>RESUELTOS</dt>
            <dd>
              {st.solved}/{st.total}
            </dd>
          </div>
          <div>
            <dt>PUNTOS</dt>
            <dd>{st.points}</dd>
          </div>
        </dl>
        {tier === 4 && st.solved === st.total ? (
          <p className="eda-celebrate__unlock anim-blink">¡JEFE DERROTADO!</p>
        ) : hasNext && nextTier ? (
          <p className="eda-celebrate__unlock anim-blink">¡NIVEL {nextTier} DESBLOQUEADO!</p>
        ) : null}
        <button
          ref={btnRef}
          type="button"
          className="px-btn px-btn--primary px-btn--block"
          onClick={() => {
            sfx.click()
            onContinue()
          }}
        >
          {dayDone ? 'VER RESULTADOS ▶' : 'CONTINUAR ▶'}
        </button>
      </div>
    </div>
  )
}

import { TIERS, TIER_NAMES, dayInfo, type DayNum } from '../../engine/course'
import { getDay } from '../../engine/content'
import { dayStats, isDayComplete, isTierComplete, isTierUnlocked, nextPending, tierStats } from '../../engine/progress'
import type { Exercise, Tier } from '../../engine/types'
import { Fruit, Ghost, PacMan, Pellets, Stars, sfx, toast } from '../../ui'
import { useGame } from '../game'

interface Props {
  day: DayNum
  onPlay: (ex: Exercise) => void
  onContinue: () => void
  onScores: () => void
  onBack: () => void
}

export function DayScreen({ day, onPlay, onContinue, onScores, onBack }: Props) {
  const game = useGame()
  const dc = getDay(day)
  const info = dayInfo(day)

  if (!dc) {
    return (
      <div className="eda-day">
        <button type="button" className="px-btn px-btn--sm" onClick={onBack}>
          ◀ DÍAS
        </button>
        <p className="eda-empty">PRÓXIMAMENTE</p>
      </div>
    )
  }

  const st = dayStats(dc, game.prog)
  const next = nextPending(dc, game.prog)
  const complete = isDayComplete(dc, game.prog)

  return (
    <div className="eda-day">
      <div className="eda-day__head">
        <button
          type="button"
          className="px-btn px-btn--sm"
          onClick={() => {
            sfx.click()
            onBack()
          }}
        >
          ◀ DÍAS
        </button>
        <div className="eda-day__title">
          <Fruit kind={info.fruit} size={32} />
          <div>
            <span className="eda-day__num">{day === 0 ? 'DÍA 0 · SALA DE PRUEBAS' : `DÍA ${day}`}</span>
            <h1 className="eda-day__name">{info.title}</h1>
          </div>
        </div>
      </div>

      <div className="eda-day__stats px-panel">
        <Pellets total={st.total} done={st.finished} />
        <span>
          {st.finished}/{st.total}
        </span>
        <span>
          ★ {st.stars}/{st.maxStars}
        </span>
        <span>{st.points} PTS</span>
      </div>

      {next ? (
        <button
          type="button"
          className="px-btn px-btn--primary px-btn--block eda-continue"
          onClick={() => {
            sfx.click()
            onContinue()
          }}
          autoFocus
        >
          ▶ {st.finished === 0 ? 'EMPEZAR' : 'CONTINUAR'}
        </button>
      ) : complete ? (
        <div className="eda-day__done">
          <p className="px-title eda-day__doneText">¡DÍA COMPLETADO!</p>
          <p className="eda-muted">Repite cualquier ejercicio para mejorar tu puntaje.</p>
        </div>
      ) : null}

      <button
        type="button"
        className="px-btn px-btn--sm eda-scores-btn"
        onClick={() => {
          sfx.click()
          onScores()
        }}
      >
        🏆 HIGH SCORES
      </button>

      <ol className="eda-maze">
        {TIERS.map((tier) => {
          const list = dc.byTier[tier]
          if (!list.length) return null
          return (
            <TierBlock
              key={tier}
              tier={tier}
              list={list}
              unlocked={isTierUnlocked(dc, tier, game.prog)}
              complete={isTierComplete(dc, tier, game.prog)}
              nextId={next?.id ?? null}
              onPlay={onPlay}
              stats={tierStats(dc, tier, game.prog)}
            />
          )
        })}
      </ol>
    </div>
  )
}

function TierBlock({
  tier,
  list,
  unlocked,
  complete,
  nextId,
  onPlay,
  stats,
}: {
  tier: Tier
  list: Exercise[]
  unlocked: boolean
  complete: boolean
  nextId: string | null
  onPlay: (ex: Exercise) => void
  stats: { stars: number; maxStars: number; finished: number; total: number }
}) {
  const game = useGame()
  return (
    <li className={`eda-tier eda-tier--${tier}${unlocked ? '' : ' is-locked'}${complete ? ' is-complete' : ''}`}>
      <div className="eda-tier__head">
        <span className="eda-tier__name">
          NIVEL {tier} · {TIER_NAMES[tier]}
        </span>
        <span className="eda-tier__stars">
          ★ {stats.stars}/{stats.maxStars}
        </span>
        {tier === 4 && (
          <span className="eda-tier__boss" aria-hidden="true">
            <Ghost color={complete ? 'scared' : 'red'} size={36} float={!complete} />
          </span>
        )}
      </div>
      {!unlocked && <p className="eda-tier__lock">🔒 Termina el nivel {tier - 1} para abrirlo</p>}
      <ul className="eda-nodes">
        {list.map((ex, i) => {
          const p = game.prog[ex.id]
          const state = p?.finished ? (p.solved ? 'solved' : 'failed') : !unlocked ? 'locked' : ex.id === nextId ? 'next' : 'open'
          const stateLabel =
            state === 'solved'
              ? `resuelto, ${p?.stars ?? 0} estrellas, ${p?.bestScore ?? 0} puntos`
              : state === 'failed'
                ? 'sin vidas, puedes reintentarlo'
                : state === 'locked'
                  ? 'bloqueado'
                  : state === 'next'
                    ? 'siguiente'
                    : 'pendiente'
          return (
            <li key={ex.id}>
              <button
                type="button"
                className={`eda-node is-${state}`}
                aria-disabled={state === 'locked'}
                aria-label={`Ejercicio ${i + 1}: ${ex.title}. ${stateLabel}`}
                onClick={() => {
                  if (state === 'locked') {
                    sfx.wrong()
                    toast(`Termina el nivel ${tier - 1} primero`, { icon: '🔒' })
                    return
                  }
                  sfx.click()
                  onPlay(ex)
                }}
              >
                <span className="eda-node__num">#{i + 1}</span>
                <span className="eda-node__icon" aria-hidden="true">
                  {state === 'solved' ? (
                    <Stars value={p?.stars ?? 0} size={16} />
                  ) : state === 'failed' ? (
                    <Ghost color="red" size={26} />
                  ) : state === 'next' ? (
                    <PacMan size={28} dir="right" chomp />
                  ) : (
                    <span className={`eda-pellet${tier === 4 ? ' is-power' : ''}`} />
                  )}
                </span>
                <span className="eda-node__title">{ex.title}</span>
                {p?.finished && <span className="eda-node__pts">{p.bestScore} PTS</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </li>
  )
}

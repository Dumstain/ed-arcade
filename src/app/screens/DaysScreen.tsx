import { COURSE_DAYS, DEMO_DAY, DEMO_MODE, isDayOpen, isToday, opensLabel, type CourseDay, type DayNum } from '../../engine/course'
import { getDay } from '../../engine/content'
import { dayStats, isDayComplete } from '../../engine/progress'
import { rankFor } from '../../engine/scoring'
import { ACHIEVEMENTS } from '../../engine/achievements'
import { Fruit, Ghost, PacMan, Pellets, PixelIcon, sfx, toast } from '../../ui'
import { useGame } from '../game'
import { padScore, useCountUp } from '../hooks'

interface Props {
  onOpenDay: (day: DayNum) => void
}

export function DaysScreen({ onOpenDay }: Props) {
  const game = useGame()
  const total = useCountUp(game.total, 900)
  const r = rankFor(game.total)
  const have = new Set(game.player?.achievements ?? [])

  const days: CourseDay[] = DEMO_MODE ? [DEMO_DAY, ...COURSE_DAYS] : [...COURSE_DAYS]

  return (
    <div className="eda-days">
      <section className="eda-player px-panel" aria-label="Tu marcador">
        <div className="eda-player__row">
          <div className="eda-player__who">
            <span className="eda-player__label">JUGADOR</span>
            <span className="eda-player__control">{game.control}</span>
          </div>
          <div className="eda-player__score">
            <span className="eda-player__label">PUNTOS</span>
            <span className="eda-player__num">{padScore(total)}</span>
          </div>
        </div>
        <div className="eda-rank">
          <span className="eda-player__label">RANGO</span>
          <span className="eda-rank__name">{r.rank.name}</span>
        </div>
        <div className="eda-rankbar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(r.progress * 100)} aria-label="Avance al siguiente rango">
          <div className="eda-rankbar__fill" style={{ width: `${Math.round(r.progress * 100)}%` }} />
          <span className="eda-rankbar__pac" style={{ left: `clamp(0px, calc(${Math.round(r.progress * 100)}% - 10px), calc(100% - 20px))` }} aria-hidden="true">
            <PacMan size={20} dir="right" chomp />
          </span>
        </div>
        <p className="eda-rank__next">
          {r.next ? (
            <>
              Faltan <b>{r.next.min - game.total}</b> pts para <b>{r.next.name}</b>
            </>
          ) : (
            '¡Eres leyenda del laberinto!'
          )}
        </p>
        <ul className="eda-badges" aria-label="Logros">
          {ACHIEVEMENTS.map((a) => {
            const ok = have.has(a.id)
            return (
              <li key={a.id}>
                <button
                  type="button"
                  className={`eda-badge${ok ? ' is-on' : ''}`}
                  aria-label={`${a.title}: ${ok ? 'conseguido' : 'pendiente'}. ${a.desc}`}
                  title={`${a.title} — ${a.desc}`}
                  onClick={() => {
                    sfx.click()
                    toast(`${a.title}: ${a.desc}`, { icon: ok ? a.icon : 'lock' })
                  }}
                >
                  <span aria-hidden="true">{ok ? <PixelIcon name={a.icon} size={28} /> : '?'}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <h2 className="px-title eda-section-title">ELIGE TU DÍA</h2>

      <ol className="eda-daygrid">
        {days.map((d) => {
          const dc = getDay(d.day)
          const open = isDayOpen(d.day, game.remoteUnlocked)
          const playable = open && !!dc
          const st = dayStats(dc, game.prog)
          const done = !!dc && isDayComplete(dc, game.prog)
          const today = isToday(d.day)
          const label = d.day === 0 ? 'DÍA 0' : `DÍA ${d.day}`
          const cls = ['eda-daycard', playable ? 'is-open' : 'is-locked', done ? 'is-done' : '', today ? 'is-today' : ''].filter(Boolean).join(' ')

          const body = (
            <>
              <div className="eda-daycard__top">
                <span className="eda-daycard__icon" aria-hidden="true">
                  {open ? <Fruit kind={d.fruit} size={40} /> : <Ghost color="scared" size={40} float />}
                </span>
                <div className="eda-daycard__names">
                  <span className="eda-daycard__day">{d.day === 0 ? 'DÍA 0 · SALA DE PRUEBAS' : label}</span>
                  <span className="eda-daycard__title">{d.title}</span>
                </div>
                {today && <span className="eda-tag eda-tag--pac">HOY</span>}
                {done && (
                  <span className="eda-tag eda-tag--ok">
                    <PixelIcon name="check" size={14} />
                  </span>
                )}
              </div>
              {playable ? (
                <div className="eda-daycard__stats">
                  <Pellets total={st.total} done={st.finished} />
                  <span className="eda-daycard__nums">
                    <span>
                      {st.finished}/{st.total}
                    </span>
                    <span className="px-ico-text">
                      <PixelIcon name="star" size={18} /> {st.stars}/{st.maxStars}
                    </span>
                    <span>{st.points} PTS</span>
                  </span>
                </div>
              ) : (
                <div className="eda-daycard__lock">{open ? 'PRÓXIMAMENTE' : opensLabel(d.day)}</div>
              )}
            </>
          )

          return (
            <li key={d.day}>
              {playable ? (
                <button
                  type="button"
                  className={cls}
                  onClick={() => {
                    sfx.click()
                    onOpenDay(d.day)
                  }}
                  aria-label={`${label}: ${d.title}. ${st.finished} de ${st.total} ejercicios, ${st.stars} estrellas, ${st.points} puntos`}
                >
                  {body}
                </button>
              ) : (
                <div className={cls} aria-label={`${label}: ${d.title}. ${open ? 'Próximamente' : opensLabel(d.day)}`}>
                  {body}
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

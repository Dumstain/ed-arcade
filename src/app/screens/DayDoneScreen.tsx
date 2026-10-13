import { useEffect, useState } from 'react'
import { dayInfo, type DayNum } from '../../engine/course'
import { getDay } from '../../engine/content'
import { dayStats, isDayComplete } from '../../engine/progress'
import { aliasFor, fetchLeaderboard, flushQueue, remoteEnabled, type LeaderRow } from '../../engine/remote'
import { Fruit, PacMan, Stars, sfx } from '../../ui'
import { useGame } from '../game'
import { padScore } from '../hooks'

interface Props {
  day: DayNum
  onMap: () => void
  onDay: () => void
}

const ORD = (n: number) => `${n}º`

export function DayDoneScreen({ day, onMap, onDay }: Props) {
  const game = useGame()
  const dc = getDay(day)
  const info = dayInfo(day)
  const st = dayStats(dc, game.prog)
  const complete = !!dc && isDayComplete(dc, game.prog)
  const me = game.control ? aliasFor(game.control) : '****????'
  const [rows, setRows] = useState<LeaderRow[] | null>(null)
  const [loading, setLoading] = useState(remoteEnabled && day > 0)

  useEffect(() => {
    if (complete) sfx.levelUp()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!remoteEnabled || day === 0) return
    let alive = true
    // primero intenta subir los intentos pendientes (máx. 2.5 s) para que el ranking te incluya
    Promise.race([flushQueue(), new Promise((res) => setTimeout(res, 2500))])
      .then(() => fetchLeaderboard(day, 10))
      .then((r) => {
        if (!alive) return
        setRows(r)
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [day])

  // Tabla: remota si existe; si no, solo tu marcador local
  let table: (LeaderRow & { mine: boolean })[] = []
  if (rows && rows.length) {
    table = rows.map((r) => ({ ...r, mine: r.alias === me }))
    if (!table.some((r) => r.mine)) table.push({ alias: me, total: st.points, solved: st.solved, mine: true })
  } else {
    table = [{ alias: me, total: st.points, solved: st.solved, mine: true }]
  }
  const mineIdx = rows && rows.length ? rows.findIndex((r) => r.alias === me) : -1

  return (
    <div className="eda-dayend">
      <div className="eda-dayend__head">
        <Fruit kind={info.fruit} size={48} />
        <div>
          <h1 className="px-title eda-dayend__title">{complete ? `¡DÍA ${day} COMPLETADO!` : `DÍA ${day} · MARCADOR`}</h1>
          <p className="eda-muted">{info.title}</p>
        </div>
      </div>

      <section className="eda-summary px-panel" aria-label="Resumen del día">
        <Stars value={st.total ? Math.round(st.stars / st.total) : 0} size={32} animate />
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
      </section>

      <section className="eda-hiscore" aria-label="High scores">
        <h2 className="eda-hiscore__title">HIGH SCORES</h2>
        {loading ? (
          <p className="eda-hiscore__loading anim-blink">CARGANDO…</p>
        ) : (
          <table className="eda-hiscore__table">
            <thead>
              <tr>
                <th scope="col">RANK</th>
                <th scope="col">JUGADOR</th>
                <th scope="col">PUNTOS</th>
                <th scope="col">✓</th>
              </tr>
            </thead>
            <tbody>
              {table.map((r, i) => (
                <tr key={`${r.alias}-${i}`} className={r.mine ? 'is-me' : ''}>
                  <td>{r.mine && mineIdx < 0 && rows && rows.length ? '—' : ORD(i + 1)}</td>
                  <td>
                    {r.mine && <PacMan size={14} dir="right" />} {r.mine ? 'TÚ' : r.alias}
                  </td>
                  <td>{padScore(r.total)}</td>
                  <td>{r.solved}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!remoteEnabled && <p className="eda-muted eda-hiscore__note">MODO LOCAL: solo se muestra tu marcador.</p>}
        {remoteEnabled && !loading && !rows && <p className="eda-muted eda-hiscore__note">Sin conexión: se muestra solo tu marcador.</p>}
      </section>

      <div className="eda-dayend__actions">
        <button
          type="button"
          className="px-btn px-btn--primary px-btn--block"
          onClick={() => {
            sfx.click()
            onMap()
          }}
          autoFocus
        >
          MAPA DE DÍAS ▶
        </button>
        <button
          type="button"
          className="px-btn px-btn--block"
          onClick={() => {
            sfx.click()
            onDay()
          }}
        >
          REPASAR EL DÍA
        </button>
      </div>
    </div>
  )
}

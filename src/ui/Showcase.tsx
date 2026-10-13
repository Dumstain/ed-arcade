/**
 * Vitrina de QA del kit de UI 8-bit: muestra todos los componentes, clases y efectos.
 * Uso: renderizar <Showcase /> (export default) o abrir src/ui/showcase.html con `npx vite`.
 */
import { useRef, useState, type MouseEvent, type ReactNode } from 'react'
import {
  Banner,
  Fruit,
  Ghost,
  Intermission,
  Lives,
  Modal,
  PacMan,
  Pellets,
  PIXEL_ICONS,
  PixelIcon,
  RichText,
  SoundToggle,
  Stars,
  ThemeToggle,
  burst,
  floatText,
  sfx,
  shake,
  toast,
  useMuted,
  useTheme,
  type FruitKind,
  type GhostColor,
} from './index'
import './showcase.css'

const FRUITS: FruitKind[] = ['cherry', 'strawberry', 'orange', 'apple', 'melon']
const GHOSTS: GhostColor[] = ['red', 'pink', 'cyan', 'orange', 'scared']
const DIRS = ['right', 'left', 'up', 'down'] as const

function center(e: MouseEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="px-panel ui-sc-section">
      <h2 className="px-title ui-sc-h">{title}</h2>
      {children}
    </section>
  )
}

export default function Showcase() {
  const { theme } = useTheme()
  const [muted] = useMuted()
  const [done, setDone] = useState(3)
  const [lives, setLives] = useState(3)
  const [stars, setStars] = useState(3)
  const [starKey, setStarKey] = useState(0)
  const [banner, setBanner] = useState<{ text: string; tone: 'pac' | 'ok' | 'bad' | 'info' } | null>(null)
  const [modal, setModal] = useState(false)
  const [inter, setInter] = useState(false)
  const [anim, setAnim] = useState<string>('')
  const [animKey, setAnimKey] = useState(0)
  const [sel, setSel] = useState<number | null>(1)
  const [text, setText] = useState('')
  const shakeBox = useRef<HTMLDivElement>(null)
  const TOTAL = 10

  const sounds: [string, () => void][] = [
    ['click', sfx.click],
    ['waka', sfx.waka],
    ['correct', sfx.correct],
    ['wrong', sfx.wrong],
    ['death', sfx.death],
    ['powerUp', sfx.powerUp],
    ['levelUp', sfx.levelUp],
    ['start', sfx.start],
    ['achievement', sfx.achievement],
  ]

  return (
    <main className="ui-sc">
      <header className="ui-sc-top">
        <div className="ui-sc-brand">
          <PacMan size={28} />
          <h1 className="px-title ui-sc-h1">KIT UI 8-BIT</h1>
        </div>
        <div className="px-row">
          <ThemeToggle />
          <SoundToggle />
        </div>
      </header>
      <p className="ui-sc-note">
        Tema: <b>{theme === 'dark' ? 'oscuro' : 'claro'}</b> · Sonido: <b>{muted ? 'apagado' : 'encendido'}</b>
      </p>

      <Section title="BOTONES">
        <div className="px-row">
          <button className="px-btn" onClick={() => sfx.click()}>Normal</button>
          <button className="px-btn px-btn--primary" onClick={() => sfx.click()}>¡Jugar!</button>
          <button className="px-btn px-btn--danger" onClick={() => sfx.wrong()}>Borrar</button>
          <button className="px-btn px-btn--ghost" onClick={() => sfx.click()}>Fantasma</button>
          <button className="px-btn px-btn--sm" onClick={() => sfx.click()}>Chico</button>
          <button className="px-btn" disabled>Bloqueado</button>
        </div>
        <div className="ui-sc-gap" />
        <button className="px-btn px-btn--primary px-btn--block" onClick={() => sfx.correct()}>Comprobar</button>
      </Section>

      <Section title="SPRITES">
        <div className="px-row ui-sc-sprites">
          {DIRS.map((d) => (
            <span key={d} className="ui-sc-lbl">
              <PacMan size={40} dir={d} />
              <small>{d}</small>
            </span>
          ))}
          <span className="ui-sc-lbl">
            <PacMan size={40} chomp={false} />
            <small>quieto</small>
          </span>
        </div>
        <div className="px-row ui-sc-sprites">
          {GHOSTS.map((g, i) => (
            <span key={g} className="ui-sc-lbl">
              <Ghost color={g} size={40} float={i % 2 === 0} />
              <small>{g}</small>
            </span>
          ))}
        </div>
        <div className="px-row ui-sc-sprites">
          {FRUITS.map((f, i) => (
            <span key={f} className="ui-sc-lbl">
              <Fruit kind={f} size={40} />
              <small>Día {i + 1}</small>
            </span>
          ))}
        </div>
      </Section>

      <Section title="PROGRESO">
        <Pellets total={TOTAL} done={done} />
        <div className="px-row ui-sc-ctrl">
          <button className="px-btn px-btn--sm" onClick={() => setDone((d) => Math.max(0, d - 1))} aria-label="Retroceder">◀</button>
          <span className="ui-sc-num">{done}/{TOTAL}</span>
          <button
            className="px-btn px-btn--sm"
            aria-label="Avanzar"
            onClick={() => {
              sfx.waka()
              setDone((d) => Math.min(TOTAL, d + 1))
            }}
          >
            ▶
          </button>
        </div>
        <div className="px-row ui-sc-ctrl">
          <Lives lives={lives} max={3} />
          <button
            className="px-btn px-btn--sm px-btn--danger"
            onClick={() => {
              if (lives > 0) {
                sfx.wrong()
                setLives(lives - 1)
              }
            }}
          >
            -1 vida
          </button>
          <button className="px-btn px-btn--sm" onClick={() => setLives(3)}>Reiniciar</button>
        </div>
        <div className="px-row ui-sc-ctrl">
          <Stars key={starKey} value={stars} animate size={32} />
          {[0, 1, 2, 3].map((n) => (
            <button
              key={n}
              className="px-btn px-btn--sm"
              onClick={() => {
                setStars(n)
                setStarKey((k) => k + 1)
              }}
            >
              {n} <PixelIcon name="star" size={14} />
            </button>
          ))}
        </div>
      </Section>

      <Section title="ÍCONOS PIXEL">
        <div className="px-row ui-sc-sprites">
          {PIXEL_ICONS.map((n) => (
            <span key={n} className="ui-sc-lbl">
              <PixelIcon name={n} size={24} />
              <small>{n}</small>
            </span>
          ))}
        </div>
        <div className="px-row">
          {[12, 16, 18, 24, 36].map((s) => (
            <PixelIcon key={s} name="trophy" size={s} />
          ))}
          <button className="px-btn px-btn--sm">
            <PixelIcon name="bulb" size={18} /> Pista
          </button>
        </div>
      </Section>

      <Section title="TEXTO DESTACADO">
        <p className="ui-sc-p">
          <RichText text="La **búsqueda binaria** descarta la mitad en cada paso: es **O(log n)**." />
        </p>
      </Section>

      <Section title="CELDAS Y FICHAS">
        <div className="px-row">
          <span className="px-cell">7</span>
          <span className="px-cell is-selected">3</span>
          <span className="px-cell is-correct">5</span>
          <span className="px-cell is-wrong">9</span>
          <span className="px-cell is-hl">2</span>
          <span className="px-cell is-dim">8</span>
          <span className="px-cell is-empty">?</span>
        </div>
        <small className="ui-sc-legend">normal · is-selected · is-correct · is-wrong · is-hl · is-dim · is-empty</small>
        <div className="ui-sc-gap" />
        <div className="px-row">
          {[4, 8, 15, 16].map((v, i) => (
            <button
              key={v}
              className={`px-cell${sel === i ? ' is-selected' : ''}`}
              aria-pressed={sel === i}
              onClick={() => {
                sfx.click()
                setSel(i)
              }}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="ui-sc-gap" />
        <div className="px-row">
          <button className="px-chip" onClick={() => sfx.click()}>push(5)</button>
          <button className="px-chip is-selected">pop()</button>
          <button className="px-chip is-correct">peek()</button>
          <button className="px-chip is-wrong">isEmpty()</button>
        </div>
      </Section>

      <Section title="CÓDIGO E INPUT">
        <pre className="px-code">{`int medio = (inicio + fin) / 2;\nif (a[medio] == x) return medio;`}</pre>
        <div className="ui-sc-gap" />
        <div className="px-col">
          <label htmlFor="ui-sc-input" className="ui-sc-note">Tu apodo:</label>
          <input id="ui-sc-input" className="px-input" value={text} placeholder="AAA" maxLength={10} onChange={(e) => setText(e.target.value.toUpperCase())} />
        </div>
      </Section>

      <Section title="ANIMACIONES">
        <div className="px-row">
          {['anim-shake', 'anim-pop', 'anim-blink', 'anim-float'].map((a) => (
            <button
              key={a}
              className="px-btn px-btn--sm"
              onClick={() => {
                setAnim(a)
                setAnimKey((k) => k + 1)
              }}
            >
              {a.replace('anim-', '')}
            </button>
          ))}
        </div>
        <div className="ui-sc-gap" />
        <span key={animKey} className={`px-cell is-hl ${anim}`}>42</span>
      </Section>

      <Section title="SONIDOS">
        <div className="px-row">
          {sounds.map(([n, fn]) => (
            <button key={n} className="px-btn px-btn--sm" onClick={() => fn()}>
              {n}
            </button>
          ))}
          {[1, 3, 6, 10].map((n) => (
            <button key={n} className="px-btn px-btn--sm" onClick={() => sfx.combo(n)}>
              combo {n}
            </button>
          ))}
        </div>
      </Section>

      <Section title="JUGO">
        <div className="px-row" ref={shakeBox}>
          <button
            className="px-btn px-btn--primary"
            onClick={(e) => {
              const c = center(e)
              sfx.correct()
              burst(c.x, c.y)
              floatText(c.x, c.y - 30, '+150')
            }}
          >
            Burst +150
          </button>
          <button
            className="px-btn"
            onClick={(e) => {
              const c = center(e)
              burst(c.x, c.y, { color: 'var(--ok)', count: 10 })
              floatText(c.x, c.y - 30, '¡BIEN!', { color: 'var(--ok)' })
            }}
          >
            Burst verde
          </button>
          <button
            className="px-btn px-btn--danger"
            onClick={() => {
              sfx.wrong()
              shake()
            }}
          >
            Sacudir
          </button>
          <button
            className="px-btn"
            onClick={() => {
              sfx.wrong()
              shake(shakeBox.current)
            }}
          >
            Sacudir fila
          </button>
          <button
            className="px-btn"
            onClick={() => {
              sfx.achievement()
              toast('¡LOGRO DESBLOQUEADO!', { icon: 'trophy' })
            }}
          >
            Toast
          </button>
          <button className="px-btn" onClick={() => toast('Pista usada: -30%')}>Toast simple</button>
        </div>
      </Section>

      <Section title="ESCENAS">
        <div className="px-row">
          <button
            className="px-btn px-btn--primary"
            onClick={() => {
              sfx.start()
              setBanner({ text: 'READY!', tone: 'pac' })
            }}
          >
            Ready!
          </button>
          <button
            className="px-btn"
            onClick={() => {
              sfx.levelUp()
              setBanner({ text: '¡PERFECTO!', tone: 'ok' })
            }}
          >
            Perfecto
          </button>
          <button
            className="px-btn px-btn--danger"
            onClick={() => {
              sfx.death()
              setBanner({ text: 'GAME OVER', tone: 'bad' })
            }}
          >
            Game over
          </button>
          <button className="px-btn" onClick={() => setBanner({ text: 'NIVEL 2', tone: 'info' })}>Info</button>
          <button className="px-btn" onClick={() => setModal(true)}>Modal</button>
          <button className="px-btn" onClick={() => setInter(true)}>Intermedio</button>
        </div>
      </Section>

      {banner && <Banner text={banner.text} tone={banner.tone} onDone={() => setBanner(null)} />}
      <Modal open={modal} title="¡NIVEL COMPLETADO!" onClose={() => setModal(false)}>
        <div className="px-col">
          <Stars value={2} animate />
          <p className="ui-sc-p">
            <RichText text="Las pilas funcionan como platos: el último que pones es el primero que sacas (**LIFO**)." />
          </p>
          <div className="px-row">
            <button className="px-btn px-btn--primary" onClick={() => setModal(false)}>Siguiente</button>
            <button className="px-btn px-btn--ghost" onClick={() => setModal(false)}>Repetir</button>
          </div>
        </div>
      </Modal>
      {inter && <Intermission onDone={() => setInter(false)} />}
    </main>
  )
}

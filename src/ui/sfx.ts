/**
 * Efectos de sonido chiptune con WebAudio (sin archivos).
 * - AudioContext perezoso: se crea/reanuda en el primer gesto del usuario.
 * - Mute persistente en localStorage('ed:muted'); por defecto CON sonido.
 * - Volumen moderado (salón con ~30 compus).
 */

const MUTE_KEY = 'ed:muted'
const MASTER_VOLUME = 0.11

type Wave = OscillatorType

let ctx: AudioContext | null = null
let master: GainNode | null = null
let noiseBuf: AudioBuffer | null = null
let muted = readMuted()
let wakaFlip = false
const listeners = new Set<(m: boolean) => void>()

function readMuted(): boolean {
  try {
    const v = localStorage.getItem(MUTE_KEY)
    return v === '1' || v === 'true'
  } catch {
    return false
  }
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    try {
      ctx = new AC()
    } catch {
      return null
    }
    master = ctx.createGain()
    master.gain.value = MASTER_VOLUME
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
  return ctx
}

/** ¿Ya hubo un gesto del usuario? (crear el AudioContext antes genera avisos y queda suspendido) */
let gestured = false
function hasGesture(): boolean {
  if (gestured) return true
  try {
    const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation
    if (ua?.hasBeenActive) gestured = true
  } catch {
    /* ignorar */
  }
  return gestured
}

/** Desbloquea el audio en el primer gesto del usuario (política de autoplay). */
function installUnlock() {
  if (typeof window === 'undefined') return
  const unlock = () => {
    gestured = true
    getCtx()
    window.removeEventListener('pointerdown', unlock, true)
    window.removeEventListener('keydown', unlock, true)
    window.removeEventListener('touchstart', unlock, true)
  }
  window.addEventListener('pointerdown', unlock, true)
  window.addEventListener('keydown', unlock, true)
  window.addEventListener('touchstart', unlock, true)
}
installUnlock()

interface ToneOpts {
  type?: Wave
  vol?: number
  /** frecuencia final (barrido lineal) */
  to?: number
  /** vibrato: [velocidad Hz, profundidad Hz] */
  vibrato?: [number, number]
}

/** Nota con envolvente corta. `at` en segundos relativo a ahora. */
function tone(freq: number, at: number, dur: number, o: ToneOpts = {}) {
  const ac = ctx
  if (!ac || !master) return
  const t0 = ac.currentTime + at
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = o.type ?? 'square'
  osc.frequency.setValueAtTime(freq, t0)
  if (o.to !== undefined) osc.frequency.linearRampToValueAtTime(o.to, t0 + dur)
  const vol = o.vol ?? 0.5
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.linearRampToValueAtTime(vol, t0 + 0.005)
  g.gain.setValueAtTime(vol, t0 + Math.max(0.006, dur - 0.03))
  g.gain.linearRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g)
  g.connect(master)
  let lfo: OscillatorNode | null = null
  if (o.vibrato) {
    lfo = ac.createOscillator()
    const lg = ac.createGain()
    lfo.type = 'square'
    lfo.frequency.value = o.vibrato[0]
    lg.gain.value = o.vibrato[1]
    lfo.connect(lg)
    lg.connect(osc.frequency)
    lfo.start(t0)
    lfo.stop(t0 + dur + 0.02)
  }
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
  osc.onended = () => {
    osc.disconnect()
    g.disconnect()
    lfo?.disconnect()
  }
}

/** Ráfaga de ruido (percusión 8-bit). */
function noise(at: number, dur: number, vol = 0.3, rate = 1) {
  const ac = ctx
  if (!ac || !master) return
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.5), ac.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  const t0 = ac.currentTime + at
  const src = ac.createBufferSource()
  src.buffer = noiseBuf
  src.playbackRate.value = rate
  const g = ac.createGain()
  g.gain.setValueAtTime(vol, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(g)
  g.connect(master)
  src.start(t0)
  src.stop(t0 + dur + 0.02)
  src.onended = () => {
    src.disconnect()
    g.disconnect()
  }
}

/** Ejecuta `fn` solo si hay sonido y AudioContext disponible. */
function play(fn: () => void) {
  if (muted) return
  if (!ctx && !hasGesture()) return // sin gesto todavía: silencio (no crear el AudioContext)
  if (!getCtx()) return
  try {
    fn()
  } catch {
    /* audio nunca debe romper el juego */
  }
}

// Notas (Hz)
const N = {
  C3: 130.81, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0, B5: 987.77,
  C6: 1046.5, D6: 1174.66, E6: 1318.51, G6: 1567.98,
}

export const sfx = {
  click: () => play(() => tone(1200, 0, 0.035, { vol: 0.25 })),

  /** "wa-ka": alterna barrido descendente / ascendente */
  waka: () =>
    play(() => {
      wakaFlip = !wakaFlip
      if (wakaFlip) tone(520, 0, 0.1, { type: 'triangle', to: 240, vol: 0.9 })
      else tone(240, 0, 0.1, { type: 'triangle', to: 520, vol: 0.9 })
    }),

  /** Arpegio ascendente feliz */
  correct: () =>
    play(() => {
      const notes = [N.C5, N.E5, N.G5, N.C6]
      notes.forEach((f, i) => tone(f, i * 0.07, 0.08, { vol: 0.4 }))
      tone(N.E6, 0.28, 0.18, { vol: 0.3, type: 'triangle' })
      tone(N.C6, 0.28, 0.18, { vol: 0.25 })
    }),

  /** Bajada corta */
  wrong: () =>
    play(() => {
      tone(311, 0, 0.11, { type: 'sawtooth', vol: 0.3 })
      tone(208, 0.11, 0.2, { type: 'sawtooth', vol: 0.3, to: 150 })
    }),

  /** Bajada larga con vibrato + dos "pops" */
  death: () =>
    play(() => {
      tone(880, 0, 1.25, { type: 'square', to: 110, vol: 0.32, vibrato: [14, 40] })
      tone(160, 1.32, 0.08, { type: 'square', to: 520, vol: 0.3 })
      tone(160, 1.46, 0.08, { type: 'square', to: 520, vol: 0.3 })
    }),

  /** Sirena (power pellet) */
  powerUp: () =>
    play(() => {
      for (let i = 0; i < 4; i++) {
        tone(380, i * 0.18, 0.09, { type: 'triangle', to: 820, vol: 0.7 })
        tone(820, i * 0.18 + 0.09, 0.09, { type: 'triangle', to: 380, vol: 0.7 })
      }
    }),

  /** Blip que sube un semitono por cada acierto seguido */
  combo: (n: number) =>
    play(() => {
      const k = Math.max(0, Math.min(24, Math.floor(n) || 0))
      const f = N.C5 * Math.pow(2, k / 12)
      tone(f, 0, 0.06, { vol: 0.35 })
      tone(f * 1.5, 0.06, 0.09, { vol: 0.3 })
    }),

  /** Fanfarria corta */
  levelUp: () =>
    play(() => {
      const seq: [number, number, number][] = [
        [N.G4, 0, 0.09], [N.C5, 0.1, 0.09], [N.E5, 0.2, 0.09], [N.G5, 0.3, 0.16],
        [N.E5, 0.48, 0.09], [N.G5, 0.58, 0.4],
      ]
      seq.forEach(([f, at, d]) => tone(f, at, d, { vol: 0.4 }))
      tone(N.C3, 0, 0.28, { type: 'triangle', vol: 0.6 })
      tone(N.G3, 0.3, 0.28, { type: 'triangle', vol: 0.6 })
      tone(N.C4, 0.58, 0.4, { type: 'triangle', vol: 0.6 })
      noise(0.3, 0.08, 0.15, 1.5)
      noise(0.58, 0.12, 0.15, 1.5)
    }),

  /** Jingle ORIGINAL de ~2 s (progresión I–IV–V–I en arpegios) */
  start: () =>
    play(() => {
      const s = 0.125
      const mel = [
        N.C5, N.E5, N.G5, N.E5,
        N.F5, N.A5, N.C6, N.A5,
        N.G5, N.B5, N.D6, N.B5,
      ]
      mel.forEach((f, i) => tone(f, i * s, s * 0.9, { vol: 0.32 }))
      tone(N.C6, 12 * s, 0.32, { vol: 0.32 })
      tone(N.G5, 12 * s, 0.32, { vol: 0.2, type: 'triangle' })
      const bass = [N.C3, N.F3, N.G3]
      bass.forEach((f, i) => {
        tone(f, i * 4 * s, s * 1.8, { type: 'triangle', vol: 0.7 })
        tone(f * 2, i * 4 * s + s * 2, s * 1.8, { type: 'triangle', vol: 0.6 })
      })
      tone(N.C3, 12 * s, 0.35, { type: 'triangle', vol: 0.7 })
      for (let i = 0; i < 13; i += 2) noise(i * s, 0.04, 0.12, 2)
    }),

  /** Campanita */
  achievement: () =>
    play(() => {
      tone(N.E6, 0, 0.12, { type: 'triangle', vol: 0.6 })
      tone(N.G6, 0.12, 0.35, { type: 'triangle', vol: 0.55 })
      tone(N.B5 * 2, 0.12, 0.35, { type: 'sine', vol: 0.2 })
    }),

  setMuted: (m: boolean) => {
    muted = m
    try {
      localStorage.setItem(MUTE_KEY, m ? '1' : '0')
    } catch {
      /* sin storage: solo en memoria */
    }
    if (!m && hasGesture()) getCtx()
    listeners.forEach((fn) => fn(m))
  },

  isMuted: () => muted,
}

/** Suscripción interna para useMuted (no forma parte de la API pública). */
export function subscribeMuted(fn: (m: boolean) => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

// Sincroniza entre pestañas
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === MUTE_KEY) {
      muted = readMuted()
      listeners.forEach((fn) => fn(muted))
    }
  })
}

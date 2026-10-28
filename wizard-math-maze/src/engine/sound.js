// --- Sound -------------------------------------------------------------------
//
// Procedural, for the same reason the art is: no files to download, nothing to
// license, nothing to keep in sync with a build. A door closing is a couple of
// oscillators and an envelope, and it costs the project nothing to carry.
//
// THE ONE RULE APPLIES HERE TOO, and this is the easiest place in the whole app
// to break it by accident. A wrong answer gets a soft, warm, NEUTRAL tone — no
// descending interval, no buzzer, nothing a game show would use to tell you
// that you are out. "Go again" has a sound and "you failed" has a sound, and
// they are not the same sound. If someone later reaches for juicier feedback,
// `again()` is the function to leave alone.
//
// Everything here is safe to call when there is no audio at all: before the
// first tap, in a headless browser, in plain node, or when a child has muted
// it. Nothing throws, nothing warns, the call simply does nothing.

let ctx = null
let master = null
let enabled = true

/** Mute without tearing anything down. Returns the state after any change. */
export function soundEnabled(next) {
  if (next !== undefined) enabled = !!next
  return enabled
}

/**
 * Start (or resume) the audio clock. MUST be called from inside a real user
 * gesture: iOS refuses to create a running AudioContext any other way, and a
 * context created at page load is born suspended and stays silent forever with
 * no error to tell you why.
 */
export function wakeSound() {
  try {
    const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
    if (!AC) return null
    if (!ctx) {
      ctx = new AC()
      master = ctx.createGain()
      // Quiet by default. This is played in bedrooms and classrooms, and nobody
      // ever wished a maths game were louder.
      master.gain.value = 0.18
      master.connect(ctx.destination)
    }
    // ALWAYS try to resume, including on a context we just made. Safari hands
    // back a context that is already suspended more often than not, and the
    // first version only resumed one it found suspended on a LATER call — so a
    // context born asleep stayed asleep, silently, forever.
    if (ctx.state !== 'running') ctx.resume().catch(() => {})
    // The unlock itself: iOS treats a context as unlocked once something has
    // actually been played through it inside a gesture. One silent frame does
    // that without making a sound.
    try {
      const b = ctx.createBufferSource()
      b.buffer = ctx.createBuffer(1, 1, ctx.sampleRate)
      b.connect(ctx.destination)
      b.start(0)
    } catch { /* nothing to unlock, or already unlocked */ }
    return ctx
  } catch { return null }
}

/**
 * Is there actually audio? Not "is sound switched on" — whether the browser has
 * given us a running clock. The two are different, and the difference is the
 * whole of this bug: the setting said ON while the context was asleep, so every
 * sound no-opped and nothing anywhere said why.
 */
export function soundReady() {
  return !!(ctx && ctx.state === 'running')
}

const live = () => {
  if (!enabled || !ctx) return null
  if (ctx.state !== 'running') {
    // Nudge it, so the NEXT sound has a chance even if this one is lost. A
    // context can be suspended again by the OS at any time — a phone call, a
    // backgrounded tab — and nothing else would ever wake it.
    ctx.resume().catch(() => {})
    return null
  }
  return ctx
}

/**
 * One note. `slide` bends the pitch over the life of the note, which is most of
 * the character of everything below — a flat sine is a test tone, a sine that
 * moves is an event.
 */
function tone({ freq, dur = 0.18, type = 'sine', delay = 0, gain = 0.5, slide = null, attack = 0.006 }) {
  const c = live()
  if (!c) return
  try {
    const t0 = c.currentTime + delay
    const osc = c.createOscillator()
    const amp = c.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t0)
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t0 + dur)
    // A ramp to exactly zero is undefined for exponential curves, hence 0.0001.
    amp.gain.setValueAtTime(0.0001, t0)
    amp.gain.exponentialRampToValueAtTime(gain, t0 + attack)
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(amp); amp.connect(master)
    osc.start(t0); osc.stop(t0 + dur + 0.02)
  } catch { /* never let a sound break a maze */ }
}

/** A short burst of filtered noise — the body of anything made of stone. */
function thud({ delay = 0, dur = 0.16, cut = 320, gain = 0.5 }) {
  const c = live()
  if (!c) return
  try {
    const t0 = c.currentTime + delay
    const n = Math.floor(c.sampleRate * dur)
    const buf = c.createBuffer(1, n, c.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n)
    const src = c.createBufferSource(); src.buffer = buf
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cut
    const amp = c.createGain(); amp.gain.value = gain
    src.connect(lp); lp.connect(amp); amp.connect(master)
    src.start(t0)
  } catch { /* as above */ }
}

// --- The sounds themselves ---------------------------------------------------

/**
 * A door opening. The most-heard sound in the game by a wide margin, so it is
 * short, soft, and never twice the same: the pitch wanders a little each time,
 * because a sound that is identical on the fiftieth door stops being a door and
 * becomes a dripping tap.
 */
export function door() {
  const v = 0.92 + Math.random() * 0.16
  thud({ dur: 0.18, cut: 300 * v, gain: 0.35 })
  tone({ freq: 190 * v, slide: 120 * v, dur: 0.26, type: 'sine', gain: 0.3 })
}

/** A rune picked up: small, glassy, over before you think about it. */
export function rune() {
  const v = 0.97 + Math.random() * 0.06
  tone({ freq: 1180 * v, dur: 0.1, type: 'triangle', gain: 0.26 })
  tone({ freq: 1760 * v, dur: 0.14, type: 'sine', gain: 0.16, delay: 0.045 })
}

/** The Great Rune. The same idea, three times, going up. */
export function greatRune() {
  const notes = [880, 1320, 1760]
  notes.forEach((f, i) => {
    tone({ freq: f, dur: 0.2, type: 'triangle', gain: 0.24, delay: i * 0.085 })
    tone({ freq: f * 2, dur: 0.26, type: 'sine', gain: 0.1, delay: i * 0.085 + 0.02 })
  })
}

/** A correct answer: a rising third. Brief — the door sound follows it. */
export function right() {
  tone({ freq: 660, dur: 0.11, type: 'sine', gain: 0.3 })
  tone({ freq: 880, dur: 0.16, type: 'sine', gain: 0.28, delay: 0.085 })
}

/**
 * A wrong answer. Read the note at the top of this file before changing it.
 *
 * One warm tone, level, gone quickly. It does not fall, it does not buzz, and
 * it is quieter than the correct answer — it marks the moment without judging
 * it. The door still opens; she just goes again.
 */
export function again() {
  tone({ freq: 392, dur: 0.17, type: 'sine', gain: 0.17 })
}

/** A new rank. The one real fanfare in the game, so it can afford four notes. */
export function rankUp() {
  const notes = [523.25, 659.25, 783.99, 1046.5]
  notes.forEach((f, i) => {
    tone({ freq: f, dur: i === 3 ? 0.5 : 0.17, type: 'triangle', gain: 0.26, delay: i * 0.11 })
    tone({ freq: f / 2, dur: i === 3 ? 0.55 : 0.2, type: 'sine', gain: 0.12, delay: i * 0.11 })
  })
}

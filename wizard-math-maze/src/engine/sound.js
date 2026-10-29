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

/**
 * The sounds' own randomness, deliberately not the global one.
 *
 * Every noise burst needs a few thousand random samples, and a footstep is two
 * bursts — so once walking made a sound, the game was drawing ten thousand
 * numbers per step out of the same stream the maze, the rune placement and the
 * encounter rolls draw from. Gameplay became a function of how many sounds had
 * played, and the seeded tests started wandering off: `coachtest` simply
 * stopped finding a door. Cosmetic dither must not be able to move the game, so
 * it gets a generator of its own (mulberry32, the same one the tests seed with).
 */
let seed = 0x9e3779b9
const rnd = () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = seed
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/**
 * Pre-rolled noise, three variants per length.
 *
 * Same lesson as `grain()` in the art: the fix for "this costs too much" is
 * caching, not doing less of it. Filling a fresh buffer per burst meant about
 * four thousand numbers and a fresh allocation on every footstep. Three
 * variants stop a step from being literally the same sample each time, and the
 * cutoff still wobbles per step on top of that.
 */
const noiseCache = new Map()
function noiseBuffer(c, dur) {
  const key = Math.round(dur * 1000)
  let bank = noiseCache.get(key)
  if (!bank) {
    const n = Math.max(1, Math.floor(c.sampleRate * dur))
    bank = []
    for (let v = 0; v < 3; v++) {
      const buf = c.createBuffer(1, n, c.sampleRate)
      const d = buf.getChannelData(0)
      for (let i = 0; i < n; i++) d[i] = (rnd() * 2 - 1) * (1 - i / n)
      bank.push(buf)
    }
    noiseCache.set(key, bank)
  }
  return bank[(rnd() * bank.length) | 0]
}

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
      // Quiet by default — this is played in bedrooms and classrooms. One
      // number for the whole app, so turning everything up or down is a
      // one-character change. It was 0.18, which measured so conservatively
      // (the loudest sound in the game peaked at 13% of full scale) that a
      // tablet at half volume barely carried a footstep.
      master.gain.value = 0.26
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

/**
 * A short burst of filtered noise — the body of anything made of stone.
 *
 * `cut` is the lowpass: low for stone and footfalls, high for a scuff. `hp`
 * adds a highpass on top of it, which turns the same burst into cloth, air or
 * a spark. Everything percussive in the game is this function twice: one dark
 * layer for the mass, one bright layer for the surface.
 */
function thud({ delay = 0, dur = 0.16, cut = 320, gain = 0.5, hp = 0 }) {
  const c = live()
  if (!c) return
  try {
    const t0 = c.currentTime + delay
    const src = c.createBufferSource(); src.buffer = noiseBuffer(c, dur)
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cut
    const amp = c.createGain(); amp.gain.value = gain
    let tail = lp
    if (hp) {
      const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp
      lp.connect(f); tail = f
    }
    src.connect(lp); tail.connect(amp); amp.connect(master)
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
  const v = 0.92 + rnd() * 0.16
  thud({ dur: 0.18, cut: 300 * v, gain: 0.35 })
  tone({ freq: 190 * v, slide: 120 * v, dur: 0.26, type: 'sine', gain: 0.3 })
}

/** A rune picked up: small, glassy, over before you think about it. */
export function rune() {
  const v = 0.97 + rnd() * 0.06
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

// --- The world ---------------------------------------------------------------
//
// Everything below here is ambient: it happens constantly and nobody should
// ever notice it individually. The budget matters more than the design, and
// gain numbers are a bad guide to it — a 210Hz footstep and a 660Hz blip at the
// same gain are nowhere near the same loudness to an ear or to a tablet
// speaker. `soundsheet.mjs` renders every sound offline and prints A-weighted
// loudness, which is the only way to check this without ears. As measured
// there, the four constant sounds (step, key, turn, erase) are the four
// quietest things in the game: a footstep is ~7dB under a door and ~12dB under
// a rank-up, and a keypress ~5dB under a door. Keep them there. If one of them
// is ever described as "nice", it is too loud.

let foot = 0

/**
 * A footstep. Alternates between two slightly different weights, because a
 * perfectly identical step is the single most obvious tell in game audio — ten
 * of them in a row and you are listening to a machine, not walking.
 */
export function step() {
  foot ^= 1
  const v = (foot ? 1 : 0.86) * (0.96 + rnd() * 0.08)
  thud({ dur: 0.085, cut: 210 * v, gain: 0.17 })
  thud({ dur: 0.05, cut: 1500 * v, hp: 600, gain: 0.055, delay: 0.012 })
}

/** Turning on the spot: cloth, not stone. No footfall, because her feet pivot. */
export function turn() {
  thud({ dur: 0.14, cut: 2800, hp: 900, gain: 0.055 })
}

/**
 * A digit going into the answer box.
 *
 * Pitched by the digit, so typing 1-7-7 sounds like 1-7-7 and not like three
 * identical clicks. That is nearly subliminal and it is the whole point: the
 * box fills up audibly. Short and quiet by necessity — this is the most-fired
 * sound in the game after the footstep, and a child mashing the pad must not
 * be punished for it.
 */
export function key(digit) {
  const n = Number(digit)
  const f = 520 + (Number.isFinite(n) ? n : 5) * 28
  tone({ freq: f, dur: 0.05, type: 'triangle', gain: 0.095, attack: 0.003 })
  thud({ dur: 0.03, cut: 3000, hp: 1300, gain: 0.03 })
}

/**
 * Backspace. This one falls, and it is the only sound in the game allowed to.
 *
 * A short downward slide is what "undo" sounds like everywhere, and the one
 * rule is about VERDICTS: a sound that follows an answer must not pass judgement
 * on it. Clearing a digit she chose to clear is not a verdict on anything.
 */
export function erase() {
  tone({ freq: 400, slide: 300, dur: 0.07, type: 'sine', gain: 0.15 })
}

/** A panel, a screen, a change of place. Barely there on purpose. */
export function page() {
  thud({ dur: 0.18, cut: 1700, hp: 400, gain: 0.075 })
  tone({ freq: 523.25, dur: 0.1, type: 'sine', gain: 0.1 })
}

// --- Moments ------------------------------------------------------------------

/**
 * Something lands in the corridor. The one deliberately startling sound in the
 * game, and it still rises rather than falls — an arrival, not a threat. The
 * sawtooth is the only one in the file and it is mixed very low; it supplies a
 * growl under the swell without ever being audible as a buzz.
 */
export function ambush() {
  thud({ dur: 0.3, cut: 250, gain: 0.55 })
  tone({ freq: 110, slide: 225, dur: 0.42, type: 'sawtooth', gain: 0.14 })
  tone({ freq: 330, slide: 500, dur: 0.3, type: 'triangle', gain: 0.13, delay: 0.1 })
  tone({ freq: 880, dur: 0.18, type: 'sine', gain: 0.09, delay: 0.26 })
}

/** A bolt leaving the wand: a spark, then the hit landing a beat later. */
export function bolt() {
  tone({ freq: 1400, slide: 430, dur: 0.16, type: 'sawtooth', gain: 0.07 })
  thud({ dur: 0.14, cut: 6000, hp: 1900, gain: 0.09 })
  tone({ freq: 660, dur: 0.1, type: 'sine', gain: 0.13, delay: 0.1 })
}

/**
 * The runes scatter, or a creature's spell completes. An encounter lost.
 *
 * The notes are deliberately out of order — 1320, 990, 1560, 1180 — so this
 * cannot be heard as a sad cadence. It is glass drifting out of reach: the
 * moment is over, nothing was taken, she keeps every point she had. A
 * descending run here would say "you failed", and losing an encounter in this
 * game costs nothing at all.
 */
export function scatter() {
  const notes = [1320, 990, 1560, 1180]
  notes.forEach((f, i) => tone({ freq: f, dur: 0.22, type: 'sine', gain: 0.07, delay: i * 0.055 }))
  thud({ dur: 0.4, cut: 5000, hp: 2300, gain: 0.05, delay: 0.05 })
}

/** An encounter won. Three notes — smaller than a rank, bigger than a rune. */
export function victory() {
  const notes = [587.33, 739.99, 880]
  notes.forEach((f, i) => tone({ freq: f, dur: 0.22, type: 'triangle', gain: 0.22, delay: i * 0.07 }))
  tone({ freq: 1174.66, dur: 0.34, type: 'sine', gain: 0.12, delay: 0.21 })
}

/**
 * Out through the gate. The end of a whole maze, so it is the longest sound
 * here: stone grinding, then the way opening. Earned rarely enough to be big.
 */
export function exit() {
  thud({ dur: 0.5, cut: 190, gain: 0.62 })
  thud({ dur: 0.3, cut: 1000, gain: 0.14, delay: 0.06 })
  tone({ freq: 196, slide: 392, dur: 0.6, type: 'sine', gain: 0.24, delay: 0.05 })
  const notes = [392, 523.25, 659.25]
  notes.forEach((f, i) => tone({ freq: f, dur: 0.5, type: 'triangle', gain: 0.21, delay: 0.26 + i * 0.09 }))
}

/**
 * The way out is still sealed. Two knocks on something solid, level pitch, no
 * slide anywhere in it — it reports that the stone is thick, which is a fact
 * about the door and not about her. Compare `again()`: same reasoning.
 */
export function sealed() {
  thud({ dur: 0.1, cut: 230, gain: 0.42 })
  tone({ freq: 147, dur: 0.18, type: 'sine', gain: 0.14, delay: 0.02 })
  thud({ dur: 0.12, cut: 210, gain: 0.36, delay: 0.14 })
}

/**
 * Something is revealed: a hint bought with a rune stone, the Attunement's
 * verdict, the card that welcomes her back. Rising, open, and the same sound
 * each time, so "the castle is telling you something" has one voice.
 */
export function shimmer() {
  tone({ freq: 784, dur: 0.14, type: 'sine', gain: 0.14 })
  tone({ freq: 1046.5, dur: 0.18, type: 'triangle', gain: 0.12, delay: 0.06 })
  tone({ freq: 1568, dur: 0.22, type: 'sine', gain: 0.08, delay: 0.12 })
}

/** Rune stones spent on something she gets to keep. */
export function buy() {
  thud({ dur: 0.08, cut: 5200, hp: 2600, gain: 0.07 })
  tone({ freq: 1046.5, dur: 0.1, type: 'triangle', gain: 0.2 })
  tone({ freq: 1396.91, dur: 0.14, type: 'triangle', gain: 0.17, delay: 0.06 })
  tone({ freq: 2093, dur: 0.2, type: 'sine', gain: 0.09, delay: 0.12 })
}

/** A new rank. The one real fanfare in the game, so it can afford four notes. */
export function rankUp() {
  const notes = [523.25, 659.25, 783.99, 1046.5]
  notes.forEach((f, i) => {
    tone({ freq: f, dur: i === 3 ? 0.5 : 0.17, type: 'triangle', gain: 0.26, delay: i * 0.11 })
    tone({ freq: f / 2, dur: i === 3 ? 0.55 : 0.2, type: 'sine', gain: 0.12, delay: i * 0.11 })
  })
}

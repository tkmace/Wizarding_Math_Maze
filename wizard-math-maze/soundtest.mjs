// The sounds, against a stand-in for WebAudio.
//
// Mostly here for one assertion: a wrong answer must not sound like a failure.
// That is the easiest rule in the app to break by accident later, by someone
// reaching for juicier feedback, and it is invisible in code review.
import * as sfx from './src/engine/sound.js'

let fails = 0
const check = (name, ok, extra) => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} — ${name}${extra ? ' :: ' + extra : ''}`)
  if (!ok) fails++
}

// --- a minimal AudioContext that records what it was asked to play ----------
let made = []
class FakeOsc {
  constructor() { this.type = 'sine'; this.freqs = []; this.ramps = []
    this.frequency = { setValueAtTime: (v) => this.freqs.push(v),
                       exponentialRampToValueAtTime: (v) => this.ramps.push(v) } }
  connect() {} start() {} stop() {}
}
class FakeGain {
  // `peak` has to catch BOTH ways the module sets a gain: the ramped envelope
  // on a tone, and the plain `gain.value = x` on a noise burst. The first
  // version of this fake only recorded the ramp, so every percussive layer —
  // every footstep, every door, the whole gate — was invisible to this file.
  constructor() {
    const self = this
    this.peak = 0
    let v = 0
    this.gain = {
      get value() { return v },
      set value(x) { v = x; self.peak = Math.max(self.peak, x) },
      setValueAtTime: () => {},
      exponentialRampToValueAtTime: (x) => { self.peak = Math.max(self.peak, x) },
    }
  }
  connect() {}
}
globalThis.window = {
  AudioContext: class {
    constructor() { this.state = 'running'; this.currentTime = 0; this.sampleRate = 48000 }
    createOscillator() { const o = new FakeOsc(); made.push({ kind: 'osc', node: o }); return o }
    createGain() { const g = new FakeGain(); made.push({ kind: 'gain', node: g }); return g }
    createBiquadFilter() { const f = { type: '', frequency: { value: 0 }, connect() {} }; made.push({ kind: 'filter', node: f }); return f }
    createBufferSource() { return { buffer: null, connect() {}, start() {} } }
    createBuffer(_c, n) { return { getChannelData: () => new Float32Array(n) } }
    get destination() { return { } }
  },
}
const played = fn => { made = []; fn(); return {
  oscs: made.filter(m => m.kind === 'osc').map(m => m.node),
  peak: Math.max(0, ...made.filter(m => m.kind === 'gain').map(m => m.node.peak)),
  cuts: made.filter(m => m.kind === 'filter').map(m => m.node.frequency.value),
} }

sfx.wakeSound()

console.log('a wrong answer is not a failure sting')
const bad = played(() => sfx.again())
const good = played(() => sfx.right())
check('it is a single tone, not a motif', bad.oscs.length === 1, `${bad.oscs.length} oscillators`)
check('it does not fall', bad.oscs.every(o => o.ramps.length === 0), JSON.stringify(bad.oscs[0]?.ramps))
check('it is quieter than a correct answer', bad.peak < good.peak, `${bad.peak} vs ${good.peak}`)

console.log('a correct answer rises')
check('two notes', good.oscs.length === 2, `${good.oscs.length}`)
check('the second is higher than the first', good.oscs[1].freqs[0] > good.oscs[0].freqs[0],
  `${good.oscs[0].freqs[0]} then ${good.oscs[1].freqs[0]}`)

console.log('the door does not become a dripping tap')
const a = played(() => sfx.door()), b = played(() => sfx.door())
check('two doors are not identical', a.oscs[0].freqs[0] !== b.oscs[0].freqs[0],
  `${a.oscs[0].freqs[0].toFixed(1)} vs ${b.oscs[0].freqs[0].toFixed(1)}`)

console.log('the Great Rune is bigger than a rune')
check('more notes', played(() => sfx.greatRune()).oscs.length > played(() => sfx.rune()).oscs.length)
check('a rank-up is bigger still', played(() => sfx.rankUp()).oscs.length >= 8)

// --- the ambient budget -----------------------------------------------------
//
// These four fire constantly: a footstep every step, a keypress every digit.
// Loudness is not readable from a gain number (see soundsheet.mjs for the
// A-weighted measurement), but a cap on the gains is, and a cap is what stops
// the slow creep that turns background into foreground. If one of these ever
// needs to go over its cap, the honest move is to measure the mix again and
// change the cap deliberately, not to nudge the number until it feels right.
console.log('the constant sounds stay in the background')
const CAP = { step: 0.2, key: 0.1, turn: 0.07, erase: 0.16, page: 0.11 }
for (const [name, cap] of Object.entries(CAP)) {
  const p = played(() => sfx[name](7)).peak
  check(`${name} is at or under its cap`, p <= cap + 1e-9, `${p} vs ${cap}`)
}
const loudest = Math.max(...['door', 'rune', 'right', 'exit', 'rankUp', 'greatRune']
  .map(n => played(() => sfx[n]()).peak))
for (const name of Object.keys(CAP)) {
  check(`${name} is quieter than every sound that means something`,
    played(() => sfx[name](7)).peak < loudest)
}

console.log('a keypress sounds like the digit it is')
const k1 = played(() => sfx.key(1)), k9 = played(() => sfx.key(9))
check('1 is lower than 9', k1.oscs[0].freqs[0] < k9.oscs[0].freqs[0],
  `${k1.oscs[0].freqs[0]} vs ${k9.oscs[0].freqs[0]}`)
check('a non-digit does not break it', played(() => sfx.key('x')).oscs.length === 1)

console.log('footsteps are not one footstep repeated')
const s1 = played(() => sfx.step()), s2 = played(() => sfx.step())
check('two steps differ', s1.cuts[0] !== s2.cuts[0], `${s1.cuts[0]} vs ${s2.cuts[0]}`)

// --- the one rule, in the places it is easiest to forget --------------------
console.log('a sealed gate reports the stone, not the child')
const seal = played(() => sfx.sealed())
check('nothing in it falls', seal.oscs.every(o => o.ramps.length === 0))
check('it is quieter than the way out', seal.peak < played(() => sfx.exit()).peak)

console.log('losing an encounter is not a failure sting')
const sc = played(() => sfx.scatter()).oscs.map(o => o.freqs[0])
const descending = sc.every((f, i) => i === 0 || f < sc[i - 1])
check('it is not a descending run', !descending, sc.join(' → '))
check('it is quieter than winning one', played(() => sfx.scatter()).peak
  < played(() => sfx.victory()).peak)

console.log('the hierarchy of good news')
const n = f => played(f).oscs.length
check('a rune < an encounter won < a rank', n(() => sfx.rune()) < n(() => sfx.victory())
  && n(() => sfx.victory()) < n(() => sfx.rankUp()))
check('the way out is the longest sound in a run', n(() => sfx.exit()) >= 4)

console.log('muting actually mutes')
sfx.soundEnabled(false)
// Every single one, not a sample of three: a new sound that forgets to go
// through `live()` would be the one that keeps playing in a silent classroom.
const ALL = Object.keys(sfx).filter(k => typeof sfx[k] === 'function'
  && !['wakeSound', 'soundEnabled', 'soundReady'].includes(k))
check(`nothing is played at all (${ALL.length} sounds)`,
  played(() => ALL.forEach(k => sfx[k](3))).oscs.length === 0)
sfx.soundEnabled(true)
check('and it comes back', played(() => sfx.right()).oscs.length === 2)

console.log(fails ? `${fails} FAILED` : 'all passed')
process.exit(fails ? 1 : 0)

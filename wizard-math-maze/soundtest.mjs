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
  constructor() { this.peak = 0
    this.gain = { value: 0, setValueAtTime: () => {},
                  exponentialRampToValueAtTime: (v) => { this.peak = Math.max(this.peak, v) } } }
  connect() {}
}
globalThis.window = {
  AudioContext: class {
    constructor() { this.state = 'running'; this.currentTime = 0; this.sampleRate = 48000 }
    createOscillator() { const o = new FakeOsc(); made.push({ kind: 'osc', node: o }); return o }
    createGain() { const g = new FakeGain(); made.push({ kind: 'gain', node: g }); return g }
    createBiquadFilter() { return { type: '', frequency: { value: 0 }, connect() {} } }
    createBufferSource() { return { buffer: null, connect() {}, start() {} } }
    createBuffer(_c, n) { return { getChannelData: () => new Float32Array(n) } }
    get destination() { return { } }
  },
}
const played = fn => { made = []; fn(); return {
  oscs: made.filter(m => m.kind === 'osc').map(m => m.node),
  peak: Math.max(0, ...made.filter(m => m.kind === 'gain').map(m => m.node.peak)),
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

console.log('muting actually mutes')
sfx.soundEnabled(false)
check('nothing is played at all', played(() => { sfx.door(); sfx.right(); sfx.rankUp() }).oscs.length === 0)
sfx.soundEnabled(true)
check('and it comes back', played(() => sfx.right()).oscs.length === 2)

console.log(fails ? `${fails} FAILED` : 'all passed')
process.exit(fails ? 1 : 0)

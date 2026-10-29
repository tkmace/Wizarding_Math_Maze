// The mix, measured. `node soundsheet.mjs`
//
// A sheet, not a test: it prints numbers for a human to read and cannot fail.
// (See the convention in CLAUDE.md — *test.mjs asserts, *sheet.mjs looks.)
//
// Audio is the one part of this project that cannot be checked with a
// screenshot, and gain numbers in the source are a bad guide to loudness: a
// 210Hz footstep and a 660Hz keypress at the same gain are nowhere near as
// loud as each other to an ear or to a tablet speaker. So this is a small
// offline WebAudio — enough of one to render what src/engine/sound.js actually
// asks for — followed by A-weighting, which is the standard curve for how
// loud a thing SEEMS rather than how big it is.
//
// Read it as an ordering, not as absolute dB. What matters:
//   - the constant sounds (step, key, turn, erase) stay at the bottom
//   - `again` stays below `right`, which is the one rule in decibels
//   - nothing clips, including the combinations at the end, where several
//     sounds land in the same instant
//
// It renders the real module, so it stays honest when the sounds change. The
// first version of this script did NOT: it mocked `.value` as a plain property,
// so every filter rendered at its default cutoff with unity gain, and it
// confidently reported the footstep as the loudest sound in the game.
const SR = 48000, LEN = SR * 2
const sources = []            // {render(out)}

class Param {
  constructor(v) { this.v = v; this.events = [] }
  // The real code writes `node.gain.value = x` and `filter.frequency.value = x`.
  // Without these accessors those assignments land on a dead property and every
  // filter renders at its default cutoff with unity gain — which is exactly the
  // mistake that made the first run of this script rank a footstep as the
  // loudest sound in the game.
  get value() { return this.v }
  set value(v) { this.v = v }
  setValueAtTime(v, t) { this.events.push(['set', v, t]) ; this.v = v }
  exponentialRampToValueAtTime(v, t) { this.events.push(['exp', v, t]) }
  linearRampToValueAtTime(v, t) { this.events.push(['lin', v, t]) }
  valueAt(t) {
    let cur = this.v, curT = 0
    for (const [kind, v, et] of this.events) {
      if (t <= et) {
        if (kind === 'set') return cur
        const f = (t - curT) / Math.max(1e-9, et - curT)
        return kind === 'exp' ? cur * Math.pow(v / Math.max(1e-9, cur), f) : cur + (v - cur) * f
      }
      cur = v; curT = et
    }
    return cur
  }
}
class Node {
  constructor() { this.out = [] }
  connect(n) { this.out.push(n) }
  disconnect() {}
  chain() { // filters/gains between this and destination
    const path = []
    let n = this
    while (n.out.length) { n = n.out[0]; path.push(n) }
    return path
  }
}
class Gain extends Node { constructor() { super(); this.gain = new Param(1) } }
class Biquad extends Node { constructor() { super(); this.type = 'lowpass'; this.frequency = new Param(350); this.Q = new Param(1) } }
class Osc extends Node {
  constructor() { super(); this.type = 'sine'; this.frequency = new Param(440); this._t0 = 0; this._t1 = 1e9 }
  start(t) { this._t0 = t }
  stop(t) { this._t1 = t }
}
class BufSrc extends Node {
  constructor() { super(); this.buffer = null; this._t0 = 0 }
  start(t) { this._t0 = t || 0 }
}
const shape = (type, ph) => type === 'sine' ? Math.sin(ph)
  : type === 'triangle' ? (2 / Math.PI) * Math.asin(Math.sin(ph))
  : type === 'sawtooth' ? ((ph / Math.PI) % 2) - 1 : Math.sign(Math.sin(ph))

function applyChain(buf, path) {
  for (const n of path) {
    if (n instanceof Biquad) {
      const f = n.frequency.v
      if (n.type === 'lowpass') { const a = Math.exp(-2 * Math.PI * f / SR); let p = 0
        for (let i = 0; i < buf.length; i++) { p = (1 - a) * buf[i] + a * p; buf[i] = p * 2.2 } }
      else { const a = Math.exp(-2 * Math.PI * f / SR); let px = 0, py = 0
        for (let i = 0; i < buf.length; i++) { const x = buf[i]; py = a * (py + x - px); px = x; buf[i] = py } }
    } else if (n instanceof Gain) {
      if (n.gain.events.length) { for (let i = 0; i < buf.length; i++) buf[i] *= n.gain.valueAt(i / SR) }
      else { const g = n.gain.v; for (let i = 0; i < buf.length; i++) buf[i] *= g }
    }
  }
  return buf
}
globalThis.window = { AudioContext: class {
  constructor() { this.state = 'running'; this.sampleRate = SR; sources.length = 0 }
  get currentTime() { return 0 }
  createOscillator() { const o = new Osc(); sources.push(o); return o }
  createGain() { return new Gain() }
  createBiquadFilter() { return new Biquad() }
  createBufferSource() { const b = new BufSrc(); sources.push(b); return b }
  createBuffer(_c, n) { const d = new Float32Array(n); return { length: n, getChannelData: () => d } }
  resume() { return Promise.resolve() }
  get destination() { return new Node() }
} }
const sfx = await import('./src/engine/sound.js')
sfx.wakeSound()
// The module's own master gain is part of every chain, so it is applied once
// by applyChain() and must not be applied again here.
function renderCall(fn) {
  sources.length = 0
  fn()
  const out = new Float64Array(LEN)
  for (const s of sources) {
    const buf = new Float64Array(LEN)
    if (s instanceof Osc) {
      const t1 = Math.min(s._t1, LEN / SR)
      let ph = 0
      for (let i = Math.floor(s._t0 * SR); i < Math.min(LEN, t1 * SR); i++) {
        const t = i / SR
        ph += 2 * Math.PI * s.frequency.valueAt(t) / SR
        buf[i] = shape(s.type, ph)
      }
    } else if (s instanceof BufSrc && s.buffer) {
      const d = s.buffer.getChannelData(0)
      const n = d.length
      // the real code fills the buffer itself; it is noise with a linear decay
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n)
      const off = Math.floor(s._t0 * SR)
      for (let i = 0; i < n && off + i < LEN; i++) buf[off + i] = d[i]
    } else continue
    applyChain(buf, s.chain())
    for (let i = 0; i < LEN; i++) out[i] += buf[i]
  }
  // master gain is part of the chain already; do not apply it twice
  return out
}
function aw(x) {
  let s = Float64Array.from(x)
  const hp = f => { const a = Math.exp(-2 * Math.PI * f / SR); let px = 0, py = 0
    const o = new Float64Array(s.length)
    for (let i = 0; i < s.length; i++) { const v = s[i]; py = a * (py + v - px); px = v; o[i] = py }; s = o }
  const lp = f => { const a = Math.exp(-2 * Math.PI * f / SR); let p = 0
    const o = new Float64Array(s.length)
    for (let i = 0; i < s.length; i++) { p = (1 - a) * s[i] + a * p; o[i] = p }; s = o }
  hp(20.6); hp(20.6); hp(107.7); hp(737.9); lp(12194); lp(12194)
  return s
}
const db = v => 20 * Math.log10(Math.max(1e-9, v))
function measure(name, fn) {
  // average a few renders: the noise layers are random
  let rms = 0, peak = 0, raw = 0, ms = 0, R = 5
  for (let k = 0; k < R; k++) {
    const buf = renderCall(fn), w = aw(buf)
    let s = 0, n = 0, p = 0, rp = 0
    for (let i = 0; i < buf.length; i++) {
      rp = Math.max(rp, Math.abs(buf[i]))
      if (Math.abs(buf[i]) > 1e-5) { s += w[i] * w[i]; n++; p = Math.max(p, Math.abs(w[i])) }
    }
    rms += Math.sqrt(s / Math.max(1, n)) / R; peak += p / R; raw = Math.max(raw, rp); ms += (n / SR) * 1000 / R
  }
  return { name, rms: db(rms), peak: db(peak), raw, ms: Math.round(ms) }
}
const names = process.argv[2] ? process.argv.slice(2)
  : ['step','turn','key','erase','page','sealed','again','door','rune','right','shimmer','ambush','bolt','scatter','victory','exit','buy','greatRune','rankUp']
const combos = {
  'rank door': () => { sfx.right(); sfx.door(); sfx.rankUp() },
  'great rune+step': () => { sfx.step(); sfx.greatRune() },
  'key mash x6': () => { for (let i = 0; i < 6; i++) sfx.key(i + 1) },
  'exit+rank': () => { sfx.exit(); sfx.rankUp() },
  'duel volley': () => { sfx.bolt(); sfx.victory() },
}
const rows = names.map(n => measure(n, () => sfx[n](5)))
  .concat(Object.entries(combos).map(([k, f]) => measure(k, f)))
  .sort((a, b) => a.rms - b.rms)
console.log('sound        A-RMS    A-peak   len ms   raw peak')
for (const r of rows) console.log(r.name.padEnd(11), r.rms.toFixed(1).padStart(6), r.peak.toFixed(1).padStart(9), String(r.ms).padStart(7), r.raw.toFixed(3).padStart(10))

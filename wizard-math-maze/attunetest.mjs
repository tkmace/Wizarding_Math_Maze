// Does the Attunement actually place a child, in a number of questions she will
// sit through?
//
// This runs the REAL engine against simulated children, questions and all — the
// staircase drives `genQ`, so what is tested is the whole path, not just the
// arithmetic of the steps.
//
// The child is modelled by the only thing that really decides whether a
// question is hard: the SIZE OF THE NUMBERS in it. `cap` is the biggest operand
// she is comfortable with; above that her chances fall away. She also fumbles
// 5% of the questions she knows cold, because a staircase that only works on a
// child who never slips is no use in a primary classroom.
//
// The subtlety worth writing down: `skill` is a NOMINAL level that sets the
// RANGE a question is drawn from, and most draws land below the top of their
// range. So a child's ability and a skill value are not the same scale, and
// comparing them directly makes a correct placement look 0.06 too high. What
// the test compares against instead is `fairPlacement(cap)` — found by asking
// the real generator, at each nominal level, how often this child would get one
// right, and taking the level where that crosses half. That is the level a
// staircase should converge on, so it is the level to judge it against.
import {
  beginAttunement, attuneNext, attuneRecord, attuneDone, attuneResult, attuneLength,
} from './src/game/attunement.js'
import { warmPlaysFor } from './src/game/curriculum.js'
import { genQ, SENSE } from './src/game/math.js'

// Seeded, so this is the same run every time.
//
// The measurements below are statistical — "how often is a child placed
// somewhere too hard" is a rate, not a fact — and a threshold set near the
// measured value will flicker between pass and fail on sampling noise alone. A
// test that fails one run in four teaches you to ignore it. With the generator
// pinned, a failure here means the ENGINE changed, which is the only thing this
// is meant to detect.
let seed = 0x9e3779b9
Math.random = () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

let bad = 0
const check = (label, ok, extra = '') => {
  if (!ok) bad++
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? ' :: ' + extra : ''}`)
}
const mean = a => a.reduce((x, y) => x + y, 0) / a.length

const LAPSE = 0.05
const sizeOf = q => (q.op === 'division' ? Math.max(q.b, q.ans) : Math.max(q.a, q.b))
function answers(cap, q) {
  const p = 1 / (1 + Math.exp(-(cap - sizeOf(q)) / Math.max(1, cap * 0.25)))
  return Math.random() < LAPSE * 0.5 + (1 - LAPSE) * p
}

/** The nominal skill level at which this child would get about half right. */
function fairPlacement(cap, op = 'addition') {
  let lo = 0, hi = 1
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2
    let right = 0
    for (let n = 0; n < 400; n++) {
      const q = genQ([op], SENSE, { skill: { [op]: mid } })
      const s = sizeOf(q)
      right += 1 / (1 + Math.exp(-(cap - s) / Math.max(1, cap * 0.25)))
    }
    if (right / 400 > 0.5) lo = mid; else hi = mid
  }
  return (lo + hi) / 2
}

function run(cap, ops = ['addition'], capFor = null) {
  const s = beginAttunement(ops)
  let guard = 0
  while (!attuneDone(s) && guard++ < 200) {
    const q = attuneNext(s)
    if (!q) break
    attuneRecord(s, q, answers(capFor ? capFor(q.op) : cap, q), 1200)
  }
  return { ...attuneResult(s), lanes: s.lanes }
}

/**
 * How often this child would get one right at a given nominal level.
 *
 * This is what a placement is FOR, so it is what the placement is judged on —
 * not the distance between two numbers. At the very bottom of the scale a
 * placement of 0.05 and a "fair" 0.02 draw practically the same questions, so
 * comparing them says nothing, while this says the thing that matters: is her
 * first maze one she can do?
 */
function successAt(cap, level, op = 'addition') {
  let p = 0
  for (let n = 0; n < 500; n++) {
    const q = genQ([op], SENSE, { skill: { [op]: level } })
    p += 1 / (1 + Math.exp(-(cap - sizeOf(q)) / Math.max(1, cap * 0.25)))
  }
  return p / 500
}

console.log('1. it lands near where it should, and errs on the kind side')
console.log(`   ${'comfy to'.padStart(9)} ${'fair'.padStart(6)} ${'placed'.padStart(7)} ${'error'.padStart(7)} ${'gets right'.padStart(11)} ${'questions'.padStart(10)}`)
const FLOOR = 0.02
for (const cap of [6, 12, 25, 60, 150]) {
  const fair = fairPlacement(cap)
  const runs = Array.from({ length: 1200 }, () => run(cap))
  const est = runs.map(r => r.skill.addition)
  const qs = runs.map(r => r.asked)
  const m = mean(est)
  const rate = successAt(cap, m)
  // Badly misplaced: somewhere she would get barely a third right. A child at
  // 50% is fine — a wrong answer at a door costs nothing and pulls her level
  // down straight away — but a third means every other door is a wall.
  const harsh = est.filter(e => successAt(cap, e) < 0.35).length / est.length
  console.log(`   ${String(cap).padStart(9)} ${fair.toFixed(2).padStart(6)} ${m.toFixed(2).padStart(7)} ${((m - fair >= 0 ? '+' : '') + (m - fair).toFixed(2)).padStart(7)} ${(rate * 100).toFixed(0).padStart(10)}% ${mean(qs).toFixed(1).padStart(10)}`)
  check(`  cap ${cap}: within 0.12 of a fair placement`, Math.abs(m - fair) <= 0.12, `off by ${(m - fair).toFixed(3)}`)
  check(`  cap ${cap}: finishes inside the budget`, mean(qs) <= 14, `${mean(qs).toFixed(1)} questions`)
  if (fair > 0.1) {
    check(`  cap ${cap}: her first maze is one she can do`, rate >= 0.55, `${(rate * 100).toFixed(0)}% right at the placed level`)
    check(`  cap ${cap}: seldom badly misplaced`, harsh <= 0.10, `${(harsh * 100).toFixed(1)}% of children`)
  } else {
    // She is below the gentlest setting the game has. The placement cannot
    // invent an easier tier — all it can do is put her at the bottom, and it
    // must not do anything cleverer than that.
    //
    // Worth noting on its own account: the easiest question this game can ask
    // is roughly 1-8 plus 1-8, which is a real stretch for a child still
    // counting to six. That is a property of TIERS[0], not of the placement.
    check(`  cap ${cap}: below the game's floor, so placed on the floor`, m <= 0.10, `placed ${m.toFixed(3)}`)
  }
}

console.log('\n2. the extremes do not break it')
const floor = Array.from({ length: 400 }, () => run(0).skill.addition)
check('a child who gets nothing right lands at the bottom', mean(floor) < 0.12, mean(floor).toFixed(3))
const ceil = Array.from({ length: 400 }, () => run(10000).skill.addition)
check('a child who gets everything right lands near the top', mean(ceil) > 0.75, mean(ceil).toFixed(3))
check('nobody is ever placed outside 0..1', [...floor, ...ceil].every(v => v >= 0.02 && v <= 1))

console.log('\n3. it stops early rather than spending the whole budget')
const one = Array.from({ length: 1200 }, () => run(20).asked)
check(`typically ${mean(one).toFixed(1)} questions of a possible ${attuneLength(['addition']).max}`, mean(one) < 13, mean(one).toFixed(1))
check('and never more than the budget', Math.max(...one) <= attuneLength(['addition']).max)

console.log('\n4. several operations are measured separately')
const multi = run(20, ['addition', 'multiplication'])
check('one lane per operation', Object.keys(multi.skill).sort().join(',') === 'addition,multiplication', Object.keys(multi.skill).join(','))
check('an operation she is not playing is not guessed at', multi.skill.division === undefined)
// Strong at addition, new to multiplication — the normal case, and the reason
// the lanes are separate at all.
const lop = Array.from({ length: 500 }, () =>
  run(null, ['addition', 'multiplication'], op => (op === 'addition' ? 90 : 3)).skill)
check('a strong operation does not drag a weak one up',
  mean(lop.map(s => s.multiplication)) < mean(lop.map(s => s.addition)) - 0.2,
  `add ${mean(lop.map(s => s.addition)).toFixed(2)} vs mul ${mean(lop.map(s => s.multiplication)).toFixed(2)}`)

console.log('\n5. a placement can still climb afterwards (the warmCap trap)')
// Without this, `Math.min(next, Math.max(cur, warmCap))` collapses to
// `Math.min(next, cur)` and a placed child can only ever go DOWN.
for (const level of [0.2, 0.35, 0.5, 0.75]) {
  const plays = warmPlaysFor(level)
  const cap = 0.16 + 0.042 * plays
  check(`placed at ${level}: credited ${plays} plays, ceiling ${cap.toFixed(2)} clears it`, cap > level)
}
check('a level below the base needs no credit', warmPlaysFor(0.1) === 0)

console.log(bad ? `\n${bad} FAILURES` : '\nall passed')
process.exit(bad ? 1 : 0)

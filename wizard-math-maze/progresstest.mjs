// What the progress page is allowed to say about a child.
//
// This exists because the page spent its whole life telling every child she had
// locked in nothing. "Locked in" counted single facts at box 4, and box 4 is
// unreachable: the review queue is sorted lowest-box-first and most questions
// are freshly generated, so a simulated child who got 96% of three hundred
// questions right reached box 4 on zero facts. Nobody noticed, because a
// progress page reading "0 locked in" looks like a child who needs to practise
// more rather than a counter that cannot move.
//
// So the assertions here are mostly of the form "a child doing well is TOLD she
// is doing well". That is a strange thing to need a test for, and it is exactly
// the thing that broke.
//
// It drives the real engine — nextQuestion, recordAnswer, masteryReport — with
// seeded randomness, so it is checking the actual behaviour rather than
// arithmetic on numbers a test made up.
import { nextQuestion, recordAnswer, masteryReport, areaState, factState, AREA_LEVELS }
  from './src/game/curriculum.js'
import { blankSkill, SENSE } from './src/game/math.js'
import { rng, SEED } from './harness.mjs'

let fails = 0
const check = (name, ok, extra) => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} — ${name}${extra ? ' :: ' + extra : ''}`)
  if (!ok) fails++
}

// --- a simulated child ------------------------------------------------------
const rand = rng(SEED)
const blank = ops => ({
  totalPoints: 0, stones: 0, facts: {}, skill: blankSkill(), opPlays: {}, plays: 0,
  settings: { ops, diff: SENSE }, stats: {},
})

/**
 * `acc` is the chance she gets any given question right. Response times are
 * modelled too, because they feed Wizard's Sense and therefore which numbers
 * she is shown next — a child who answers everything in 200ms is not a child.
 */
function play(n, acc, ops = ['addition']) {
  let p = blank(ops)
  const recent = []
  for (let i = 0; i < n; i++) {
    const q = nextQuestion(p, ops, SENSE, recent)
    recent.push(q.key)
    if (recent.length > 6) recent.shift()
    const correct = rand() < acc
    const ms = (correct ? 2200 + rand() * 3500 : 5000 + rand() * 5000) * (1.25 - acc * 0.4)
    const rec = recordAnswer(p, q, correct, ms, 0)
    p = { ...p, facts: rec.facts, skill: rec.skill, opPlays: rec.opPlays, plays: rec.plays }
  }
  return p
}
const area = (p, op = 'addition') => masteryReport(p).byOp[op].state

// --- 1. the regression --------------------------------------------------------
console.log('a child doing well is told so')
check('90% over 120 answers is locked in', area(play(120, 0.9)) === 'locked', area(play(120, 0.9)))
check('97% over 120 answers is locked in', area(play(120, 0.97)) === 'locked', area(play(120, 0.97)))
check('…and it does not take hundreds of answers', area(play(60, 0.95)) === 'locked', area(play(60, 0.95)))

// The old bar, for contrast. If this ever starts passing, the review queue has
// been changed and this file's thresholds are worth revisiting.
const strong = play(300, 0.95)
const atBox4 = Object.values(strong.facts).filter(f => f.box >= 4).length
console.log(`  (for reference: facts at box 4 after 300 answers at 95% — ${atBox4})`)

// --- 2. it still means something ---------------------------------------------
console.log('and a child who is guessing is not')
check('55% is building up, however long she plays', area(play(300, 0.55)) === 'building', area(play(300, 0.55)))
check('80% reads as getting strong, not locked in', area(play(300, 0.8)) === 'strong', area(play(300, 0.8)))
check('four answers in is "just started"', area(play(4, 1.0)) === 'started', area(play(4, 1.0)))

// --- 3. the one rule ----------------------------------------------------------
console.log('nothing the page can say about an area is bad news')
const WORDS = Object.values(AREA_LEVELS).map(l => l.label.toLowerCase())
check('the vocabulary is only ever encouraging',
  WORDS.every(w => !/weak|poor|bad|fail|behind|struggl/.test(w)), WORDS.join(', '))
// The floor matters more than the ceiling: the worst case is a child who gets
// most of it wrong, and she must still be told the area is coming along.
const worst = ['addition', 'subtraction', 'multiplication', 'division'].map(op => {
  const p = play(150, 0.25, [op])
  return masteryReport(p).byOp[op].state
})
check('a child getting three in four wrong still reads as building up',
  worst.every(s => s === 'building' || s === 'started'), worst.join(', '))
check('there is no state below building', Object.keys(AREA_LEVELS)
  .every(k => AREA_LEVELS[k].rank >= AREA_LEVELS.started.rank))

// --- 4. single facts are reachable too ---------------------------------------
console.log('individual sums can become solid')
const mid = play(150, 0.85)
const solid = Object.values(mid.facts).filter(f => factState(f) === 'solid').length
check('a good run leaves plenty of solid sums', solid >= 10, `${solid} solid`)
check('the page has some to show', masteryReport(mid).strongest.length > 0)
check('a new fact is not solid', factState({ n: 0, box: 0, right: 0, wrong: 0 }) === 'new')
check('one right answer is not solid', factState({ n: 1, box: 1, right: 1, wrong: 0 }) === 'learning')

// --- 5. the shape of the thresholds ------------------------------------------
// Pinned directly, so a change to them is a deliberate edit to this file rather
// than something that drifts out from under the simulation above.
console.log('the thresholds themselves')
check('accuracy alone is not enough', areaState({ attempts: 100, right: 100, solid: 2 }) !== 'locked')
check('volume alone is not enough', areaState({ attempts: 400, right: 200, solid: 60 }) !== 'locked')
check('both together are', areaState({ attempts: 100, right: 90, solid: 12 }) === 'locked')
check('a short perfect run is still early days', areaState({ attempts: 8, right: 8, solid: 8 }) === 'started')
check('an empty area is early days', areaState() === 'started')

// --- 6. the headline ----------------------------------------------------------
console.log('the line at the top of the page')
const multi = play(400, 0.92, ['addition', 'subtraction'])
const rep = masteryReport(multi)
check('her best area is named', rep.bestArea && rep.bestArea.op, rep.bestArea?.op)
check('the best area is really the best', rep.areas.every(a =>
  AREA_LEVELS[a.state].rank <= AREA_LEVELS[rep.bestArea.state].rank))
check('areasAtLeast counts what it says',
  rep.areasAtLeast('started') === rep.areas.length)
const fresh = masteryReport(blank(['addition']))
check('a brand new wizard has no best area, and does not crash', fresh.bestArea === null)
check('…and no areas at all', fresh.areas.length === 0 && fresh.areasAtLeast('locked') === 0)

console.log(fails ? `${fails} FAILED` : 'all passed')
process.exit(fails ? 1 : 0)

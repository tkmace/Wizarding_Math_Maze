// Does the creature's clock start at the right moment, and only then?
//
// This is the one piece of the encounter that a parent will notice getting it
// wrong in either direction: a clock on a five-year-old's first duel, or a
// twelve-year-old who never gets one.
import { duelIsTimed, duelPlan, TIMED_BAND, TIMED_PLAYS } from './src/game/encounters.js'
import { SENSE, blankSkill } from './src/game/math.js'

let bad = 0
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) bad++
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `  got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`)
}

const prof = (skill, plays) => ({ skill: { ...blankSkill(), ...skill }, opPlays: plays })
// band 1.0 is the Apprentice tier, which sits at skill = 1/(TIERS.length-1) = 0.25
const AT_BAND_1 = 0.25

console.log('1. a brand new wizard is never on the clock')
check('fresh profile, adaptive', duelIsTimed(SENSE, prof({}, {}), ['addition']), false)
check('fresh profile, no ops given', duelIsTimed(SENSE, prof({}, {}), undefined), false)
check('fresh profile on Legendary', duelIsTimed('legendary', prof({}, {}), ['addition']), false)

console.log('2. experience alone is not enough, and skill alone is not enough')
check('fluent but green', duelIsTimed(SENSE, prof({ addition: 0.6 }, { addition: 5 }), ['addition']), false)
check('experienced but slow', duelIsTimed(SENSE, prof({ addition: 0.05 }, { addition: 400 }), ['addition']), false)
check('both', duelIsTimed(SENSE, prof({ addition: 0.6 }, { addition: 400 }), ['addition']), true)

console.log('3. the boundary is where it says it is')
const justUnder = prof({ addition: AT_BAND_1 }, { addition: TIMED_PLAYS - 1 })
const justOver = prof({ addition: AT_BAND_1 }, { addition: TIMED_PLAYS })
check(`${TIMED_PLAYS - 1} answers`, duelIsTimed(SENSE, justUnder, ['addition']), false)
check(`${TIMED_PLAYS} answers`, duelIsTimed(SENSE, justOver, ['addition']), true)

console.log('4. it waits for her WEAKEST operation, not her best')
const plays = { addition: 300, division: 300 }
check('strong add, weak div', duelIsTimed(SENSE, prof({ addition: 0.9, division: 0.03 }, plays), ['addition', 'division']), false)
check('…and on addition alone, she is ready', duelIsTimed(SENSE, prof({ addition: 0.9, division: 0.03 }, plays), ['addition']), true)
check('both strong', duelIsTimed(SENSE, prof({ addition: 0.9, division: 0.9 }, plays), ['addition', 'division']), true)
check('an op she is not playing cannot hold her back',
  duelIsTimed(SENSE, prof({ addition: 0.9, multiplication: 0.01 }, plays), ['addition']), true)

console.log('5. an untimed duel cannot tick, and can still be lost')
const green = duelPlan(SENSE, prof({}, {}), ['addition'])
check('chargeMs is Infinity', green.chargeMs, Infinity)
check('a frame adds nothing to the bar', 16 / green.chargeMs, 0)
check('timed flag off', green.timed, false)
check('a wrong answer still feeds the bar', green.missCost > 0, true)
const wardsCost = Math.ceil(1 / green.missCost) * green.wards
check(`losing takes ${wardsCost} wrong answers`, wardsCost >= 9 && wardsCost <= 15, true)

console.log('6. the handover is a ramp down from generous, never a step up')
const at = (skill, ops = ['addition']) => duelPlan(SENSE, prof({ addition: skill }, { addition: 400 }), ops).chargeMs
const first = at(AT_BAND_1)
check('the first timed duel is the most generous', first >= 15000, true)
check('the old timer never gave more than 11s, so this is no cliff', first > 11000, true)
let prev = Infinity
for (const s of [0.25, 0.4, 0.55, 0.7, 0.85, 1.0]) {
  const ms = at(s)
  if (!(ms <= prev)) bad++
  console.log(`  ${ms <= prev ? 'PASS' : 'FAIL'}  skill ${s.toFixed(2)} -> ${ms}ms (never longer than the last)`)
  prev = ms
}
check('and it never gets shorter than 9s', prev >= 9000, true)

console.log('7. fixed tiers: the gentlest one is untimed too')
const veteran = { addition: 400 }
check('novice', duelIsTimed('novice', prof({}, veteran), ['addition']), false)
check('apprentice', duelIsTimed('apprentice', prof({}, veteran), ['addition']), true)
check('legendary', duelIsTimed('legendary', prof({}, veteran), ['addition']), true)

console.log(bad ? `\n${bad} FAILURES` : '\nall passed')
process.exit(bad ? 1 : 0)

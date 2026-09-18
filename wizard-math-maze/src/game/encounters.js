import { genQ, SENSE, skillOf, senseTier, TIERS, tierByKey, opByKey, roundPts } from './math.js'
import { randomCreature } from '../engine/creatureSprite.js'

// --- Wandering encounters -----------------------------------------------------
// Little animated set-pieces that interrupt the walk between doors. Two rules
// shape them:
//
//  1. The maths is EASIER than the maze's own difficulty. A door is a puzzle you
//     stop and think about; an encounter is fast and loud, so the problems have
//     to be ones she can already nearly do. Fluency practice, not new ground.
//  2. Losing costs nothing you already had. You forfeit the reward and the
//     creature scampers off. A seven-year-old should never be punished for
//     losing a game of chance she didn't choose to enter.

const CHANCE = 0.16          // per newly-entered cell
const MAX_PER_MAZE = 2
const MIN_GAP_CELLS = 4      // steps since the last encounter

export const KINDS = ['duel', 'runes']

/**
 * Should an encounter fire on stepping into this cell?
 * `state` is mutable bookkeeping kept on the maze object.
 */
export function rollEncounter(state, stepsTaken) {
  if (!state) return null
  if ((state.count || 0) >= MAX_PER_MAZE) return null
  if (stepsTaken - (state.lastAt ?? -99) < MIN_GAP_CELLS) return null
  if (Math.random() > CHANCE) return null

  state.count = (state.count || 0) + 1
  state.lastAt = stepsTaken
  return {
    kind: KINDS[Math.floor(Math.random() * KINDS.length)],
    creature: randomCreature(),
  }
}

/**
 * An easier version of the current difficulty.
 *
 * For Wizard's Sense we drop the skill value, which slides the operand ranges
 * down smoothly. For a fixed tier we step down one named tier. Either way the
 * points follow the easier setting, so a flurry of simple answers can't out-earn
 * a hard door.
 */
export function easierDifficulty(diff, profile) {
  if (diff === SENSE) {
    const skill = {}
    for (const op of ['addition', 'subtraction', 'multiplication', 'division']) {
      skill[op] = Math.max(0.02, skillOf(profile, op) - 0.22)
    }
    return { diff: SENSE, profile: { ...profile, skill } }
  }
  const i = TIERS.findIndex(t => t.key === diff)
  const down = TIERS[Math.max(0, i - 1)] || TIERS[0]
  return { diff: down.key, profile }
}

export function encounterQuestion(ops, diff, profile) {
  const e = easierDifficulty(diff, profile)
  return genQ(ops, e.diff, e.profile)
}

/** Four answer options for the multiple-choice game: the real one plus near misses. */
export function answerChoices(q) {
  const out = new Set([q.ans])
  const spread = Math.max(2, Math.round(Math.abs(q.ans) * 0.2))
  let guard = 0
  while (out.size < 4 && guard++ < 60) {
    const delta = (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * spread))
    const cand = q.ans + delta
    if (cand > 0 && cand !== q.ans) out.add(cand)
  }
  while (out.size < 4) out.add(q.ans + out.size)       // degenerate tiny answers
  return [...out].sort(() => Math.random() - 0.5)
}

// --- When does the creature start racing you? ---------------------------------
//
// A spell duel has always had a clock: the creature charges on its own and you
// answer against it. For a child who is still working out what the game even is,
// that is two hard things at once — the maths, and the hurry — and the hurry is
// the one that makes her freeze. So early on the clock simply does not run.
//
// The duel keeps every other rule. The creature's spell still grows and can
// still cost you the round, but ONLY from wrong answers. The bar stops being a
// timer and becomes a mistake meter, which is the same thing Rune Catch already
// does with its three chances — and it means nothing has to be re-explained when
// the clock does start.
//
// Two conditions, both required:
//
//  - EXPERIENCE. She has answered enough questions for the game to be familiar.
//    Not a difficulty judgement, just "she has been here a while".
//  - FLUENCY, measured on her WEAKEST operation in play, not her best. A child
//    doing addition and division together is not ready for a clock because her
//    addition is quick; she is as ready as her division makes her.
//
// The handover is a ramp, not a switch. The moment the clock starts it is at its
// most generous — sixteen seconds, half again as long as the old timer ever gave
// anyone — and it tightens as she grows into it. There is no step to fall off.
export const TIMED_BAND = 1.0       // about the Apprentice tier
export const TIMED_PLAYS = 40       // answers, summed over the operations in play

const ALL_OPS = ['addition', 'subtraction', 'multiplication', 'division']

/** Where the player sits, 0..4, on her weakest operation in play. */
function weakestBand(diff, profile, ops) {
  const list = [...(ops || [])].filter(op => ALL_OPS.includes(op))
  const inPlay = list.length ? list : ALL_OPS
  if (diff !== SENSE) return Math.max(0, TIERS.findIndex(t => t.key === diff))
  return Math.min(...inPlay.map(op => senseTier(skillOf(profile, op), op).band))
}

/**
 * Does the creature's spell charge on its own yet?
 *
 * Exported so the encounter's opening card can say which game she is about to
 * play, and so App can explain the change the first time it happens.
 */
export function duelIsTimed(diff, profile, ops) {
  const plays = [...(ops?.length || ops?.size ? ops : ALL_OPS)]
    .reduce((n, op) => n + (profile?.opPlays?.[op] || 0), 0)
  return plays >= TIMED_PLAYS && weakestBand(diff, profile, ops) >= TIMED_BAND
}

/** Creature toughness and reward, scaled so an encounter is worth roughly one good door. */
export function duelPlan(diff, profile, ops) {
  const band = weakestBand(diff, profile, ops)
  const timed = duelIsTimed(diff, profile, ops)
  return {
    hp: 3 + (band > 2.5 ? 1 : 0),
    wards: 3,
    timed,
    // Infinity rather than a flag the draw loop has to remember to check: an
    // untimed duel divides by it and adds nothing, every frame, for free.
    chargeMs: timed ? Math.max(9000, 16000 - 1700 * (band - TIMED_BAND)) : Infinity,
    hitRelief: 0.42,                    // fraction of the charge a correct answer knocks back
    // Wrong answers have to carry the whole bar when the clock isn't running,
    // or an untimed duel has no way to end badly and stops being a duel.
    missCost: timed ? 0.22 : 0.30,
  }
}

/** Reward for winning: the questions' own value plus a bravery bonus. */
export function encounterReward(earned, perks) {
  const bonus = roundPts(earned * 0.5)
  return {
    points: roundPts((earned + bonus) * (perks?.fortune || 1)),
    stone: Math.random() < 0.45 ? 1 : 0,
  }
}

export { opByKey, tierByKey }

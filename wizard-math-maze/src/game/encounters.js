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

/** Creature toughness and reward, scaled so an encounter is worth roughly one good door. */
export function duelPlan(diff, profile) {
  const band = diff === SENSE
    ? senseTier(skillOf(profile, 'multiplication'), 'multiplication').band
    : TIERS.findIndex(t => t.key === diff)
  const hp = 3 + (band > 2.5 ? 1 : 0)
  return {
    hp,
    wards: 3,
    chargeMs: 11000 - Math.min(3000, band * 600),
    hitRelief: 0.42,          // fraction of the charge a correct answer knocks back
    missCost: 0.22,           // fraction added by a wrong answer
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

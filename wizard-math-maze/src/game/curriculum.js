import {
  genQ, factKey, parseFactKey, factInDifficulty, opByKey,
  roundPts, blankSkill, skillOf, SENSE,
} from './math.js'

// --- Adaptive practice engine -------------------------------------------------
// A Leitner box system. Every fact she meets lands in a box; getting it right
// promotes it and pushes the next review further out, getting it wrong demotes
// it and brings it back almost immediately. Intervals are counted in *questions
// answered* rather than wall-clock time, so a child who plays once a fortnight
// still gets a sensible review order instead of a wall of overdue cards.
const BOX_INTERVAL = [1, 3, 8, 20, 50, 120]
const MAX_BOX = BOX_INTERVAL.length - 1

/** Share of door questions pulled from the review queue rather than generated fresh. */
const REVIEW_RATE = 0.45

// How far one answer moves the per-operation skill that drives Wizard's Sense.
// Still rises more slowly than it falls, so the maze backs off quickly when she
// starts struggling but makes her earn the harder numbers.
//
// These were raised by about half again after the first version sat too long at
// easy numbers: someone answering confidently could clear a whole maze and
// barely feel the questions grow, which reads as the game not paying attention.
// A steady run now moves a full tier in roughly six or seven doors rather than
// twelve. SPEED_BONUS goes further for an answer that comes back almost
// instantly — the clearest signal there is that the numbers are too small.
const SKILL_UP_FAST  = 0.070
const SKILL_UP       = 0.045
const SKILL_UP_SLOW  = 0.008
const SKILL_DOWN     = 0.052
const SKILL_MIN      = 0.02
const SPEED_BONUS    = 0.25   // up to +25% for answering well inside the window

// How high the adaptive skill is allowed to climb in the first few questions of
// an operation. Wizard's Sense reads a child from how she answers, and at the
// very start it has almost nothing to read: a beginner who gets three lucky
// ones in a row was being handed Sorcerer-sized numbers before she had really
// begun, which is how an encounter ends up too hard for a younger sister. The
// ceiling lifts by about a tier every six questions and stops mattering after
// twenty-odd. It only ever limits a RISE — it can never drag anyone back below
// where they already are, so a returning wizard keeps her level.
const WARM_BASE = 0.16
const WARM_STEP = 0.042

export const blankFact = () => ({ n: 0, right: 0, wrong: 0, box: 0, due: 0, bestMs: null, lastMs: null, streak: 0 })

/**
 * Choose the next question. Prefers a weak, due fact that fits the operations
 * and difficulty in play; otherwise generates a fresh one. `recent` is a list of
 * fact keys to avoid, so the same problem never appears back-to-back.
 */
export function nextQuestion(profile, ops, diff, recent = []) {
  const facts = profile?.facts || {}
  const plays = profile?.plays || 0
  const opSet = ops instanceof Set ? ops : new Set(ops)

  const due = Object.entries(facts)
    .filter(([key, f]) => {
      if (f.box > 3) return false            // comfortably known — leave it alone
      if (f.due > plays) return false        // not due yet
      if (recent.includes(key)) return false
      const { op, a, b } = parseFactKey(key)
      return opSet.has(op) && factInDifficulty(op, a, b, diff, profile)
    })
    .sort((x, y) =>
      x[1].box - y[1].box ||
      (y[1].wrong - y[1].right) - (x[1].wrong - x[1].right) ||
      x[1].due - y[1].due)

  if (due.length && Math.random() < REVIEW_RATE) {
    // Sample from the neediest handful so the order still feels varied.
    const pool = due.slice(0, 5)
    const [key] = pool[Math.floor(Math.random() * pool.length)]
    const { op, a, b } = parseFactKey(key)
    return { ...genQ(opSet, diff, profile, { op, a, b }), review: true }
  }

  for (let i = 0; i < 8; i++) {
    const q = genQ(opSet, diff, profile)
    if (!recent.includes(q.key)) return q
  }
  return genQ(opSet, diff, profile)
}

/**
 * Fold one answer into the profile's fact table and adaptive skill.
 *
 * `swiftBonusMs` comes from the worn form's perk and widens the quick-recall
 * window. Returns { facts, skill, plays, fast, bonus } — `bonus` is extra
 * points for a first-try answer inside that window.
 */
export function recordAnswer(profile, q, correct, ms, swiftBonusMs = 0) {
  const facts = { ...(profile?.facts || {}) }
  const prev = facts[q.key] || blankFact()
  const plays = (profile?.plays || 0) + 1
  const firstTry = q.wrongs === 0 && !q.hinted
  const window = (q.fastMs || 6000) + swiftBonusMs
  const fast = correct && firstTry && ms <= window

  let box = prev.box
  if (correct) box = firstTry ? Math.min(MAX_BOX, box + 1) : box
  else         box = Math.max(0, box - 2)

  facts[q.key] = {
    n: prev.n + 1,
    right: prev.right + (correct ? 1 : 0),
    wrong: prev.wrong + (correct ? 0 : 1),
    box,
    due: plays + (correct ? BOX_INTERVAL[box] : 1),
    bestMs: correct && (prev.bestMs == null || ms < prev.bestMs) ? ms : prev.bestMs,
    lastMs: correct ? ms : prev.lastMs,
    streak: correct ? prev.streak + 1 : 0,
  }

  // --- Wizard's Sense ---
  const skill = { ...blankSkill(), ...(profile?.skill || {}) }
  const opPlays = { ...(profile?.opPlays || {}) }
  opPlays[q.op] = (opPlays[q.op] || 0) + 1
  const cur = skillOf(profile, q.op)
  let delta
  if (!correct)      delta = -SKILL_DOWN
  else if (fast)     delta = SKILL_UP_FAST
  else if (firstTry) delta = SKILL_UP
  else               delta = SKILL_UP_SLOW
  // An answer that comes back in a fraction of the window isn't just correct,
  // it's unchallenged — push harder for those.
  if (delta > 0 && correct && firstTry) {
    const spare = Math.max(0, 1 - ms / Math.max(1, window))     // 0 at the buzzer, →1 instant
    delta *= 1 + SPEED_BONUS * spare
  }
  // Ease off as it approaches the ceiling so the top tier has to be earned.
  const scaled = delta > 0 ? delta * (1 - cur * 0.50) : delta
  const warmCap = WARM_BASE + WARM_STEP * opPlays[q.op]
  const next = Math.min(1, Math.max(SKILL_MIN, cur + scaled))
  // The cap holds back a climb, never a wizard: `Math.max(cur, warmCap)` means
  // it can only ever slow someone down, not send them backwards.
  skill[q.op] = Math.min(next, Math.max(cur, warmCap))

  return { facts, skill, opPlays, plays, fast, bonus: fast ? roundPts(q.curPts * 0.25) : 0 }
}

// --- Mastery classification ---------------------------------------------------
export function factState(f) {
  if (!f || f.n === 0) return 'new'
  if (f.box >= 4) return 'mastered'
  // Only flag it as shaky if she has actually got it wrong. A fact she has seen
  // once and answered correctly is "learning", not a problem.
  if (f.box <= 1 && f.wrong > 0) return 'shaky'
  return 'learning'
}

const STATE_ORDER = ['shaky', 'learning', 'mastered', 'new']

/** Everything the parent report needs, derived from the fact table. */
export function masteryReport(profile) {
  const facts = profile?.facts || {}
  const byOp = {}
  for (const o of ['addition', 'subtraction', 'multiplication', 'division'])
    byOp[o] = { mastered: 0, learning: 0, shaky: 0, attempts: 0, right: 0, wrong: 0, skill: skillOf(profile, o) }

  const rows = []
  for (const [key, f] of Object.entries(facts)) {
    const { op, a, b } = parseFactKey(key)
    if (!byOp[op]) continue
    const st = factState(f)
    if (byOp[op][st] != null) byOp[op][st] += 1
    byOp[op].attempts += f.n
    byOp[op].right += f.right
    byOp[op].wrong += f.wrong
    rows.push({ key, op, a, b, ...f, state: st, disp: `${a} ${opByKey(op).rune} ${b}` })
  }

  rows.sort((x, y) =>
    STATE_ORDER.indexOf(x.state) - STATE_ORDER.indexOf(y.state) ||
    (y.wrong - y.right) - (x.wrong - x.right) ||
    y.n - x.n)

  const timed = rows.filter(r => r.bestMs != null)
  const all = rows.reduce((s, r) => s + r.n, 0)
  return {
    rows,
    byOp,
    needsWork: rows.filter(r => r.state === 'shaky').slice(0, 12),
    strongest: rows.filter(r => r.state === 'mastered').slice(0, 12),
    totalFacts: rows.length,
    totalAttempts: all,
    accuracy: all ? rows.reduce((s, r) => s + r.right, 0) / all : 0,
    medianMs: timed.length
      ? timed.map(r => r.bestMs).sort((a, b) => a - b)[Math.floor(timed.length / 2)]
      : null,
  }
}

export { factKey, SENSE }

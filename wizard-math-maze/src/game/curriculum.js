import { genQ, factKey, parseFactKey, factInDifficulty, opByKey, diffByKey, to5 } from './math.js'

// ─── Adaptive practice engine ─────────────────────────────────────────────────
// A Leitner box system. Every math fact she meets lands in a box; getting it
// right promotes it and pushes the next review further out, getting it wrong
// demotes it and brings it back almost immediately. Intervals are counted in
// *questions answered*, not wall-clock time, so a kid who plays once a fortnight
// still gets a sensible review order instead of a wall of overdue cards.
const BOX_INTERVAL = [1, 3, 8, 20, 50, 120]
const MAX_BOX = BOX_INTERVAL.length - 1

/** Share of door questions pulled from the review queue rather than generated fresh. */
const REVIEW_RATE = 0.45

export const blankFact = () => ({ n: 0, right: 0, wrong: 0, box: 0, due: 0, bestMs: null, lastMs: null, streak: 0 })

/**
 * Choose the next question. Prefers a weak, due fact that fits the chosen
 * operations and difficulty; otherwise generates a fresh one. `recent` is a
 * list of fact keys to avoid so the same problem never appears back-to-back.
 */
export function nextQuestion(profile, ops, diff, recent = []) {
  const facts = profile.facts || {}
  const plays = profile.plays || 0
  const opSet = ops instanceof Set ? ops : new Set(ops)

  const due = Object.entries(facts)
    .filter(([key, f]) => {
      if (f.box > 3) return false            // comfortably known — leave it alone
      if (f.due > plays) return false        // not due yet
      if (recent.includes(key)) return false
      const { op, a, b } = parseFactKey(key)
      return opSet.has(op) && factInDifficulty(op, a, b, diff)
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
    const q = genQ(opSet, diff, { op, a, b })
    return { ...q, review: true }
  }

  // Fresh question, but don't hand back something she just saw.
  for (let i = 0; i < 8; i++) {
    const q = genQ(opSet, diff)
    if (!recent.includes(q.key)) return q
  }
  return genQ(opSet, diff)
}

/**
 * Fold one answer into the profile's fact table.
 * Returns { facts, plays, fast, bonus } — `bonus` is extra points for a
 * first-try answer inside the difficulty's quick-recall window.
 */
export function recordAnswer(profile, q, correct, ms) {
  const facts = { ...(profile.facts || {}) }
  const prev = facts[q.key] || blankFact()
  const plays = (profile.plays || 0) + 1
  const firstTry = q.wrongs === 0 && !q.hinted
  const fast = correct && firstTry && ms <= diffByKey(profile.settings?.diff || 'apprentice').fastMs

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

  return { facts, plays, fast, bonus: fast ? to5(q.curPts * 0.25) : 0 }
}

// ─── Mastery classification ───────────────────────────────────────────────────
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
  const facts = profile.facts || {}
  const byOp = {}
  for (const o of ['addition', 'subtraction', 'multiplication', 'division'])
    byOp[o] = { mastered: 0, learning: 0, shaky: 0, attempts: 0, right: 0, wrong: 0 }

  const rows = []
  for (const [key, f] of Object.entries(facts)) {
    const { op, a, b } = parseFactKey(key)
    if (!byOp[op]) continue
    const st = factState(f)
    if (byOp[op][st] != null) byOp[op][st] += 1
    byOp[op].attempts += f.n
    byOp[op].right += f.right
    byOp[op].wrong += f.wrong
    rows.push({ key, op, a, b, ...f, state: st, disp: dispOf(op, a, b) })
  }

  rows.sort((x, y) =>
    STATE_ORDER.indexOf(x.state) - STATE_ORDER.indexOf(y.state) ||
    (y.wrong - y.right) - (x.wrong - x.right) ||
    y.n - x.n)

  const timed = rows.filter(r => r.bestMs != null)
  return {
    rows,
    byOp,
    needsWork: rows.filter(r => r.state === 'shaky').slice(0, 12),
    strongest: rows.filter(r => r.state === 'mastered').slice(0, 12),
    totalFacts: rows.length,
    totalAttempts: rows.reduce((s, r) => s + r.n, 0),
    accuracy: (() => {
      const right = rows.reduce((s, r) => s + r.right, 0)
      const all = rows.reduce((s, r) => s + r.n, 0)
      return all ? right / all : 0
    })(),
    medianMs: timed.length
      ? timed.map(r => r.bestMs).sort((a, b) => a - b)[Math.floor(timed.length / 2)]
      : null,
  }
}

function dispOf(op, a, b) {
  const r = opByKey(op).rune
  return `${a} ${r} ${b}`
}

export { factKey }

import { genQ, SENSE, OPS } from './math.js'
import { revealFrom, WALL, PATH, DOOR, START as CELL_START, END as CELL_END } from './maze.js'

// --- The Attunement: placing a wizard on her first day -------------------------
//
// A new wizard starts at the bottom of Wizard's Sense and climbs at 0.045 per
// correct answer, which is a LEARNING rate — deliberately slow, tuned not to
// overwhelm. For a child who already knows her tables that means fifty-odd
// questions of being asked things she can do in her sleep before the maze
// catches up with her. She will have decided the game is for babies long before
// then.
//
// This is a different loop with a different job. It does not teach; it searches.
// So it can move fast, and it can stop as soon as it has found the answer.
//
// The method is a staircase, the standard way to find somebody's threshold
// without asking them a hundred questions: go up when they succeed, down when
// they fail, and halve the size of the step every time they change direction.
// The step size collapses around the level where they start getting things
// wrong, and the places where the direction flipped — the REVERSALS — are the
// measurement. Averaging the last few is robust to one careless slip in a way
// that a plain binary search is not: a single wrong answer costs you one
// reversal instead of permanently halving the estimate.
//
// It settles in ten to twelve questions. See attunetest.mjs.

/**
 * Where each operation starts before anything is known.
 *
 * Roughly the relative difficulty the blank profile already assumes. Starting
 * LOW on purpose: the first question a child ever sees should be one she can
 * do, whoever she is. A staircase that opens with 13 x 9 has told a six-year-old
 * something about herself before she has answered anything.
 */
const START = { addition: 0.30, subtraction: 0.26, multiplication: 0.18, division: 0.15 }

const STEP0 = 0.18          // first step, about two-thirds of a tier
const SHRINK = 0.6          // how much the step collapses at each reversal
const STEP_MIN = 0.03
const STOP_REVERSALS = 5

/**
 * How far below the measured level to place her.
 *
 * The costs are not symmetric. Placed too low, she breezes the first maze, feels
 * clever, and Wizard's Sense pulls her up within one sitting — it costs nothing.
 * Placed too high, the game is too hard from her very first door and she
 * concludes she is bad at maths, which is the exact outcome this whole app
 * exists to avoid. So the estimate is shaded down, every time, on purpose.
 *
 * It is also why being placed slightly low FEELS better: the first hour is spent
 * getting visibly better at something, rather than sitting still at exactly the
 * right level.
 */
export const SHADE = 0.05

/** Questions each operation may be asked, before early stopping. */
export function laneBudget(n) {
  return n === 1 ? 16 : n === 2 ? 12 : 8
}

const orderedOps = ops => {
  const want = new Set([...(ops || [])])
  return OPS.map(o => o.key).filter(k => want.has(k))
}

/** Total questions the ceremony could ask — for telling her before she starts. */
export function attuneLength(ops) {
  const n = orderedOps(ops).length || 1
  return { lanes: n, max: laneBudget(n) * n, typical: Math.round(laneBudget(n) * n * 0.68) }
}

export function beginAttunement(ops) {
  const list = orderedOps(ops)
  const budget = laneBudget(list.length || 1)
  return {
    budget,
    // A lane per operation. They are measured independently because being quick
    // at addition says very little about division — a child strong in one and
    // new to another is the normal case, not the exception.
    lanes: (list.length ? list : ['addition']).map(op => ({
      op,
      level: START[op] ?? 0.25,
      step: STEP0,
      dir: 0,                 // +1 last answer was right, -1 wrong, 0 nothing yet
      reversals: [],
      asked: 0,
      done: false,
      seeded: false,
    })),
    cursor: 0,
    asked: 0,
    log: [],
  }
}

/** Stop a lane once it has turned around enough times, or run out of budget. */
function laneMin(budget) { return Math.min(8, Math.max(4, budget - 2)) }

function settle(lane, budget) {
  if (lane.asked >= budget) lane.done = true
  else if (lane.reversals.length >= STOP_REVERSALS && lane.asked >= laneMin(budget)) lane.done = true
}

/**
 * A lane that has not started yet can borrow from one that has finished.
 *
 * Knowing where her addition landed says a lot about where her subtraction will,
 * so there is no reason to make her walk the whole staircase again from the
 * bottom. The offsets are the same ones the starting levels use.
 */
function seed(session, lane) {
  if (lane.seeded || lane.asked > 0) return
  lane.seeded = true
  const from = session.lanes.find(l => l !== lane && l.done && l.reversals.length)
  if (!from) return
  const shift = (START[lane.op] ?? 0.25) - (START[from.op] ?? 0.25)
  lane.level = clamp(estimateOf(from, 0) + shift, 0.05, 0.9)
}

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v)

/** A lane's measurement: the mean of its last few turning points. */
function estimateOf(lane, shade = SHADE) {
  const pts = lane.reversals.length ? lane.reversals.slice(-3) : [lane.level]
  const mean = pts.reduce((a, b) => a + b, 0) / pts.length
  return clamp(mean - shade, 0.02, 1)
}

export const attuneDone = s => s.lanes.every(l => l.done)

export function attuneProgress(s) {
  const total = s.lanes.length * s.budget
  const spent = s.lanes.reduce((n, l) => n + (l.done ? s.budget : l.asked), 0)
  return clamp(spent / Math.max(1, total), 0, 1)
}

/**
 * The next question, at the level this staircase currently stands on.
 *
 * Generated through the ordinary `genQ` with a made-up profile whose skill is
 * the staircase's level — so an Attunement question is drawn from exactly the
 * same distribution as a real door at that level. There is no second question
 * generator to keep in step with the first.
 */
export function attuneNext(s) {
  const open = s.lanes.filter(l => !l.done)
  if (!open.length) return null
  const lane = open[s.cursor % open.length]
  s.cursor++
  seed(s, lane)
  const q = genQ([lane.op], SENSE, { skill: { [lane.op]: lane.level } })
  return { ...q, attuneOp: lane.op }
}

export function attuneRecord(s, q, correct, ms = 0) {
  const lane = s.lanes.find(l => l.op === (q?.attuneOp || q?.op))
  if (!lane || lane.done) return s
  lane.asked++
  s.asked++
  s.log.push({ q, correct, ms })

  const d = correct ? 1 : -1
  // A reversal is the interesting event: it means we have just crossed her
  // threshold, so this is a place worth remembering and the step should shrink.
  if (lane.dir !== 0 && d !== lane.dir) {
    lane.reversals.push(lane.level)
    lane.step = Math.max(STEP_MIN, lane.step * SHRINK)
  }
  lane.dir = d
  lane.level = clamp(lane.level + d * lane.step, 0.02, 1)
  settle(lane, s.budget)
  return s
}

/**
 * Where this places her, per operation.
 *
 * Only the operations that were actually measured appear — an operation she
 * never turned on is left exactly as it was, rather than being guessed at.
 */
export function attuneResult(s) {
  const skill = {}
  for (const l of s.lanes) skill[l.op] = round2(estimateOf(l))
  return { skill, asked: s.asked, log: s.log }
}

const round2 = v => Math.round(v * 100) / 100

// --- The corridor it happens in -----------------------------------------------

/**
 * One corridor, forward only, with a door at every step.
 *
 * This started as a maze, and the maze was wrong in three ways at once, all of
 * which a child found in a single sitting:
 *
 *  - The DIFFICULTY looked random. A staircase goes up and down by design —
 *    that is how it finds a threshold — but in a maze she also chooses which
 *    door to open and in what order, so the up-and-down read as the castle
 *    asking 2+2 and then 60+40 for no reason at all.
 *  - It seemed never to end. With doors scattered through a grid there is
 *    nothing to see that says how much is left.
 *  - It could run out of reachable doors near her, so the last few questions
 *    turned into a hunt.
 *
 * A corridor fixes all three by construction: the next question is the next
 * door, the way out is visibly ahead of her, and there is no navigating to do.
 * It is still a walk through the castle rather than a worksheet, which was the
 * only thing the maze was really buying.
 *
 * Laid out as a boustrophedon — along a row, down one, back along the next —
 * so it turns corners and feels like somewhere rather than a straight line.
 */
export function attuneCorridor(ops, profile) {
  const R = 4                          // rooms per side
  const H = R * 2 + 1, W = R * 2 + 1
  const grid = Array.from({ length: H }, () => Array(W).fill(WALL))

  // The rooms, in the order she will walk them.
  const order = []
  for (let r = 0; r < R; r++) {
    for (let i = 0; i < R; i++) {
      const c = r % 2 === 0 ? i : R - 1 - i
      order.push([r, c])
    }
  }

  const cell = ([r, c]) => [r * 2 + 1, c * 2 + 1]
  for (const room of order) {
    const [gr, gc] = cell(room)
    grid[gr][gc] = DOOR
  }
  // Carve the wall between each pair, so the path is one line with no branches.
  // These stay plain floor: one door per room means a question, then a few
  // steps of walking, then the next. Making the joins doors too would double
  // the count and leave her answering with no pause in between.
  for (let i = 1; i < order.length; i++) {
    const [ar, ac] = cell(order[i - 1])
    const [br, bc] = cell(order[i])
    grid[(ar + br) / 2][(ac + bc) / 2] = PATH
  }

  // She starts standing in the first room, so that one is not a question.
  const [sr, sc] = cell(order[0])
  grid[sr][sc] = CELL_START
  const [er, ec] = cell(order[order.length - 1])
  grid[er][ec] = CELL_END

  const seen = Array.from({ length: H }, () => Array(W).fill(false))
  revealFrom(seen, grid, sr, sc)

  return {
    grid, dq: {}, stones: {}, seen,
    start: { row: sr, col: sc },
    doorTotal: order.length - 1,
    pointsAvailable: 0,
    pointsRequired: 0,        // the way out is never sealed
  }
}

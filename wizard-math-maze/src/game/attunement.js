import { genQ, SENSE, OPS } from './math.js'
import { genMaze, revealFrom, PATH, DOOR } from './maze.js'

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

const DOOR_SHARE = 0.72     // how much of the floor is doors
const DOOR_MIN = 18         // …but never fewer than the ceremony could need

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

// --- The maze it happens in ---------------------------------------------------

/**
 * A compact maze, thick with doors.
 *
 * The instinct is to make a placement maze BIGGER, since there are more
 * questions in it. The opposite is right: walking is the enjoyable part of a
 * maze but it is dead time for a measurement, and sixteen questions at normal
 * corridor lengths is a long sit for a six-year-old. So the maze is small and
 * the doors come every few steps — the same amount of maths, half the walking.
 *
 * The doors carry no questions. A door's question has to be chosen at the moment
 * she opens it, because which question is worth asking depends on how she has
 * answered the ones before it — which is the whole idea. So the generated
 * questions are thrown away and the grid is kept for its shape.
 *
 * There is no exit gate and no way to fail. The ceremony ends when the staircase
 * has its answer, wherever in the maze she happens to be standing.
 */
export function attuneMaze(ops, profile) {
  const m = genMaze(ops, SENSE, profile, {}, 4)
  const H = m.grid.length, W = m.grid[0].length
  // Only the corner she starts in is kept clear, so her first step isn't a
  // question. The ordinary maze also keeps the ground around the EXIT clear,
  // which here would leave a door-free pocket in the far corner — and a child
  // who wandered into it would be hunting for her next question instead of
  // answering one. There is no gate to protect in this maze, so doors go
  // everywhere else.
  const near = (r, c) => r <= 2 && c <= 2

  const open = []
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    if ((m.grid[r][c] === PATH || m.grid[r][c] === DOOR) && !near(r, c)) open.push([r, c])
  }
  // Not every cell. A door on literally every step is a worksheet with a
  // corridor drawn round it; leaving some plain floor means she is still
  // walking somewhere between questions, which is the point of using a maze.
  open.sort(() => Math.random() - 0.5)
  const doors = open.slice(0, Math.max(DOOR_MIN, Math.round(open.length * DOOR_SHARE)))
  for (const [r, c] of open) m.grid[r][c] = PATH
  for (const [r, c] of doors) m.grid[r][c] = DOOR
  revealFrom(m.seen, m.grid, 1, 1)

  return {
    ...m,
    dq: {},                  // filled one door at a time, as she reaches them
    stones: {},              // no pickups: this is short and it is not about loot
    doorTotal: doors.length,
    pointsAvailable: 0,
    pointsRequired: 0,       // the way out is never sealed
  }
}

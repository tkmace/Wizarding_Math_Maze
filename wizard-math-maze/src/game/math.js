// --- Operations ---------------------------------------------------------------
// `rune` is drawn large and sharp on the door face; `color` tints the frame and
// the minimap marker, so an operation is identifiable at a glance even though
// the numbers themselves are blurred until you step up to the door.
//
// `weight` is how much harder this operation is than addition at the same size
// of numbers. It matters because the raw magnitude-based score can't tell that
// 6 x 7 is a bigger ask than 6 + 7.
export const OPS = [
  { key: 'addition',       label: 'Addition',       icon: '➕', rune: '+', color: '#7ee8a2', dim: '#2f6b45', short: 'add', weight: 1.00 },
  { key: 'subtraction',    label: 'Subtraction',    icon: '➖', rune: '−', color: '#f9ca74', dim: '#7a5a22', short: 'sub', weight: 1.15 },
  { key: 'multiplication', label: 'Multiplication', icon: '✖️', rune: '×', color: '#f78fb3', dim: '#7a3550', short: 'mul', weight: 1.45 },
  { key: 'division',       label: 'Division',       icon: '➗', rune: '÷', color: '#74b9ff', dim: '#2a5580', short: 'div', weight: 1.75 },
]
export const opByKey = k => OPS.find(o => o.key === k) || OPS[0]

// --- Fixed difficulty tiers ---------------------------------------------------
// `fastMs` is the quick-recall bonus window — generous, so a slow reader is
// never punished for reading.
export const TIERS = [
  { key: 'novice',     label: 'Novice',     icon: '🌿', color: '#b8f0c0', mult: 0.7, fastMs: 7000,  gate: 0.45, desc: 'Small numbers',
    ranges: { add: [1, 8],    sub: [3, 12],   mul: [1, 4],  div: [1, 4]  } },
  { key: 'apprentice', label: 'Apprentice', icon: '🌱', color: '#7ee8a2', mult: 1.0, fastMs: 6000,  gate: 0.50, desc: 'Classic challenge',
    ranges: { add: [1, 15],   sub: [5, 20],   mul: [1, 6],  div: [1, 6]  } },
  { key: 'sorcerer',   label: 'Sorcerer',   icon: '🔥', color: '#f9ca74', mult: 1.6, fastMs: 6500,  gate: 0.60, desc: 'Numbers get serious',
    ranges: { add: [5, 40],   sub: [10, 50],  mul: [2, 10], div: [2, 10] } },
  { key: 'archmage',   label: 'Archmage',   icon: '⚡', color: '#f78fb3', mult: 2.5, fastMs: 8000,  gate: 0.68, desc: 'Large numbers',
    ranges: { add: [10, 80],  sub: [20, 100], mul: [3, 12], div: [3, 12] } },
  { key: 'legendary',  label: 'Legendary',  icon: '💀', color: '#ff6bff', mult: 4.0, fastMs: 11000, gate: 0.75, desc: 'Only the bravest',
    ranges: { add: [50, 500], sub: [100, 999],mul: [6, 20], div: [6, 20] } },
]

/** Wizard's Sense — the adaptive setting, and the default for a new player. */
export const SENSE = 'sense'
export const SENSE_TIER = {
  key: SENSE, label: "Wizard's Sense", icon: '✨', color: '#c8a4ff', adaptive: true,
  desc: 'The maze reads you and adjusts',
}

/** Everything shown in the "how brave are you" list, adaptive first. */
export const DIFFS = [SENSE_TIER, ...TIERS]
export const tierByKey = k => (k === SENSE ? SENSE_TIER : TIERS.find(t => t.key === k) || TIERS[1])

const rnd = (lo, hi) => Math.floor(Math.random() * (hi - lo + 1)) + lo
const lerp = (a, b, t) => a + (b - a) * t
const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v)

// --- Wizard's Sense -----------------------------------------------------------
// One skill value per operation, in 0..1, nudged by every answer (see
// curriculum.recordAnswer). Rather than snapping between the five named tiers,
// the skill slides *between* them: skill 0 gives Novice-sized numbers, skill 1
// gives Legendary ones, and 0.5 gives something genuinely halfway. That keeps
// the difficulty moving smoothly instead of lurching a whole tier at a time,
// and each operation adapts independently — she can be fluent at addition and
// still be finding her feet with multiplication.
export const blankSkill = () => ({ addition: 0.12, subtraction: 0.10, multiplication: 0.06, division: 0.05 })

export function skillOf(profile, op) {
  const s = profile?.skill
  if (!s || typeof s[op] !== 'number') return blankSkill()[op] ?? 0.1
  return clamp01(s[op])
}

/** Interpolate the fixed tiers into a continuous difficulty at `skill`. */
export function senseTier(skill, op) {
  const short = opByKey(op).short
  const p = clamp01(skill) * (TIERS.length - 1)
  const i = Math.min(TIERS.length - 2, Math.floor(p))
  const t = p - i
  const a = TIERS[i], b = TIERS[i + 1]
  const ra = a.ranges[short], rb = b.ranges[short]
  return {
    key: SENSE,
    label: SENSE_TIER.label,
    ranges: { [short]: [Math.max(1, Math.round(lerp(ra[0], rb[0], t))), Math.max(2, Math.round(lerp(ra[1], rb[1], t)))] },
    mult: lerp(a.mult, b.mult, t),
    fastMs: lerp(a.fastMs, b.fastMs, t),
    adaptive: true,
    band: i + t,          // 0..4, handy for showing "where am I" in the UI
  }
}

/**
 * The effective difficulty for one operation: either a fixed tier, or the
 * player's current adaptive band for that operation.
 */
export function effectiveTier(diffKey, profile, op) {
  if (diffKey !== SENSE) {
    const t = tierByKey(diffKey)
    const short = opByKey(op).short
    return { key: t.key, label: t.label, ranges: { [short]: t.ranges[short] }, mult: t.mult, fastMs: t.fastMs, adaptive: false }
  }
  return senseTier(skillOf(profile, op), op)
}

/** How much of a maze's available points the exit gate demands. */
export function gateFraction(diffKey, profile, ops) {
  if (diffKey !== SENSE) return tierByKey(diffKey).gate
  const list = [...(ops || [])]
  if (!list.length) return 0.5
  const mean = list.reduce((s, op) => s + skillOf(profile, op), 0) / list.length
  return 0.45 + 0.30 * clamp01(mean)
}

// --- Points -------------------------------------------------------------------
/**
 * Round a score. Below 25 we keep single points, because rounding everything to
 * a multiple of 5 flattened the difference between operations at the low tiers —
 * multiplication paid exactly the same as addition at Apprentice, which is
 * wrong. Above 25 the numbers are big enough that multiples of 5 read better.
 */
export function roundPts(n) {
  return n < 25 ? Math.max(3, Math.round(n)) : Math.round(n / 5) * 5
}

export function calcPts(op, a, b, ans, mult) {
  let base
  if (op === 'addition') {
    const mx = Math.max(a, b)
    base = mx <= 8 ? 5 : mx <= 15 ? 9 : mx <= 30 ? 14 : mx <= 60 ? 20 : 28
  } else if (op === 'subtraction') {
    base = a <= 10 ? 6 : a <= 20 ? 10 : a <= 50 ? 16 : a <= 100 ? 22 : 30
    if (a - b < 3) base = base * 0.85
  } else if (op === 'multiplication') {
    base = ans <= 20 ? 10 : ans <= 50 ? 16 : ans <= 100 ? 24 : ans <= 200 ? 34 : 45
    const mf = Math.min(a, b)
    if (mf >= 6) base *= 1.15
    if (mf >= 8) base *= 1.25
  } else {
    const pr = b * ans
    base = pr <= 20 ? 10 : pr <= 50 ? 16 : pr <= 100 ? 24 : pr <= 200 ? 34 : 45
    if (b >= 6) base *= 1.15
    if (b >= 9) base *= 1.2
  }
  return roundPts(base * opByKey(op).weight * mult)
}

// --- Fact identity ------------------------------------------------------------
// Addition and multiplication are commutative, so 7x8 and 8x7 are ONE fact to
// practice. Subtraction and division are not, so order is preserved.
export function factKey(op, a, b) {
  const s = opByKey(op).short
  if (op === 'addition' || op === 'multiplication') {
    const [lo, hi] = a <= b ? [a, b] : [b, a]
    return `${s}:${lo}_${hi}`
  }
  return `${s}:${a}_${b}`
}

export function parseFactKey(key) {
  const [short, pair] = key.split(':')
  const op = (OPS.find(o => o.short === short) || OPS[0]).key
  const [a, b] = pair.split('_').map(Number)
  return { op, a, b }
}

const within = (n, [lo, hi]) => n >= lo && n <= hi

/** Is this fact inside the operand ranges currently in play? */
export function factInDifficulty(op, a, b, diffKey, profile) {
  const r = effectiveTier(diffKey, profile, op).ranges
  if (op === 'addition')       return within(a, r.add) && within(b, r.add)
  if (op === 'subtraction')    return within(a, r.sub) && b >= 1 && b <= a
  if (op === 'multiplication') return within(a, r.mul) && within(b, r.mul)
  return within(b, r.div) && a % b === 0 && within(a / b, r.div)
}

// --- Question builder ---------------------------------------------------------
export function buildQuestion(op, a, b, diffKey, profile) {
  const tier = effectiveTier(diffKey, profile, op)
  const o = opByKey(op)
  let ans, disp
  if (op === 'addition')            { ans = a + b; disp = `${a} + ${b}` }
  else if (op === 'subtraction')    { ans = a - b; disp = `${a} − ${b}` }
  else if (op === 'multiplication') { ans = a * b; disp = `${a} × ${b}` }
  else                              { ans = a / b; disp = `${a} ÷ ${b}` }

  const basePts = calcPts(op, a, b, ans, tier.mult)
  return {
    op, a, b, ans, disp,
    rune: o.rune, color: o.color, dim: o.dim, emoji: o.icon,
    key: factKey(op, a, b),
    basePts, curPts: basePts,
    fastMs: tier.fastMs,
    wrongs: 0, hinted: false, clear: false,
  }
}

/** Pass `forced` = { op, a, b } to practice one specific fact. */
export function genQ(ops, diffKey, profile, forced = null) {
  if (forced) return buildQuestion(forced.op, forced.a, forced.b, diffKey, profile)

  const opArr = [...ops]
  const op = opArr[Math.floor(Math.random() * opArr.length)]
  const r = effectiveTier(diffKey, profile, op).ranges
  let a, b
  if (op === 'addition')            { a = rnd(...r.add); b = rnd(...r.add) }
  else if (op === 'subtraction')    { a = rnd(...r.sub); b = rnd(1, a) }
  else if (op === 'multiplication') { a = rnd(...r.mul); b = rnd(...r.mul) }
  else                              { b = rnd(...r.div); a = b * rnd(...r.div) }
  return buildQuestion(op, a, b, diffKey, profile)
}

// --- Visual hint descriptors --------------------------------------------------
/**
 * Describes how to *show* the answer rather than tell it. A child who has just
 * got 7 x 6 wrong learns nothing from being handed "42"; seeing seven rows of
 * six dots and counting them builds the fact.
 */
export function buildHint(q) {
  const { op, a, b, ans } = q
  if (op === 'multiplication' && a <= 12 && b <= 12)
    return { kind: 'grid', rows: Math.min(a, b), cols: Math.max(a, b),
             caption: `${Math.min(a, b)} rows of ${Math.max(a, b)} — count them all` }
  if (op === 'division' && b <= 12 && ans <= 12)
    return { kind: 'groups', groups: b, per: ans,
             caption: `Share ${a} into ${b} equal groups — how many in each?` }
  if (op === 'addition' && Math.max(a, b) <= 20 && ans <= 30)
    return { kind: 'line', from: a, add: b, to: ans, max: Math.max(30, ans),
             caption: `Start at ${a}, then hop forward ${b} times` }
  if (op === 'subtraction' && a <= 30)
    return { kind: 'line', from: a, add: -b, to: ans, max: Math.max(30, a),
             caption: `Start at ${a}, then hop back ${b} times` }
  return { kind: 'split', op, a, b, caption: splitCaption(op, a, b) }
}

function splitCaption(op, a, b) {
  if (op === 'addition' || op === 'subtraction') {
    const sign = op === 'addition' ? '+' : '−'
    const bt = Math.floor(b / 10) * 10, bo = b - bt
    if (bt === 0) return `${a} ${sign} ${b}`
    return `Do it in two hops:  ${a} ${sign} ${bt}  then  ${sign} ${bo}`
  }
  if (op === 'multiplication') {
    const at = Math.floor(a / 10) * 10, ao = a - at
    if (at === 0) return `${a} × ${b}`
    return `Split it:  (${at} × ${b}) + (${ao} × ${b})`
  }
  return `How many ${b}s fit inside ${a}?`
}

// Kept for callers that still import the old names.
export const to5 = roundPts
export const diffByKey = tierByKey

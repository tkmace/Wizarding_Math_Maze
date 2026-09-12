// ─── Operations ───────────────────────────────────────────────────────────────
// `rune` is drawn large on the door face; `color` tints the door frame + minimap
// marker so each operation is identifiable at a glance, before you can read it.
export const OPS = [
  { key: 'addition',       label: 'Addition',       icon: '➕', rune: '+', color: '#7ee8a2', dim: '#2f6b45', short: 'add' },
  { key: 'subtraction',    label: 'Subtraction',    icon: '➖', rune: '−', color: '#f9ca74', dim: '#7a5a22', short: 'sub' },
  { key: 'multiplication', label: 'Multiplication', icon: '✖️', rune: '×', color: '#f78fb3', dim: '#7a3550', short: 'mul' },
  { key: 'division',       label: 'Division',       icon: '➗', rune: '÷', color: '#74b9ff', dim: '#2a5580', short: 'div' },
]
export const opByKey = k => OPS.find(o => o.key === k) || OPS[0]

// ─── Difficulties ─────────────────────────────────────────────────────────────
// `fastMs` is the window for the ⚡ quick-recall bonus — generous for the easy
// tiers so a slow reader is never punished, tighter as the numbers get simpler
// relative to skill.
export const DIFFS = [
  { key: 'novice',     label: 'Novice',     icon: '🌿', color: '#b8f0c0', mult: 0.7, fastMs: 7000, desc: 'Small numbers',
    ranges: { add: [1, 8],    sub: [3, 12],   mul: [1, 4],  div: [1, 4]  } },
  { key: 'apprentice', label: 'Apprentice', icon: '🌱', color: '#7ee8a2', mult: 1.0, fastMs: 6000, desc: 'Classic challenge',
    ranges: { add: [1, 15],   sub: [5, 20],   mul: [1, 6],  div: [1, 6]  } },
  { key: 'sorcerer',   label: 'Sorcerer',   icon: '🔥', color: '#f9ca74', mult: 1.6, fastMs: 6500, desc: 'Numbers get serious',
    ranges: { add: [5, 40],   sub: [10, 50],  mul: [2, 10], div: [2, 10] } },
  { key: 'archmage',   label: 'Archmage',   icon: '⚡', color: '#f78fb3', mult: 2.5, fastMs: 8000, desc: 'Large numbers',
    ranges: { add: [10, 80],  sub: [20, 100], mul: [3, 12], div: [3, 12] } },
  { key: 'legendary',  label: 'Legendary',  icon: '💀', color: '#ff6bff', mult: 4.0, fastMs: 11000, desc: 'Only the bravest',
    ranges: { add: [50, 500], sub: [100, 999],mul: [6, 20], div: [6, 15] } },
]
export const diffByKey = k => DIFFS.find(d => d.key === k) || DIFFS[1]

const rnd = (lo, hi) => Math.floor(Math.random() * (hi - lo + 1)) + lo

// ─── Point calculation (tuned in v1 — kept intact) ────────────────────────────
export function calcPts(op, a, b, ans, m) {
  let base
  if (op === 'addition') {
    const mx = Math.max(a, b)
    base = mx <= 8 ? 5 : mx <= 15 ? 9 : mx <= 30 ? 14 : mx <= 60 ? 20 : 28
  } else if (op === 'subtraction') {
    base = a <= 10 ? 6 : a <= 20 ? 10 : a <= 50 ? 16 : a <= 100 ? 22 : 30
    if (a - b < 3) base = Math.round(base * 0.85)
  } else if (op === 'multiplication') {
    base = ans <= 20 ? 10 : ans <= 50 ? 16 : ans <= 100 ? 24 : ans <= 200 ? 34 : 45
    const mf = Math.min(a, b)
    if (mf >= 6) base = Math.round(base * 1.15)
    if (mf >= 8) base = Math.round(base * 1.25)
  } else {
    const pr = b * ans
    base = pr <= 20 ? 10 : pr <= 50 ? 16 : pr <= 100 ? 24 : pr <= 200 ? 34 : 45
    if (b >= 6) base = Math.round(base * 1.15)
    if (b >= 9) base = Math.round(base * 1.2)
  }
  return Math.max(5, Math.round(Math.round(base * m) / 5) * 5)
}

/** Round to the nearest 5, floor of 5 — used for every points adjustment. */
export const to5 = n => Math.max(5, Math.round(n / 5) * 5)

// ─── Fact identity ────────────────────────────────────────────────────────────
// Addition and multiplication are commutative, so 7×8 and 8×7 are ONE fact to
// practise, not two. Subtraction and division are not, so order is preserved.
export function factKey(op, a, b) {
  const s = opByKey(op).short
  if (op === 'addition' || op === 'multiplication') {
    const [lo, hi] = a <= b ? [a, b] : [b, a]
    return `${s}:${lo}_${hi}`
  }
  return `${s}:${a}_${b}`
}

/** Rebuild the operands of a fact from its key. */
export function parseFactKey(key) {
  const [short, pair] = key.split(':')
  const op = (OPS.find(o => o.short === short) || OPS[0]).key
  const [a, b] = pair.split('_').map(Number)
  return { op, a, b }
}

/** Is this fact inside the operand ranges of the given difficulty? */
export function factInDifficulty(op, a, b, dk) {
  const r = diffByKey(dk).ranges
  if (op === 'addition')       return within(a, r.add) && within(b, r.add)
  if (op === 'subtraction')    return within(a, r.sub) && b >= 1 && b <= a
  if (op === 'multiplication') return within(a, r.mul) && within(b, r.mul)
  return within(b, r.div) && a % b === 0 && within(a / b, [1, r.div[1]])
}
const within = (n, [lo, hi]) => n >= lo && n <= hi

// ─── Question builder ─────────────────────────────────────────────────────────
/**
 * Build a question object. Pass `forced` = { op, a, b } to practise a specific
 * fact (the spaced-repetition path); otherwise operands are drawn at random
 * from the difficulty's ranges.
 */
export function buildQuestion(op, a, b, dk) {
  const d = diffByKey(dk)
  const o = opByKey(op)
  let ans, disp
  if (op === 'addition')            { ans = a + b; disp = `${a} + ${b}` }
  else if (op === 'subtraction')    { ans = a - b; disp = `${a} − ${b}` }
  else if (op === 'multiplication') { ans = a * b; disp = `${a} × ${b}` }
  else                              { ans = a / b; disp = `${a} ÷ ${b}` }
  const basePts = calcPts(op, a, b, ans, d.mult)
  return {
    op, a, b, ans, disp,
    rune: o.rune, color: o.color, dim: o.dim, emoji: o.icon,
    key: factKey(op, a, b),
    basePts, curPts: basePts,
    wrongs: 0, hinted: false,
  }
}

export function genQ(ops, dk, forced = null) {
  if (forced) return buildQuestion(forced.op, forced.a, forced.b, dk)
  const d = diffByKey(dk)
  const opArr = [...ops]
  const op = opArr[Math.floor(Math.random() * opArr.length)]
  const r = d.ranges
  let a, b
  if (op === 'addition')            { a = rnd(...r.add); b = rnd(...r.add) }
  else if (op === 'subtraction')    { a = rnd(...r.sub); b = rnd(1, a) }
  else if (op === 'multiplication') { a = rnd(...r.mul); b = rnd(...r.mul) }
  else                              { b = rnd(...r.div); const q = rnd(1, r.div[1]); a = b * q }
  return buildQuestion(op, a, b, dk)
}

// ─── Visual hint descriptors ──────────────────────────────────────────────────
/**
 * Describes how to *show* the answer rather than tell it. The UI renders these;
 * keeping them as plain data means the same hint works in the modal and in the
 * parent report.
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
  // Big numbers: break the problem into place values instead of drawing dots.
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

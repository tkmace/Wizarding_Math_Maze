// --- Ranks, forms and perks ---------------------------------------------------
// Eight ranks above the starting form, each offering a CHOICE of three wizards.
// Thresholds are deliberately front-loaded: the first two ranks arrive inside a
// maze or two so a new player gets a reward almost immediately, then they
// stretch out so the later forms stay worth chasing.
//
// Every form is drawn procedurally from the fields below (see
// engine/wizardSprite.js) rather than from image files — that's what makes 25
// distinct wizards affordable with nothing to host and crisp art at any size.
//
// Each form also carries a PERK. Because a rank's three forms are mutually
// exclusive for ever, the perks are the real choice: one leans on scoring, one
// on forgiveness, one on tempo. None of them shortcut the maths.

export const RANKS = [
  { rank: 0, threshold: 0,     name: 'Apprentice' },
  { rank: 1, threshold: 100,   name: 'Initiate' },
  { rank: 2, threshold: 300,   name: 'Adept' },
  { rank: 3, threshold: 700,   name: 'Scholar' },
  { rank: 4, threshold: 1500,  name: 'Conjurer' },
  { rank: 5, threshold: 3000,  name: 'Sage' },
  { rank: 6, threshold: 6000,  name: 'Oracle' },
  { rank: 7, threshold: 11000, name: 'Archmage' },
  { rank: 8, threshold: 20000, name: 'Grand Wizard' },
]

/**
 * Perks, kept small and legible so a child can read one and understand it.
 *   fortune  — points multiplier
 *   mercy    — fraction a wrong answer costs (0.5 is the default penalty)
 *   swift    — extra milliseconds on the quick-recall bonus window
 *   stones   — extra rune stones placed in every maze
 *   seer     — doors whose numbers are legible from a distance, per maze
 *   gate     — exit gate lowered by this fraction
 */
const P = {
  none:    { label: 'A steady beginning', desc: 'No magic bonus yet — earn points to choose your first true form.' },
  fortune: v => ({ fortune: v, label: `+${Math.round((v - 1) * 100)}% points`, desc: `Every door pays ${Math.round((v - 1) * 100)}% more.` }),
  mercy:   v => ({ mercy: v, label: 'Gentle failure', desc: `A wrong answer only costs ${Math.round(v * 100)}% of the door's points instead of 50%.` }),
  swift:   v => ({ swift: v, label: `+${v / 1000}s quick bonus`, desc: `The ⚡ quick-answer window lasts ${v / 1000} seconds longer.` }),
  stones:  v => ({ stones: v, label: `+${v} rune stone${v > 1 ? 's' : ''}`, desc: `${v} extra rune stone${v > 1 ? 's' : ''} appear in every maze, for hints.` }),
  seer:    v => ({ seer: v, label: 'True sight', desc: `${v} door${v > 1 ? 's' : ''} per maze show their numbers clearly from afar.` }),
  gate:    v => ({ gate: v, label: 'Lighter gate', desc: `The exit unseals with ${Math.round(v * 100)}% fewer points needed.` }),
}

/**
 * Form fields:
 *   robe/trim  — the two main colours
 *   hat        — pointed | wide | hood | horned | crown
 *   staff      — wand | staff | orb | crook | none
 *   aura       — null | sparkle | flame | frost | star | leaf | storm
 *   emoji      — compact stand-in for tight list rows
 */
export const FORMS = [
  // ── Rank 0 — the starting form ──
  { id: 'apprentice', rank: 0, title: 'Apprentice', emoji: '🧙',
    robe: '#6f6fae', trim: '#a9a9d8', hat: 'pointed', staff: 'wand', aura: null,
    blurb: 'Every wizard starts here.', perk: P.none },

  // ── Rank 1 — 100 pts ──
  { id: 'candle', rank: 1, title: 'Candle Mage', emoji: '🕯️',
    robe: '#c4762c', trim: '#ffd9a0', hat: 'pointed', staff: 'wand', aura: 'flame',
    blurb: 'Small flame, steady hand.', perk: P.fortune(1.08) },
  { id: 'leaf', rank: 1, title: 'Leaf Whisperer', emoji: '🌿',
    robe: '#3f8f5c', trim: '#b8f0c0', hat: 'wide', staff: 'crook', aura: 'leaf',
    blurb: 'The garden listens to you.', perk: P.mercy(0.35) },
  { id: 'pebble', rank: 1, title: 'Pebble Adept', emoji: '🪨',
    robe: '#6b7180', trim: '#c8d0dd', hat: 'hood', staff: 'staff', aura: null,
    blurb: 'Patient as stone.', perk: P.stones(1) },

  // ── Rank 2 — 300 pts ──
  { id: 'frost', rank: 2, title: 'Frost Scribe', emoji: '❄️',
    robe: '#3f7fb8', trim: '#dff6ff', hat: 'pointed', staff: 'wand', aura: 'frost',
    blurb: 'Writes spells in ice.', perk: P.swift(2000) },
  { id: 'ember', rank: 2, title: 'Ember Acolyte', emoji: '🔥',
    robe: '#b23a2a', trim: '#ffb072', hat: 'hood', staff: 'staff', aura: 'flame',
    blurb: 'Keeper of the first fire.', perk: P.fortune(1.12) },
  { id: 'tide', rank: 2, title: 'Tide Caller', emoji: '🌊',
    robe: '#2a7f8f', trim: '#8ff0e6', hat: 'wide', staff: 'orb', aura: null,
    blurb: 'The sea answers when called.', perk: P.gate(0.12) },

  // ── Rank 3 — 700 pts ──
  { id: 'storm', rank: 3, title: 'Storm Herald', emoji: '⚡',
    robe: '#4a4a8f', trim: '#ffe9a0', hat: 'pointed', staff: 'staff', aura: 'storm',
    blurb: 'Thunder walks a step behind.', perk: P.swift(3000) },
  { id: 'moon', rank: 3, title: 'Moon Scholar', emoji: '🌙',
    robe: '#3a3a6e', trim: '#d8d8ff', hat: 'hood', staff: 'orb', aura: 'star',
    blurb: 'Reads by moonlight only.', perk: P.seer(1) },
  { id: 'thorn', rank: 3, title: 'Thorn Warden', emoji: '🌹',
    robe: '#6b2f4a', trim: '#f0a8c0', hat: 'horned', staff: 'crook', aura: 'leaf',
    blurb: 'Guards the briar gate.', perk: P.mercy(0.3) },

  // ── Rank 4 — 1,500 pts ──
  { id: 'starweaver', rank: 4, title: 'Starweaver', emoji: '✨',
    robe: '#2f2f7a', trim: '#ffe9c2', hat: 'pointed', staff: 'wand', aura: 'star',
    blurb: 'Stitches constellations by hand.', perk: P.fortune(1.18) },
  { id: 'flamebinder', rank: 4, title: 'Flamebinder', emoji: '🔆',
    robe: '#8f2a1f', trim: '#ffd070', hat: 'horned', staff: 'staff', aura: 'flame',
    blurb: 'Fire obeys, mostly.', perk: P.stones(2) },
  { id: 'mist', rank: 4, title: 'Mistwalker', emoji: '🌫️',
    robe: '#57708a', trim: '#e0eef7', hat: 'hood', staff: 'none', aura: 'frost',
    blurb: 'Steps between the fog.', perk: P.gate(0.18) },

  // ── Rank 5 — 3,000 pts ──
  { id: 'runesage', rank: 5, title: 'Rune Sage', emoji: '🔮',
    robe: '#5a3f9a', trim: '#d0b0ff', hat: 'pointed', staff: 'orb', aura: 'sparkle',
    blurb: 'Knows the shape of every rune.', perk: P.seer(2) },
  { id: 'dawn', rank: 5, title: 'Dawn Templar', emoji: '🌅',
    robe: '#b8862a', trim: '#fff0c0', hat: 'crown', staff: 'staff', aura: 'flame',
    blurb: 'First light is a weapon.', perk: P.fortune(1.22) },
  { id: 'shadow', rank: 5, title: 'Shadow Cartographer', emoji: '🗺️',
    robe: '#2a2a3f', trim: '#8f8fc0', hat: 'hood', staff: 'wand', aura: null,
    blurb: 'Maps the halls nobody lights.', perk: P.mercy(0.25) },

  // ── Rank 6 — 6,000 pts ──
  { id: 'astral', rank: 6, title: 'Astral Oracle', emoji: '🌌',
    robe: '#241a5c', trim: '#a0e0ff', hat: 'crown', staff: 'orb', aura: 'star',
    blurb: 'Sees the maze before it is built.', perk: P.seer(3) },
  { id: 'dragon', rank: 6, title: 'Dragon Tutor', emoji: '🐉',
    robe: '#1f6b4a', trim: '#ffd070', hat: 'horned', staff: 'staff', aura: 'flame',
    blurb: 'Teaches sums to something enormous.', perk: P.fortune(1.28) },
  { id: 'glass', rank: 6, title: 'Glass Alchemist', emoji: '⚗️',
    robe: '#2f7f8f', trim: '#dffaff', hat: 'wide', staff: 'orb', aura: 'frost',
    blurb: 'Turns mistakes into windows.', perk: P.mercy(0.2) },

  // ── Rank 7 — 11,000 pts ──
  { id: 'arch-ember', rank: 7, title: 'Archmage of Ember', emoji: '🜂',
    robe: '#7a1f14', trim: '#ffc46b', hat: 'crown', staff: 'staff', aura: 'flame',
    blurb: 'The forge bows.', perk: P.fortune(1.35) },
  { id: 'arch-tide', rank: 7, title: 'Archmage of Tides', emoji: '🜄',
    robe: '#14496b', trim: '#8ff0ff', hat: 'crown', staff: 'orb', aura: 'frost',
    blurb: 'The deep keeps your counsel.', perk: P.swift(4500) },
  { id: 'arch-star', rank: 7, title: 'Archmage of Stars', emoji: '🜍',
    robe: '#3d1f6b', trim: '#ffe9ff', hat: 'crown', staff: 'wand', aura: 'star',
    blurb: 'Night is a library.', perk: P.seer(4) },

  // ── Rank 8 — 20,000 pts ──
  { id: 'grand', rank: 8, title: 'Grand Wizard', emoji: '👑',
    robe: '#4a1f6b', trim: '#ffe070', hat: 'crown', staff: 'staff', aura: 'sparkle',
    blurb: 'A legend of the ancient ages.', perk: P.fortune(1.5) },
  { id: 'eternal', rank: 8, title: 'Eternal Sage', emoji: '♾️',
    robe: '#1f4a4a', trim: '#a0ffe0', hat: 'hood', staff: 'orb', aura: 'sparkle',
    blurb: 'Has answered every question twice.', perk: P.mercy(0.1) },
  { id: 'keeper', rank: 8, title: 'Keeper of the Maze', emoji: '🗝️',
    robe: '#3f2a1f', trim: '#ffd9a0', hat: 'horned', staff: 'crook', aura: 'storm',
    blurb: 'Built these halls. Still gets lost.', perk: P.gate(0.3) },
]

export const STARTER = 'apprentice'

// --- Rune prices for the forms you didn't pick --------------------------------
// The free pick at each rank is still one-of-three and still permanent. The two
// you passed over aren't gone for ever any more — they can be BOUGHT with rune
// stones, which are earned by playing (roughly 3-4 a maze) rather than by
// points.
//
// The prices come from Tom's rule: a form should cost about the runes you'd be
// holding one or two ranks above the rank it belongs to. Runes accrue roughly
// LINEARLY with play (~3.5 a maze) while point thresholds DOUBLE each rank, so
// the rule works beautifully low down and explodes at the top — hence the taper
// above rank 4. Two properties are preserved at every rank:
//
//   1. The price is always more than the runes you'd hold when you first reach
//      that rank, so buying always arrives LATER than the free choice.
//   2. Prices only ever go up, so a higher form is never the cheaper one.
//
//   rank  free at    runes held   price   ≈ mazes of saving
//    1      100 pts       3         20          5
//    2      300           9         40          9
//    3      700          20         70         14
//    4    1,500          44        110         19
//    5    3,000          88        170         23
//    6    6,000         175        250         21
//    7   11,000         321        400         23
//    8   20,000         583        700         33
const RUNE_COST = { 1: 20, 2: 40, 3: 70, 4: 110, 5: 170, 6: 250, 7: 400, 8: 700 }

/** What an unchosen form at this rank costs in rune stones. */
export const runeCost = rank => RUNE_COST[rank] || 0

export const formById = id => FORMS.find(f => f.id === id) || FORMS[0]
export const formsAtRank = rank => FORMS.filter(f => f.rank === rank)
export const rankInfo = rank => RANKS.find(r => r.rank === rank) || RANKS[0]

/** Highest rank the given points have reached. */
export function rankFor(points) {
  let r = RANKS[0]
  for (const x of RANKS) if (points >= x.threshold) r = x
  return r
}

export const nextRank = points => RANKS.find(r => r.threshold > points) || null

/** Progress (0..1) toward the next rank; 1 when maxed. */
export function rankProgress(points) {
  const next = nextRank(points)
  if (!next) return 1
  const cur = rankFor(points)
  const span = next.threshold - cur.threshold
  return span <= 0 ? 1 : Math.min(1, Math.max(0, (points - cur.threshold) / span))
}

/**
 * Ranks the player has reached but not yet chosen a form for. Each one owes them
 * a pick-one-of-three, oldest first.
 */
export function pendingRanks(profile) {
  const reached = rankFor(profile?.totalPoints || 0).rank
  const chosen = profile?.chosen || {}
  const out = []
  for (let r = 1; r <= reached; r++) if (!chosen[r]) out.push(r)
  return out
}

/** Every form the player can actually wear — picked at a rank, or bought with runes. */
export function ownedForms(profile) {
  const ids = ownedIds(profile)
  return FORMS.filter(f => ids.includes(f.id))
}

export function ownedIds(profile) {
  const chosen = Object.values(profile?.chosen || {})
  const bought = Array.isArray(profile?.bought) ? profile.bought : []
  return [STARTER, ...chosen, ...bought]
}

export const owns = (profile, id) => ownedIds(profile).includes(id)

/**
 * Can this form be bought right now? Three gates, in the order a player meets
 * them: the rank has to be reached, the free choice at that rank has to be made
 * (so the permanent decision still comes first and still means something), and
 * the runes have to be there.
 */
export function buyState(profile, form) {
  const reached = rankFor(profile?.totalPoints || 0).rank
  const cost = runeCost(form.rank)
  const runes = profile?.stones || 0
  if (owns(profile, form.id)) return { own: true, cost }
  if (form.rank === 0 || !cost) return { blocked: 'none', cost }
  if (form.rank > reached) return { blocked: 'rank', cost }
  if (!(profile?.chosen || {})[form.rank]) return { blocked: 'choose', cost }
  if (runes < cost) return { blocked: 'runes', cost, short: cost - runes }
  return { can: true, cost }
}

/**
 * Combined effect of the worn form. Perks don't stack across forms — only what
 * she's actually wearing counts, which keeps the choice meaningful.
 */
export function activePerks(profile) {
  const form = formById(profile?.equippedSkin || STARTER)
  const p = form.perk || {}
  return {
    fortune: p.fortune || 1,
    mercy: p.mercy != null ? p.mercy : 0.5,
    swift: p.swift || 0,
    stones: p.stones || 0,
    seer: p.seer || 0,
    gate: p.gate || 0,
    form,
  }
}

// Back-compat: v3 profiles stored these ids in `equippedSkin`.
const LEGACY_MAP = {
  mage: 'candle', enchanter: 'frost', sorceress: 'moon',
  archmage: 'starweaver', legendary: 'grand',
}
export const mapLegacySkin = id => (id && LEGACY_MAP[id]) || (FORMS.some(f => f.id === id) ? id : STARTER)

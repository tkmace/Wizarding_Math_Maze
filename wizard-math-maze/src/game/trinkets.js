// --- Trinkets: what rune stones are for ---------------------------------------
// Rune stones had exactly one use — a hint at a door — and a robe she had
// passed over, which costs twenty of them and takes several sittings. So a
// child who does not want a hint has nothing to spend anything on, and picking
// up a stone means nothing.
//
// Trinkets are the small end of that ladder. The first one costs about a
// maze's worth, the last one about five, and every one of them is VISIBLE: it
// is drawn over whatever robe she is wearing, on every screen that shows her.
// That is the whole point — a thing you can see is worth saving for, and a
// number in a corner is not.
//
// Deliberately not perks. Nothing here makes the maths easier or the points
// bigger. They exist so that collecting runes has an end, and so that a wizard
// who has played for a month looks different from one who started today — and
// looks different by her own choices rather than by her rank.
//
// Each one occupies its own place on the figure (throat, brow, eyes, and the
// air either side of her), so any combination can be worn at once without two
// of them landing in the same spot.

export const TRINKETS = [
  {
    id: 'pendant',
    name: 'Moonstone Pendant',
    blurb: 'A pale stone on a cord, cool to the touch',
    emoji: '📿',
    cost: 8,
    slot: 'throat',
  },
  {
    id: 'circlet',
    name: 'Emberglass Circlet',
    blurb: 'A thin band across the brow, with one warm stone',
    emoji: '👑',
    cost: 14,
    slot: 'brow',
  },
  {
    id: 'spectacles',
    name: 'Owl-Eye Spectacles',
    blurb: 'For reading the small print on old spells',
    emoji: '👓',
    cost: 20,
    slot: 'eyes',
  },
  {
    id: 'moth',
    name: 'Spirit Moth',
    blurb: 'It follows you. Nobody knows why',
    emoji: '🦋',
    cost: 30,
    slot: 'air-left',
  },
  {
    id: 'crystal',
    name: 'Seeing Crystal',
    blurb: 'Turns slowly in the air beside your shoulder',
    emoji: '💎',
    cost: 42,
    slot: 'air-right',
  },
  {
    id: 'wand',
    name: 'Starwood Wand',
    blurb: 'Cut from a tree that was struck twice',
    emoji: '🪄',
    cost: 60,
    slot: 'hand-left',
  },
]

export const trinketById = id => TRINKETS.find(t => t.id === id) || null

export const ownsTrinket = (profile, id) => (profile?.trinkets || []).includes(id)

/** Worn right now, filtered to the ones she actually owns. */
export function wornTrinkets(profile) {
  const owned = profile?.trinkets || []
  return (profile?.wearing || []).filter(id => owned.includes(id) && trinketById(id))
}

/**
 * Can she buy this one? Re-checked wherever it matters rather than trusted from
 * a button, the same as buying a robe.
 */
export function buyTrinketState(profile, trinket) {
  if (!trinket) return { blocked: 'none', cost: 0 }
  const runes = profile?.stones || 0
  if (ownsTrinket(profile, trinket.id)) return { own: true, cost: trinket.cost }
  if (runes < trinket.cost) return { blocked: 'runes', cost: trinket.cost, short: trinket.cost - runes }
  return { can: true, cost: trinket.cost }
}

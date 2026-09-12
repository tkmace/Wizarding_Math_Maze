// ─── Wizard ranks / skins ─────────────────────────────────────────────────────
export const ALL_SKINS = [
  { id: 'apprentice', threshold: 0,     emoji: '🧙‍♂️', title: 'Apprentice',   wand: '🪄', color: '#a0a0cc', glow: '#8f8fd8', desc: 'Your journey begins...' },
  { id: 'mage',       threshold: 300,   emoji: '🧙',    title: 'Mage',         wand: '⚡', color: '#7ee8a2', glow: '#4fd97f', desc: 'The arcane arts awaken!' },
  { id: 'enchanter',  threshold: 800,   emoji: '🧝',    title: 'Enchanter',    wand: '🔮', color: '#74b9ff', glow: '#3d9bff', desc: 'Reality bends to your will.' },
  { id: 'sorceress',  threshold: 2000,  emoji: '🧝‍♀️', title: 'Sorceress',    wand: '🌙', color: '#f78fb3', glow: '#f4699a', desc: 'The stars know your name.' },
  { id: 'archmage',   threshold: 5000,  emoji: '🧛',    title: 'Archmage',     wand: '🌟', color: '#f9ca74', glow: '#f0932b', desc: 'Mastery over all elements!' },
  { id: 'legendary',  threshold: 12000, emoji: '👑',    title: 'Grand Wizard', wand: '☄️', color: '#ff6bff', glow: '#ff2fff', desc: 'A legend of the ancient ages.' },
]

export const skinById   = id => ALL_SKINS.find(s => s.id === id) || ALL_SKINS[0]
export const getSkin    = p  => [...ALL_SKINS].reverse().find(s => p >= s.threshold) || ALL_SKINS[0]
export const getUnlocked= p  => ALL_SKINS.filter(s => p >= s.threshold)
export const getNext    = p  => ALL_SKINS.find(s => s.threshold > p) || null

/** Progress (0..1) toward the next rank. Returns 1 when maxed. */
export function rankProgress(points) {
  const next = getNext(points)
  if (!next) return 1
  const cur = getSkin(points)
  const span = next.threshold - cur.threshold
  return span <= 0 ? 1 : Math.min(1, (points - cur.threshold) / span)
}

// --- Who you are, under the robe ----------------------------------------------
// A form is a costume you earn; this is the wizard herself. Kept deliberately
// small — five skin tones, four hair lengths, five hair colours — because the
// point is that she picks a face once and it carries across all 25 forms, not
// that she spends ten minutes in a character creator.

export const SKIN_TONES = [
  { id: 0, name: 'Porcelain', hex: '#f6ddc6' },
  { id: 1, name: 'Sand',      hex: '#e8c9a0' },
  { id: 2, name: 'Honey',     hex: '#cf9d6d' },
  { id: 3, name: 'Chestnut',  hex: '#a06f47' },
  { id: 4, name: 'Umber',     hex: '#6d472c' },
]

export const HAIR_COLORS = [
  { id: 0, name: 'Midnight', hex: '#2b2732' },
  { id: 1, name: 'Chestnut', hex: '#6b4326' },
  { id: 2, name: 'Copper',   hex: '#b0541f' },
  { id: 3, name: 'Wheat',    hex: '#dcb75c' },
  { id: 4, name: 'Silver',   hex: '#dcdceb' },
]

export const HAIR_STYLES = [
  { id: 0, name: 'Cropped',  desc: 'Neat under the hat' },
  { id: 1, name: 'Short',    desc: 'Just past the ears' },
  { id: 2, name: 'Shoulder', desc: 'Down to the collar' },
  { id: 3, name: 'Long',     desc: 'Falls past the shoulders' },
]

export const blankAppearance = () => ({ skin: 1, hairColor: 1, hairStyle: 1 })

const pick = (list, i, fallback) => list[i] || list[fallback]

/** Resolve an appearance record into the colours the sprite actually draws. */
export function resolveLook(appearance) {
  const a = { ...blankAppearance(), ...(appearance || {}) }
  return {
    skinHex: pick(SKIN_TONES, a.skin, 1).hex,
    hairHex: pick(HAIR_COLORS, a.hairColor, 1).hex,
    hairStyle: Math.max(0, Math.min(HAIR_STYLES.length - 1, a.hairStyle ?? 1)),
  }
}

/** A random look, for a brand new wizard so she isn't always the same face. */
export function randomAppearance() {
  return {
    skin: Math.floor(Math.random() * SKIN_TONES.length),
    hairColor: Math.floor(Math.random() * HAIR_COLORS.length),
    hairStyle: Math.floor(Math.random() * HAIR_STYLES.length),
  }
}

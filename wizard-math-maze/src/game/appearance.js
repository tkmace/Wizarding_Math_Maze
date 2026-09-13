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

// --- Face parts ---------------------------------------------------------------
// The face is assembled from swappable parts rather than drawn as one fixed
// illustration. Every entry here is just a name and a few numbers; the drawing
// code in engine/wizardSprite.js reads those numbers and knows nothing about
// which part it is drawing. That is what lets one face rig produce a room full
// of people who don't look like siblings, and what makes adding a part a line
// of config rather than a new branch in the renderer.
//
// The numbers are all RATIOS of the head radius, so a part works identically on
// a 64px wardrobe tile and a 168px hub portrait.

/** Head outline. `w` is width at the temples, `jaw` how far the chin tapers in. */
export const FACE_SHAPES = [
  { id: 0, name: 'Round',  w: 1.00, jaw: 0.70, chin: 1.12 },
  { id: 1, name: 'Oval',   w: 0.94, jaw: 0.60, chin: 1.20 },
  { id: 2, name: 'Square', w: 1.02, jaw: 0.86, chin: 1.06 },
  { id: 3, name: 'Heart',  w: 1.04, jaw: 0.50, chin: 1.16 },
]

/**
 * Eyes. `r` is the radius, `sq` squashes it into an almond (1 = perfectly
 * round, lower = more human), `tilt` rotates the outer corner up.
 */
export const EYE_SHAPES = [
  { id: 0, name: 'Round',  r: 0.170, sq: 0.94, tilt: 0.00 },
  { id: 1, name: 'Almond', r: 0.175, sq: 0.84, tilt: 0.09 },
  { id: 2, name: 'Wide',   r: 0.188, sq: 0.88, tilt: 0.04 },
  { id: 3, name: 'Keen',   r: 0.158, sq: 0.78, tilt: 0.14 },
]

export const EYE_COLORS = [
  { id: 0, name: 'Hazel',  hex: '#7a4f2a' },
  { id: 1, name: 'Brown',  hex: '#4a2c18' },
  { id: 2, name: 'Green',  hex: '#3f7a52' },
  { id: 3, name: 'Blue',   hex: '#356f9e' },
  { id: 4, name: 'Violet', hex: '#6b4a9e' },
  { id: 5, name: 'Amber',  hex: '#b07a24' },
]

/** Brows. `lift` is how high above the eye, `arch` how curved, `w` how thick. */
export const BROW_SHAPES = [
  { id: 0, name: 'Soft',     lift: 0.48, arch: 0.17, w: 0.10, tilt: 0.05 },
  { id: 1, name: 'Arched',   lift: 0.56, arch: 0.27, w: 0.09, tilt: 0.08 },
  { id: 2, name: 'Straight', lift: 0.44, arch: 0.05, w: 0.11, tilt: 0.00 },
  { id: 3, name: 'Bushy',    lift: 0.46, arch: 0.15, w: 0.15, tilt: 0.03 },
]

/** Noses. `len` is how far down the face, `w` how wide the tip. */
export const NOSE_SHAPES = [
  { id: 0, name: 'Button',  len: 0.26, w: 0.10, bridge: 0.00 },
  { id: 1, name: 'Straight',len: 0.32, w: 0.09, bridge: 0.14 },
  { id: 2, name: 'Round',   len: 0.28, w: 0.13, bridge: 0.06 },
  { id: 3, name: 'Fine',    len: 0.30, w: 0.07, bridge: 0.18 },
]

/**
 * Mouths. `open` is how far the jaw drops (0 = a closed curve), `w` the width,
 * `curve` the smile — negative would frown, which is what an expression system
 * would reach for later.
 */
export const MOUTH_SHAPES = [
  { id: 0, name: 'Smile',  w: 0.46, open: 0.00, curve: 0.34 },
  { id: 1, name: 'Grin',   w: 0.52, open: 0.30, curve: 0.36 },
  { id: 2, name: 'Beam',   w: 0.58, open: 0.38, curve: 0.42 },
  { id: 3, name: 'Gentle', w: 0.38, open: 0.00, curve: 0.26 },
]

export const HAIR_STYLES_COUNT = () => HAIR_STYLES.length

export const blankAppearance = () => ({
  skin: 1, hairColor: 1, hairStyle: 1,
  face: 0, eyes: 1, eyeColor: 1, brows: 0, nose: 0, mouth: 1,
})

const pick = (list, i, fallback) => list[i] || list[fallback]

/**
 * Resolve an appearance record into everything the sprite draws.
 *
 * Missing parts fall back to the blank face, so a profile saved before these
 * existed still renders — it just gets the default set rather than a broken one.
 */
export function resolveLook(appearance) {
  const a = { ...blankAppearance(), ...(appearance || {}) }
  return {
    skinHex: pick(SKIN_TONES, a.skin, 1).hex,
    hairHex: pick(HAIR_COLORS, a.hairColor, 1).hex,
    hairStyle: Math.max(0, Math.min(HAIR_STYLES.length - 1, a.hairStyle ?? 1)),
    face: pick(FACE_SHAPES, a.face, 0),
    eyes: pick(EYE_SHAPES, a.eyes, 1),
    eyeHex: pick(EYE_COLORS, a.eyeColor, 1).hex,
    brows: pick(BROW_SHAPES, a.brows, 0),
    nose: pick(NOSE_SHAPES, a.nose, 0),
    mouth: pick(MOUTH_SHAPES, a.mouth, 1),
  }
}

const rnd = n => Math.floor(Math.random() * n)

/**
 * A random look, for a brand new wizard so she isn't always the same face.
 *
 * Only the parts the look picker offers are rolled. Randomising a part she
 * can't then change — a square jaw, bushy brows — hands her a face she's stuck
 * with, which is worse than a pleasant default she chose nothing about.
 */
export function randomAppearance() {
  return {
    ...blankAppearance(),
    skin: rnd(SKIN_TONES.length),
    hairColor: rnd(HAIR_COLORS.length),
    hairStyle: rnd(HAIR_STYLES.length),
    eyes: rnd(EYE_SHAPES.length),
    eyeColor: rnd(EYE_COLORS.length),
  }
}

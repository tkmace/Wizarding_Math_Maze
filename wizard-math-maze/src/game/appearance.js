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

/**
 * Facial morphology.
 *
 * This used to be three numbers — width, jaw taper, chin length — which is a
 * scale adjustment rather than a face. A real head is not one width: the
 * forehead, the cheekbones, the jaw corner and the chin are four different
 * widths at four different heights, and which of them is widest is most of what
 * makes one face read as angular and another as soft. So each shape below is a
 * profile through the skull, and the renderer builds the outline from it.
 *
 * Everything is a multiple of the head radius:
 *   top      how far the crown rises above centre
 *   brow     half-width at the temples
 *   cheek    half-width at the cheekbones — usually the widest point
 *   cheekY   how far below centre the cheekbones sit
 *   jaw      half-width at the jaw corner
 *   chin     half-width of the chin itself
 *   chinY    how far below centre the chin bottom sits
 *
 * The features are NOT placed from these numbers directly. They're placed at
 * fractions of the span from crown to chin — eyes at the halfway line, nose at
 * seven tenths, mouth at eight tenths, which is roughly where they sit on a
 * real head — so a long face gets a long face's spacing for free rather than a
 * short face's features slid down a longer oval.
 */
export const FACE_SHAPES = [
  // id 0 is the default every existing wizard already has saved, so it is the
  // one that has to be the good general-purpose face.
  { id: 0, name: 'Oval',    top: 1.00, brow: 0.86, cheek: 0.95, cheekY: 0.06, jaw: 0.70, chin: 0.34, chinY: 1.22 },
  { id: 1, name: 'Round',   top: 1.00, brow: 0.90, cheek: 1.00, cheekY: 0.14, jaw: 0.82, chin: 0.44, chinY: 1.08 },
  { id: 2, name: 'Narrow',  top: 1.04, brow: 0.78, cheek: 0.84, cheekY: 0.02, jaw: 0.60, chin: 0.28, chinY: 1.36 },
  { id: 3, name: 'Angular', top: 1.02, brow: 0.90, cheek: 0.93, cheekY: -0.02, jaw: 0.78, chin: 0.46, chinY: 1.20 },
  { id: 4, name: 'Broad',   top: 0.96, brow: 0.96, cheek: 1.06, cheekY: 0.10, jaw: 0.88, chin: 0.50, chinY: 1.06 },
  { id: 5, name: 'Soft',    top: 1.00, brow: 0.84, cheek: 0.98, cheekY: 0.18, jaw: 0.74, chin: 0.40, chinY: 1.12 },
]

/**
 * Eyes.
 *
 * `r` is the radius and `sq` squashes it toward an almond — the lower `sq`
 * goes, the more horizontal and the less emoji the eye reads. `hood` is how far
 * an upper lid comes down over it, which is the difference between an alert eye
 * and a knowing one. `set` moves the pair apart or together.
 */
export const EYE_SHAPES = [
  { id: 0, name: 'Almond', r: 0.152, sq: 0.72, tilt: 0.10, hood: 0.14, set: 1.00 },
  { id: 1, name: 'Round',  r: 0.146, sq: 0.84, tilt: 0.02, hood: 0.08, set: 1.00 },
  { id: 2, name: 'Wide',   r: 0.158, sq: 0.76, tilt: 0.05, hood: 0.10, set: 1.08 },
  { id: 3, name: 'Keen',   r: 0.136, sq: 0.64, tilt: 0.16, hood: 0.20, set: 0.96 },
  { id: 4, name: 'Hooded', r: 0.150, sq: 0.70, tilt: 0.07, hood: 0.34, set: 1.00 },
  { id: 5, name: 'Narrow', r: 0.142, sq: 0.58, tilt: 0.12, hood: 0.18, set: 0.98 },
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
  { id: 0, name: 'Soft',     lift: 0.46, arch: 0.15, w: 0.085, tilt: 0.04 },
  { id: 1, name: 'Arched',   lift: 0.54, arch: 0.25, w: 0.080, tilt: 0.07 },
  { id: 2, name: 'Straight', lift: 0.42, arch: 0.04, w: 0.095, tilt: 0.00 },
  { id: 3, name: 'Thick',    lift: 0.44, arch: 0.13, w: 0.130, tilt: 0.03 },
  { id: 4, name: 'Angled',   lift: 0.50, arch: 0.10, w: 0.090, tilt: -0.09 },
  { id: 5, name: 'Fine',     lift: 0.50, arch: 0.18, w: 0.060, tilt: 0.05 },
]

/**
 * Noses. A nose at this size is not a shape you draw, it's a small solid that
 * catches light on top and casts a shadow underneath — `len` is how far it
 * sits below the brow line, `w` the width of the ball, `bridge` how much of a
 * ridge runs up from it.
 */
export const NOSE_SHAPES = [
  { id: 0, name: 'Short',  len: 0.00, w: 0.090, bridge: 0.30 },
  { id: 1, name: 'Long',   len: 0.07, w: 0.085, bridge: 0.48 },
  { id: 2, name: 'Narrow', len: 0.03, w: 0.070, bridge: 0.44 },
  { id: 3, name: 'Broad',  len: 0.01, w: 0.115, bridge: 0.26 },
]

/**
 * Mouths. `open` is how far the jaw drops (0 = closed), `w` the width as a
 * fraction of the cheekbones, `curve` the smile, and `lower` how full the
 * bottom lip is — a line with nothing under it is a drawn-on smile, and a
 * little weight below it is a mouth.
 */
export const MOUTH_SHAPES = [
  { id: 0, name: 'Smile',  w: 0.40, open: 0.00, curve: 0.28, lower: 0.55 },
  { id: 1, name: 'Grin',   w: 0.44, open: 0.18, curve: 0.29, lower: 0.50 },
  { id: 2, name: 'Beam',   w: 0.49, open: 0.28, curve: 0.34, lower: 0.45 },
  { id: 3, name: 'Gentle', w: 0.34, open: 0.00, curve: 0.21, lower: 0.70 },
  { id: 4, name: 'Wide',   w: 0.52, open: 0.00, curve: 0.24, lower: 0.40 },
  { id: 5, name: 'Full',   w: 0.38, open: 0.00, curve: 0.26, lower: 0.95 },
]

/**
 * Facial hair.
 *
 * This used to be decided by the ROBE: anything from rank 5 up drew an elder's
 * beard on whoever was wearing it, which meant a girl who worked her way to
 * Archmage was handed a beard she never asked for. It's a choice now, off by
 * default, and it applies at every rank.
 *
 * `reach` is how far the mass hangs below the jaw, as a multiple of the full
 * elder's beard; `tash` is whether there's a moustache above the mouth.
 */
export const BEARD_STYLES = [
  { id: 0, name: 'None',      reach: 0.00, tash: false },
  { id: 1, name: 'Moustache', reach: 0.00, tash: true  },
  { id: 2, name: 'Short',     reach: 0.52, tash: true  },
  { id: 3, name: 'Long',      reach: 1.00, tash: true  },
]

export const HAIR_STYLES_COUNT = () => HAIR_STYLES.length

export const blankAppearance = () => ({
  skin: 1, hairColor: 1, hairStyle: 1,
  face: 0, eyes: 1, eyeColor: 1, brows: 0, nose: 0, mouth: 1,
  beard: 0,
})

const pick = (list, i, fallback) => list[i] || list[fallback]

/**
 * A small, stable set of asymmetries for one face.
 *
 * Nothing living is symmetrical, and a face drawn by mirroring one half is the
 * quietest reason a drawing reads as a manufactured object. These are tiny — a
 * few percent — and they are derived from the appearance record rather than
 * random, so a wizard has the same crooked smile every time she is drawn.
 */
function asymmetry(a) {
  const n = (a.skin * 7 + a.hairColor * 13 + a.eyes * 29 + a.eyeColor * 5
           + a.face * 17 + a.mouth * 11 + a.brows * 3 + 1)
  const wave = k => ((Math.sin(n * k) * 43758.5453) % 1 + 1) % 1 * 2 - 1   // -1..1
  return {
    eye:   wave(1.7) * 0.05,    // one eye very slightly larger
    eyeY:  wave(2.3) * 0.03,    // and a touch higher
    brow:  wave(3.1) * 0.07,    // brows never level
    mouth: wave(4.7) * 0.10,    // one corner lifts more than the other
    tilt:  wave(5.9) * 0.02,    // the whole face off true by a fraction
  }
}

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
    beard: pick(BEARD_STYLES, a.beard, 0),
    asym: asymmetry(a),
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
    // Face shape isn't a row in the picker — Tom took those rows out — but
    // leaving it fixed made every wizard the same person in different colours.
    // It rolls here and it rolls again under "Surprise me", so it is varied
    // without being a face she is stuck with.
    face: rnd(FACE_SHAPES.length),
    mouth: rnd(MOUTH_SHAPES.length),
    brows: rnd(BROW_SHAPES.length),
    nose: rnd(NOSE_SHAPES.length),
  }
}

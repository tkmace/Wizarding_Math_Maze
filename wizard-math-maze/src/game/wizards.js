import { HAIR_COLORS, EYE_COLORS } from './appearance.js'

// --- The six ------------------------------------------------------------------
// A deliberate retreat from "any face with any hair with any nose".
//
// That modularity is exactly why the wizards looked generic. If every hair
// style has to sit on every skull and every eye has to work above every nose,
// then every single part is a compromise, and a room full of compromises looks
// like a room full of the same person. Nothing in a renderer fixes that,
// because the problem is not the rendering — it is the constraint.
//
// So instead: a small number of people, each drawn for herself. Wren's hair is
// drawn for Wren's head and would not fit anyone else. Her eyes are placed at
// her spacing. Her cheekbone catches the light where HER cheekbone is. That is
// what lets a face stop being an assembly and start being a face.
//
// What a child still chooses: which of them she is, and her hair colour. What
// she earns still changes: the robe, the hat, the trim, the trinket — all of
// which are drawn over the top and belong to the FORM, not to her.
//
// Numbers here are fractions of the head radius, so one wizard reads the same
// at a 64px tile and a 400px portrait.

/**
 * A skin tone is five colours, not one.
 *
 * Swapping a single base colour and darkening it for the shadows gives you
 * plastic — that is the whole reason the old sprite's faces looked like toys.
 * Real skin is translucent and it does two things a flat fill cannot: it goes
 * WARM where it is thin and light passes through it (ears, the tip of the nose,
 * the lower lip, the edge of a cheek), and it goes cool and slightly grey where
 * it turns away from the light.
 *
 * `lit` is the one people forget. A highlight is not white — it is the skin's
 * own colour with the light on it. Painting a near-white highlight on dark skin
 * blows a chalky patch in the middle of the face, which is the single most
 * common way dark skin gets drawn badly. So every tone brings its own.
 *
 * Indexed to match SKIN_TONES in appearance.js, so `appearance.skin` selects one
 * directly and any wizard can wear any of them. This is the free half of the
 * personalisation line: COLOUR is interchangeable because it moves nothing.
 */
export const SKIN_PALETTES = [
  // Porcelain
  { base: '#f6ddc6', shadow: '#d9b193', warm: '#e0998a', deep: '#a9764f', lit: '#fffaf2' },
  // Sand
  { base: '#e8c9a0', shadow: '#c69b72', warm: '#d4866f', deep: '#94623e', lit: '#fff5e8' },
  // Honey
  { base: '#cf9d6d', shadow: '#a9764a', warm: '#c37356', deep: '#77492a', lit: '#ffeeda' },
  // Chestnut
  { base: '#a06f47', shadow: '#7c5231', warm: '#ad6446', deep: '#4c2b18', lit: '#f2d0a8' },
  // Umber — the highlight here is a light warm brown, nowhere near white.
  { base: '#6d472c', shadow: '#513320', warm: '#85472d', deep: '#2f1a0d', lit: '#d9a878' },
]

export const paletteFor = i => SKIN_PALETTES[i] ?? SKIN_PALETTES[1]

export const WIZARDS = [
  {
    id: 'wren',
    name: 'Wren',
    blurb: 'Quick, and knows it',
    // Her usual look. Every one of these is the child's to change — they are
    // where she starts, not what she is.
    skin: 1, hair: 2, eye: 0,
    brow: { lift: 0.46, arch: 0.20, w: 0.085, tilt: 0.06, len: 0.30 },

    // Head. `w` at the temples, `cheek` how far the cheekbone sits out, `jaw`
    // how far it draws in below that, `chin` how low it finishes.
    head: { w: 0.95, cheek: 0.97, jaw: 0.62, chin: 1.24, tilt: -0.035 },

    // Eyes: set slightly wide, tipped up at the outer corner.
    eyes: {
      out: 0.392, y: 0.07, rx: 0.188, ry: 0.140, tilt: 0.085,
      lid: 0.42,                   // how far the upper lid covers the iris
      iris: 0.80, shine: 1,
    },
    nose: { y: 0.44, w: 0.10, bridge: 0.30, tipLift: 0.06 },
    mouth: { y: 0.76, w: 0.20, curve: 0.11, lower: 0.055, upper: 0.032 },

    // Hair, drawn as overlapping locks rather than one silhouette with lines
    // scratched into it. Each entry is a lock: where it leaves the scalp, how
    // it sweeps, how thick it is at the root and where it ends.
    //
    // This is the part that genuinely cannot be shared. A lock list is a
    // hairstyle drawn for one skull.
    // Hair, placed by hand for this head. Every lock is "start here on the
    // scalp, fall this far, drift this far sideways" — in head radii, because
    // a hairstyle is authored by eye and the numbers have to be picturable.
    hairPlan: {
      hairline: -0.44,             // where the hair stops, centre front
      temple: 0.06,                // …and at the sides, well down past the eye
      peak: -0.10,                 // the parting, just off centre
      back: 1.5,
      fringe: [
        { x: -0.92, y: -0.16, len: 0.62, sweep: -0.10, thick: 0.24, curl: -0.10 },
        { x: -0.70, y: -0.36, len: 0.58, sweep: -0.14, thick: 0.23, curl: -0.09 },
        { x: -0.46, y: -0.50, len: 0.50, sweep: -0.16, thick: 0.21, curl: -0.07 },
        { x: -0.20, y: -0.58, len: 0.40, sweep: -0.14, thick: 0.19, curl: -0.05 },
        { x: 0.06, y: -0.58, len: 0.36, sweep: 0.14, thick: 0.18, curl: 0.05 },
        { x: 0.34, y: -0.52, len: 0.46, sweep: 0.18, thick: 0.20, curl: 0.07 },
        { x: 0.62, y: -0.38, len: 0.56, sweep: 0.18, thick: 0.22, curl: 0.09 },
        { x: 0.90, y: -0.16, len: 0.60, sweep: 0.12, thick: 0.23, curl: 0.10 },
      ],
      side: [
        { x: -1.02, y: -0.10, len: 1.40, sweep: -0.16, thick: 0.26, curl: -0.14 },
        { x: -0.94, y: 0.06, len: 1.24, sweep: -0.04, thick: 0.20, curl: -0.08 },
        { x: -0.84, y: 0.20, len: 1.02, sweep: 0.04, thick: 0.15, curl: -0.04 },
        { x: 1.02, y: -0.10, len: 1.44, sweep: 0.18, thick: 0.26, curl: 0.16 },
        { x: 0.94, y: 0.06, len: 1.26, sweep: 0.06, thick: 0.20, curl: 0.09 },
        { x: 0.84, y: 0.20, len: 1.04, sweep: -0.02, thick: 0.15, curl: 0.05 },
      ],
      flyaway: [
        { x: -0.72, y: -0.62, len: 0.30, sweep: -0.34, w: 0.022 },
        { x: 0.40, y: -0.76, len: 0.22, sweep: 0.30, w: 0.020 },
        { x: 0.86, y: -0.34, len: 0.34, sweep: 0.26, w: 0.018 },
      ],
    },
  },
  {
    id: 'kestrel',
    name: 'Kestrel',
    blurb: 'Patient, and never rushed',
    skin: 3, hair: 0, eye: 1,
    // Heavier and flatter than Wren's, which is half of why the two faces read
    // as different people before you have looked at anything else.
    brow: { lift: 0.43, arch: 0.12, w: 0.104, tilt: 0.02, len: 0.33 },

    // Broad and round where Wren is narrow and long: wider at the cheekbone,
    // a fuller jaw, a shorter chin, and tipped the other way.
    head: { w: 1.02, cheek: 1.05, jaw: 0.76, chin: 1.13, tilt: 0.03 },

    // Big and round, barely tilted — a wide-open face.
    eyes: {
      out: 0.402, y: 0.085, rx: 0.196, ry: 0.162, tilt: 0.03,
      lid: 0.36, iris: 0.84, shine: 1,
    },
    nose: { y: 0.42, w: 0.128, bridge: 0.22, tipLift: 0.05 },
    mouth: { y: 0.735, w: 0.216, curve: 0.135, lower: 0.072, upper: 0.044 },

    // Coils, not locks. A lock hangs; a coil springs out and holds its volume,
    // so this is a cloud of clumps round the skull rather than a list of things
    // falling off it. The renderer takes the other branch entirely.
    hairPlan: {
      hairline: -0.46,
      temple: -0.02,
      peak: 0.04,
      back: 0,                     // it does not fall — there is nothing behind
      curls: [
        { x: -0.24, y: -1.10, r: 0.31 },
        { x: 0.18, y: -1.10, r: 0.30 },
        { x: -0.64, y: -0.96, r: 0.32 },
        { x: 0.58, y: -0.95, r: 0.31 },
        { x: -0.95, y: -0.66, r: 0.30 },
        { x: 0.90, y: -0.64, r: 0.29 },
        { x: -1.12, y: -0.26, r: 0.28 },
        { x: 1.09, y: -0.25, r: 0.28 },
        { x: -1.16, y: 0.14, r: 0.26 },
        { x: 1.13, y: 0.15, r: 0.26 },
        { x: -1.08, y: 0.50, r: 0.23 },
        { x: 1.05, y: 0.51, r: 0.23 },
        { x: -0.46, y: -0.72, r: 0.28 },
        { x: 0.02, y: -0.82, r: 0.30 },
        { x: 0.44, y: -0.70, r: 0.28 },
        { x: -0.88, y: -0.92, r: 0.18 },
        { x: 0.80, y: -0.88, r: 0.17 },
        { x: -1.22, y: -0.50, r: 0.15 },
        { x: 1.19, y: -0.48, r: 0.15 },
        { x: -0.06, y: -0.52, r: 0.19 },
      ],
      flyaway: [
        { x: -1.04, y: -0.78, len: 0.16, sweep: -0.26, w: 0.020 },
        { x: 0.30, y: -1.26, len: 0.12, sweep: 0.20, w: 0.018 },
        { x: 1.02, y: -0.76, len: 0.18, sweep: 0.24, w: 0.018 },
      ],
    },
  },
  {
    id: 'rook',
    name: 'Rook',
    blurb: 'Steady, and hard to rattle',
    skin: 2, hair: 1, eye: 2,

    // What actually makes a stylised face read as a boy's, in order: a squarer
    // jaw, a heavier and flatter brow sitting lower, a longer nose, thinner
    // lips, and slightly smaller eyes. Hair carries a lot of it, but hair comes
    // off under a hat — these do not.
    brow: { lift: 0.375, arch: 0.05, w: 0.116, tilt: -0.01, len: 0.35 },
    head: { w: 0.98, cheek: 0.96, jaw: 0.82, chin: 1.19, tilt: 0.02, ridge: 1 },
    neck: { top: 0.42, bot: 0.66 },
    eyes: {
      out: 0.385, y: 0.075, rx: 0.172, ry: 0.122, tilt: 0.02,
      lid: 0.48, iris: 0.76, shine: 1,
    },
    nose: { y: 0.46, w: 0.118, bridge: 0.34, tipLift: 0.06 },
    mouth: { y: 0.775, w: 0.205, curve: 0.08, lower: 0.042, upper: 0.028 },

    // Cropped short. Same construction as Wren's — locks, just short ones — so
    // this one cost nothing but the numbers.
    hairPlan: {
      hairline: -0.52, temple: -0.10, peak: 0.12, back: 0,
      fringe: [
        { x: -0.92, y: -0.26, len: 0.32, sweep: -0.12, thick: 0.22, curl: -0.04 },
        { x: -0.68, y: -0.50, len: 0.30, sweep: -0.10, thick: 0.21, curl: -0.03 },
        { x: -0.42, y: -0.66, len: 0.28, sweep: -0.08, thick: 0.20, curl: -0.02 },
        { x: -0.14, y: -0.74, len: 0.24, sweep: 0.06, thick: 0.19, curl: 0.02 },
        { x: 0.16, y: -0.72, len: 0.26, sweep: 0.10, thick: 0.19, curl: 0.03 },
        { x: 0.46, y: -0.62, len: 0.28, sweep: 0.12, thick: 0.20, curl: 0.04 },
        { x: 0.74, y: -0.44, len: 0.30, sweep: 0.12, thick: 0.21, curl: 0.04 },
        { x: 0.94, y: -0.22, len: 0.30, sweep: 0.10, thick: 0.21, curl: 0.04 },
      ],
      side: [
        { x: -1.01, y: -0.14, len: 0.44, sweep: -0.04, thick: 0.20, curl: -0.02 },
        { x: 1.01, y: -0.14, len: 0.46, sweep: 0.06, thick: 0.20, curl: 0.03 },
      ],
      flyaway: [
        { x: -0.34, y: -0.86, len: 0.16, sweep: -0.20, w: 0.020 },
        { x: 0.44, y: -0.82, len: 0.14, sweep: 0.20, w: 0.018 },
      ],
    },
  },
  {
    id: 'lark',
    name: 'Lark',
    blurb: 'Curious about everything',
    skin: 0, hair: 4, eye: 4,

    // Deliberately in between. Nothing here pushes hard in either direction:
    // a moderate jaw, a brow with some arch but not much, medium lips. A child
    // who does not see herself in the other three should find nothing here
    // insisting she is one thing or the other.
    brow: { lift: 0.42, arch: 0.11, w: 0.095, tilt: 0.03, len: 0.32 },
    head: { w: 0.98, cheek: 1.00, jaw: 0.74, chin: 1.19, tilt: -0.02, ridge: 0.45 },
    neck: { top: 0.38, bot: 0.60 },
    eyes: {
      out: 0.396, y: 0.075, rx: 0.184, ry: 0.146, tilt: 0.05,
      lid: 0.40, iris: 0.80, shine: 1,
    },
    nose: { y: 0.44, w: 0.110, bridge: 0.28, tipLift: 0.06 },
    mouth: { y: 0.755, w: 0.208, curve: 0.105, lower: 0.055, upper: 0.036 },

    // Shaggy, parted hard to one side and swept across the brow. The only
    // ASYMMETRIC hair of the four, which is most of why it reads as a different
    // person at a glance rather than as Wren with other numbers.
    hairPlan: {
      hairline: -0.40, temple: 0.10, peak: -0.40, back: 1.05,
      // A swept fringe travels ACROSS the brow, not down it. The first pass
      // gave these locks a long `len` and a short `sweep`, which is the same
      // shape as Wren's straight fringe and hung the whole lot over both eyes.
      // Long sweep, short drop — and every inner lock ends above the brow.
      fringe: [
        { x: -0.82, y: -0.40, len: 0.20, sweep: 0.52, thick: 0.24, curl: 0.12 },
        { x: -0.62, y: -0.56, len: 0.24, sweep: 0.86, thick: 0.23, curl: 0.16 },
        { x: -0.42, y: -0.66, len: 0.28, sweep: 0.92, thick: 0.22, curl: 0.18 },
        { x: -0.20, y: -0.72, len: 0.30, sweep: 0.86, thick: 0.20, curl: 0.16 },
        { x: 0.04, y: -0.74, len: 0.28, sweep: 0.70, thick: 0.19, curl: 0.12 },
        { x: 0.30, y: -0.68, len: 0.26, sweep: 0.46, thick: 0.19, curl: 0.08 },
        { x: 0.62, y: -0.52, len: 0.28, sweep: 0.22, thick: 0.20, curl: 0.06 },
        { x: 0.88, y: -0.28, len: 0.34, sweep: 0.10, thick: 0.21, curl: 0.04 },
      ],
      side: [
        { x: -1.02, y: -0.04, len: 0.96, sweep: -0.10, thick: 0.24, curl: -0.08 },
        { x: -0.92, y: 0.14, len: 0.84, sweep: 0.00, thick: 0.18, curl: -0.04 },
        { x: 1.02, y: -0.04, len: 1.02, sweep: 0.12, thick: 0.24, curl: 0.10 },
        { x: 0.92, y: 0.14, len: 0.88, sweep: 0.04, thick: 0.18, curl: 0.06 },
      ],
      flyaway: [
        { x: -0.70, y: -0.62, len: 0.28, sweep: 0.40, w: 0.020 },
        { x: 0.52, y: -0.74, len: 0.20, sweep: 0.26, w: 0.018 },
      ],
    },
  },
  {
    id: 'finch',
    name: 'Finch',
    blurb: 'Watches before he speaks',
    skin: 4, hair: 0, eye: 1,

    // A second boy who is nothing like the first. Rook is square and heavy;
    // Finch is lean and sharp — the point being that a child who wants to be a
    // boy and does not like Rook has somewhere else to go. Where Rook widens,
    // this one narrows: a long jaw rather than a broad one, high cheekbones,
    // a ridge that is present but not a shelf, eyes narrowed and tilted.
    brow: { lift: 0.44, arch: 0.07, w: 0.098, tilt: 0.00, len: 0.34 },
    head: { w: 0.93, cheek: 0.96, jaw: 0.66, chin: 1.30, tilt: -0.04, ridge: 0.7 },
    neck: { top: 0.38, bot: 0.60 },
    eyes: {
      out: 0.388, y: 0.05, rx: 0.180, ry: 0.118, tilt: 0.11,
      lid: 0.50, iris: 0.78, shine: 1,
    },
    nose: { y: 0.46, w: 0.102, bridge: 0.36, tipLift: 0.05 },
    mouth: { y: 0.785, w: 0.198, curve: 0.075, lower: 0.044, upper: 0.028 },

    // Long and loose, well past the shoulders. Locks again — the length lives
    // in `back`, which is the curtain behind the head, so this cost nothing.
    hairPlan: {
      hairline: -0.46, temple: 0.02, peak: 0.06, back: 2.25,
      fringe: [
        { x: -0.92, y: -0.22, len: 0.54, sweep: -0.14, thick: 0.23, curl: -0.08 },
        { x: -0.70, y: -0.44, len: 0.48, sweep: -0.16, thick: 0.22, curl: -0.07 },
        { x: -0.44, y: -0.58, len: 0.40, sweep: -0.18, thick: 0.20, curl: -0.06 },
        { x: -0.16, y: -0.64, len: 0.30, sweep: -0.12, thick: 0.18, curl: -0.03 },
        { x: 0.14, y: -0.64, len: 0.32, sweep: 0.14, thick: 0.18, curl: 0.04 },
        { x: 0.44, y: -0.56, len: 0.42, sweep: 0.20, thick: 0.20, curl: 0.06 },
        { x: 0.72, y: -0.40, len: 0.50, sweep: 0.18, thick: 0.22, curl: 0.08 },
        { x: 0.93, y: -0.20, len: 0.56, sweep: 0.12, thick: 0.23, curl: 0.08 },
      ],
      side: [
        { x: -1.02, y: -0.06, len: 2.05, sweep: -0.18, thick: 0.28, curl: -0.16 },
        { x: -0.92, y: 0.14, len: 1.80, sweep: -0.06, thick: 0.21, curl: -0.09 },
        { x: 1.02, y: -0.06, len: 2.10, sweep: 0.20, thick: 0.28, curl: 0.18 },
        { x: 0.92, y: 0.14, len: 1.84, sweep: 0.08, thick: 0.21, curl: 0.10 },
      ],
      flyaway: [
        { x: -0.58, y: -0.74, len: 0.22, sweep: -0.30, w: 0.020 },
        { x: 0.66, y: -0.62, len: 0.26, sweep: 0.28, w: 0.018 },
      ],
    },
  },
  {
    id: 'pip',
    name: 'Pip',
    blurb: 'The smallest, and the loudest',
    skin: 0, hair: 3, eye: 3,

    // The youngest of the six, and the only one whose proportions say so. A
    // child's face is not an adult's made smaller: the eyes are larger relative
    // to the skull and set lower, the forehead is bigger, the chin is short,
    // the nose is small and the brow is barely there. Linden should be able to
    // pick someone her own age.
    brow: { lift: 0.40, arch: 0.15, w: 0.072, tilt: 0.04, len: 0.26 },
    head: { w: 1.03, cheek: 1.06, jaw: 0.80, chin: 1.06, tilt: 0.04 },
    neck: { top: 0.33, bot: 0.52 },
    eyes: {
      out: 0.398, y: 0.115, rx: 0.208, ry: 0.175, tilt: 0.02,
      lid: 0.32, iris: 0.86, shine: 1,
    },
    nose: { y: 0.42, w: 0.098, bridge: 0.16, tipLift: 0.07 },
    mouth: { y: 0.735, w: 0.196, curve: 0.155, lower: 0.062, upper: 0.034 },

    // Two bunches, springing out above the ears and falling. Still locks — the
    // silhouette comes from where they start and how hard they sweep outward,
    // not from any new machinery.
    hairPlan: {
      hairline: -0.50, temple: -0.06, peak: 0.00, back: 0.55,
      fringe: [
        { x: -0.72, y: -0.44, len: 0.34, sweep: -0.10, thick: 0.22, curl: -0.04 },
        { x: -0.46, y: -0.60, len: 0.30, sweep: -0.08, thick: 0.21, curl: -0.03 },
        { x: -0.18, y: -0.68, len: 0.26, sweep: -0.04, thick: 0.20, curl: -0.01 },
        { x: 0.12, y: -0.68, len: 0.26, sweep: 0.06, thick: 0.20, curl: 0.02 },
        { x: 0.40, y: -0.60, len: 0.30, sweep: 0.10, thick: 0.21, curl: 0.03 },
        { x: 0.68, y: -0.44, len: 0.34, sweep: 0.12, thick: 0.22, curl: 0.04 },
      ],
      side: [
        { x: -0.98, y: -0.30, len: 0.46, sweep: -0.52, thick: 0.30, curl: -0.22 },
        { x: -1.02, y: -0.12, len: 0.66, sweep: -0.44, thick: 0.32, curl: -0.18 },
        { x: -0.96, y: 0.06, len: 0.62, sweep: -0.30, thick: 0.26, curl: -0.12 },
        { x: 0.98, y: -0.30, len: 0.48, sweep: 0.54, thick: 0.30, curl: 0.24 },
        { x: 1.02, y: -0.12, len: 0.68, sweep: 0.46, thick: 0.32, curl: 0.20 },
        { x: 0.96, y: 0.06, len: 0.64, sweep: 0.32, thick: 0.26, curl: 0.13 },
      ],
      flyaway: [
        { x: -0.24, y: -0.84, len: 0.18, sweep: -0.22, w: 0.020 },
        { x: 0.30, y: -0.82, len: 0.16, sweep: 0.24, w: 0.020 },
      ],
    },
  },
]

export const wizardById = id => WIZARDS.find(w => w.id === id) || WIZARDS[0]
export const DEFAULT_WIZARD = WIZARDS[0].id

/**
 * One profile in, one painted face out.
 *
 * Every screen that shows her — the picker, the castle, the wardrobe tiles, the
 * duel, the Attunement — needs exactly this: which of the six she is, plus the
 * three colours she is allowed to change. Having each screen work that out for
 * itself is how a wizard ends up chestnut-haired in one place and copper in
 * another, so it is worked out once, here.
 *
 * Shape falls back to the first wizard and colour to that wizard's own look, so
 * a profile saved before any of this existed still draws somebody.
 */
export function lookFor(profile, appearanceOverride) {
  const wiz = wizardById(profile?.wizard)
  const a = appearanceOverride || profile?.appearance || {}
  return {
    wiz,
    skin: paletteFor(a.skin ?? wiz.skin),
    eye: (EYE_COLORS[a.eyeColor ?? wiz.eye] || EYE_COLORS[0]).hex,
    hair: (HAIR_COLORS[a.hairColor ?? wiz.hair] || HAIR_COLORS[1]).hex,
  }
}

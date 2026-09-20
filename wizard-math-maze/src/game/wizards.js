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
 * `warm`, `cool` and `deep` are not decoration. Skin is translucent: it picks
 * up warmth where it is thin (ears, nose, cheeks, the edge of the jaw) and goes
 * cool and grey where it turns away from the light. Painting a face in one flat
 * tone plus a darker version of that tone is most of what makes cartoon skin
 * look like plastic.
 */
const skinOf = (base, shadow, warm, deep) => ({ base, shadow, warm, deep })

export const WIZARDS = [
  {
    id: 'wren',
    name: 'Wren',
    blurb: 'Quick, and knows it',
    skin: skinOf('#f0cfa8', '#cf9f74', '#d8836e', '#9a6442'),
    hair: 2,                       // her usual colour; the child may change it
    eyeHex: '#5c3a22',
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
    skin: skinOf('#a4744c', '#7d5233', '#b56c48', '#4a2a17'),
    hair: 0,
    eyeHex: '#3a2216',
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
]

export const wizardById = id => WIZARDS.find(w => w.id === id) || WIZARDS[0]
export const DEFAULT_WIZARD = WIZARDS[0].id

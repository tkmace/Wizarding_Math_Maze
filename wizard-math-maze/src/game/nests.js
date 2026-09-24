// --- The four Nests -----------------------------------------------------------
// A house system. Camille's school sorts every pupil into one of four eagle
// nests, so the app uses the same four names and colours — a child who already
// knows she is a Sea Eagle should be a Sea Eagle here too, without being taught
// a second set of houses.
//
// The crests are drawn from these numbers (engine/nestCrest.js): they are this
// app's own heraldry in this app's own style, not copies of the school's
// artwork. `head`, `beak`, `crest` and `brow` are what make the four birds
// readable apart at the size of a badge. `crest` is how much of a crown the
// bird carries — a harpy's tuft stands straight up, a golden eagle's lies back
// along the nape, and a bald or sea eagle has none at all, which is why theirs
// is zero rather than a small number.
//
// A nest is chosen once and is not a difficulty setting, a perk, or something
// to be earned: it is just who you belong to. Deliberately so — everything else
// in the game has to be won, and there should be one thing that is simply hers.

export const NESTS = [
  {
    id: 'golden',
    name: 'Golden Eagles',
    colorName: 'Yellow',
    shield: '#e8b33c',          // field colour
    trim: '#8a5f12',            // border and lettering
    ink: '#3a2a06',
    head: '#b5762a',            // golden-brown, dark enough to read on a yellow field
    nape: '#7e4d14',            // darker feathers at the back of the head
    beak: '#3c3a38',            // dark hooked beak
    eye: '#f2c744',
    crest: 0.55,                // how much of a crown she carries
    lay: 1,                     // ...and it lies BACK along the nape, not up
    brow: 0.85,                 // how heavy the brow ridge sits over the eye
    motto: 'Steady and far-sighted',
  },
  {
    id: 'sea',
    name: 'Sea Eagles',
    colorName: 'Blue',
    shield: '#2f6fc4',
    trim: '#123a74',
    ink: '#08203f',
    head: '#f4f7fb',
    nape: '#c3d3e6',
    beak: '#f0b429',            // the big yellow fish-hook
    eye: '#6d5a2a',
    crest: 0,                   // a smooth head — no crown feathers at all
    brow: 0.70,
    motto: 'Patient, then sudden',
  },
  {
    id: 'harpy',
    name: 'Harpy Eagles',
    colorName: 'Green',
    shield: '#1f6b3f',
    trim: '#0c3a20',
    ink: '#05200f',
    head: '#eef2f0',
    nape: '#9aa8a2',
    beak: '#4a4e50',
    eye: '#2f6b4a',
    crest: 1.00,                // the tuft standing straight up — the harpy's tell
    lay: 0,
    brow: 0.95,
    motto: 'Nothing escapes notice',
  },
  {
    id: 'bald',
    name: 'Bald Eagles',
    colorName: 'Red',
    shield: '#c0342c',
    trim: '#6d1512',
    ink: '#2c0806',
    head: '#fbfbfb',
    nape: '#dcdcdc',
    beak: '#f0b429',
    eye: '#9a7a1e',
    crest: 0,                   // famously bald on top
    brow: 1.00,                 // the famous scowl
    motto: 'Bold in the open sky',
  },
]

export const nestById = id => NESTS.find(n => n.id === id) || null
export const hasNest = profile => !!nestById(profile?.nest)

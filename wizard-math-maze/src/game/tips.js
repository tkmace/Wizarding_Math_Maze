// --- First-run explanations ---------------------------------------------------
// Everything in this game was obvious to the person who built it and to nobody
// else. A creature jumps out and a pop-up appears; a door asks a sum; a stone on
// the floor turns into a hint later. None of that is explained anywhere, so a
// child's first ten minutes are spent guessing.
//
// These are the explanations, each shown ONCE, at the moment the thing it
// describes first happens — not as a tutorial up front, which nobody reads and
// which asks a seven-year-old to remember six rules before she has seen any of
// them. Each one is a sentence or two and a button; they are recorded in
// `profile.seen` and never come back.
//
// The rule for writing one: say what it IS and what to DO. Nothing about how
// clever the system is, and no reassurance she didn't ask for.

export const TIPS = {
  maze: {
    icon: '🗺️',
    title: 'Into the maze',
    lines: [
      'Walk with {fwd}, or swipe the picture.',
      '{left} and {right} turn you to face a new corridor.',
      'Somewhere in here is the way out. Find it, and you win the maze.',
    ],
    cta: "Let's go!",
  },
  door: {
    icon: '🚪',
    title: 'A sealed door',
    lines: [
      'Doors are locked with a sum. Answer it and the door opens — and you keep the points.',
      'Get it wrong and nothing bad happens. You can try again, or **step back** and find another way round.',
    ],
    cta: 'I can do this',
  },
  gate: {
    icon: '🔒',
    title: 'The way out is sealed',
    lines: [
      'You can see the exit, but it won\'t open yet — you need more points from the doors first.',
      'The bar at the top of the screen shows how many more.',
    ],
    cta: 'Back to the doors',
  },
  encounter: {
    icon: '👾',
    title: 'Something jumped out!',
    lines: [
      'Creatures wander the maze. Answer its questions and you beat it, and win points and maybe a rune stone.',
      'If you lose, you lose **nothing you already had** — it just runs off. You can also sneak past without playing.',
    ],
    cta: 'Raise my wand',
  },
  // Shown once, at the first duel where the creature's spell charges on its own.
  // Up to now the bar has only moved when she got one wrong, so this is a change
  // to a rule she already knows — and it is worth a card, because a bar that
  // starts creeping with no explanation is alarming rather than exciting.
  duelTimer: {
    icon: '⏳',
    title: 'It casts back now',
    lines: [
      'You have got quick enough that the creatures have started **charging their spells as you think**. Watch the bar under it.',
      'Every right answer knocks the bar back down, and losing still costs you nothing you already have.',
    ],
    cta: "I'm ready",
  },
  rune: {
    icon: '🔮',
    title: 'A rune stone',
    lines: [
      'Rune stones are scattered through the mazes. Spend one at a door for a **hint**.',
      'Or save them up — the **Curiosity Shop** in the wardrobe sells wands, pendants and stranger things, and the wardrobe itself sells robes.',
      'Somewhere in every maze there is one **Great Rune**, worth five on its own. It glows gold, and it is never on the easy path.',
    ],
    cta: 'Mine now',
  },
  wardrobe: {
    icon: '🧥',
    title: 'The wardrobe',
    lines: [
      'Every so often your points earn you a new rank, and a **choice of three robes**. The one you pick is yours forever, and its magic helps you in the maze.',
      'The two you pass over can be bought later with rune stones — and the **Curiosity Shop** at the top of this page sells smaller things, from eight runes.',
    ],
    cta: 'Let me look',
  },
}

export const seenTip = (profile, id) => !!profile?.seen?.[id]

/** Every tip marked as already shown — for a wizard who plainly knows all this. */
export const allSeen = () =>
  Object.fromEntries(Object.keys(TIPS).map(k => [k, true]))

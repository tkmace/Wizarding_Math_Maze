// --- Coming back -------------------------------------------------------------
//
// The usage data said this plainly: two children have come back across a month,
// and everybody else played once and never returned. The app gives a child no
// reason to come back TOMORROW in particular — points accrue whenever you play,
// so there is nothing waiting for her.
//
// So: the castle noticed she was gone, and kept something for her.
//
// What this deliberately is NOT is a streak. A streak counts consecutive days
// and therefore punishes a week at her grandmother's, and "nothing may make a
// child feel bad at maths" does not stop at the maths. There is no counter to
// break here and no way to lose anything by staying away — the gift is the same
// whether she was gone a day or a month, and the only thing the number of days
// changes is what the card says.

/** A night and a bit. Long enough that it cannot fire twice in one evening. */
export const AWAY_MS = 20 * 60 * 60 * 1000

/** Small on purpose: about one good door, not a replacement for playing. */
export const WELCOME_POINTS = 20

/** Below this she is still in her first sitting, and has not been away at all. */
const SETTLED_IN = 5

/**
 * What to give a returning wizard, or null if she is not one.
 *
 * Pure, and takes `now`, so the whole thing is testable in plain node — which
 * matters more here than usual, because the alternative is setting a laptop
 * clock forward a day to find out whether it works.
 */
export function welcomeBack(profile, now = Date.now()) {
  if (!profile) return null
  if ((profile.plays || 0) < SETTLED_IN) return null
  const last = Math.max(profile.awayGiftAt || 0, profile.lastPlayed || 0)
  if (!last || now - last < AWAY_MS) return null
  return { points: WELCOME_POINTS, days: Math.max(1, Math.round((now - last) / 86400000)), at: now }
}

/** What the card says. Separate from the decision so the wording can move. */
export function welcomeWords(gift) {
  if (!gift) return null
  if (gift.days <= 1) return 'The lanterns were still lit for you.'
  if (gift.days <= 6) return `${gift.days} days away — the castle kept your place.`
  return 'It has been a while. The castle kept your place anyway.'
}

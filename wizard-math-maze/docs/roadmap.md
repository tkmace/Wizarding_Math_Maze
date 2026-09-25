# Roadmap

What is agreed but unbuilt, roughly in the order it is likely to matter. Work
items live in GitHub Issues; this file is for the shape of each thing and why it
is wanted, so an issue can stay one line.

Marked **[standalone]** where a second person can take it without colliding with
anyone — self-contained, or touching files nobody else is in.

---

## Teacher mode  **[standalone]**

A friend teaches, and wants to see whether his pupils are using it and what they
are getting wrong. Designed but not built; the full design note is in the
project knowledge base, and the constraint that shapes all of it is this:

**The server cannot look a child up by name.** The sync token is
`PBKDF2(passcode, "wmm:<name>", 100k)`, computed in the browser — by design,
so nobody can enumerate children. That rules out teacher-initiated lookup
entirely, so joining has to be child-initiated: the teacher's code
(`Mann234` — surname plus room) is entered by the child, the teacher accepts.

Needs: a classroom table, a join code, an accept flow, and a teacher view that
aggregates the fact tables the game already keeps. No new data collection — the
report page already computes everything from `facts`.

This is the largest single piece of unbuilt work and the only one with a real
user waiting.

## More hairstyles per wizard  **[standalone]**

Each of the six has one authored `hairPlan` — a list of locks drawn for her
skull. Two or three alternates each would be the biggest remaining lift to
"she looks like me", and it is pure data: no renderer changes, just more lock
lists. `trinketsheet.html` is the place to iterate.

Do not be tempted to parameterise this into one shared style with numbers. That
was tried; it is why the faces used to look like one person in six wigs.

## Sound  **[standalone]**

Nothing has audio. A door opening, a rune picked up, the Great Rune, a duel
hit, the rank-up fanfare. Wants to be: procedural (WebAudio, no asset files, to
match the art), off by default, and a single settings toggle. Nothing may be
required to hear — the game must stay fully playable silent, including the
timed encounters.

## The easiest tier may still be too hard

Standing note, flagged and never addressed: `TIERS[0]` is roughly 1-8 plus 1-8,
which is not the bottom of the ladder for a five-year-old. A true beginner tier
(sums to 5, counting on) below the current floor would widen the audience at the
one end where the app currently has nothing to offer.

Needs care: the Attunement's `START` levels and `SHADE` assume the current
floor, and `attunetest.mjs` asserts against it.

## Timed challenges

A separate mode: a fixed set, a clock, a personal best. Deliberately apart from
the maze, where speed is a bonus and never a penalty — the moment the maze
itself is timed, the one rule is broken. Wants a different entry point and its
own framing.

## Floors, and boss doors

A maze currently ends and another begins. A descent — floor 2, floor 3, each
harder, with a boss door that needs several answers in a row — would give the
long game a shape it does not have. Interacts with the exit gate and the rank
ladder; think before building.

## Leaderboard

Asked for, and the riskiest thing on this list against the one rule. A
leaderboard that ranks children by points ranks them by how much maths they can
already do. If it happens it should rank effort (doors answered, days played,
facts moved from shaky to locked-in) and probably be per-classroom rather than
global.

---

## Smaller

- **Delete the paused Supabase project.** Superseded by Neon; nothing points at
  it. Housekeeping.
- **Codex leftovers.** `src/ui/WizardPortrait.jsx` and `src/game/portraits.js`
  are tracked, imported by nothing, and describe a renderer that no longer
  exists. Safe to delete; left in place only because they were never explicitly
  condemned.
- **`.DS_Store` is tracked** at the repo root and in `src/`. Should be removed
  from the index — `.gitignore` already covers it.
- **`v4test` and `full` take minutes each.** They are excluded from
  `test:fast` and CI. Worth splitting into something that can run on every PR.

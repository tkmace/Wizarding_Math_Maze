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

## Account recovery, and what going public would need

Children forget four digits. It has already happened twice. Today that is
unrecoverable by design, and the design is worth defending before it is
changed.

**The constraint.** The sync token is `PBKDF2(passcode, "wmm:<name>", 100k)`,
computed in the browser, and it is the only way in: `GET /api/profile` takes a
token and nothing else, so the API cannot be asked "is there a wizard called
Camille" and cannot be enumerated. That is why there is no password reset —
there is no account to send one about.

Be precise about what that does and does not buy, because the first draft of
this section was wrong. The `profiles` table stores `name` in plaintext
alongside the blob, so anyone holding the connection string can list every
child using the app; it is first names only, capped at 40 characters, and it is
what makes the owner's own queries possible. The property is "the public API
cannot be enumerated", not "the database cannot identify anyone".

**What recovery should be: a recovery phrase, not an email.** At signup,
generate three random words, show them once, tell the grown-up to write them
somewhere. Derive a SECOND token from the phrase and store it server-side as an
alias row pointing at the same profile; entering the phrase on any device logs
her in and lets her set a new passcode. Cross-device recovery, no email, no
personal data, no mail infrastructure, and the server still cannot be asked who
anyone is. Touches the sync contract, so `synctest.mjs` is the thing to extend
first.

**Why not email.** It would be personal data about children, which is COPPA
territory in the US and a question for someone qualified rather than a design
call. It would create the durable identifier this whole scheme exists to avoid.
And it needs a mail sender, domain authentication, a reset-token table, rate
limiting, and a public endpoint whose job is to answer "does this account
exist" — the enumeration that was deliberately designed out.

**A rejected idea, recorded so it is not re-proposed.** A "forgot your
passcode" panel on the login screen, behind a hard sum, revealing the passcode
that is already sitting in `localStorage` in clear. It dies on one observation:
in a maths app, a maths lock gets easier exactly as the child it is locking
gets better, and the children most likely to beat it are the ones using the app
most. A nine-year-old here can already do 17 x 23. Any gate wants to be a
grown-up's secret or nothing.

**The rest of going public.** None of this is urgent while the players are two
sisters and a friend's classroom, and all of it comes due together the first
time a stranger's child signs in:

- A privacy policy, and a way to actually delete a profile and its cloud row.
- A decision on ages, written down, with the COPPA question answered by someone
  qualified.
- The passcode is stored in clear in `localStorage` (`loadProfile` string-
  compares it). Fine on a family iPad; worth revisiting when the device might
  be shared with strangers.
- Teacher mode (above) is the same problem wearing a different hat — it is
  already designed around child-initiated joining for exactly this reason.

There is no user-generated content anywhere in the app and nothing is ever
shown to one child about another. That is worth keeping on purpose: it is why
there is no moderation problem to solve.

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

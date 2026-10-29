# Working on Wizard Math Maze

Context for an assistant picking this up. The short version: it is a maths game
for two specific children, the art is all procedural canvas, and every rule in
here exists because something went wrong without it.

## The one rule

**Nothing may make a child feel bad at maths.** Everything else is negotiable.
In practice:

- A wrong answer costs points and never progress. Doors always open.
- Difficulty follows her, never a grade level, and rises slowly on purpose.
- Nothing is ever framed as a mark, a score out of, or a test — including the
  Attunement, which is a ceremony that cannot be failed.
- The progress page has no red on it. "Shaky" is "worth another go".
- A wrong answer gets a soft, level, neutral tone — never a buzzer, never a
  falling interval, never anything a game show would use. `again()` in
  `src/engine/sound.js` is the function to leave alone when someone later
  reaches for juicier feedback; `soundtest.mjs` asserts it does not fall and is
  quieter than the correct answer, because that is invisible in code review.
  The same reasoning governs `sealed()` (the exit gate reports that the stone is
  thick, which is a fact about the door) and `scatter()` (losing an encounter
  costs nothing, so it is glass drifting away rather than a descending run).
  In the Attunement, a right answer and a miss make the SAME sound — the
  ceremony never tells her which it was, and a cheerful chime there would leak
  the whole measurement through the speaker.

If a change would make a struggling child feel measured, it is wrong even if it
is more accurate.

## Architecture

```
src/game/    rules — no rendering, no React, testable in plain node
src/engine/  canvas drawing — no React
src/ui/      React screens, as little logic as possible
src/store/   localStorage, schema migration, optional cloud mirror
api/         one Vercel function over Neon
```

The separation is load-bearing: `src/game/` is what the pure-node tests
(`attunetest`, `pacetest`, `runetest`) import directly, and they are the only
tests that can simulate thousands of children in a second.

## Art

**No image assets. Ever.** Every wizard, creature, crest, wall and trinket is
drawn procedurally. That is what makes 25 robes affordable and keeps everything
crisp at any size. When something looks flat, the fix is always one of:

- **Modelling** — a direction the light comes from, a shadow where forms meet,
  an ambient darkening where a surface turns away.
- **Soft transitions** — `ctx.filter = blur()` under a sharp pass on top. Hair,
  fur, folds and beards all use this. A hard edge is a vector tell.
- **Texture** — `grain()`. Cached as a tile; see below.
- **A rim light** along the lit edge. This is what stops a silhouette reading as
  a sticker on the background.

Two rules that came out of painful experience:

- **"Colour is free. Geometry is authored."** Each of the six wizards has her
  face, eyes and hair placed by hand for her own skull. Colours (skin, hair,
  eyes) swap freely because they move nothing. A control that overrides
  *geometry* undoes the entire reason the six stopped looking like one person
  in six wigs — that is why the eye-shape picker was removed.
- **Performance is about caching, not drawing less.** `grain()` was six thousand
  `fillRect`s per shape per frame before it was baked into a repeating tile.
  Drawing a wizard went 2.4ms → 5.5ms → 0.9ms across that change. Check
  `perfprobe.mjs` after any art work.

`src/engine/portrait.js` is the reference implementation. Read it first.

## Tests

Playwright harnesses that drive the real built app. No unit tests, no mocks —
what is worth protecting here is emergent.

```bash
npm test                 # all of it
npm run test:fast        # skips v4test and full
npm test -- keytest      # one
```

Conventions that matter:

- **A test asserts. A shot looks.** `*test.mjs`/`*flow.mjs` print PASS/FAIL and
  are in the suite. `*shot.mjs`/`*sheet.mjs` produce output for a human to read
  — screenshots, or the loudness table from `soundsheet.mjs` — and are not. Do
  not add a "test" that cannot fail.
- **Fix the right side.** When something goes red, work out whether the bug is
  in the product or in the test *before* touching either, then fix that one.
  Widening a tolerance, raising a timeout or softening an assertion to get back
  to green is how a suite quietly stops being evidence — it will still be there,
  still passing, and no longer telling you anything. If the honest answer is
  "neither, it is the runner", say so in the commit message, because that claim
  is checkable: a runner fix changes no assertions.
- **Seed the randomness.** Statistical assertions use a seeded `mulberry32`
  over `Math.random` (see `attunetest.mjs`). An unseeded threshold test will
  flake and then be ignored, which is worse than not having it.
- **Wait for the thing, not for a duration.** Several bugs in this repo's
  history were harness races dressed as app bugs. `waitFor` the element.
- **Changing onboarding breaks the harnesses.** The shared helpers in
  `harness.mjs` (`pickWizard`, `takeLook`, `takePractice`, `skipAttunement`,
  `takeNest`) exist so the order lives in one place. Update them, not twenty
  scripts.
- `testenv.mjs` is the only file that knows anything about the machine.

Verify art with a screenshot you actually look at. Several regressions here were
invisible in code review and obvious in a 200px crop.

## Sound

Procedural WebAudio, for the same reasons as the art: no files, no licences,
nothing to keep in sync with a build. `src/engine/sound.js` is the whole of it —
two primitives (`tone`, `thud`) and about twenty sounds built from them.

Three things that are easy to get wrong:

- **An AudioContext is born suspended.** It can only be started from inside a
  real user gesture, and one that is left suspended swallows every sound in
  silence with no error anywhere. `wakeSound()` always calls `resume()` and
  plays a one-sample silent buffer; `soundReady()` is the only honest answer to
  "is there audio", and it is not the same question as "is sound switched on".
  On iOS the hardware silent switch mutes WebAudio whatever the volume is, which
  is why the castle's sound button has a third state that says so.
- **Verify under the real autoplay policy.** Do not launch a browser with
  `--autoplay-policy=no-user-gesture-required` to check audio. That switches off
  the exact restriction the code exists to handle, and a check that does it
  proves nothing — this is how the first sound release shipped silent.
  `wiretest.mjs` makes the context report `suspended` until something resumes
  it, which is what a tablet does and what desktop Chromium will not do for you.
- **Gain numbers are not loudness.** A 210Hz footstep and a 660Hz keypress at
  the same gain are nowhere near as loud as each other. `soundsheet.mjs` renders
  every sound through a small offline WebAudio and prints A-weighted loudness;
  the ordering is what matters. The four constant sounds (step, key, turn,
  erase) must stay at the bottom of that list, and `soundtest.mjs` keeps a cap
  on each so the budget cannot drift upward one commit at a time.

`master.gain` in `wakeSound()` is the single volume for the whole app.

## The adaptive system

Two mechanisms, easy to confuse:

- **Wizard's Sense** (`curriculum.js`) — the slow per-operation climb during
  normal play, 0.045 per correct answer. It is a *learning* rate, tuned not to
  overwhelm. There is a beginner ceiling (`warmCap`) that stops a new player
  being launched upward by a lucky streak.
- **The Attunement** (`attunement.js`) — a staircase that *searches*. Up on
  success, down on failure, step shrinks at each reversal, estimate is the mean
  of the last three reversals, shaded down by `SHADE` because being placed low
  costs nothing and being placed high costs everything. Settles in ~10-12
  questions. A Quick Tuning is the same engine on one operation.

If you change either, run `attunetest.mjs` — it simulates children of known
ability and checks the placement lands near the truth and errs low.

## Data

`src/store/storage.js` owns the profile schema and `migrate()` brings any older
one forward. **Add a field there with a default, never assume it exists.** Live
profiles belong to real children and cannot be reset. Anything read from a
profile needs a fallback (`profile.trinkets || []`).

## Commits

Messages explain *why*, and are often several paragraphs. That is deliberate —
most of the useful history in this repo is the reasoning behind a fix, and a
one-line "fix beard" would have thrown away the interesting part (that
`shade()` returned `rgb()` while `parse()` only read hex, silently greying four
things). Keep the habit. The code comments do the same job in the same voice.

## Traps

- `shade()` returns `rgb(...)`, not hex. `parse()` handles both now; it did not,
  and the grey fallback looked deliberate for weeks.
- React refs assigned during render (`ref.current = state`) are **not** a
  synchronous guard. Two key events in one tick both pass. Assign the ref at the
  moment of the action. This caused the Attunement to score a child against a
  question it had silently swapped in.
- Canvas sprites are occlusion-tested against walls, not against each other.
  Anything new that draws in the world needs a depth pass.
- `ctx.restore()` does not reset the current path.

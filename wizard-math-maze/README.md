# Wizard Math Maze

A first-person maze where the doors are arithmetic. Built for two children who
were bored of flashcards, and shaped around one rule: **nothing in the game may
make a child feel bad at maths.** Wrong answers cost points and never progress,
doors always open, and the difficulty follows her rather than a grade level.

React 18 + Vite. One runtime dependency (`@neondatabase/serverless`, used only
by the one API route). No image assets at all — every wizard, creature, crest
and wall is drawn procedurally on a canvas, which is why 25 robes and 6 faces
cost a config block each instead of an art budget.

```bash
npm install
npm run dev          # http://localhost:5173
npm run build
npm test             # the full suite, cold — see "Tests" below
```

Node 20+. No backend required: without `DATABASE_URL` the cloud sync marks
itself unavailable on the first 404 and the game plays entirely from
`localStorage`.

## What's where

| Path | What lives there |
|---|---|
| `src/game/` | The rules. Curriculum, adaptive difficulty, maze generation, the Attunement, forms, trinkets, nests. No rendering, no React. |
| `src/engine/` | The drawing. Raycaster, wall renderer, the painted portrait, the full-figure sprite, creatures, crests, minimap. Pure canvas, no React. |
| `src/ui/` | The screens. React, and as little logic as it can get away with. |
| `src/store/` | `localStorage` persistence, schema migration, and the optional cloud mirror. |
| `api/profile.js` | The only server code. A Vercel function over Neon Postgres. |
| `*.mjs` (root) | Playwright harnesses — the test suite and the screenshot scripts. |
| `*sheet.html` (root) | Component sheets for looking at art in isolation. `npm run sheets`, then open one. |

Two files are worth reading before anything else: **`src/game/curriculum.js`**
(how difficulty adapts, and why it is deliberately slow to rise) and
**`src/engine/portrait.js`** (the painting model everything else copies).

## Tests

Every test drives the real built app in a real browser and asserts on what it
finds. There are no unit tests and no mocks — the things worth protecting here
are emergent (does the maze stay solvable, does the placement land near the
truth, does a held key leak a digit into the answer box), and none of them
survive being mocked.

```bash
npm test                    # everything, ~12 min, builds first
npm run test:fast           # skips the two multi-minute walks
npm test -- keytest shoptest    # just these
```

The runner builds the app, starts the servers the harnesses expect, runs them,
and reports. It finds Chromium from `PLAYWRIGHT_BROWSERS_PATH` or Playwright's
own install; `WMM_CHROME` overrides. Screenshots land in `.shots/` (gitignored),
or `WMM_SHOTS`.

CI runs `test:fast` on every pull request and uploads the screenshots.

The scripts NOT in the suite — `*shot.mjs`, `*sheet.mjs` — exist to be looked
at rather than to pass. A run that cannot fail is not a test.

## Deploying

Vercel, from `main`. The one function needs `DATABASE_URL` pointing at a Neon
database with a `profiles` table; `api/profile.js` documents the shape. Leave it
unset and the app still works, minus cross-device sync.

Passcodes never leave the browser: the client derives
`PBKDF2-SHA256(passcode, "wmm:<name>", 100k)` and sends only that, so the token
is both the lookup key and the only credential, and the server cannot enumerate
children by name.

## Working on it

Branch, PR, merge — even when it's obvious, because two people pushing to `main`
from two machines will collide eventually. Commit messages here carry the
reasoning, not just the change: most of the useful history is in *why* something
was wrong, and the code comments do the same job. Please keep both habits.

`CLAUDE.md` holds the conventions in the form an AI assistant reads. It is worth
skimming as a human too — it is the shortest description of how this thing is
built.

`docs/roadmap.md` is what's agreed but unbuilt.

# Glossary

The vocabulary around this repo, in the meaning it has *here*. Aimed at
someone comfortable writing code who has not spent much time in git branches
or CI — not at explaining what a variable is.

The one-sentence version of how it all fits together:

> **git** tracks history, **GitHub** hosts it and adds pull requests,
> **Actions** runs things on a throwaway Linux box, **npm** installs and runs
> this project on that box, and the result comes back as a **check** that the
> **ruleset** on `main` is waiting for.

---

## Git — local, about history

**repository (repo)** — the project folder plus its entire history. History
lives in `.git/` at the root; delete that and you have files with no past.

**commit** — a saved snapshot with a message. `df98ddf` is one; that short
string is the front of its hash. Commits in this repo carry their reasoning,
not just their change — see the Commits section of `CLAUDE.md`.

**branch** — a movable name pointing at a commit. Making one is nearly free:
it writes a name, it does not copy files. That is why the advice is always
"just make a branch".

**`main`** — the branch that is the real state of the project. Protected here;
see *ruleset*.

**checkout** — switch the working files to a branch. Real consequence: on
`claude/ci-suite` the file `.github/workflows/test.yml` exists on disk; check
out `main` before that branch is merged and it is gone, because it is not on
that branch.

**HEAD** — whatever is checked out right now.

**remote / `origin`** — a copy of the repo somewhere else. `origin` is the
conventional name for the GitHub one.

**push / fetch / pull** — send commits to the remote / bring theirs down
without touching your files / bring theirs down *and* merge into the current
branch.

**merge** — combine one branch's commits into another.

**merge conflict** — the same lines changed on both sides, so git refuses to
guess and marks the spot for a human. Short-lived branches are how you mostly
avoid these.

## GitHub — the website, not git

Nothing in this section exists in git itself. A repo works fine without any of
it.

**pull request (PR)** — a request to merge one branch into another, wrapped in
a page where automation can run and people can comment first. The name is
historical and reads backwards: "please pull my branch in".

**check** — a pass/fail result reported onto a PR by something automated.
This repo has exactly one, named `suite`.

**ruleset** — conditions a branch enforces. On `main`: changes arrive by pull
request, `suite` must be green, no force pushes, no deleting the branch. It
applies to everyone including the repo owner, which is the point — it caught
the very commit that added it.

**artifact** — files a CI run saves for downloading afterwards. Here, the
contents of `.shots/`, so a failed run can be *looked at* rather than guessed
at.

## CI — Continuous Integration

**CI** — automatically building and testing every change, so a problem
surfaces at the change that caused it instead of three weeks later.
**GitHub Actions** is GitHub's implementation.

**workflow** — one YAML file saying what to run and when. Ours is `tests`,
at `.github/workflows/test.yml`. That path is not a convention, it is the only
place Actions looks — and it is the *repository* root, while the app lives one
level down in `wizard-math-maze/`. Hence `defaults.run.working-directory`.

**job** — a unit inside a workflow, run on its own fresh machine. Ours is
`suite`. Several jobs run in parallel by default.

**step** — one command (`run:`) or one prepackaged action (`uses:`) inside a
job.

**`run:` vs `uses:`** — `run:` is a shell command. `uses:` pulls in an action
someone else wrote, like `actions/checkout@v4` ("clone this repo onto the
runner"). The `@v4` pins the major version.

**runner** — the machine a job gets. `ubuntu-latest` is a clean Linux VM
GitHub creates, lends for up to `timeout-minutes`, and destroys. It starts
with nothing of yours on it, which is why the early steps check out the code
and install everything from scratch.

**why the check is called `suite`** — because that is the job's id. GitHub
names the check after the job. It is not a built-in term, and the ruleset
matches the string literally: rename the job without changing the ruleset and
PRs wait forever for a check that never arrives.

## Node and npm

**Node** — JavaScript outside a browser. It runs the `.mjs` harnesses.

**npm** — Node's package manager (`pip`'s counterpart), which also runs named
scripts.

**`package.json`** — the manifest: dependencies, and the scripts behind
`npm test`, `npm run build` and the rest.

**`package-lock.json`** — the exact resolved version of every package,
transitive ones included. `package.json` says roughly what is wanted; the lock
file records precisely what was got, so another machine reproduces it.

**`npm install` vs `npm ci`** — `install` resolves versions and may rewrite the
lock file. `ci` installs strictly what the lock file says and fails if the two
disagree. CI uses `ci`, because a build must never quietly drift onto a
version nobody tested.

**build** — here, `vite build`: bundling `src/` into `dist/`, which is what a
browser can actually serve. The tests drive the built app, not the source.

**lint** — an automated style and error checker, ESLint being the usual one.
This repo has none. Mentioned because it is the other job people commonly see
next to `suite`.

## The two the workflow leans on

**Playwright** — the library the harnesses use to drive a real browser: click,
type, screenshot, assert.

**Chromium** — the open-source browser Chrome is built from. Installing a
known-good copy onto the runner is the slow step of a CI run.

## Formats

**YAML** — the plain-text config format Actions uses. Structure comes from
indentation rather than braces. Two spaces per level, and **a tab character is
a syntax error** — that is the one trap worth knowing in advance. `.yml` and
`.yaml` are the same thing.

**Markdown** — what this file is. Also what the README, `CLAUDE.md` and PR
descriptions are.

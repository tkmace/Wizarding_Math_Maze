// --- Where the harnesses run ---------------------------------------------------
// Every test in this repo is a Playwright script that drives the real built app
// and asserts on what it finds. They were written inside one particular sandbox
// and hardcoded three things about it: the path to a Chromium binary, an
// absolute scratch directory for screenshots, and the absolute path of the
// checkout. All three are true in exactly one place on earth, which meant a
// second person could clone this repo and not run a single test.
//
// This module is the one place that knows about the machine. Everything else
// imports SHOTS, DIST and launch() and works anywhere.

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { chromium } from 'playwright'

/** The checkout, found from this file rather than assumed. */
export const REPO = path.dirname(fileURLToPath(import.meta.url))

/** The built app the harnesses serve. Run `npm run build` first. */
export const DIST = path.join(REPO, 'dist')

/**
 * Where screenshots go.
 *
 * `.shots/` inside the checkout by default — gitignored, so a test run never
 * shows up as pending changes — or wherever WMM_SHOTS points, which is how the
 * sandbox keeps writing to its own scratch space.
 */
export const SHOTS = process.env.WMM_SHOTS || path.join(REPO, '.shots')
fs.mkdirSync(SHOTS, { recursive: true })

/**
 * A Chromium, wherever this machine keeps one.
 *
 * In order: whatever WMM_CHROME says, then a Playwright install under
 * PLAYWRIGHT_BROWSERS_PATH, then Playwright's own default — which is the
 * ordinary case after `npx playwright install chromium`.
 *
 * The --no-sandbox pair is for running as root inside a container. It is
 * harmless on a laptop.
 */
function findChrome() {
  if (process.env.WMM_CHROME) return process.env.WMM_CHROME
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH
  if (root && fs.existsSync(root)) {
    for (const dir of fs.readdirSync(root)) {
      if (!/^chromium-\d+$/.test(dir)) continue
      for (const rel of ['chrome-linux/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium']) {
        const p = path.join(root, dir, rel)
        if (fs.existsSync(p)) return p
      }
    }
  }
  return null                       // let Playwright pick its own
}

export function launch(extra = {}) {
  const executablePath = findChrome()
  return chromium.launch({
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    ...(executablePath ? { executablePath } : {}),
    ...extra,
  })
}

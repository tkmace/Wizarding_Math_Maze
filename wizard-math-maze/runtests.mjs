// --- The suite ------------------------------------------------------------------
// `npm test` from a cold clone: builds the app, brings up the two servers some
// harnesses expect, runs everything that asserts, and reports.
//
// The tests come in four kinds and the runner has to know which is which:
//
//   pure      plain node, no browser — the statistical ones
//   served    starts its own http server on its own port, needs nothing
//   preview   drives the built app on :4173 (vite preview)
//   dev       drives a component sheet on :4241 (vite dev, for .jsx imports)
//
// Screenshot-only scripts (*shot.mjs, *sheet.mjs) are not here. They exist to
// be LOOKED at, and a run that cannot fail is not a test.
//
//   npm test            everything
//   npm test -- --fast  skip the two that take several minutes
//   npm test -- keytest shoptest    just these

import { spawn } from 'child_process'
import net from 'net'
import { REPO } from './testenv.mjs'

const TESTS = [
  { name: 'attunetest', needs: 'pure' },
  { name: 'pacetest', needs: 'pure' },
  { name: 'runetest', needs: 'pure' },

  { name: 'looktest', needs: 'served' },
  { name: 'picktest', needs: 'served' },
  { name: 'nestflow', needs: 'served' },
  { name: 'coachtest', needs: 'served' },
  { name: 'keytest', needs: 'served' },
  { name: 'shoptest', needs: 'served' },
  { name: 'buytest', needs: 'served' },
  { name: 'enctest2', needs: 'served' },
  { name: 'scratchshot', needs: 'served' },
  { name: 'attuneflow', needs: 'served' },
  { name: 'relogin', needs: 'served' },

  { name: 'controltest', needs: 'dev' },
  { name: 'wintest', needs: 'dev' },
  { name: 'runeorder', needs: 'dev' },

  { name: 'attuneops', needs: 'preview' },

  // Minutes each: v4test plays a whole rank, full.mjs walks the entire app.
  { name: 'v4test', needs: 'served', slow: true },
  { name: 'full', needs: 'preview', slow: true },
]

const args = process.argv.slice(2)
const fast = args.includes('--fast')
const only = args.filter(a => !a.startsWith('--'))
const chosen = TESTS.filter(t =>
  (only.length ? only.includes(t.name) : true) && (fast ? !t.slow : true))

if (!chosen.length) {
  console.error(`No tests matched. Known: ${TESTS.map(t => t.name).join(', ')}`)
  process.exit(2)
}

const run = (cmd, cmdArgs, opts = {}) => spawn(cmd, cmdArgs, { cwd: REPO, ...opts })

const sh = (cmd, cmdArgs) => new Promise((res, rej) => {
  const p = run(cmd, cmdArgs, { stdio: 'inherit' })
  p.on('exit', c => (c === 0 ? res() : rej(new Error(`${cmd} exited ${c}`))))
})

/** Resolve once something is listening, or give up. */
function waitForPort(port, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs
  return new Promise((res, rej) => {
    const tick = () => {
      const s = net.connect(port, '127.0.0.1')
      s.on('connect', () => { s.destroy(); res() })
      s.on('error', () => {
        s.destroy()
        if (Date.now() > deadline) rej(new Error(`nothing on :${port} after ${timeoutMs}ms`))
        else setTimeout(tick, 250)
      })
    }
    tick()
  })
}

const servers = []
async function ensure(kind) {
  if (kind === 'preview' && !servers.preview) {
    servers.preview = run('npx', ['vite', 'preview', '--port', '4173'], { stdio: 'ignore' })
    servers.push(servers.preview)
    await waitForPort(4173)
  }
  if (kind === 'dev' && !servers.dev) {
    servers.dev = run('npx', ['vite', '--port', '4241'], { stdio: 'ignore' })
    servers.push(servers.dev)
    await waitForPort(4241)
  }
}

/** A harness passes if it exits 0 and prints no FAIL line. */
function runTest(name) {
  return new Promise(res => {
    const started = Date.now()
    const p = run('node', [`${name}.mjs`])
    let out = ''
    p.stdout.on('data', d => { out += d })
    p.stderr.on('data', d => { out += d })
    p.on('exit', code => {
      const failed = code !== 0 || /\bFAIL\b|\d+ FAILED/.test(out)
      res({ name, ok: !failed, code, secs: ((Date.now() - started) / 1000).toFixed(0), out })
    })
  })
}

console.log('building…')
await sh('npx', ['vite', 'build'])

const results = []
for (const t of chosen) {
  await ensure(t.needs)
  process.stdout.write(`  ${t.name}… `)
  const r = await runTest(t.name)
  results.push(r)
  console.log(r.ok ? `ok (${r.secs}s)` : `FAILED (${r.secs}s)`)
  if (!r.ok) console.log(r.out.split('\n').filter(l => /FAIL|Error|error/.test(l)).slice(0, 8).join('\n'))
}

for (const s of servers) s.kill()

const bad = results.filter(r => !r.ok)
console.log(`\n${results.length - bad.length}/${results.length} suites passed`)
if (bad.length) {
  console.log('failed: ' + bad.map(r => r.name).join(', '))
  process.exit(1)
}

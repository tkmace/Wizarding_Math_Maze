// Who is actually using this. `DATABASE_URL=... node usagesheet.mjs`
//
// A sheet, not a test: it prints numbers for a human and cannot fail. (See the
// convention in CLAUDE.md — *test.mjs asserts, *sheet.mjs looks.)
//
// This exists because the honest answer to "how has usage been?" lived in a
// Neon console that is a nuisance to navigate, so the question kept turning
// into a research task. It is read-only — one SELECT, no writes, ever — and it
// reads the same fact tables the progress page does, through the same
// `masteryReport`, so what it says about a child matches what she sees.
//
// Getting the connection string, from the project directory:
//
//     vercel env pull .env.local        # writes DATABASE_URL into .env.local
//     set -a; . ./.env.local; set +a    # load it into this shell
//     node usagesheet.mjs
//
// or paste it for one command only, with a leading space so it stays out of
// shell history:
//
//      DATABASE_URL='postgres://…' node usagesheet.mjs
//
// Passing --json prints the same data as JSON instead of a table.
//
// A note on what is in here. `profiles` stores each child's first name in
// plaintext next to her blob — that is what makes this script possible, and it
// is the thing the privacy design does NOT protect (see docs/roadmap.md). So
// this output is a list of real children and how they are doing at maths.
// Treat it accordingly: it belongs on your own machine and nowhere else.
import { neon } from '@neondatabase/serverless'
import { masteryReport, AREA_LEVELS } from './src/game/curriculum.js'
import { OPS } from './src/game/math.js'

const DAY = 86400000
const asJson = process.argv.includes('--json')

const url = process.env.DATABASE_URL
if (!url) {
  console.error('No DATABASE_URL in the environment. See the header of this file for how to get it.')
  process.exit(1)
}

let rows
try {
  const sql = neon(url)
  rows = await sql`
    select name, plays, updated_at, data
    from profiles
    order by updated_at desc`
} catch (err) {
  console.error('Could not read the database:', err?.message || err)
  console.error('If this is a connection error, the compute may simply be asleep — try once more.')
  process.exit(1)
}

const now = Date.now()
const num = n => (Number.isFinite(n) ? n : 0)

const wizards = [...rows]
  // The query already orders by updated_at, but sorting here as well means the
  // sheet is right even if that ever changes or a row arrives with a null date.
  .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))
  .map(r => {
  const p = r.data || {}
  const st = p.stats || {}
  const answered = num(st.correct) + num(st.wrong)
  const rep = masteryReport(p)
  const areas = OPS
    .filter(o => rep.byOp[o.key]?.attempts > 0)
    .map(o => ({ op: o.key, label: o.label, state: rep.byOp[o.key].state,
      attempts: rep.byOp[o.key].attempts, acc: rep.byOp[o.key].right / Math.max(1, rep.byOp[o.key].attempts) }))
    return {
    name: r.name,
    lastSeen: new Date(r.updated_at),
    daysAgo: Math.floor((now - new Date(r.updated_at).getTime()) / DAY),
    answered,
    plays: num(r.plays),
    accuracy: answered ? num(st.correct) / answered : 0,
    mazes: num(st.mazesCleared),
    // Capped at half an hour per maze since the playMs fix; older rows can
    // still carry the inflated figure, so this is a floor, not a measurement.
    minutes: Math.round(num(st.playMs) / 60000),
    points: num(p.totalPoints),
    facts: rep.totalFacts,
    solid: OPS.reduce((n, o) => n + num(rep.byOp[o.key]?.solid), 0),
    areas,
    best: rep.bestArea ? rep.bestArea.state : null,
  }
})

if (asJson) {
  console.log(JSON.stringify(wizards, null, 2))
  process.exit(0)
}

// --- the sheet ---------------------------------------------------------------
const active = d => wizards.filter(w => w.daysAgo <= d).length
const pad = (s, n) => String(s).padEnd(n)
const num6 = n => String(n).padStart(6)

console.log()
console.log(`${wizards.length} wizard${wizards.length === 1 ? '' : 's'} in the cloud`)
console.log(`  played in the last  2 days: ${active(2)}`)
console.log(`  played in the last  7 days: ${active(7)}`)
console.log(`  played in the last 14 days: ${active(14)}`)
console.log(`  played in the last 30 days: ${active(30)}`)
const dormant = wizards.filter(w => w.daysAgo > 30).length
if (dormant) console.log(`  not seen for over a month:  ${dormant}`)
console.log()

console.log(pad('WIZARD', 14), pad('LAST PLAYED', 14), num6('ANSW'), num6('ACC%'), num6('MAZES'),
  num6('MINS'), num6('FACTS'), num6('SOLID'), ' AREAS')
for (const w of wizards) {
  const when = w.daysAgo === 0 ? 'today'
    : w.daysAgo === 1 ? 'yesterday'
      : w.daysAgo < 30 ? `${w.daysAgo} days ago`
        : w.lastSeen.toISOString().slice(0, 10)
  const areas = w.areas.length
    ? w.areas.map(a => `${a.label.slice(0, 3)} ${AREA_LEVELS[a.state].label.toLowerCase()}`).join(', ')
    : '—'
  console.log(
    pad(w.name.slice(0, 13), 14), pad(when, 14),
    num6(w.answered), num6(Math.round(w.accuracy * 100)), num6(w.mazes),
    num6(w.minutes), num6(w.facts), num6(w.solid), ' ' + areas)
}
console.log()

// Two wizards with the same name are two DIFFERENT accounts — a passcode typed
// differently on a second device makes a second token and a second profile, and
// the child sees an empty castle. Worth knowing about; it has happened.
const byName = {}
for (const w of wizards) (byName[w.name.toLowerCase()] ||= []).push(w)
const dupes = Object.entries(byName).filter(([, list]) => list.length > 1)
if (dupes.length) {
  console.log('SAME NAME, DIFFERENT ACCOUNTS')
  for (const [name, list] of dupes) {
    console.log(`  ${name}: ${list.length} separate profiles — ` +
      list.map(w => `${w.answered} answers, last ${w.daysAgo}d ago`).join(' | '))
  }
  console.log('  (a passcode typed differently on another device makes a new account)')
  console.log()
}

const quiet = wizards.filter(w => w.answered < 20)
if (quiet.length) {
  console.log(`${quiet.length} signed up and barely played: ` +
    quiet.map(w => `${w.name} (${w.answered})`).join(', '))
  console.log()
}

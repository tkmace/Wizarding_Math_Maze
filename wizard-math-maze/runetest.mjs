// What a maze actually carries now: stones, their worth, and where the great
// one lands relative to the way in.
import { genMaze, GREAT_RUNE } from './src/game/maze.js'


let pass = 0, fail = 0
const check = (what, ok, note = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${what}${note ? ' :: ' + note : ''}`)
  ok ? pass++ : fail++
}

const profile = { skill: { addition: 0.3 }, opPlays: {}, facts: {}, settings: { diff: 'wizard' } }
const runs = []
for (let i = 0; i < 40; i++) {
  const m = genMaze(['addition'], 'wizard', profile, {}, 6)
  const vals = Object.values(m.stones)
  runs.push({
    n: vals.length,
    great: vals.filter(v => v > 1).length,
    total: vals.reduce((a, b) => a + b, 0),
  })
}
const avg = k => (runs.reduce((s, r) => s + r[k], 0) / runs.length).toFixed(1)

console.log(`  ${runs.length} mazes: ${avg('n')} stones, ${avg('total')} runes a maze on average`)
check('at least seven stones in every maze', runs.every(r => r.n >= 7), `min ${Math.min(...runs.map(r => r.n))}`)
check('exactly one great rune in every maze', runs.every(r => r.great === 1))
check('the great rune is worth five', GREAT_RUNE === 5)
check('a maze is worth about eleven runes', +avg('total') >= 10 && +avg('total') <= 13, avg('total'))
check('the old four-rune maze is well behind us', +avg('total') > 8)

// The perk still adds on top.
const perked = genMaze(['addition'], 'wizard', profile, { stones: 3 }, 6)
const pv = Object.values(perked.stones)
check('the rune-stone perk still adds its share', pv.length >= 10, `${pv.length} stones`)

console.log(`\n${pass} passed, ${fail} failed`)

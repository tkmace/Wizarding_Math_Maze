// The returning-wizard gift. Pure, so it runs in plain node — which matters
// because the alternative way to test "she came back tomorrow" is to put the
// laptop clock forward a day.
import { welcomeBack, welcomeWords, AWAY_MS, WELCOME_POINTS } from './src/game/welcome.js'

let fails = 0
const check = (name, ok, extra) => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} — ${name}${extra ? ' :: ' + extra : ''}`)
  if (!ok) fails++
}
const NOW = 1_800_000_000_000
const wiz = (over = {}) => ({ name: 'Linden', plays: 60, totalPoints: 300, lastPlayed: NOW - AWAY_MS - 1, ...over })

console.log('who gets welcomed back')
check('a wizard returning the next day', !!welcomeBack(wiz(), NOW))
check('and she is given points', welcomeBack(wiz(), NOW)?.points === WELCOME_POINTS)
check('nobody who is still in the same sitting', welcomeBack(wiz({ lastPlayed: NOW - 1000 }), NOW) === null)
check('nobody an hour later', welcomeBack(wiz({ lastPlayed: NOW - 3600_000 }), NOW) === null)
check('not on a first visit', welcomeBack(wiz({ plays: 2 }), NOW) === null)
check('not a brand-new profile', welcomeBack({ plays: 0, lastPlayed: 0 }, NOW) === null)
check('a missing profile is not a crash', welcomeBack(null, NOW) === null)

console.log('it cannot be farmed')
const first = welcomeBack(wiz(), NOW)
const after = { ...wiz(), awayGiftAt: first.at }
check('no second gift the same evening', welcomeBack(after, NOW + 60_000) === null)
check('nor four hours later', welcomeBack(after, NOW + 4 * 3600_000) === null)
check('but yes the following day', !!welcomeBack(after, NOW + AWAY_MS + 1000))

console.log('being away longer is never worth less')
const day = welcomeBack(wiz({ lastPlayed: NOW - 25 * 3600_000 }), NOW)
const month = welcomeBack(wiz({ lastPlayed: NOW - 40 * 86400_000 }), NOW)
check('a month away pays the same as a night away', day.points === month.points,
  `${day.points} vs ${month.points}`)
check('and the only difference is the wording', welcomeWords(day) !== welcomeWords(month))
check('there is no streak to break', !('streak' in day) && !('lost' in day))

console.log(fails ? `${fails} FAILED` : 'all passed')
process.exit(fails ? 1 : 0)

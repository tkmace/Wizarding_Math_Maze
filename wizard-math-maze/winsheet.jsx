import { createRoot } from 'react-dom/client'
import WinScreen from './src/ui/WinScreen.jsx'
import { formById } from './src/game/skins.js'
import { CSS } from './src/ui/theme.js'
import { blankAppearance } from './src/game/appearance.js'

const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s)
const profile = { name: 'Camille', totalPoints: 1120, stones: 9, equippedSkin: 'apprentice', appearance: blankAppearance(), chosen: {} }
const run = { points: 340, doors: 9, correct: 11, answered: 13, fast: 5 }
const which = new URL(location.href).searchParams.get('rank')
createRoot(document.getElementById('root')).render(
  <div style={{ minHeight: '100vh', background: '#080820', display: 'flex', justifyContent: 'center' }}>
    <WinScreen profile={profile} run={run} newRank={which === null ? 2 : (which === 'none' ? null : +which)}
      form={formById('apprentice')} onAgain={() => {}} onCastle={() => {}} />
  </div>
)

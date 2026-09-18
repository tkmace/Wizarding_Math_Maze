import { createRoot } from 'react-dom/client'
import WizardPortrait from './src/ui/WizardPortrait.jsx'
import { PORTRAITS } from './src/game/portraits.js'
import { formById } from './src/game/skins.js'
import { blankAppearance, SKIN_TONES } from './src/game/appearance.js'

const base = blankAppearance()
const card = (id, i) => ({ ...base, portrait: id, skin: i % SKIN_TONES.length, hairColor: (i + 1) % 5, hairStyle: i % 4, eyeColor: (i + 2) % 6, beard: i === 3 ? 1 : 0 })

function Section({ title, children }) {
  return <section><h2>{title}</h2><div className="row">{children}</div></section>
}

function Tile({ form, appearance, label, size = 150 }) {
  return <figure><WizardPortrait form={form} appearance={appearance} size={size} /><figcaption>{label}</figcaption></figure>
}

function App() {
  return <main>
    <h1>Wizard Portrait Renderer</h1>
    <p>Development sheet — original SVG components at portrait, hub, and tile scale.</p>
    <Section title="Six identities · Apprentice robe">
      {PORTRAITS.map((p, i) => <Tile key={p.id} form={formById('apprentice')} appearance={card(p.id, i)} label={p.name} size={150} />)}
    </Section>
    <Section title="Wardrobe adapter · one identity across forms">
      {['candle', 'leaf', 'pebble', 'frost', 'thorn', 'dawn', 'astral', 'grand'].map((id, i) => <Tile key={id} form={formById(id)} appearance={card('river', i)} label={formById(id).title} size={106} />)}
    </Section>
    <Section title="Small wardrobe tiles · 64 px">
      {PORTRAITS.map((p, i) => <Tile key={p.id} form={formById('storm')} appearance={card(p.id, i)} label={p.name} size={64} />)}
    </Section>
  </main>
}

createRoot(document.getElementById('root')).render(<App />)

const style = document.createElement('style')
style.textContent = `
  * { box-sizing: border-box } body { margin: 0; background: #080820; color: #dddaf5; font: 14px system-ui, sans-serif } main { max-width: 1080px; margin: auto; padding: 26px 22px 50px } h1 { margin: 0; color: #f9ca74; font-family: Georgia, serif; letter-spacing: 1px } p { color: #9b96c8; margin: 6px 0 26px } section { margin: 30px 0 } h2 { color: #c8a4ff; font: 700 16px Georgia, serif; letter-spacing: 1px } .row { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-start } figure { margin: 0; padding: 8px; text-align: center; background: #11113a; border: 1px solid #34346d; border-radius: 12px } figcaption { margin-top: 4px; color: #d8d6ed; font-size: 11px; font-weight: 700 }`
document.head.append(style)
window.__done = true

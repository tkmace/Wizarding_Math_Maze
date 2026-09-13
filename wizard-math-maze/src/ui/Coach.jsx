import { TIPS } from '../game/tips.js'
import { C, sans, serif, btn } from './theme.js'

/**
 * One first-run explanation, over whatever it is explaining.
 *
 * Deliberately a single card with one button. A multi-step tour would be read
 * once, at the wrong moment, by a parent — this turns up while the thing is on
 * screen behind it, says the one thing worth saying, and goes away for good.
 *
 * It sits above the door and encounter overlays (zIndex 90) because those are
 * exactly the moments it explains.
 */
export default function Coach({ id, onClose }) {
  const tip = TIPS[id]
  if (!tip) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 90, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 16,
      background: 'rgba(4,3,18,.72)', backdropFilter: 'blur(3px)',
    }}>
      <div className="appear" style={{
        width: '100%', maxWidth: 380, textAlign: 'center',
        background: C.panel, border: `3px solid ${C.gold}`, borderRadius: 24,
        padding: '20px 20px 18px', boxShadow: `0 0 44px ${C.gold}44`,
      }}>
        <div style={{ fontSize: 42, lineHeight: 1 }}>{tip.icon}</div>
        <h3 style={{
          fontFamily: serif, fontSize: 21, fontWeight: 900, color: C.gold,
          letterSpacing: 1, margin: '8px 0 10px',
        }}>{tip.title}</h3>
        {tip.lines.map((line, i) => (
          <p key={i} style={{
            color: i === 0 ? '#fff' : C.dim, fontSize: i === 0 ? 14.5 : 13,
            lineHeight: 1.65, margin: '0 0 10px', fontFamily: sans,
          }}>{bold(line)}</p>
        ))}
        <button className="bh" onClick={onClose}
          style={btn('gold', { width: '100%', marginTop: 6, fontSize: 16, minHeight: 52 })}>
          {tip.cta}
        </button>
      </div>
    </div>
  )
}

/** **like this** — the few words in each tip that are the actual instruction. */
function bold(line) {
  return line.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2
      ? <strong key={i} style={{ color: C.goldHi }}>{part}</strong>
      : <span key={i}>{part}</span>)
}

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
        {/* Everything up to the last line is the instruction and reads white;
            the last line is the context and steps back. */}
        {tip.lines.map((line, i) => {
          const lead = i < tip.lines.length - 1
          return (
            <p key={i} style={{
              color: lead ? '#fff' : C.dim, fontSize: lead ? 14.5 : 13,
              lineHeight: 1.75, margin: '0 0 9px', fontFamily: sans,
            }}>{bold(line)}</p>
          )
        })}
        <button className="bh" onClick={onClose}
          style={btn('gold', { width: '100%', marginTop: 6, fontSize: 16, minHeight: 52 })}>
          {tip.cta}
        </button>
      </div>
    </div>
  )
}

/**
 * **like this** — the few words in each tip that are the actual instruction —
 * and {left} / {right} / {fwd}, which draw the buttons themselves rather than
 * naming them. A child matching a picture to a button beats a child matching a
 * word to a button, and it keeps the card honest when the buttons change.
 */
function bold(line) {
  return line.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2
      ? <strong key={i} style={{ color: C.goldHi }}>{part}</strong>
      : <span key={i}>{icons(part, i)}</span>)
}

const KEY = { '{left}': 'left', '{right}': 'right', '{fwd}': 'fwd' }

function icons(text, key) {
  return text.split(/(\{left\}|\{right\}|\{fwd\})/g).map((part, i) => {
    const which = KEY[part]
    if (!which) return <span key={i}>{part}</span>
    return (
      <span key={i} style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 30, height: 26, verticalAlign: 'middle', margin: '0 1px',
        borderRadius: 7, border: `1.5px solid ${C.lineHi}`,
        background: 'linear-gradient(180deg,#1b1b52,#12123a)',
      }}>
        {which === 'fwd'
          ? <span style={{ color: C.goldHi, fontSize: 13, lineHeight: 1 }}>▲</span>
          : <TurnGlyph dir={which} />}
      </span>
    )
  })
}

function TurnGlyph({ dir }) {
  const flip = dir === 'right' ? -1 : 1
  return (
    <svg viewBox="0 0 40 40" width="17" height="17" aria-hidden="true" style={{ display: 'block' }}>
      <g transform={`scale(${flip},1) translate(${flip < 0 ? -40 : 0},0)`}
        fill="none" stroke={C.goldHi} strokeWidth="5"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M28 34 L28 16 L14 16" />
        <path d="M20 9 L11 16 L20 23" />
      </g>
    </svg>
  )
}

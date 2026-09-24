import { useState } from 'react'
import { NESTS, nestById } from '../game/nests.js'
import { C, sans, serif, btn } from './theme.js'
import NestCrest from './NestCrest.jsx'

/**
 * Choosing a nest.
 *
 * This is the one choice in the game with no consequences attached: no perk, no
 * points, no difficulty. That's deliberate. Camille's school sorts every child
 * into one of these four, and she already knows which one is hers — the app's
 * job is to recognise it, not to turn it into another thing to optimise. Which
 * is also why it can be changed at any time from the castle: a house you can't
 * change is a punishment, and this isn't one.
 *
 * `current` marks the nest already chosen (if any); `onClose` is omitted on the
 * first run so a new wizard picks one before going in.
 */
export default function NestPicker({ current, onChoose, onClose }) {
  const [sel, setSel] = useState(current || null)
  const chosen = nestById(sel)
  const staying = !!chosen && chosen.id === current

  return (
    <div className="appear scroll" style={{ zIndex: 10, width: '100%', maxWidth: 470, padding: '8px 14px 24px', textAlign: 'center' }}>
      <div className="wf" style={{ fontSize: 40 }}>🪶</div>
      <h2 style={{
        fontFamily: serif, fontSize: 'clamp(22px,6.5vw,30px)', fontWeight: 900, color: C.gold,
        letterSpacing: 1.5, margin: '2px 0 2px', textShadow: `0 0 22px ${C.gold}88`,
      }}>Choose your Nest</h2>
      <p style={{ color: C.dim, fontSize: 13, margin: '0 0 16px', lineHeight: 1.6 }}>
        Every wizard belongs to one of the four nests. Wear its crest with you
        into the maze.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
        {NESTS.map(n => {
          const on = sel === n.id
          return (
            <button key={n.id} className="bh" onClick={() => setSel(n.id)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              padding: '12px 8px 10px', borderRadius: 18, cursor: 'pointer',
              border: `2.5px solid ${on ? n.shield : C.lineHi}`,
              background: on ? `${n.shield}26` : C.panelHi,
              boxShadow: on ? `0 0 26px ${n.shield}55` : 'none',
              WebkitTapHighlightColor: 'transparent',
            }}>
              <NestCrest nest={n} size={on ? 96 : 88} animate={false} />
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 15, fontFamily: sans, lineHeight: 1.2, marginTop: 4 }}>
                {n.name}
              </span>
              <span style={{ color: on ? C.dim : C.faint, fontSize: 10.5, fontStyle: 'italic' }}>
                {n.motto}
              </span>
            </button>
          )
        })}
      </div>

      {chosen && (
        <div style={{
          marginTop: 14, padding: '11px 13px', borderRadius: 14,
          background: '#0a0a2c', border: `1.5px solid ${chosen.shield}66`,
          color: C.dim, fontSize: 12.5, lineHeight: 1.6,
        }}>
          <strong style={{ color: chosen.shield === '#1f6b3f' ? '#6fd79b' : chosen.shield }}>
            {chosen.name}
          </strong>
          {' '}— {chosen.colorName.toLowerCase()}. {chosen.motto}.
          {staying && <span style={{ color: C.gold }}> Your nest already.</span>}
        </div>
      )}

      <button className="bh" onClick={() => chosen && onChoose(chosen.id)} disabled={!chosen}
        style={btn('gold', {
          width: '100%', marginTop: 14, fontSize: 17, minHeight: 54,
          opacity: chosen ? 1 : 0.45, cursor: chosen ? 'pointer' : 'default',
        })}>
        {/* A wizard who comes back to this page and looks at her OWN nest is
            not joining anything — she is deciding whether to stay. Offering
            her "Join the Sea Eagles" when she has been a Sea Eagle all term
            reads as though the choice had been forgotten. */}
        {!chosen ? 'Pick a nest'
          : staying ? `Stay with the ${chosen.name} 🪶`
          : `Join the ${chosen.name} 🪶`}
      </button>

      {onClose && (
        <button className="bh" onClick={onClose} style={btn('ghost', { width: '100%', marginTop: 9, fontSize: 13 })}>
          🏰 Back to the Castle
        </button>
      )}

      <p style={{ color: C.faint, fontSize: 10.5, lineHeight: 1.6, margin: '14px 4px 0' }}>
        Your nest changes nothing about the maze — no extra points, no easier
        sums. It's just yours. You can change it whenever you like.
      </p>
    </div>
  )
}

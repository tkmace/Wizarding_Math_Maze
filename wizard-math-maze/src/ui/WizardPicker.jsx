import { useState } from 'react'
import { WIZARDS } from '../game/wizards.js'
import { formById } from '../game/skins.js'
import { C, sans, serif, btn, panel } from './theme.js'
import Portrait from './Portrait.jsx'

/**
 * Who are you?
 *
 * The first question the castle asks, before the nest and before it takes her
 * measure. It comes first on purpose: a nest is a team you join, and the
 * Attunement is something done to you, but this is the one that is simply hers.
 *
 * Six people rather than a set of sliders. That trade is the whole reason these
 * faces stopped looking generic — each one is drawn for herself — so the screen
 * has to make it feel like meeting six wizards rather than being handed a
 * shorter list of options. Hence the names, the one-line character notes, and a
 * preview big enough to look at properly.
 */
export default function WizardPicker({ profile, form, onChoose, onClose }) {
  const [sel, setSel] = useState(() => profile?.wizard || WIZARDS[0].id)
  const chosen = WIZARDS.find(w => w.id === sel) || WIZARDS[0]
  const robe = form || formById(profile?.equippedSkin)

  // First time through, every face wears its OWN colouring — otherwise all six
  // tiles come out in whatever hair colour she happens to have and the set
  // looks like one person six times, which is the opposite of the point.
  //
  // Coming back later to be someone else, they wear HERS, because then the
  // question really is "which of these faces", and changing her hair colour is
  // not what she came here to do.
  const first = !profile?.wizard
  const asSeen = id => ({ ...profile, wizard: id, appearance: first ? {} : profile.appearance })

  return (
    <div className="appear scroll" style={{ zIndex: 10, width: '100%', maxWidth: 460, padding: '8px 14px 24px' }}>
      {onClose && (
        <button className="bh" onClick={onClose} style={btn('gold', { width: '100%', marginBottom: 12 })}>
          Back to the Castle 🏰
        </button>
      )}

      <h2 style={{
        fontFamily: serif, fontSize: 27, fontWeight: 900, color: C.gold,
        letterSpacing: 1.5, textAlign: 'center', margin: '6px 0 2px',
        textShadow: `0 0 18px ${C.gold}77`,
      }}>Who are you?</h2>
      <p style={{ color: C.dim, fontSize: 13, textAlign: 'center', margin: '0 0 12px', fontFamily: serif, letterSpacing: 1 }}>
        This is you, whatever robes you wear
      </p>

      {/* The preview reads the CHOSEN face; see `asSeen` for whose colours. */}
      <div style={{ textAlign: 'center', marginBottom: 6 }}>
        <div style={{ filter: `drop-shadow(0 0 24px ${robe.trim}55)` }}>
          <Portrait profile={asSeen(chosen.id)} form={robe} size={200} style={{ margin: '0 auto' }} />
        </div>
        <div style={{ fontFamily: serif, fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: 1, marginTop: 2 }}>
          {chosen.name}
        </div>
        <div style={{ color: C.dim, fontSize: 13, fontStyle: 'italic', marginBottom: 12 }}>
          {chosen.blurb}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
        {WIZARDS.map(w => {
          const on = w.id === sel
          return (
            <button
              key={w.id}
              className="bh"
              onClick={() => setSel(w.id)}
              aria-label={w.name}
              aria-pressed={on}
              style={{
                padding: 4, borderRadius: 15, cursor: 'pointer',
                border: `2.5px solid ${on ? C.gold : C.lineHi}`,
                background: on ? `${C.gold}1c` : C.panelHi,
                boxShadow: on ? `0 0 16px ${C.gold}55` : 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {/* Only the big one animates. Six breathing canvases on a phone is
                  a lot of work for a detail nobody can see at this size. */}
              <Portrait profile={asSeen(w.id)} form={robe} size={90} animate={false}
                style={{ margin: '0 auto', borderRadius: 11 }} />
              <span style={{
                display: 'block', textAlign: 'center', marginTop: 2,
                fontFamily: sans, fontSize: 11.5, fontWeight: 900,
                color: on ? '#fff' : C.faint,
              }}>{w.name}</span>
            </button>
          )
        })}
      </div>

      <p style={{ color: C.faint, fontSize: 11.5, textAlign: 'center', margin: '0 0 12px', lineHeight: 1.6 }}>
        {first
          ? 'Next you choose her hair, skin and colours — and you can come back and be someone else any time.'
          : 'You can change your skin, hair and colours any time from My Wizard — and you can come back and be someone else, too.'}
      </p>

      <button className="bh" onClick={() => onChoose(chosen.id)}
        style={btn('gold', { width: '100%', fontSize: 17, minHeight: 56 })}>
        This is me ✦
      </button>
    </div>
  )
}

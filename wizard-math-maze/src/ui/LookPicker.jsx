import { useState } from 'react'
import { SKIN_TONES, HAIR_COLORS, HAIR_STYLES, blankAppearance } from '../game/appearance.js'
import { formById } from '../game/skins.js'
import { C, sans, serif, btn, panel, label } from './theme.js'
import WizardPreview from './WizardPreview.jsx'

/**
 * Choose the wizard's face and hair.
 *
 * This is the half of the character that persists: the form she earns is a
 * costume, this is her. Changes preview live on the currently worn form so she
 * can see the combination she'll actually be playing.
 */
export default function LookPicker({ profile, onSave, onClose }) {
  const [look, setLook] = useState(() => ({ ...blankAppearance(), ...(profile.appearance || {}) }))
  const form = formById(profile.equippedSkin)

  const set = (key, value) => setLook(l => ({ ...l, [key]: value }))

  return (
    <div className="appear scroll" style={{ zIndex: 10, width: '100%', maxWidth: 470, padding: '8px 14px 24px' }}>
      <h2 style={{
        fontFamily: serif, fontSize: 26, fontWeight: 900, color: C.gold,
        letterSpacing: 1.5, textAlign: 'center', margin: '6px 0 2px',
        textShadow: `0 0 18px ${C.gold}77`,
      }}>My Look</h2>
      <p style={{ color: C.dim, fontSize: 13, textAlign: 'center', margin: '0 0 14px', fontFamily: serif, letterSpacing: 1 }}>
        This stays with you through every form
      </p>

      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ filter: `drop-shadow(0 0 22px ${form.trim}66)` }}>
          <WizardPreview form={form} appearance={look} size={190} style={{ margin: '0 auto' }} />
        </div>
        <div style={{ color: form.trim, fontFamily: serif, fontSize: 13, letterSpacing: 2, fontWeight: 900, marginTop: -6 }}>
          {form.title.toUpperCase()}
        </div>
      </div>

      <div style={panel({ padding: '14px 16px', marginBottom: 10 })}>
        <div style={label()}>SKIN</div>
        <Swatches
          items={SKIN_TONES}
          selected={look.skin}
          onPick={i => set('skin', i)}
          colorOf={s => s.hex}
        />
      </div>

      <div style={panel({ padding: '14px 16px', marginBottom: 10 })}>
        <div style={label()}>HAIR COLOUR</div>
        <Swatches
          items={HAIR_COLORS}
          selected={look.hairColor}
          onPick={i => set('hairColor', i)}
          colorOf={s => s.hex}
        />
      </div>

      <div style={panel({ padding: '14px 16px', marginBottom: 14 })}>
        <div style={label()}>HAIR LENGTH</div>
        <div style={{ display: 'grid', gap: 7 }}>
          {HAIR_STYLES.map(h => {
            const on = look.hairStyle === h.id
            return (
              <button key={h.id} className="bh" onClick={() => set('hairStyle', h.id)} style={{
                display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                padding: '10px 12px', borderRadius: 13, cursor: 'pointer', minHeight: 48,
                border: `2px solid ${on ? C.gold : C.lineHi}`,
                background: on ? `${C.gold}1c` : C.panelHi,
                color: on ? '#fff' : C.faint, fontFamily: sans,
              }}>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontWeight: 900, fontSize: 14.5 }}>{h.name}</span>
                  <span style={{ display: 'block', fontSize: 11, color: on ? C.dim : C.faint }}>{h.desc}</span>
                </span>
                {on && <span style={{ color: C.gold, fontSize: 17 }}>✓</span>}
              </button>
            )
          })}
        </div>
      </div>

      <button className="bh" onClick={() => onSave(look)} style={btn('gold', { width: '100%', fontSize: 17, minHeight: 54 })}>
        That's me! ✨
      </button>
      <button className="bh" onClick={onClose} style={btn('ghost', { width: '100%', marginTop: 9, fontSize: 13 })}>
        Cancel
      </button>
    </div>
  )
}

function Swatches({ items, selected, onPick, colorOf }) {
  return (
    <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', justifyContent: 'center' }}>
      {items.map(s => {
        const on = selected === s.id
        return (
          <button key={s.id} className="bh" onClick={() => onPick(s.id)} aria-label={s.name} style={{
            width: 54, height: 54, borderRadius: '50%', cursor: 'pointer',
            background: colorOf(s),
            border: `3px solid ${on ? C.gold : 'transparent'}`,
            boxShadow: on ? `0 0 16px ${C.gold}88` : 'inset 0 0 0 1px rgba(0,0,0,.35)',
            position: 'relative',
            WebkitTapHighlightColor: 'transparent',
          }}>
            {on && (
              <span style={{
                position: 'absolute', inset: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 20, color: '#0c0820', fontWeight: 900,
                textShadow: '0 0 4px rgba(255,255,255,.7)',
              }}>✓</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

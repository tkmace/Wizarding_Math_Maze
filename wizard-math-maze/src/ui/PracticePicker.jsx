import { useState } from 'react'
import { OPS } from '../game/math.js'
import { attuneLength } from '../game/attunement.js'
import { C, sans, serif, btn, panel } from './theme.js'

/**
 * What shall we practise?
 *
 * Its own screen, on the way in, because the order used to be wrong in a way
 * that quietly broke the Attunement: the ceremony arrived the moment she chose
 * a nest, which is BEFORE she had ever seen the practice list, so it ran on
 * the blank profile's `['addition']` and every new wizard was measured at
 * addition alone.
 *
 * Asking here fixes it at the source. The castle then measures exactly what she
 * ticked, and the ceremony itself does not have to ask again.
 *
 * Only addition starts on. A child who has never done division should not have
 * to notice it is switched on and turn it off — the default has to be the
 * smallest true thing, and everything else is hers to add.
 */
export default function PracticePicker({ profile, initial, onDone }) {
  const [picked, setPicked] = useState(() => {
    const from = (initial || []).filter(k => OPS.some(o => o.key === k))
    return from.length ? from : ['addition']
  })
  const ordered = OPS.map(o => o.key).filter(k => picked.includes(k))
  const plan = attuneLength(ordered)

  const toggle = key => setPicked(cur => cur.includes(key)
    // Never all the way off. A wizard with nothing switched on has no maze to
    // walk, and a disabled button with no explanation is worse than a rule.
    ? (cur.length > 1 ? cur.filter(k => k !== key) : cur)
    : [...cur, key])

  return (
    <div className="appear scroll" style={{ zIndex: 10, width: '100%', maxWidth: 420, padding: '8px 14px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 38, lineHeight: 1 }}>🗝️</div>
      <h2 style={{
        fontFamily: serif, fontSize: 25, fontWeight: 900, color: C.gold,
        letterSpacing: 1.2, margin: '6px 0 2px', textShadow: `0 0 18px ${C.gold}77`,
      }}>What shall we practise?</h2>
      <p style={{ color: C.dim, fontSize: 13, fontFamily: serif, letterSpacing: 1, margin: '0 0 16px' }}>
        {profile?.name ? `${profile.name}, pick ` : 'Pick '}the ones you have done before
      </p>

      <div style={panel({ padding: '14px 14px 12px' })}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 9 }}>
          {OPS.map(o => {
            const on = picked.includes(o.key)
            return (
              <button key={o.key} className="bh" onClick={() => toggle(o.key)} style={{
                display: 'flex', alignItems: 'center', gap: 9, padding: '13px 12px',
                borderRadius: 14, cursor: 'pointer', minHeight: 58,
                border: `2.5px solid ${on ? o.color : C.lineHi}`,
                background: on ? `${o.color}22` : C.panelHi,
                boxShadow: on ? `0 0 16px ${o.color}33` : 'none',
                color: on ? '#fff' : C.faint,
                fontWeight: 900, fontSize: 14, fontFamily: sans,
                WebkitTapHighlightColor: 'transparent',
              }}>
                <span style={{ fontSize: 22 }}>{o.icon}</span>
                <span style={{ flex: 1, textAlign: 'left' }}>{o.label}</span>
                {on && <span style={{ color: o.color, fontSize: 14 }}>✓</span>}
              </button>
            )
          })}
        </div>

        <p style={{ color: C.faint, fontSize: 11, lineHeight: 1.6, margin: '12px 2px 0' }}>
          You can change this any time in the castle. Anything you leave off, the
          castle will offer to measure the first time you pick it.
        </p>
      </div>

      <p style={{ color: C.dim, fontSize: 12.5, lineHeight: 1.6, margin: '14px 4px 12px', fontFamily: sans }}>
        Next the castle takes your measure — about{' '}
        <strong style={{ color: C.goldHi }}>{plan.typical} doors</strong>, so every maze
        after it is pitched at you.
      </p>

      <button className="bh" onClick={() => onDone(ordered)}
        style={btn('gold', { width: '100%', fontSize: 17, minHeight: 56 })}>
        Onward ✦
      </button>
    </div>
  )
}

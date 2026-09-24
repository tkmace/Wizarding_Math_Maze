import { OPS, opByKey } from '../game/math.js'
import { attuneLength } from '../game/attunement.js'
import { C, sans, serif, btn, panel } from './theme.js'

/**
 * A Quick Tuning.
 *
 * Offered at the maze door rather than in the castle, because that is the
 * moment it matters: she has just picked an operation the castle has never
 * measured and is about to walk into a maze full of it. A banner on the hub
 * asks the question while she is thinking about something else.
 *
 * Deliberately not called an Attunement. The Attunement is the ceremony — the
 * arrival, the corridor, the verdict, the thing that happens once. This is a
 * dozen doors to find her level in one operation, and calling it by the big
 * name would make it sound like starting again.
 *
 * "Not now" is a real answer and sits right next to the offer. Wizard's Sense
 * finds her either way; it just takes a fortnight instead of a minute.
 */
export default function TuningOffer({ ops, onTune, onSkip }) {
  const plan = attuneLength(ops)
  const names = ops.map(k => opByKey(k).label.toLowerCase())
  const list = names.length === 1 ? names[0]
    : names.slice(0, -1).join(', ') + ' and ' + names.slice(-1)

  return (
    <div className="appear scroll" style={{ zIndex: 10, width: '100%', maxWidth: 400, padding: '8px 14px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 40, lineHeight: 1 }}>✦</div>
      <h2 style={{
        fontFamily: serif, fontSize: 25, fontWeight: 900, color: C.gold,
        letterSpacing: 1.2, margin: '6px 0 2px', textShadow: `0 0 18px ${C.gold}77`,
      }}>A Quick Tuning?</h2>
      <p style={{ color: C.dim, fontSize: 13, fontFamily: serif, letterSpacing: 1, margin: '0 0 14px' }}>
        Something new in the maze today
      </p>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 14 }}>
        {OPS.filter(o => ops.includes(o.key)).map(o => (
          <div key={o.key} style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px',
            borderRadius: 13, border: `2.5px solid ${o.color}`, background: `${o.color}22`,
            color: '#fff', fontWeight: 900, fontSize: 14, fontFamily: sans,
          }}>
            <span style={{ fontSize: 20 }}>{o.icon}</span>{o.label}
          </div>
        ))}
      </div>

      <div style={panel({ padding: '14px 16px', marginBottom: 14, textAlign: 'left' })}>
        <p style={{ color: '#fff', fontSize: 14, lineHeight: 1.7, margin: '0 0 8px', fontFamily: sans }}>
          The castle has never measured your {list}. Give it about{' '}
          <strong style={{ color: C.goldHi }}>{plan.typical} doors</strong> and it will
          know where to pitch them.
        </p>
        <p style={{ color: C.dim, fontSize: 12.5, lineHeight: 1.65, margin: 0, fontFamily: sans }}>
          Without it the maze starts you at the very beginning and works its way
          up, which takes a good while if you are already past that.
        </p>
      </div>

      <button className="bh" onClick={onTune} style={btn('gold', { width: '100%', fontSize: 17, minHeight: 56 })}>
        Quick Tuning ✦
      </button>
      <button className="bh" onClick={onSkip} style={btn('ghost', { width: '100%', marginTop: 9, fontSize: 13 })}>
        Not now — straight to the maze 🗝️
      </button>
    </div>
  )
}

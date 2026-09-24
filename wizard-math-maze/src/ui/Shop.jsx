import { useState } from 'react'
import { TRINKETS, buyTrinketState, ownsTrinket } from '../game/trinkets.js'
import { formById } from '../game/skins.js'
import { C, sans, serif, btn } from './theme.js'
import { Sheet } from './Wardrobe.jsx'
import Portrait from './Portrait.jsx'

/**
 * The Curiosity Shop — the other end of the rune ladder.
 *
 * A robe she passed over costs twenty rune stones at the very cheapest and
 * seven hundred at the top, which is weeks of saving. That left a child who
 * picks up a stone with nothing to feel about it. These cost eight to sixty, so
 * the first one arrives on the same day she learns what a rune is.
 *
 * Every card shows HER, wearing the thing, rather than an icon of it. That is
 * the entire sales pitch and it costs nothing to make — the portrait renderer
 * already draws whatever is passed to it, so the preview is the real article
 * and not a promise about one.
 */
/**
 * Where to point the camera for each curio.
 *
 * A pendant sits at the throat and a circlet on the brow, and at thumbnail size
 * the two are a handful of pixels apart on a face that is itself only eighty
 * pixels tall. So every card frames the part of her the thing actually touches:
 * the brow ones crop to the forehead, the floating ones pull back far enough to
 * hold the air beside her.
 */
const FRAME = {
  pendant:    { rFrac: 0.34, cyFrac: -0.10 },
  circlet:    { rFrac: 0.46, cyFrac: 0.70 },
  spectacles: { rFrac: 0.48, cyFrac: 0.50 },
  // The three that float or are held need the whole figure in shot, so they
  // keep the standard framing.
  moth:       { rFrac: 0.26, cyFrac: 0.46 },
  crystal:    { rFrac: 0.26, cyFrac: 0.46 },
  wand:       { rFrac: 0.26, cyFrac: 0.46 },
}

export default function Shop({ profile, onBuy, onWear, onClose }) {
  const runes = profile.stones || 0
  const worn = profile.wearing || []
  const form = formById(profile.equippedSkin)
  const owned = TRINKETS.filter(t => ownsTrinket(profile, t.id))
  const [pending, setPending] = useState(null)      // id awaiting confirmation

  return (
    <Sheet
      title="The Curiosity Shop"
      subtitle={`${owned.length} of ${TRINKETS.length} curios · 🔮 ${runes} rune${runes === 1 ? '' : 's'}`}
      onClose={onClose}
      closeLabel="Back to the Wardrobe 🧥"
    >
      <div style={{ display: 'grid', gap: 10 }}>
        {TRINKETS.map(tr => {
          const b = buyTrinketState(profile, tr)
          const has = !!b.own
          const on = worn.includes(tr.id)
          const asking = pending === tr.id
          return (
            <div key={tr.id} style={{
              display: 'flex', gap: 11, alignItems: 'center',
              padding: 8, borderRadius: 15,
              border: `2px solid ${on ? C.gold : has ? C.lineHi : C.line}`,
              background: on ? `${C.gold}14` : C.panelHi,
              opacity: has || b.can ? 1 : 0.72,
            }}>
              {/* Her, wearing it. Still, not animated: six breathing canvases
                  on a phone is a lot of work for a detail this size. */}
              <Portrait
                // Lent for the picture. `wornTrinkets` only draws what she
                // owns — quite right everywhere else, and exactly wrong in a
                // shop, where it left six identical thumbnails of a girl
                // wearing nothing she was being offered.
                profile={{ ...profile, trinkets: [tr.id], wearing: [tr.id] }}
                form={form} size={84} animate={false}
                rFrac={FRAME[tr.id]?.rFrac} cyFrac={FRAME[tr.id]?.cyFrac}
                style={{ borderRadius: 12, flex: '0 0 auto' }}
              />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: serif, fontSize: 15, fontWeight: 900, color: has ? '#fff' : C.dim }}>
                  {tr.emoji} {tr.name}
                </div>
                <div style={{ color: C.faint, fontSize: 11, fontStyle: 'italic', lineHeight: 1.35, marginTop: 1 }}>
                  {tr.blurb}
                </div>

                {has ? (
                  <button className="bh" onClick={() => onWear(tr.id, !on)} style={{
                    marginTop: 6, padding: '5px 12px', borderRadius: 10,
                    border: `1.5px solid ${on ? C.gold : C.lineHi}`,
                    background: on ? `${C.gold}26` : 'transparent',
                    color: on ? C.gold : C.dim,
                    fontFamily: sans, fontWeight: 900, fontSize: 11, letterSpacing: 0.5,
                    cursor: 'pointer',
                  }}>{on ? '✦ WEARING' : 'WEAR IT'}</button>
                ) : asking ? (
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <button className="bh" onClick={() => { setPending(null); onBuy(tr.id) }}
                      style={btn('gold', { padding: '5px 12px', fontSize: 11, minHeight: 0, flex: 1 })}>
                      Yes — 🔮{b.cost}
                    </button>
                    <button className="bh" onClick={() => setPending(null)}
                      style={btn('ghost', { padding: '5px 12px', fontSize: 11, minHeight: 0 })}>
                      Not yet
                    </button>
                  </div>
                ) : b.can ? (
                  <button className="bh" onClick={() => setPending(tr.id)} style={{
                    marginTop: 6, padding: '5px 14px', borderRadius: 10,
                    border: `1.5px solid ${C.teal}`, background: `${C.teal}22`, color: C.teal,
                    fontFamily: serif, fontWeight: 900, fontSize: 12, letterSpacing: 0.5,
                    cursor: 'pointer',
                  }}>BUY 🔮{tr.cost}</button>
                ) : (
                  <div style={{ marginTop: 6 }}>
                    <span style={{ color: C.teal, fontSize: 12, fontWeight: 900 }}>🔮 {tr.cost}</span>
                    <span style={{ color: C.faint, fontSize: 10.5, marginLeft: 7 }}>
                      save {b.short} more
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        <p style={{ color: C.faint, fontSize: 10.5, lineHeight: 1.6, margin: '2px 2px 0' }}>
          Curios are yours for good once bought, and you can wear as many at once
          as you like — each one has its own place. None of them makes the maths
          easier; they are just yours.
        </p>
      </div>
    </Sheet>
  )
}

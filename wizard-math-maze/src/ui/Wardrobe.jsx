import { RANKS, FORMS, formsAtRank, formById, rankFor, runeCost, buyState, ownedIds } from '../game/skins.js'
import { C, sans, serif, btn, panel } from './theme.js'
import WizardPreview from './WizardPreview.jsx'

/**
 * The whole ladder, laid out from here to the top. Ranks she hasn't reached are
 * shown greyed with their point cost rather than hidden, because the point of a
 * wardrobe in a game like this is to show what's worth playing for.
 *
 * The form she picked at a rank is free and permanent. The two she passed over
 * are still hers to chase — with rune stones rather than points, and always
 * later than the free choice was (see runeCost in game/skins.js).
 */
export default function Wardrobe({ profile, onEquip, onBuy, onShop, onClose }) {
  const reached = rankFor(profile.totalPoints).rank
  const chosen = profile.chosen || {}
  const worn = profile.equippedSkin
  const owned = ownedIds(profile)
  const runes = profile.stones || 0

  return (
    <Sheet
      title="The Wardrobe"
      subtitle={`${owned.length} of ${FORMS.length} robes · Current inventory: 🔮 ${runes} rune${runes === 1 ? '' : 's'}`}
      onClose={onClose}
    >
      <div style={{ display: 'grid', gap: 14 }}>
        {/* The other place runes go. Up here rather than at the foot of the
            page, because the wardrobe is long and a shop nobody scrolls to is
            a shop nobody visits. */}
        {onShop && (
          <button className="bh" onClick={onShop} style={{
            width: '100%', padding: '11px 12px', borderRadius: 14,
            border: `2px solid ${C.teal}`, background: `${C.teal}1c`,
            color: C.teal, fontFamily: serif, fontWeight: 900, fontSize: 15,
            letterSpacing: 0.5, cursor: 'pointer', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: 9,
          }}>
            <span style={{ fontSize: 20 }}>🛍️</span>
            <span style={{ flex: 1 }}>
              The Curiosity Shop
              <span style={{ display: 'block', color: C.faint, fontSize: 10.5, fontWeight: 400, fontFamily: sans, letterSpacing: 0 }}>
                Wands, pendants and stranger things — from 🔮 8
              </span>
            </span>
            <span style={{ fontSize: 16 }}>›</span>
          </button>
        )}

        {RANKS.map(r => {
          const forms = r.rank === 0 ? [formById('apprentice')] : formsAtRank(r.rank)
          const pickedId = r.rank === 0 ? 'apprentice' : chosen[r.rank]
          const locked = r.rank > reached
          const undecided = !locked && !pickedId && r.rank > 0

          return (
            <div key={r.rank}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 6 }}>
                <span style={{ fontFamily: serif, fontSize: 13.5, letterSpacing: 2, fontWeight: 900, color: locked ? C.faint : C.gold }}>
                  {r.name.toUpperCase()}
                </span>
                <span style={{ fontSize: 11, color: C.faint }}>
                  {r.threshold === 0 ? 'where every wizard starts' : `Unlocks at ${r.threshold.toLocaleString()} points`}
                </span>
                {locked && <span style={{ fontSize: 10, color: C.faint, marginLeft: 'auto' }}>🔒 locked</span>}
                {undecided && <span style={{ fontSize: 10, color: C.bad, fontWeight: 900, marginLeft: 'auto' }}>choose one!</span>}
                {!locked && !undecided && r.rank > 0 && (
                  <span style={{ fontSize: 10, color: C.teal, marginLeft: 'auto' }}>
                    others 🔮 {runeCost(r.rank)}
                  </span>
                )}
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3,1fr)',
                justifyItems: 'stretch',
                gap: 6,
              }}>
                {forms.map(f => {
                  const isPicked = pickedId === f.id
                  const isWorn = worn === f.id
                  const isOwned = owned.includes(f.id)
                  const b = buyState(profile, f)
                  const dim = !isOwned && !b.can

                  return (
                    <div key={f.id} data-form={f.id} style={{
                      borderRadius: 14, padding: '8px 4px 8px', textAlign: 'center',
                      border: `2px solid ${isWorn ? f.trim : b.can ? C.teal : isOwned ? C.lineHi : C.line}`,
                      background: isWorn ? `${f.robe}2a` : dim ? '#09091f' : C.panelHi,
                      opacity: dim ? 0.52 : 1,
                      position: 'relative',
                    }}>
                      <WizardPreview profile={profile} form={f} size={86} animate={isWorn} greyscale={dim} style={{ margin: '0 auto' }} />
                      <div style={{
                        color: dim ? C.faint : '#fff', fontWeight: 900, fontSize: 11.5,
                        fontFamily: sans, lineHeight: 1.25, marginTop: 3, minHeight: 26,
                      }}>{f.title}</div>
                      <div style={{ color: dim ? C.faint : f.trim, fontSize: 8.5, fontWeight: 900, lineHeight: 1.3, minHeight: 22 }}>
                        {f.perk?.label}
                      </div>

                      {isWorn && (
                        <div style={{ marginTop: 4, color: f.trim, fontFamily: serif, fontSize: 9.5, fontWeight: 900, letterSpacing: 1 }}>
                          ✦ WORN
                        </div>
                      )}

                      {!isWorn && isOwned && (
                        <button className="bh" onClick={() => onEquip(f.id)} style={{
                          marginTop: 4, width: '100%', padding: '6px 0', borderRadius: 9,
                          border: 'none', background: `linear-gradient(135deg,${f.trim},${f.robe})`,
                          color: '#14102a', fontFamily: serif, fontWeight: 900,
                          fontSize: 9.5, letterSpacing: 1, cursor: 'pointer',
                        }}>WEAR</button>
                      )}

                      {/* Not hers yet: either a buy button, or why not. */}
                      {!isOwned && b.can && (
                        <button className="bh" onClick={() => onBuy(f.id)} style={{
                          marginTop: 4, width: '100%', padding: '6px 0', borderRadius: 9,
                          border: `1.5px solid ${C.teal}`, background: `${C.teal}22`,
                          color: C.teal, fontFamily: serif, fontWeight: 900,
                          fontSize: 9.5, letterSpacing: 0.5, cursor: 'pointer',
                        }}>BUY 🔮{b.cost}</button>
                      )}
                      {!isOwned && b.blocked === 'runes' && (
                        <div style={{ marginTop: 4 }}>
                          <div style={{ color: C.teal, fontSize: 10, fontWeight: 900 }}>🔮 {b.cost}</div>
                          <div style={{ color: C.faint, fontSize: 8.5 }}>save {b.short} more</div>
                        </div>
                      )}
                      {!isOwned && b.blocked === 'choose' && (
                        <div style={{ marginTop: 4, color: C.faint, fontSize: 9, lineHeight: 1.3 }}>
                          choose first
                        </div>
                      )}
                      {!isOwned && b.blocked === 'rank' && (
                        <div style={{ marginTop: 4, color: C.faint, fontSize: 9, letterSpacing: 0.5 }}>
                          🔒 locked
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        <p style={{ color: C.faint, fontSize: 10.5, lineHeight: 1.6, margin: '2px 2px 0' }}>
          🔮 Rune stones are found in the mazes and dropped by creatures. Spend
          them on a hint at a door — or save them up and buy robes you passed
          over. The one you chose at each rank is always free.
        </p>
      </div>
    </Sheet>
  )
}

/**
 * Shared full-screen sheet used by the wardrobe, report and scroll panels.
 *
 * The way out lives at the TOP: these sheets are long and scrolling to the
 * bottom to get home is a chore on a phone. A copy stays at the bottom so
 * whoever HAS scrolled all the way down doesn't have to scroll back up.
 */
export function Sheet({ title, subtitle, onClose, children, closeLabel = 'Back to the Castle 🏰' }) {
  return (
    <div className="appear scroll" style={{ zIndex: 10, width: '100%', maxWidth: 470, padding: '8px 14px 24px' }}>
      <button className="bh" onClick={onClose} style={btn('gold', { width: '100%', marginBottom: 12 })}>
        {closeLabel}
      </button>
      <h2 style={{
        fontFamily: serif, fontSize: 26, fontWeight: 900, color: C.gold,
        letterSpacing: 1.5, textAlign: 'center', margin: '6px 0 2px',
        textShadow: `0 0 18px ${C.gold}77`,
      }}>{title}</h2>
      {subtitle && <p style={{ color: C.dim, fontSize: 13, textAlign: 'center', margin: '0 0 16px', fontFamily: serif, letterSpacing: 1 }}>{subtitle}</p>}
      <div style={panel({ padding: '14px 13px' })}>{children}</div>
      <button className="bh" onClick={onClose} style={btn('ghost', { width: '100%', marginTop: 12, fontSize: 13 })}>
        {closeLabel}
      </button>
    </div>
  )
}

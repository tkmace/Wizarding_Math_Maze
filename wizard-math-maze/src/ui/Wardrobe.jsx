import { RANKS, FORMS, formsAtRank, formById, rankFor } from '../game/skins.js'
import { C, sans, serif, btn, panel } from './theme.js'
import WizardPreview from './WizardPreview.jsx'

/**
 * The whole ladder, laid out from here to the top. Ranks she hasn't reached are
 * shown greyed with their point cost rather than hidden, because the point of a
 * wardrobe in a game like this is to show what's worth playing for.
 */
export default function Wardrobe({ profile, onEquip, onClose }) {
  const reached = rankFor(profile.totalPoints).rank
  const chosen = profile.chosen || {}
  const worn = profile.equippedSkin

  return (
    <Sheet
      title="The Wardrobe"
      subtitle={`${Object.keys(chosen).length + 1} of ${FORMS.length} forms · ${profile.totalPoints.toLocaleString()} pts`}
      onClose={onClose}
    >
      <div style={{ display: 'grid', gap: 14 }}>
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
                  {r.threshold === 0 ? 'start' : `${r.threshold.toLocaleString()} pts`}
                </span>
                {locked && <span style={{ fontSize: 10, color: C.faint, marginLeft: 'auto' }}>🔒 locked</span>}
                {undecided && <span style={{ fontSize: 10, color: C.bad, fontWeight: 900, marginLeft: 'auto' }}>choose one!</span>}
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${Math.min(3, forms.length)},1fr)`,
                gap: 7,
              }}>
                {forms.map(f => {
                  const isPicked = pickedId === f.id
                  const isWorn = worn === f.id
                  // Not chosen at a rank she's already decided = sealed for ever.
                  const sealed = !locked && pickedId && !isPicked
                  const dim = locked || sealed

                  return (
                    <div key={f.id} style={{
                      borderRadius: 14, padding: '9px 6px 8px', textAlign: 'center',
                      border: `2px solid ${isWorn ? f.trim : isPicked ? C.lineHi : C.line}`,
                      background: isWorn ? `${f.robe}2a` : dim ? '#09091f' : C.panelHi,
                      opacity: dim ? 0.42 : 1,
                      position: 'relative',
                    }}>
                      <WizardPreview form={f} appearance={profile.appearance} size={64} animate={isWorn} greyscale={dim} />
                      <div style={{
                        color: dim ? C.faint : '#fff', fontWeight: 900, fontSize: 11.5,
                        fontFamily: sans, lineHeight: 1.25, marginTop: 3, minHeight: 26,
                      }}>{f.title}</div>
                      <div style={{ color: dim ? C.faint : f.trim, fontSize: 8.5, fontWeight: 900, lineHeight: 1.3, minHeight: 22 }}>
                        {f.perk?.label}
                      </div>

                      {isPicked && !isWorn && (
                        <button className="bh" onClick={() => onEquip(f.id)} style={{
                          marginTop: 4, width: '100%', padding: '6px 0', borderRadius: 9,
                          border: 'none', background: `linear-gradient(135deg,${f.trim},${f.robe})`,
                          color: '#14102a', fontFamily: serif, fontWeight: 900,
                          fontSize: 9.5, letterSpacing: 1, cursor: 'pointer',
                        }}>WEAR</button>
                      )}
                      {isWorn && (
                        <div style={{ marginTop: 4, color: f.trim, fontFamily: serif, fontSize: 9.5, fontWeight: 900, letterSpacing: 1 }}>
                          ✦ WORN
                        </div>
                      )}
                      {sealed && (
                        <div style={{ marginTop: 4, color: C.faint, fontSize: 9, letterSpacing: 0.5 }}>
                          not chosen
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </Sheet>
  )
}

/** Shared full-screen sheet used by the wardrobe, report and scroll panels. */
export function Sheet({ title, subtitle, onClose, children, closeLabel = 'Back to the Castle 🏰' }) {
  return (
    <div className="appear scroll" style={{ zIndex: 10, width: '100%', maxWidth: 470, padding: '8px 14px 24px' }}>
      <h2 style={{
        fontFamily: serif, fontSize: 26, fontWeight: 900, color: C.gold,
        letterSpacing: 1.5, textAlign: 'center', margin: '6px 0 2px',
        textShadow: `0 0 18px ${C.gold}77`,
      }}>{title}</h2>
      {subtitle && <p style={{ color: C.dim, fontSize: 13, textAlign: 'center', margin: '0 0 16px', fontFamily: serif, letterSpacing: 1 }}>{subtitle}</p>}
      <div style={panel({ padding: '14px 13px' })}>{children}</div>
      <button className="bh" onClick={onClose} style={btn('gold', { width: '100%', marginTop: 14 })}>{closeLabel}</button>
    </div>
  )
}

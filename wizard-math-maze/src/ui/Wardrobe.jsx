import { ALL_SKINS } from '../game/skins.js'
import { C, sans, serif, btn, panel } from './theme.js'

export default function Wardrobe({ profile, onEquip, onClose }) {
  return (
    <Sheet title="The Wardrobe" subtitle="Earn points to unlock new forms" onClose={onClose}>
      <div style={{ display: 'grid', gap: 9 }}>
        {ALL_SKINS.map(s => {
          const unlocked = profile.totalPoints >= s.threshold
          const equipped = profile.equippedSkin === s.id
          return (
            <div key={s.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px',
              borderRadius: 15,
              border: `2px solid ${equipped ? s.color : unlocked ? C.lineHi : C.line}`,
              background: equipped ? `${s.color}18` : C.panelHi,
              opacity: unlocked ? 1 : 0.5,
            }}>
              <span style={{ fontSize: 34, filter: unlocked ? `drop-shadow(0 0 9px ${s.color})` : 'grayscale(1)' }}>
                {unlocked ? s.emoji : '🔒'}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', color: unlocked ? '#fff' : C.faint, fontWeight: 900, fontSize: 15, fontFamily: sans }}>
                  {s.title} {s.wand}
                </span>
                <span style={{ display: 'block', color: C.dim, fontSize: 10.5, marginTop: 1 }}>
                  {unlocked ? s.desc : `Unlocks at ${s.threshold.toLocaleString()} points`}
                </span>
              </span>
              {unlocked && (
                <button className="bh" onClick={() => onEquip(s.id)} disabled={equipped} style={{
                  padding: '8px 12px', borderRadius: 10, border: 'none', minHeight: 40,
                  background: equipped ? 'transparent' : `linear-gradient(135deg,${s.color},${s.glow})`,
                  color: equipped ? s.color : '#14102a',
                  fontWeight: 900, fontSize: 11, fontFamily: serif, letterSpacing: 1,
                  cursor: equipped ? 'default' : 'pointer',
                }}>{equipped ? 'WORN' : 'WEAR'}</button>
              )}
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
        fontFamily: serif, fontSize: 24, fontWeight: 900, color: C.gold,
        letterSpacing: 1.5, textAlign: 'center', margin: '6px 0 2px',
        textShadow: `0 0 18px ${C.gold}77`,
      }}>{title}</h2>
      {subtitle && <p style={{ color: C.dim, fontSize: 11.5, textAlign: 'center', margin: '0 0 16px', fontFamily: serif, letterSpacing: 1 }}>{subtitle}</p>}
      <div style={panel({ padding: '14px 13px' })}>{children}</div>
      <button className="bh" onClick={onClose} style={btn('gold', { width: '100%', marginTop: 14 })}>{closeLabel}</button>
    </div>
  )
}

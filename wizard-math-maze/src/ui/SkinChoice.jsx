import { useState } from 'react'
import { formsAtRank, rankInfo } from '../game/skins.js'
import { C, sans, serif, btn } from './theme.js'
import WizardPreview from './WizardPreview.jsx'

/**
 * The rank-up moment: three forms, pick one, and the other two are sealed at
 * this rank for good. That permanence is what makes it a decision rather than a
 * menu — so the three always differ in what their magic actually does, not just
 * in colour.
 */
export default function SkinChoice({ rank, appearance, onChoose }) {
  const forms = formsAtRank(rank)
  const info = rankInfo(rank)
  const [sel, setSel] = useState(null)
  const [confirming, setConfirming] = useState(false)

  const chosen = forms.find(f => f.id === sel)

  return (
    <div className="appear scroll" style={{ zIndex: 10, width: '100%', maxWidth: 470, padding: '8px 14px 24px', textAlign: 'center' }}>
      <div className="wf" style={{ fontSize: 44 }}>✨</div>
      <div style={{ fontFamily: serif, fontSize: 13.5, letterSpacing: 2.5, color: C.dim, fontWeight: 900 }}>
        RANK {rank} REACHED
      </div>
      <h2 style={{
        fontFamily: serif, fontSize: 'clamp(22px,6vw,30px)', fontWeight: 900, color: C.gold,
        letterSpacing: 1.5, margin: '2px 0 4px', textShadow: `0 0 22px ${C.gold}88`,
      }}>{info.name}</h2>
      <p style={{ color: C.dim, fontSize: 13, margin: '0 0 16px', lineHeight: 1.6 }}>
        Choose the form you will take. The other two stay sealed at this rank —
        choose the magic you want, not just the robe you like.
      </p>

      <div style={{ display: 'grid', gap: 10 }}>
        {forms.map(f => {
          const on = sel === f.id
          return (
            <button key={f.id} className="bh" onClick={() => setSel(f.id)} style={{
              display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
              padding: '10px 12px', borderRadius: 16, cursor: 'pointer',
              border: `2px solid ${on ? f.trim : C.lineHi}`,
              background: on ? `${f.robe}33` : C.panelHi,
              boxShadow: on ? `0 0 22px ${f.trim}44` : 'none',
            }}>
              <WizardPreview form={f} appearance={appearance} size={78} animate={on} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', color: '#fff', fontWeight: 900, fontSize: 17.5, fontFamily: sans }}>
                  {f.title}
                </span>
                <span style={{ display: 'block', color: C.dim, fontSize: 12, fontStyle: 'italic', margin: '2px 0 5px' }}>
                  {f.blurb}
                </span>
                <span style={{
                  display: 'inline-block', padding: '3px 8px', borderRadius: 8,
                  background: `${f.trim}22`, border: `1px solid ${f.trim}66`,
                  color: f.trim, fontSize: 12, fontWeight: 900,
                }}>{f.perk?.label}</span>
              </span>
              {on && <span style={{ color: f.trim, fontSize: 20 }}>✓</span>}
            </button>
          )
        })}
      </div>

      {chosen && (
        <div style={{
          marginTop: 12, padding: '11px 13px', borderRadius: 14,
          background: '#0a0a2c', border: `1.5px solid ${chosen.trim}55`,
          color: C.dim, fontSize: 12, lineHeight: 1.6, textAlign: 'left',
        }}>
          <strong style={{ color: chosen.trim }}>{chosen.perk?.label}</strong> — {chosen.perk?.desc}
        </div>
      )}

      {!confirming ? (
        <button className="bh" onClick={() => chosen && setConfirming(true)} disabled={!chosen}
          style={btn('gold', {
            width: '100%', marginTop: 14, fontSize: 17, minHeight: 54,
            opacity: chosen ? 1 : 0.45, cursor: chosen ? 'pointer' : 'default',
          })}>
          {chosen ? `Become the ${chosen.title}` : 'Choose a form'}
        </button>
      ) : (
        <div style={{ marginTop: 14 }}>
          <div style={{ color: C.gold, fontSize: 12, fontWeight: 900, marginBottom: 9 }}>
            Sure? The other two forms at this rank will be sealed for good.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button className="bh" onClick={() => setConfirming(false)} style={btn('ghost', { fontSize: 13 })}>
              Let me look again
            </button>
            <button className="bh" onClick={() => onChoose(chosen.id)} style={btn('gold', { fontSize: 13 })}>
              Yes — become it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

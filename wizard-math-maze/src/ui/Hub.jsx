import { OPS, DIFFS, SENSE, senseTier, skillOf } from '../game/math.js'
import { formById, rankFor, nextRank, rankProgress, activePerks } from '../game/skins.js'
import { C, sans, serif, btn, panel, label } from './theme.js'
import WizardPreview from './WizardPreview.jsx'

/** The castle: choose what to practice, see your rank, head into a maze. */
export default function Hub({ profile, ops, diff, onToggleOp, onSetDiff, onStart, onWardrobe, onReport, onScroll, onLook, onLogout, pendingPicks }) {
  const form = formById(profile.equippedSkin)
  const rank = rankFor(profile.totalPoints)
  const next = nextRank(profile.totalPoints)
  const pct = rankProgress(profile.totalPoints)
  const perks = activePerks(profile)

  return (
    <div className="appear scroll" style={{ zIndex: 10, width: '100%', maxWidth: 470, padding: '8px 14px 24px' }}>
      {/* Wizard + rank */}
      <div style={{ textAlign: 'center', marginBottom: 10 }}>
        <div className="wf" style={{ filter: `drop-shadow(0 0 26px ${form.trim}88)` }}>
          <WizardPreview form={form} appearance={profile.appearance} size={168} style={{ margin: '0 auto' }} />
        </div>
        <div style={{ color: '#fff', fontWeight: 900, fontSize: 22, fontFamily: sans, marginTop: -6 }}>{profile.name}</div>
        <div style={{ color: form.trim, fontFamily: serif, fontSize: 14, letterSpacing: 2, fontWeight: 900 }}>
          {form.title.toUpperCase()}
        </div>
        {perks.form.perk?.label && perks.form.perk.label !== 'A steady beginning' && (
          <div style={{ color: C.dim, fontSize: 12, marginTop: 3 }}>✦ {perks.form.perk.label}</div>
        )}
      </div>

      {/* Points + next rank */}
      <div style={panel({ padding: '14px 16px', marginBottom: 12 })}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <span style={{ color: C.gold, fontWeight: 900, fontSize: 26, fontFamily: sans }}>
            {profile.totalPoints.toLocaleString()}
            <span style={{ fontSize: 11, color: C.faint, marginLeft: 5, letterSpacing: 1 }}>PTS</span>
          </span>
          <span style={{ color: C.teal, fontSize: 13, fontWeight: 900 }}>🔮 {profile.stones || 0}</span>
        </div>
        <div style={{ height: 9, background: '#0a0a2c', borderRadius: 9, overflow: 'hidden', border: `1px solid ${C.line}` }}>
          <div style={{
            height: '100%', width: `${pct * 100}%`, borderRadius: 9,
            background: `linear-gradient(90deg,${form.robe},${form.trim})`,
            boxShadow: `0 0 12px ${form.trim}99`, transition: 'width .5s ease-out',
          }} />
        </div>
        <div style={{ color: C.faint, fontSize: 10, marginTop: 6 }}>
          {next
            ? `${(next.threshold - profile.totalPoints).toLocaleString()} points to ${next.name} — 3 new forms to choose from`
            : `${rank.name} — every form unlocked. ☄️`}
        </div>
      </div>

      {/* Into the maze — the thing she came here to press. */}
      <button className="bh" onClick={onStart} style={btn('gold', { width: '100%', fontSize: 19, minHeight: 58 })}>
        Enter the Maze! 🗝️
      </button>

      {/* Wardrobe + look */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, margin: '10px 0 14px' }}>
        <button className="bh" onClick={onWardrobe} style={btn('ghost', { fontSize: 13, position: 'relative' })}>
          🧥 Wardrobe
          {pendingPicks > 0 && <span style={{
            position: 'absolute', top: -5, right: -5, minWidth: 17, height: 17, borderRadius: 9,
            background: C.bad, border: `2px solid ${C.bg}`, color: '#fff',
            fontSize: 10, fontWeight: 900, lineHeight: '13px',
          }}>{pendingPicks}</span>}
        </button>
        <button className="bh" onClick={onLook} style={btn('ghost', { fontSize: 13 })}>🪞 My Look</button>
      </div>

      {/* Operations */}
      <div style={panel({ padding: '14px 16px', marginBottom: 12 })}>
        <div style={label()}>WHAT SHALL WE PRACTICE?</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
          {OPS.map(o => {
            const on = ops.has(o.key)
            const band = diff === SENSE ? senseTier(skillOf(profile, o.key), o.key) : null
            return (
              <button key={o.key} className="bh" onClick={() => onToggleOp(o.key)} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 11px',
                borderRadius: 13, cursor: 'pointer', minHeight: 50,
                border: `2px solid ${on ? o.color : C.lineHi}`,
                background: on ? `${o.color}1f` : C.panelHi,
                boxShadow: on ? `0 0 16px ${o.color}33` : 'none',
                color: on ? '#fff' : C.faint,
                fontWeight: 900, fontSize: 13, fontFamily: sans,
              }}>
                <span style={{ fontSize: 19 }}>{o.icon}</span>
                <span style={{ flex: 1, textAlign: 'left' }}>
                  {o.label}
                  {on && band && (
                    <span style={{ display: 'block', fontSize: 9, color: C.dim, fontWeight: 800, letterSpacing: 0.5 }}>
                      up to {band.ranges[o.short][1]}
                    </span>
                  )}
                </span>
                {on && <span style={{ color: o.color, fontSize: 13 }}>✓</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Difficulty */}
      <div style={panel({ padding: '14px 16px', marginBottom: 14 })}>
        <div style={label()}>HOW BRAVE ARE YOU?</div>
        <div style={{ display: 'grid', gap: 7 }}>
          {DIFFS.map(d => {
            const on = d.key === diff
            return (
              <button key={d.key} className="bh" onClick={() => onSetDiff(d.key)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 13, cursor: 'pointer', minHeight: 48, textAlign: 'left',
                border: `2px solid ${on ? d.color : C.lineHi}`,
                background: on ? `${d.color}1c` : C.panelHi,
                color: on ? '#fff' : C.faint, fontFamily: sans,
              }}>
                <span style={{ fontSize: 18 }}>{d.icon}</span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontWeight: 900, fontSize: 14 }}>
                    {d.label}
                    {d.adaptive && <span style={{ color: C.gold, fontSize: 9, marginLeft: 6, letterSpacing: 1 }}>RECOMMENDED</span>}
                  </span>
                  <span style={{ display: 'block', fontSize: 10, color: on ? C.dim : C.faint }}>{d.desc}</span>
                </span>
                {!d.adaptive && <span style={{ color: d.color, fontSize: 10, fontWeight: 900 }}>×{d.mult}</span>}
              </button>
            )
          })}
        </div>
        {diff === SENSE && (
          <p style={{ color: C.faint, fontSize: 10, marginTop: 9, lineHeight: 1.6 }}>
            Each operation adjusts on its own — get quicker and the numbers grow,
            struggle and they ease back. Points scale with the difficulty it picks.
          </p>
        )}
      </div>

      <button className="bh" onClick={onReport} style={btn('ghost', { width: '100%', fontSize: 13 })}>
        📊 My Progress
      </button>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 16 }}>
        <button onClick={onScroll} style={linkStyle}>📜 Wizard Scroll</button>
        <button onClick={onLogout} style={linkStyle}>↩ Switch wizard</button>
      </div>
    </div>
  )
}

const linkStyle = {
  background: 'none', border: 'none', color: C.faint,
  fontSize: 11, cursor: 'pointer', textDecoration: 'underline', padding: 4,
}

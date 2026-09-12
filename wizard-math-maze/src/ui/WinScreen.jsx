import { rankFor, rankInfo, formsAtRank } from '../game/skins.js'
import { C, sans, serif, btn, panel } from './theme.js'

export default function WinScreen({ profile, run, onAgain, onCastle, newRank, form }) {
  const rank = rankFor(profile.totalPoints)
  const acc = run.answered ? Math.round((run.correct / run.answered) * 100) : 100

  return (
    <div className="appear" style={{ zIndex: 10, width: '100%', maxWidth: 430, padding: '0 14px', textAlign: 'center' }}>
      <div className="wf" style={{ fontSize: 78, filter: `drop-shadow(0 0 28px ${C.gold})` }}>🏆</div>
      <h2 style={{
        fontFamily: serif, fontSize: 'clamp(22px,6vw,32px)', fontWeight: 900, color: C.gold,
        letterSpacing: 2, textShadow: `0 0 24px ${C.gold}aa`, margin: '4px 0 16px',
      }}>Maze Conquered!</h2>

      {newRank != null && (
        <div className="pulseRing" style={{
          ...panel({ padding: '14px 16px', marginBottom: 12, borderColor: C.gold }),
        }}>
          <div style={{ fontSize: 34 }}>✨</div>
          <div style={{ color: C.gold, fontFamily: serif, fontSize: 12, letterSpacing: 2, fontWeight: 900, marginTop: 4 }}>
            RANK {newRank} — {rankInfo(newRank).name.toUpperCase()}
          </div>
          <div style={{ color: '#fff', fontWeight: 900, fontSize: 15, fontFamily: sans, marginTop: 2 }}>
            {formsAtRank(newRank).length} new forms to choose from
          </div>
          <div style={{ color: C.dim, fontSize: 11, marginTop: 4 }}>Pick one — the others seal for good.</div>
        </div>
      )}

      <div style={panel({ padding: '16px', marginBottom: 14 })}>
        <div style={{ color: C.gold, fontSize: 40, fontWeight: 900, fontFamily: sans, lineHeight: 1 }}>
          +{run.points.toLocaleString()}
        </div>
        <div style={{ color: C.faint, fontSize: 10, letterSpacing: 2, fontFamily: serif, marginBottom: 14 }}>POINTS EARNED</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          <Mini label="DOORS" value={run.doors} color={C.teal} />
          <Mini label="FIRST TRY" value={`${acc}%`} color={acc >= 80 ? C.good : C.gold} />
          <Mini label="⚡ QUICK" value={run.fast} color={C.gold} />
        </div>
        <div style={{ color: C.dim, fontSize: 11, marginTop: 14, fontFamily: serif, letterSpacing: 1 }}>
          {form?.title || rank.name} · {profile.totalPoints.toLocaleString()} total
        </div>
      </div>

      <button className="bh" onClick={onAgain} style={btn('gold', { width: '100%', fontSize: 17, minHeight: 56 })}>
        {newRank != null ? 'Choose my new form! ✨' : 'Another Maze! 🗺️'}
      </button>
      <button className="bh" onClick={onCastle} style={btn('ghost', { width: '100%', marginTop: 9, fontSize: 14 })}>
        🏰 Return to Castle
      </button>
    </div>
  )
}

function Mini({ label, value, color }) {
  return (
    <div style={{ background: '#0a0a2c', borderRadius: 11, padding: '8px 4px', border: `1.5px solid ${C.line}` }}>
      <div style={{ fontWeight: 900, fontSize: 17, color, fontFamily: sans }}>{value}</div>
      <div style={{ fontSize: 8, letterSpacing: 1.2, color: C.faint, fontFamily: serif, marginTop: 1 }}>{label}</div>
    </div>
  )
}

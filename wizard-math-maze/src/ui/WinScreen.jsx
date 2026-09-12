import { getSkin, skinById } from '../game/skins.js'
import { C, sans, serif, btn, panel } from './theme.js'

export default function WinScreen({ profile, run, onAgain, onCastle, unlocked }) {
  const rank = getSkin(profile.totalPoints)
  const acc = run.answered ? Math.round((run.correct / run.answered) * 100) : 100

  return (
    <div className="appear" style={{ zIndex: 10, width: '100%', maxWidth: 430, padding: '0 14px', textAlign: 'center' }}>
      <div className="wf" style={{ fontSize: 78, filter: `drop-shadow(0 0 28px ${C.gold})` }}>🏆</div>
      <h2 style={{
        fontFamily: serif, fontSize: 'clamp(22px,6vw,32px)', fontWeight: 900, color: C.gold,
        letterSpacing: 2, textShadow: `0 0 24px ${C.gold}aa`, margin: '4px 0 16px',
      }}>Maze Conquered!</h2>

      {unlocked && (
        <div className="pulseRing" style={{
          ...panel({ padding: '14px 16px', marginBottom: 12, borderColor: skinById(unlocked).color }),
        }}>
          <div style={{ fontSize: 40 }}>{skinById(unlocked).emoji}</div>
          <div style={{ color: skinById(unlocked).color, fontFamily: serif, fontSize: 12, letterSpacing: 2, fontWeight: 900, marginTop: 4 }}>
            NEW FORM UNLOCKED
          </div>
          <div style={{ color: '#fff', fontWeight: 900, fontSize: 18, fontFamily: sans }}>{skinById(unlocked).title}</div>
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
          {rank.wand} {rank.title} · {profile.totalPoints.toLocaleString()} total
        </div>
      </div>

      <button className="bh" onClick={onAgain} style={btn('gold', { width: '100%', fontSize: 17, minHeight: 56 })}>
        Another Maze! 🗺️
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

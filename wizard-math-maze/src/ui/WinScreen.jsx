import { rankFor, rankInfo, formsAtRank } from '../game/skins.js'
import { C, sans, serif, btn, panel } from './theme.js'
import WizardPreview from './WizardPreview.jsx'

/**
 * The end of a maze.
 *
 * Two different screens share this one component, and they should not feel the
 * same. Clearing a maze is satisfying; clearing the maze that earns you new
 * robes is THE reward the whole points ladder is built around, and it used to
 * be announced in a small panel above the score. It now takes the top of the
 * screen, drops in with confetti, shows the three robes waiting to be chosen,
 * and pushes the score down to second billing where it belongs.
 */
export default function WinScreen({ profile, run, onAgain, onCastle, newRank, form }) {
  const rank = rankFor(profile.totalPoints)
  const acc = run.answered ? Math.round((run.correct / run.answered) * 100) : 100
  const levelled = newRank != null
  const choices = levelled ? formsAtRank(newRank) : []

  return (
    <div className="appear scroll" style={{ zIndex: 10, width: '100%', maxWidth: 430, padding: '0 14px 20px', textAlign: 'center' }}>
      {levelled && <Confetti />}

      {levelled ? (
        <div className="rankIn" style={{ position: 'relative', marginBottom: 12 }}>
          <div className="bigStar" style={{ fontSize: 60, filter: `drop-shadow(0 0 30px ${C.gold})`, lineHeight: 1.1 }}>🌟</div>
          <div style={{
            fontFamily: serif, fontSize: 12.5, letterSpacing: 3.5, fontWeight: 900,
            color: C.goldHi, marginTop: 2,
          }}>YOU HAVE RISEN</div>
          <h2 style={{
            fontFamily: serif, fontSize: 'clamp(30px,9vw,44px)', fontWeight: 900, color: C.gold,
            letterSpacing: 1.5, margin: '0 0 2px', textShadow: `0 0 30px ${C.gold}`,
          }}>{rankInfo(newRank).name}</h2>
          <div style={{ color: C.dim, fontSize: 12, fontFamily: serif, letterSpacing: 2, marginBottom: 12 }}>
            RANK {newRank} · MAZE CONQUERED
          </div>

          {/* The banner IS the button. It's the brightest thing on the screen
              and it shows the three robes, so of course it gets pressed — and
              before this it did nothing, which made the real button below it
              feel like a consolation prize. */}
          <button className="rankGlow bh" onClick={onAgain} style={{
            position: 'relative', overflow: 'hidden', width: '100%',
            cursor: 'pointer', textAlign: 'center', display: 'block',
            ...panel({ padding: '14px 12px 12px', borderColor: C.gold }),
          }}>
            <div className="shine" />
            <div style={{ color: '#fff', fontWeight: 900, fontSize: 17, fontFamily: sans }}>
              {choices.length} new robes await you
            </div>
            <div style={{ color: C.dim, fontSize: 11.5, marginTop: 3, lineHeight: 1.5 }}>
              Tap to choose one — it's yours for keeps.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${choices.length},1fr)`, gap: 6, marginTop: 10 }}>
              {choices.map(f => (
                <div key={f.id} style={{
                  borderRadius: 12, padding: '6px 2px 5px',
                  background: `${f.robe}22`, border: `1.5px solid ${f.trim}55`,
                }}>
                  <WizardPreview form={f} appearance={profile.appearance} size={66} animate={false} />
                  <div style={{ color: f.trim, fontSize: 9.5, fontWeight: 900, lineHeight: 1.2, marginTop: 1 }}>
                    {f.title}
                  </div>
                </div>
              ))}
            </div>
            <div style={{
              marginTop: 9, color: C.gold, fontFamily: serif, fontSize: 12,
              fontWeight: 900, letterSpacing: 1.5,
            }}>TAP TO CHOOSE ✨</div>
          </button>
        </div>
      ) : (
        <>
          <div className="wf" style={{ fontSize: 78, filter: `drop-shadow(0 0 28px ${C.gold})` }}>🏆</div>
          <h2 style={{
            fontFamily: serif, fontSize: 'clamp(22px,6vw,32px)', fontWeight: 900, color: C.gold,
            letterSpacing: 2, textShadow: `0 0 24px ${C.gold}aa`, margin: '4px 0 16px',
          }}>Maze Conquered!</h2>
        </>
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

      <button className="bh" onClick={onAgain}
        style={btn('gold', { width: '100%', fontSize: levelled ? 19 : 17, minHeight: levelled ? 62 : 56 })}>
        {levelled ? 'Choose my new robes! ✨' : 'Another Maze! 🗺️'}
      </button>
      <button className="bh" onClick={onCastle} style={btn('ghost', { width: '100%', marginTop: 9, fontSize: 14 })}>
        🏰 Return to Castle
      </button>
    </div>
  )
}

/**
 * Confetti, as fixed-position divs falling past the whole viewport.
 *
 * Seeded once on mount rather than per frame, so nothing re-renders and the
 * pieces don't jump; CSS does the falling. It's set to `forwards`, so it runs
 * once and stops — a celebration that never ends stops being one.
 */
function Confetti() {
  const bits = []
  const cols = [C.gold, C.goldHi, C.teal, '#ff8fd0', '#a0e0ff', '#b8f0c0']
  for (let i = 0; i < 34; i++) {
    const r = (n) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1
    const w = 6 + r(1) * 7
    bits.push(
      <span key={i} className="confetti" style={{
        left: `${r(2) * 100}%`,
        width: w, height: w * (0.4 + r(3) * 0.9),
        background: cols[Math.floor(r(4) * cols.length)],
        borderRadius: r(5) > 0.55 ? '50%' : 2,
        '--dur': `${2.4 + r(6) * 2.2}s`,
        '--dl': `${r(7) * 0.9}s`,
        '--spin': `${(r(8) > 0.5 ? 1 : -1) * (360 + r(9) * 540)}deg`,
      }} />
    )
  }
  return <>{bits}</>
}

function Mini({ label, value, color }) {
  return (
    <div style={{ background: '#0a0a2c', borderRadius: 11, padding: '8px 4px', border: `1.5px solid ${C.line}` }}>
      <div style={{ fontWeight: 900, fontSize: 17, color, fontFamily: sans }}>{value}</div>
      <div style={{ fontSize: 8, letterSpacing: 1.2, color: C.faint, fontFamily: serif, marginTop: 1 }}>{label}</div>
    </div>
  )
}

import { masteryReport } from '../game/curriculum.js'
import { OPS, opByKey } from '../game/math.js'
import { C, sans, serif } from './theme.js'
import { Sheet } from './Wardrobe.jsx'

/**
 * What a parent actually wants to know: is the practice working, and which
 * facts still need another go. Everything here is derived from the fact table
 * the game fills in as she plays — nothing extra is collected.
 *
 * A note on the colours, because they were wrong in a way that mattered.
 *
 * Most facts a child has practised sit in "learning" — box 4 is a high bar and
 * getting there takes several correct answers on different days. That bucket
 * was amber, the shaky one was red, and a perfectly respectable 70% accuracy
 * was amber too. So a child doing well opened her own progress page and saw a
 * wall of warning colours. The page was telling the truth and giving entirely
 * the wrong impression.
 *
 * Learning is now GREEN — a lighter, springier green than mastered, because
 * getting there is good news, not a caution — and the worst thing on the page
 * is amber. There is no red on a child's progress page at all. What used to be
 * "shaky" is "worth another go", which is also what the maze actually does
 * with it.
 */
export default function ParentReport({ profile, onClose }) {
  const r = masteryReport(profile)
  const st = profile.stats || {}

  // One honest, cheerful sentence at the top. It names the biggest true good
  // thing rather than grading her, because a progress page a child opens
  // herself should start by telling her what is going right.
  const locked = OPS.reduce((n, o) => n + (r.byOp[o.key]?.mastered || 0), 0)
  const praise = locked >= 12 || r.accuracy >= 0.85
    ? { icon: '🌟', line: 'This is going really well', tone: C.good }
    : locked >= 4 || r.accuracy >= 0.7
      ? { icon: '📈', line: "You're getting stronger", tone: C.rising }
      : { icon: '🌱', line: 'A good start — keep going', tone: C.rising }

  return (
    <Sheet title="My Progress" subtitle={`${profile.name} · ${r.totalAttempts.toLocaleString()} problem${r.totalAttempts === 1 ? '' : 's'} answered`} onClose={onClose}>
      {r.totalAttempts === 0 ? (
        <p style={{ color: C.dim, fontSize: 13, textAlign: 'center', padding: '18px 8px', lineHeight: 1.7 }}>
          Nothing to show yet — clear a maze and this fills in with every fact
          you’ve practiced, which ones are solid, and which ones need another go.
        </p>
      ) : (
        <>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
            padding: '11px 13px', borderRadius: 15,
            border: `2px solid ${praise.tone}66`, background: `${praise.tone}14`,
          }}>
            <span style={{ fontSize: 24, lineHeight: 1 }}>{praise.icon}</span>
            <span>
              <span style={{ display: 'block', color: praise.tone, fontFamily: sans, fontWeight: 900, fontSize: 15 }}>
                {praise.line}
              </span>
              <span style={{ display: 'block', color: C.faint, fontSize: 11, marginTop: 1 }}>
                {locked > 0
                  ? `${locked} fact${locked === 1 ? '' : 's'} locked in · ${Math.round(r.accuracy * 100)}% right so far`
                  : `${Math.round(r.accuracy * 100)}% right so far`}
              </span>
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 14 }}>
            {/* Anything at seven in ten or better is a good score at maths, and
                it should look like one. */}
            <Stat label="Accuracy" value={`${Math.round(r.accuracy * 100)}%`}
              color={r.accuracy >= 0.75 ? C.good : r.accuracy >= 0.5 ? C.rising : C.gold} />
            <Stat label="Facts met" value={r.totalFacts} color={C.teal} />
            <Stat label="Mazes cleared" value={st.mazesCleared || 0} color={C.teal} />
            <Stat label="Typical recall" value={r.medianMs ? `${(r.medianMs / 1000).toFixed(1)}s` : '—'} color={C.rising} />
          </div>

          <SubHead>BY OPERATION</SubHead>
          <div style={{ display: 'grid', gap: 9, marginBottom: 16 }}>
            {OPS.filter(o => r.byOp[o.key].attempts > 0).map(o => {
              const b = r.byOp[o.key]
              const tot = Math.max(1, b.mastered + b.learning + b.shaky)
              return (
                <div key={o.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 900, marginBottom: 4 }}>
                    <span style={{ color: o.color }}>{o.icon} {o.label}</span>
                    <span style={{ color: C.faint }}>
                      {b.right}/{b.attempts} right
                      {b.skill != null && <span style={{ color: C.dim, marginLeft: 6 }}>· sense {Math.round(b.skill * 100)}%</span>}
                    </span>
                  </div>
                  <div style={{ display: 'flex', height: 11, borderRadius: 8, overflow: 'hidden', background: '#0a0a2c', border: `1px solid ${C.line}` }}>
                    <Seg w={b.mastered / tot} c={C.good} />
                    <Seg w={b.learning / tot} c={C.rising} />
                    <Seg w={b.shaky / tot} c={C.amber} />
                  </div>
                  <div style={{ fontSize: 9.5, color: C.faint, marginTop: 3 }}>
                    {b.mastered} locked in · {b.learning} getting there
                    {b.shaky > 0 && ` · ${b.shaky} worth another go`}
                  </div>
                </div>
              )
            })}
          </div>

          {r.needsWork.length > 0 && (
            <>
              <SubHead>WORTH ANOTHER GO</SubHead>
              <p style={{ color: C.faint, fontSize: 10.5, margin: '0 0 8px', lineHeight: 1.6 }}>
                Nothing to worry about — the maze already brings these round more
                often than the rest, which is how they end up locked in.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {r.needsWork.map(f => (
                  <span key={f.key} style={chip(C.amber)}>
                    {f.disp} <em style={{ color: C.faint, fontStyle: 'normal', fontSize: 9.5 }}>{f.right}✓ {f.wrong}✗</em>
                  </span>
                ))}
              </div>
            </>
          )}

          {r.strongest.length > 0 && (
            <>
              <SubHead>LOCKED IN</SubHead>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {r.strongest.map(f => (
                  <span key={f.key} style={chip(C.good)}>
                    {f.disp}{f.bestMs ? <em style={{ color: C.faint, fontStyle: 'normal', fontSize: 9.5 }}> {(f.bestMs / 1000).toFixed(1)}s</em> : null}
                  </span>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </Sheet>
  )
}

const Seg = ({ w, c }) => w > 0 ? <div style={{ width: `${w * 100}%`, background: c }} /> : null

const SubHead = ({ children }) => (
  <div style={{ fontFamily: serif, fontSize: 12.5, letterSpacing: 2, color: C.dim, fontWeight: 900, margin: '0 0 8px' }}>{children}</div>
)

const chip = c => ({
  padding: '5px 9px', borderRadius: 9, background: `${c}1c`, border: `1.5px solid ${c}55`,
  color: '#fff', fontSize: 12, fontWeight: 900, fontFamily: 'Nunito, sans-serif',
  display: 'inline-flex', gap: 5, alignItems: 'baseline',
})

function Stat({ label, value, color }) {
  return (
    <div style={{ background: '#0a0a2c', border: `1.5px solid ${C.line}`, borderRadius: 13, padding: '10px 12px' }}>
      <div style={{ fontFamily: serif, fontSize: 10.5, letterSpacing: 1.5, color: C.faint }}>{label.toUpperCase()}</div>
      <div style={{ fontWeight: 900, fontSize: 21, color, fontFamily: sans, marginTop: 2 }}>{value}</div>
    </div>
  )
}

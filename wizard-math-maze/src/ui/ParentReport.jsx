import { masteryReport } from '../game/curriculum.js'
import { OPS, opByKey } from '../game/math.js'
import { C, sans, serif } from './theme.js'
import { Sheet } from './Wardrobe.jsx'

/**
 * What a parent actually wants to know: is the practice working, and which
 * facts are still shaky. Everything here is derived from the fact table the
 * game fills in as she plays — nothing extra is collected.
 */
export default function ParentReport({ profile, onClose }) {
  const r = masteryReport(profile)
  const st = profile.stats || {}

  return (
    <Sheet title="My Progress" subtitle={`${profile.name} · ${r.totalAttempts.toLocaleString()} problem${r.totalAttempts === 1 ? '' : 's'} answered`} onClose={onClose}>
      {r.totalAttempts === 0 ? (
        <p style={{ color: C.dim, fontSize: 13, textAlign: 'center', padding: '18px 8px', lineHeight: 1.7 }}>
          Nothing to show yet — clear a maze and this fills in with every fact
          you’ve practised, which ones are solid, and which ones need another go.
        </p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 14 }}>
            <Stat label="Accuracy" value={`${Math.round(r.accuracy * 100)}%`} color={r.accuracy > 0.8 ? C.good : r.accuracy > 0.6 ? C.gold : C.bad} />
            <Stat label="Facts met" value={r.totalFacts} color={C.teal} />
            <Stat label="Mazes cleared" value={st.mazesCleared || 0} color={C.dim} />
            <Stat label="Typical recall" value={r.medianMs ? `${(r.medianMs / 1000).toFixed(1)}s` : '—'} color={C.gold} />
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
                    <span style={{ color: C.faint }}>{b.right}/{b.attempts} right</span>
                  </div>
                  <div style={{ display: 'flex', height: 11, borderRadius: 8, overflow: 'hidden', background: '#0a0a2c', border: `1px solid ${C.line}` }}>
                    <Seg w={b.mastered / tot} c={C.good} />
                    <Seg w={b.learning / tot} c={C.gold} />
                    <Seg w={b.shaky / tot} c={C.bad} />
                  </div>
                  <div style={{ fontSize: 9.5, color: C.faint, marginTop: 3 }}>
                    {b.mastered} solid · {b.learning} learning · {b.shaky} shaky
                  </div>
                </div>
              )
            })}
          </div>

          {r.needsWork.length > 0 && (
            <>
              <SubHead>WORTH ANOTHER GO</SubHead>
              <p style={{ color: C.faint, fontSize: 10.5, margin: '0 0 8px', lineHeight: 1.6 }}>
                The maze already puts these in front of you more often than the rest.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {r.needsWork.map(f => (
                  <span key={f.key} style={chip(C.bad)}>
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
  <div style={{ fontFamily: serif, fontSize: 9.5, letterSpacing: 2, color: C.dim, fontWeight: 900, margin: '0 0 8px' }}>{children}</div>
)

const chip = c => ({
  padding: '5px 9px', borderRadius: 9, background: `${c}1c`, border: `1.5px solid ${c}55`,
  color: '#fff', fontSize: 12, fontWeight: 900, fontFamily: 'Nunito, sans-serif',
  display: 'inline-flex', gap: 5, alignItems: 'baseline',
})

function Stat({ label, value, color }) {
  return (
    <div style={{ background: '#0a0a2c', border: `1.5px solid ${C.line}`, borderRadius: 13, padding: '10px 12px' }}>
      <div style={{ fontFamily: serif, fontSize: 8.5, letterSpacing: 1.5, color: C.faint }}>{label.toUpperCase()}</div>
      <div style={{ fontWeight: 900, fontSize: 21, color, fontFamily: sans, marginTop: 2 }}>{value}</div>
    </div>
  )
}

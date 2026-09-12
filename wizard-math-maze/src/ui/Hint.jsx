import { C, sans } from './theme.js'

/**
 * Shows the answer instead of telling it. A kid who has just got 7 × 6 wrong
 * learns nothing from being handed "42"; seeing 7 rows of 6 dots and counting
 * them builds the fact. Descriptors come from math.js `buildHint`.
 */
export default function Hint({ hint }) {
  if (!hint) return null
  return (
    <div style={{
      marginTop: 12, padding: '12px 12px 14px', borderRadius: 14,
      background: '#0a0a2c', border: `2px dashed ${C.lineHi}`,
    }}>
      <div style={{ color: C.teal, fontSize: 11, fontWeight: 900, letterSpacing: 1, marginBottom: 10, textAlign: 'center' }}>
        {hint.caption}
      </div>
      {hint.kind === 'grid'   && <DotGrid rows={hint.rows} cols={hint.cols} />}
      {hint.kind === 'groups' && <Groups groups={hint.groups} per={hint.per} />}
      {hint.kind === 'line'   && <NumberLine {...hint} />}
      {hint.kind === 'split'  && null}
    </div>
  )
}

function DotGrid({ rows, cols }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} style={{ display: 'flex', gap: 4 }}>
          {Array.from({ length: cols }, (_, c) => (
            <span key={c} style={{
              width: 12, height: 12, borderRadius: '50%',
              background: `linear-gradient(135deg,${C.teal},#2b8fd0)`,
              boxShadow: `0 0 6px ${C.teal}66`,
            }} />
          ))}
        </div>
      ))}
    </div>
  )
}

function Groups({ groups, per }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
      {Array.from({ length: groups }, (_, g) => (
        <div key={g} style={{
          padding: 6, borderRadius: 10, border: `1.5px solid ${C.lineHi}`,
          display: 'grid', gridTemplateColumns: `repeat(${Math.min(per, 4)},1fr)`, gap: 3,
        }}>
          {Array.from({ length: per }, (_, i) => (
            <span key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: C.good }} />
          ))}
        </div>
      ))}
    </div>
  )
}

function NumberLine({ from, add, to, max }) {
  const lo = Math.min(from, to, 0)
  const hi = Math.max(max, to, from)
  const pct = v => ((v - lo) / (hi - lo)) * 100
  const forward = add > 0
  return (
    <div style={{ position: 'relative', height: 58, margin: '6px 6px 0' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 26, height: 3, background: C.lineHi, borderRadius: 3 }} />
      {/* The hop */}
      <div style={{
        position: 'absolute', top: 26,
        left: `${pct(Math.min(from, to))}%`,
        width: `${Math.abs(pct(to) - pct(from))}%`,
        height: 3, background: forward ? C.good : C.gold, borderRadius: 3,
        boxShadow: `0 0 8px ${forward ? C.good : C.gold}88`,
      }} />
      {[{ v: from, c: C.dim, t: 'start' }, { v: to, c: forward ? C.good : C.gold, t: 'end' }].map(m => (
        <div key={m.t} style={{ position: 'absolute', left: `${pct(m.v)}%`, top: 14, transform: 'translateX(-50%)', textAlign: 'center' }}>
          <div style={{ width: 13, height: 13, borderRadius: '50%', background: m.c, margin: '0 auto', border: '2px solid #0a0a2c' }} />
          <div style={{ color: m.c, fontSize: 13, fontWeight: 900, fontFamily: sans, marginTop: 3 }}>{m.v}</div>
        </div>
      ))}
      <div style={{
        position: 'absolute', top: 0, left: `${(pct(from) + pct(to)) / 2}%`,
        transform: 'translateX(-50%)', color: C.ink, fontSize: 11, fontWeight: 900, whiteSpace: 'nowrap',
      }}>{forward ? `+${add}` : `−${Math.abs(add)}`}</div>
    </div>
  )
}

import { useMemo } from 'react'

/** Ambient background stars. Positions are generated once and then hold still. */
export default function StarField({ count = 55 }) {
  const stars = useMemo(() => Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    sz: Math.random() * 2.5 + 0.5,
    dl: Math.random() * 4,
    dr: Math.random() * 2 + 2,
  })), [count])

  return stars.map(s => (
    <div key={s.id} className="star" style={{
      left: `${s.x}%`, top: `${s.y}%`, width: s.sz, height: s.sz,
      '--dr': `${s.dr}s`, '--dl': `${s.dl}s`,
    }} />
  ))
}

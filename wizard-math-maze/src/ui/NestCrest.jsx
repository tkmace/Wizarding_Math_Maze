import { useEffect, useRef } from 'react'
import { drawCrest } from '../engine/nestCrest.js'
import { nestById } from '../game/nests.js'

/**
 * A nest crest, drawn to a canvas at whatever size it's given.
 *
 * Static by default — a badge that never stops moving is a badge nobody can
 * read past. `animate` is for the one on the choosing screen, where a slow
 * float is what makes the four feel like something you're picking between.
 */
export default function NestCrest({ nest, size = 64, animate = false, style }) {
  const ref = useRef(null)
  const n = typeof nest === 'string' ? nestById(nest) : nest

  useEffect(() => {
    const cv = ref.current
    if (!cv || !n) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const h = Math.round(size * 1.22) + 2
    cv.width = Math.round(size * dpr); cv.height = Math.round(h * dpr)

    const paint = t => {
      const ctx = cv.getContext('2d')
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, size, h)
      drawCrest(ctx, { x: size / 2, y: 1, w: size - 2, nest: n, t })
    }

    if (!animate) { paint(0); return }
    let raf
    const frame = t => { paint(t); raf = requestAnimationFrame(frame) }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [n, size, animate])

  if (!n) return null
  return (
    <canvas
      ref={ref}
      aria-label={n.name}
      style={{ width: size, height: Math.round(size * 1.22) + 2, display: 'block', ...style }}
    />
  )
}

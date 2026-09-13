import { useEffect, useRef } from 'react'
import { drawWizard } from '../engine/wizardSprite.js'

/**
 * A live, animated wizard on a small canvas. Used for the hub portrait, the
 * wardrobe gallery and the rank-up choice screen, so the wizard she picks looks
 * exactly like the one she'll be guiding through the maze.
 */
export default function WizardPreview({ form, appearance, size = 140, view = 'front', animate = true, greyscale = false, style }) {
  const ref = useRef(null)

  useEffect(() => {
    const cv = ref.current
    if (!cv || !form) return
    // Oversample small previews. A wardrobe tile is a fraction of the hub
    // portrait, and at one device pixel per CSS pixel the face — eyes a couple
    // of pixels across — turns to mush, which is why the gallery looked less
    // detailed than every other screen. Drawing it at 3x and letting the
    // browser scale down costs nothing at these sizes and keeps the same art.
    const dpr = size < 120
      ? Math.min(3, Math.max(2, window.devicePixelRatio || 1))
      : Math.min(2, window.devicePixelRatio || 1)
    cv.width = Math.round(size * dpr)
    cv.height = Math.round(size * dpr)

    let raf
    const frame = t => {
      const ctx = cv.getContext('2d')
      ctx.clearRect(0, 0, cv.width, cv.height)
      drawWizard(ctx, {
        x: cv.width / 2,
        yBase: cv.height * 0.94,
        h: cv.height * 0.82,
        form, appearance,
        t: animate ? t : 1200,
        moving: false,
        view,
      })
      if (animate) raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [form, appearance, size, view, animate])

  return (
    <canvas
      ref={ref}
      aria-label={form?.title}
      style={{
        width: size, height: size, display: 'block',
        filter: greyscale ? 'grayscale(1) brightness(0.55)' : 'none',
        ...style,
      }}
    />
  )
}

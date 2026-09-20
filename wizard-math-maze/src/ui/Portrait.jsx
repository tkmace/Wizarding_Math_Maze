import { useEffect, useRef } from 'react'
import { drawPortrait } from '../engine/portrait.js'
import { wizardById } from '../game/wizards.js'
import { HAIR_COLORS } from '../game/appearance.js'

/**
 * A wizard, face on, at a size where you can see her.
 *
 * Deliberately NOT a drop-in for WizardPreview. That one draws the whole figure
 * because the wardrobe and the rank-up screen are about the ROBE — a chest-up
 * crop there would be showing the wrong thing. This is for the screens that are
 * about the person: the castle, the Attunement, the duel.
 */
export default function Portrait({ profile, form, size = 200, animate = true, style }) {
  const ref = useRef(null)

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    cv.width = Math.round(size * dpr)
    cv.height = Math.round(size * dpr)
    const wiz = wizardById(profile?.wizard)
    const hair = (HAIR_COLORS[profile?.appearance?.hairColor] || HAIR_COLORS[1]).hex

    let raf
    const frame = t => {
      const ctx = cv.getContext('2d')
      ctx.clearRect(0, 0, cv.width, cv.height)
      drawPortrait(ctx, {
        cx: cv.width / 2,
        cy: cv.height * 0.46,
        R: cv.height * 0.26,
        wiz, hair, form,
        t: animate ? t : 1200,
      })
      if (animate) raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [profile?.wizard, profile?.appearance?.hairColor, form, size, animate])

  return (
    <canvas
      ref={ref}
      aria-label={form?.title}
      style={{ width: size, height: size, display: 'block', borderRadius: 18, ...style }}
    />
  )
}

import { useEffect, useRef } from 'react'
import { drawPortrait } from '../engine/portrait.js'
import { lookFor } from '../game/wizards.js'
import { wornTrinkets } from '../game/trinkets.js'

/**
 * A wizard, face on, at a size where you can see her.
 *
 * Deliberately NOT a drop-in for WizardPreview. That one draws the whole figure
 * because the wardrobe and the rank-up screen are about the ROBE — a chest-up
 * crop there would be showing the wrong thing. This is for the screens that are
 * about the person: the castle, the Attunement, the duel.
 */
/**
 * `rFrac` and `cyFrac` are the framing: how big the head is as a fraction of
 * the canvas, and where its centre sits. The shop uses them to crop in on
 * whichever part of her a curio actually touches — a pendant is four pixels
 * across in the standard framing at tile size, which makes six identical
 * thumbnails and a shop nobody believes.
 */
export default function Portrait({ profile, form, size = 200, animate = true, rFrac = 0.26, cyFrac = 0.46, style }) {
  const ref = useRef(null)
  // A plain string, so swapping a trinket redraws without the effect depending
  // on an array identity that changes on every render.
  const wornKey = (profile?.wearing || []).join(',')

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    cv.width = Math.round(size * dpr)
    cv.height = Math.round(size * dpr)
    // Shape from the character she picked; colour from what she chose in My
    // Wizard, falling back to that character's usual look. Colour is free here
    // because it moves nothing — a lock sits in the same place whether it is
    // copper or silver.
    const { wiz, skin, eye, hair } = lookFor(profile)
    const a = profile?.appearance || {}
    const trinkets = wornTrinkets(profile)

    let raf
    const frame = t => {
      const ctx = cv.getContext('2d')
      ctx.clearRect(0, 0, cv.width, cv.height)
      drawPortrait(ctx, {
        cx: cv.width / 2,
        cy: cv.height * cyFrac,
        R: cv.height * rFrac,
        wiz, skin, eye, hair, form, trinkets,
        beard: a.beard || 0, hairLen: a.hairStyle,
        t: animate ? t : 1200,
      })
      if (animate) raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [profile?.wizard, profile?.appearance?.skin, profile?.appearance?.eyeColor,
      profile?.appearance?.hairColor, profile?.appearance?.beard,
      profile?.appearance?.hairStyle, wornKey, form, size, animate, rFrac, cyFrac])

  return (
    <canvas
      ref={ref}
      aria-label={form?.title}
      style={{ width: size, height: size, display: 'block', borderRadius: 18, ...style }}
    />
  )
}

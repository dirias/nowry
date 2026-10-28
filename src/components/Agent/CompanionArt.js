import React, { useEffect, useState } from 'react'
import { Box } from '@mui/joy'
import { recolorArt } from '@nowry/core/tokens/recolorArt'
import { stageConfig } from '@nowry/core/domain/petStages'
import stage1 from '../../assets/companion/stage-1.webp'
import stage2 from '../../assets/companion/stage-2.webp'
import stage3 from '../../assets/companion/stage-3.webp'
import stage4 from '../../assets/companion/stage-4.webp'
import stage5 from '../../assets/companion/stage-5.webp'
import stage6 from '../../assets/companion/stage-6.webp'

/**
 * Nowry, the default companion, as the B2 line (ADR-051): six painted forms,
 * an egg to a crowned serpent, one per stage. A generated portrait still wins;
 * `petPortrait` decides that, and this draws only the `default` answer.
 *
 * The forms were painted teal. Each is moved onto the learner's accent in the
 * browser (`recolorArt`, in core) and cached per stage and accent, so a level-up
 * or a theme change costs one 256px pass and nothing after it. Until the pass
 * is done — and wherever there is no canvas — the painted original shows: a
 * teal companion for a moment is better than none.
 *
 * Decorative: the surrounding control or caption names the companion.
 */
const STAGE_ART = { 1: stage1, 2: stage2, 3: stage3, 4: stage4, 5: stage5, 6: stage6 }

export const companionArtFor = (stage) => STAGE_ART[stage] ?? STAGE_ART[1]

const recolored = new Map()

function recolorInCanvas(image, accent) {
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null
  context.drawImage(image, 0, 0)
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
  pixels.data.set(recolorArt(pixels.data, accent))
  context.putImageData(pixels, 0, 0)
  return canvas.toDataURL('image/png')
}

/** The form's art in `accent`, or the painted original until (or unless) that is ready. */
export function useAccentArt(stage, accent) {
  const original = companionArtFor(stage)
  const key = `${original}|${accent}`
  const [url, setUrl] = useState(() => recolored.get(key) ?? original)

  useEffect(() => {
    if (!accent) return setUrl(original)
    if (recolored.has(key)) return setUrl(recolored.get(key))
    setUrl(original)
    let live = true
    const image = new Image()
    image.onload = () => {
      let result = null
      try {
        result = recolorInCanvas(image, accent)
      } catch {
        // A canvas that refuses (a privacy mode, a tainted read) leaves the original showing.
      }
      if (!result) return
      recolored.set(key, result)
      if (live) setUrl(result)
    }
    image.src = original
    return () => {
      live = false
    }
  }, [key, original, accent])

  return url
}

/**
 * One form, `size` px square, with the art filling `fill` of it — by default
 * the stage's own share, so each form stands bigger than the one before.
 * `locked` is a rung not yet earned: the form's silhouette in a theme token.
 */
export const CompanionArt = ({ stage = 1, accent, size = 56, fill, locked = false, sx = {}, ...rest }) => {
  const url = useAccentArt(stage, locked ? null : accent)
  const share = fill ?? stageConfig(stage).artFill
  const art = Math.round(size * share)

  return (
    <Box
      aria-hidden='true'
      data-companion-art={stage}
      data-companion-locked={locked || undefined}
      sx={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, ...sx }}
      {...rest}
    >
      {locked ? (
        <Box
          sx={{
            width: art,
            height: art,
            bgcolor: 'text.tertiary',
            opacity: 0.55,
            maskImage: `url(${companionArtFor(stage)})`,
            maskSize: 'contain',
            maskRepeat: 'no-repeat',
            maskPosition: 'center',
            WebkitMaskImage: `url(${companionArtFor(stage)})`,
            WebkitMaskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center'
          }}
        />
      ) : (
        <Box component='img' src={url} alt='' draggable={false} sx={{ width: art, height: art, objectFit: 'contain', display: 'block' }} />
      )}
    </Box>
  )
}

/**
 * The companion on a paper disc — the shape a portrait takes in the chat panel,
 * so Nowry sits where a generated portrait would. Paper, not the accent: the
 * art already wears the accent, and on an accent disc it would vanish.
 */
export const CompanionArtDisc = ({ stage = 1, accent, size = 28, sx = {} }) => (
  <Box
    aria-hidden='true'
    sx={{
      width: size,
      height: size,
      borderRadius: 'full',
      bgcolor: 'background.surface',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      flexShrink: 0,
      ...sx
    }}
  >
    <CompanionArt stage={stage} accent={accent} size={size} fill={0.9} />
  </Box>
)

export default CompanionArt

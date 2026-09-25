import React, { useId, useMemo } from 'react'
import { Box, Typography } from '@mui/joy'
import { spiralMark, wordmarkCoil } from '@nowry/core/tokens/brandMark'

/** At and below this size the coil drops a turn so its gaps stay open. */
const COMPACT_AT = 32

/**
 * One coil, drawn. Shared by the mark and the display lockup so the eye is cut
 * the same way in both: a mask, not a second fill, so it shows the real ground.
 */
const Coil = ({ mark, size, title = null, sx = {} }) => {
  const rawId = useId()
  const maskId = `nowry-mark-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`

  return (
    <Box
      component='svg'
      viewBox={mark.viewBox}
      role={title ? 'img' : undefined}
      aria-label={title ?? undefined}
      aria-hidden={title ? undefined : true}
      focusable='false'
      sx={{ width: size, height: size, display: 'block', flexShrink: 0, ...sx }}
    >
      <defs>
        <mask id={maskId}>
          <rect width='100' height='100' fill='white' />
          <circle cx={mark.eye.cx} cy={mark.eye.cy} r={mark.eye.r} fill='black' />
        </mask>
      </defs>
      <g mask={`url(#${maskId})`} fill='currentColor'>
        <path d={mark.body} />
        <circle cx={mark.head.cx} cy={mark.head.cy} r={mark.head.r} />
        <circle cx={mark.tail.cx} cy={mark.tail.cy} r={mark.tail.r} />
      </g>
    </Box>
  )
}

/**
 * The Spiral (ADR-034), drawn from the shared geometry in `@nowry/core`.
 *
 * One colour, taken from `currentColor`, so the mark wears whatever ground it
 * sits on: the header's white, a page's `text.primary`. The eye is a hole cut
 * with a mask rather than a second fill, so it shows the real ground beneath
 * instead of guessing its colour.
 *
 * Decorative by default. Pass `title` only when the mark stands alone and is
 * the thing that names the brand; inside `BrandLockup` the word does that.
 */
export const BrandMark = ({ size = 24, title = null, sx = {} }) => {
  const mark = useMemo(() => spiralMark({ preset: size <= COMPACT_AT ? 'compact' : 'full', pad: 0.02 }), [size])

  return <Coil mark={mark} size={size} title={title} sx={sx} />
}

/**
 * The mark and the `nowry` wordmark, as one unit. The word is the brand's name,
 * not copy, so it is the same in every locale; it is also the lockup's
 * accessible name, read once.
 */
export const BrandLockup = ({ markSize = 28, level = 'h4', sx = {} }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'inherit', ...sx }}>
    <BrandMark size={markSize} />
    <Typography level={level} component='span' sx={{ color: 'inherit', fontWeight: 'xl', letterSpacing: '-0.03em', lineHeight: 1 }}>
      nowry
    </Typography>
  </Box>
)

/**
 * The display lockup: the coil in place of the `o` (BRAND-009).
 *
 * For the name set large — a splash, a landing header, marketing. Below
 * `WORDMARK_FIT.MIN_PX` the coil's turns merge into a bullet, so this renders
 * `BrandLockup` instead rather than shipping an unreadable mark: the floor is a
 * property of the geometry, not of the caller's taste, and a caller passing 22
 * gets the lockup that works at 22.
 *
 * The word is the accessible name, read once; the coil inside it is decorative
 * because the `o` is a letter here, not a second logo.
 */
export const BrandWordmark = ({ fontSize = 96, sx = {} }) => {
  const fit = useMemo(() => wordmarkCoil(fontSize), [fontSize])

  if (!fit) return <BrandLockup sx={sx} />

  return (
    <Box
      aria-label='nowry'
      sx={{
        display: 'flex',
        alignItems: 'baseline',
        color: 'inherit',
        fontWeight: 'xl',
        fontFamily: 'display',
        fontSize,
        lineHeight: 1,
        letterSpacing: '-0.03em',
        ...sx
      }}
    >
      <Box component='span' aria-hidden>
        n
      </Box>
      <Coil mark={fit.mark} size={fit.size} sx={{ mx: `${fit.side}px`, transform: `translateY(${fit.drop}px)` }} />
      <Box component='span' aria-hidden>
        wry
      </Box>
    </Box>
  )
}

export default BrandMark

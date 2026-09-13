import React, { useId, useMemo } from 'react'
import { Box, Typography } from '@mui/joy'
import { spiralMark } from '@nowry/core/tokens/brandMark'

/** At and below this size the coil drops a turn so its gaps stay open. */
const COMPACT_AT = 32

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
  const rawId = useId()
  const maskId = `nowry-mark-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`
  const mark = useMemo(() => spiralMark({ preset: size <= COMPACT_AT ? 'compact' : 'full', pad: 0.02 }), [size])

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

export default BrandMark

import React, { useId, useMemo } from 'react'
import { Box } from '@mui/joy'
import { companionMark } from '@nowry/core/tokens/companionMark'
import { readableTextOn } from '@nowry/core/tokens/colorSchemeGenerator'

/**
 * Nowry, the default companion (BRAND-007), drawn from the shared geometry in
 * `@nowry/core`: the Spiral with a turn added at every stage, its head turned
 * and its eye drawn by mood. The phone draws the same parts with
 * `react-native-svg`, so the two clients cannot come to keep different pets.
 *
 * One colour, taken from `color` — the learner's accent where the companion
 * stands on the page, the readable foreground where it sits on an accent disc
 * — and the face is cut out with a mask so it shows the real ground beneath.
 * `locked` is a rung not yet earned: the same shape, flat and quiet, which is
 * what makes showing an unearned form worth doing (PET-008).
 *
 * Decorative: the surrounding control or caption names the companion.
 */
export const CompanionMark = ({ stage = 1, mood = 'idle', size = 56, color = 'currentColor', locked = false, sx = {}, ...rest }) => {
  const rawId = useId()
  const maskId = `nowry-companion-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`
  const mark = useMemo(() => companionMark({ stage, mood }), [stage, mood])

  return (
    <Box
      component='svg'
      viewBox={mark.viewBox}
      aria-hidden='true'
      focusable='false'
      data-companion-stage={stage}
      data-companion-mood={mood}
      sx={{
        width: size,
        height: size,
        display: 'block',
        flexShrink: 0,
        color: locked ? 'text.tertiary' : color,
        opacity: locked ? 0.55 : 1,
        ...sx
      }}
      {...rest}
    >
      <defs>
        <mask id={maskId}>
          <rect width='100' height='100' fill='white' />
          {mark.eye.kind === 'round' ? (
            <circle cx={mark.eye.cx} cy={mark.eye.cy} r={mark.eye.r} fill='black' />
          ) : (
            <path d={mark.eye.d} stroke='black' strokeWidth={mark.eye.stroke} fill='none' strokeLinecap='round' />
          )}
          {mark.mouth && <circle cx={mark.mouth.cx} cy={mark.mouth.cy} r={mark.mouth.r} fill='black' />}
        </mask>
      </defs>
      {/* The shell of the first stage: the same colour, faint, with the curl inside it. */}
      {mark.egg && <path d={mark.egg} fill='currentColor' opacity={0.18} />}
      <g mask={`url(#${maskId})`} fill='currentColor'>
        <path d={mark.body} />
        <circle cx={mark.head.cx} cy={mark.head.cy} r={mark.head.r} />
        <circle cx={mark.tail.cx} cy={mark.tail.cy} r={mark.tail.r} />
      </g>
    </Box>
  )
}

/**
 * The companion on a disc of the learner's accent — the shape a portrait takes
 * in the chat panel, so Nowry sits where a generated portrait would. The coil
 * is drawn in whichever of paper or ink reads on that accent.
 */
export const CompanionDisc = ({ stage = 1, mood = 'idle', size = 28, accent, sx = {} }) => (
  <Box
    aria-hidden='true'
    sx={{
      width: size,
      height: size,
      borderRadius: '50%',
      bgcolor: accent,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      ...sx
    }}
  >
    <CompanionMark stage={stage} mood={mood} size={Math.round(size * 0.72)} color={readableTextOn(accent)} />
  </Box>
)

export default CompanionMark

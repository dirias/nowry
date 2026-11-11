import React, { useMemo } from 'react'
import { Box } from '@mui/joy'
import { motion } from 'framer-motion'
import { MOTION } from '@nowry/core/tokens/tokens'
import { MOTE_COUNT, beatDuration, spiralPath, spiralPoint } from '@nowry/core/domain/petEvolution'

/**
 * The spiral of light around an evolving companion (ADR-075, EVO-012).
 *
 * An effect, not anatomy: one line and a few motes drawn over the reveal's
 * frame, so it wraps a form of any shape and needs nothing per stage. It is
 * the only thing that moves while it is on screen — the companion under it
 * holds still.
 *
 *   anticipation    the line draws itself, outer end first
 *   transformation  the whole coil turns and tightens; motes ride it inward
 *   flash           it has closed; it is gone under the gold
 *   reveal          it opens outward past the frame and fades
 *   sweep (short)   it draws and turns once, with no tightening
 *
 * It wears the accent's plain colour through `currentColor`; gold stays with
 * the flash, which is the earned thing. It follows the forms in the markup, so
 * it paints over them without a layer of its own. It is decoration: hidden from
 * assistive technology, and not rendered at all under reduced motion.
 */
const STROKE = 3
const MOTE_RADIUS = 2.5
const MOTE_STEPS = 8
const seconds = (ms) => ms / 1000
const EASE = MOTION.easing.standard.match(/[\d.]+/g).map(Number)

/** What the coil as a whole does at each beat: one transform, one opacity. */
const COIL = {
  anticipation: { rotate: 0, scale: 1, opacity: 1 },
  transformation: { rotate: 360, scale: 0.5, opacity: 1 },
  flash: { rotate: 360, scale: 0.5, opacity: 0 },
  reveal: { rotate: 270, scale: 1.2, opacity: 0 },
  sweep: { rotate: 180, scale: 1, opacity: 1 },
  done: { rotate: 270, scale: 1.2, opacity: 0 }
}

const SpiralEffect = ({ beat, variant, size }) => {
  const path = useMemo(() => spiralPath({ size }), [size])
  const motes = useMemo(
    () =>
      Array.from({ length: MOTE_COUNT }, (_, index) => {
        const start = index / MOTE_COUNT
        const points = Array.from({ length: MOTE_STEPS + 1 }, (__, step) =>
          spiralPoint(start + ((1 - start) * step) / MOTE_STEPS, { size })
        )
        return { key: index, cx: points.map((point) => point.x), cy: points.map((point) => point.y) }
      }),
    [size]
  )
  const duration = seconds(beatDuration(variant, beat) || MOTION.duration.base)
  const drawn = beat !== 'anticipation' && beat !== 'sweep'
  const coil = COIL[beat] ?? COIL.done

  return (
    <Box
      aria-hidden='true'
      data-spiral-beat={beat}
      component={motion.div}
      initial={{ rotate: 0, scale: 1, opacity: beat === 'reveal' || beat === 'done' ? 0 : 1 }}
      animate={coil}
      transition={{ duration, ease: EASE }}
      sx={{ gridArea: '1 / 1', width: size, height: size, color: 'primary.plainColor', pointerEvents: 'none' }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill='none'>
        <motion.path
          d={path}
          stroke='currentColor'
          strokeWidth={STROKE}
          strokeLinecap='round'
          initial={{ pathLength: drawn ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration, ease: EASE }}
        />
        {beat === 'transformation' &&
          motes.map(({ key, cx, cy }) => (
            <motion.circle
              key={key}
              r={MOTE_RADIUS}
              fill='currentColor'
              initial={{ cx: cx[0], cy: cy[0], opacity: 0 }}
              animate={{ cx, cy, opacity: [0, 1, 1, 0] }}
              transition={{ duration, ease: 'linear' }}
            />
          ))}
      </svg>
    </Box>
  )
}

export default SpiralEffect

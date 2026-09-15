/**
 * Nowry, the default companion (BRAND-007), drawn from the shared geometry in
 * `@nowry/core`: the Spiral with a turn added at every stage, its head turned
 * and its eye drawn by mood. The web draws the same `companionMark()` with an
 * SVG element; this draws it with `react-native-svg`, so the two clients
 * cannot come to keep different pets.
 *
 * One colour: a semantic name, or `literalColor` for the one place a literal
 * is right — the readable foreground on an accent-coloured body, which is the
 * learner's data rather than a token (the same seam `Icon` has). The face is
 * cut out with a mask so it shows the real ground beneath. `locked` is a rung
 * not yet earned: the same shape, flat and quiet.
 */
import { useMemo, useRef } from 'react'
import Svg, { Circle, Defs, G, Mask, Path, Rect } from 'react-native-svg'
import { companionMark } from '@nowry/core/tokens/companionMark'
import { useTheme } from '../../theme'
import { resolveColor } from '../Typography'

/** Mask ids are document-wide, and a screen can hold several companions. */
let instances = 0

export function CompanionMark({ stage = 1, mood = 'idle', size = 56, color = 'text.primary', literalColor = null, locked = false }) {
  const theme = useTheme()
  const maskId = useRef(`nowry-companion-${instances++}`).current
  const fill = literalColor ?? resolveColor(theme, locked ? 'text.tertiary' : color)
  const mark = useMemo(() => companionMark({ stage, mood }), [stage, mood])

  return (
    <Svg width={size} height={size} viewBox={mark.viewBox} accessible={false} opacity={locked ? 0.55 : 1}>
      <Defs>
        <Mask id={maskId}>
          <Rect width='100' height='100' fill='white' />
          {mark.eye.kind === 'round' ? (
            <Circle cx={mark.eye.cx} cy={mark.eye.cy} r={mark.eye.r} fill='black' />
          ) : (
            <Path d={mark.eye.d} stroke='black' strokeWidth={mark.eye.stroke} fill='none' strokeLinecap='round' />
          )}
          {mark.mouth ? <Circle cx={mark.mouth.cx} cy={mark.mouth.cy} r={mark.mouth.r} fill='black' /> : null}
        </Mask>
      </Defs>
      {/* The shell of the first stage: the same colour, faint, with the curl inside it. */}
      {mark.egg ? <Path d={mark.egg} fill={fill} opacity={0.18} /> : null}
      <G mask={`url(#${maskId})`} fill={fill}>
        <Path d={mark.body} />
        <Circle cx={mark.head.cx} cy={mark.head.cy} r={mark.head.r} />
        <Circle cx={mark.tail.cx} cy={mark.tail.cy} r={mark.tail.r} />
      </G>
    </Svg>
  )
}

export default CompanionMark

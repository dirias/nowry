/**
 * The Spiral (ADR-034), drawn from the shared geometry in `@nowry/core`.
 *
 * The web draws the same `spiralMark()` with an SVG element; this draws it with
 * `react-native-svg`, so the two clients cannot come to wear different marks.
 * One colour, passed by the caller as a theme name or a literal. The eye is a
 * hole cut with a mask, so it shows the real ground rather than a guess at it.
 */
import { useMemo } from 'react'
import { View } from 'react-native'
import Svg, { Circle, Defs, G, Mask, Path, Rect } from 'react-native-svg'
import { spiralMark } from '@nowry/core/tokens/brandMark'
import { useTheme } from '../../theme'
import { Typography, resolveColor } from '../Typography'

/** At and below this size the coil drops a turn so its gaps stay open. */
const COMPACT_AT = 32

export function BrandMark({ size = 24, color = 'text.primary' }) {
  const theme = useTheme()
  const fill = resolveColor(theme, color)
  const mark = useMemo(() => spiralMark({ preset: size <= COMPACT_AT ? 'compact' : 'full', pad: 0.02 }), [size])

  return (
    <Svg width={size} height={size} viewBox={mark.viewBox} accessible={false}>
      <Defs>
        <Mask id='nowry-mark-eye'>
          <Rect width='100' height='100' fill='white' />
          <Circle cx={mark.eye.cx} cy={mark.eye.cy} r={mark.eye.r} fill='black' />
        </Mask>
      </Defs>
      <G mask='url(#nowry-mark-eye)' fill={fill}>
        <Path d={mark.body} />
        <Circle cx={mark.head.cx} cy={mark.head.cy} r={mark.head.r} />
        <Circle cx={mark.tail.cx} cy={mark.tail.cy} r={mark.tail.r} />
      </G>
    </Svg>
  )
}

/**
 * The mark and the `nowry` wordmark, as one unit — the same lockup the web's
 * header carries. The word is the brand's name, the same in every locale.
 */
export function BrandLockup({ markSize = 28, color = 'text.primary' }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <BrandMark size={markSize} color={color} />
      <Typography level='h4' weight='xl' color={color}>
        nowry
      </Typography>
    </View>
  )
}

export default BrandMark

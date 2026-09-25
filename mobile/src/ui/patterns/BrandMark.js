/**
 * The Spiral (ADR-034), drawn from the shared geometry in `@nowry/core`.
 *
 * The web draws the same `spiralMark()` with an SVG element; this draws it with
 * `react-native-svg`, so the two clients cannot come to wear different marks.
 * One colour, passed by the caller as a theme name or a literal. The eye is a
 * hole cut with a mask, so it shows the real ground rather than a guess at it.
 */
import { useId, useMemo } from 'react'
import { View } from 'react-native'
import Svg, { Circle, Defs, G, Mask, Path, Rect } from 'react-native-svg'
import { spiralMark, wordmarkCoil } from '@nowry/core/tokens/brandMark'
import { useTheme } from '../../theme'
import { Typography, resolveColor } from '../Typography'
import { TYPE_LEVELS } from '../typeLevels'

/** The wordmark's tracking: −0.03 em of `h4`'s 20 points (BRAND.md). */
const WORDMARK_TRACKING = -0.6

/** At and below this size the coil drops a turn so its gaps stay open. */
const COMPACT_AT = 32

/**
 * One coil, drawn. Shared by the mark and the display lockup.
 *
 * The mask id is per-instance. It used to be the constant `nowry-mark-eye`,
 * harmless only while one coil was ever on screen at a time — two would have
 * shared a mask, and the display lockup puts a second coil on the page.
 */
function Coil({ mark, size, fill }) {
  const maskId = `nowry-mark-eye-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

  return (
    <Svg width={size} height={size} viewBox={mark.viewBox} accessible={false}>
      <Defs>
        <Mask id={maskId}>
          <Rect width='100' height='100' fill='white' />
          <Circle cx={mark.eye.cx} cy={mark.eye.cy} r={mark.eye.r} fill='black' />
        </Mask>
      </Defs>
      <G mask={`url(#${maskId})`} fill={fill}>
        <Path d={mark.body} />
        <Circle cx={mark.head.cx} cy={mark.head.cy} r={mark.head.r} />
        <Circle cx={mark.tail.cx} cy={mark.tail.cy} r={mark.tail.r} />
      </G>
    </Svg>
  )
}

export function BrandMark({ size = 24, color = 'text.primary' }) {
  const theme = useTheme()
  const fill = resolveColor(theme, color)
  const mark = useMemo(() => spiralMark({ preset: size <= COMPACT_AT ? 'compact' : 'full', pad: 0.02 }), [size])

  return <Coil mark={mark} size={size} fill={fill} />
}

/**
 * The mark and the `nowry` wordmark, as one unit — the same lockup the web's
 * header carries. The word is the brand's name, the same in every locale.
 */
export function BrandLockup({ markSize = 28, color = 'text.primary' }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <BrandMark size={markSize} color={color} />
      <Typography level='h4' weight='xl' color={color} style={{ letterSpacing: WORDMARK_TRACKING }}>
        nowry
      </Typography>
    </View>
  )
}

/**
 * The display lockup: the coil in place of the `o` (BRAND-009).
 *
 * Takes a LEVEL, not a size in points — DESIGN_GUIDELINES §4 says name a level,
 * and both display levels clear the geometry's floor. If a level below it is
 * ever added, this falls back to the standard lockup rather than drawing a coil
 * whose turns have merged.
 */
export function BrandWordmark({ level = 'display-md', color = 'text.primary' }) {
  const theme = useTheme()
  const fill = resolveColor(theme, color)
  const fontSize = TYPE_LEVELS[level]?.fontSize
  const fit = useMemo(() => wordmarkCoil(fontSize), [fontSize])

  if (!fit) return <BrandLockup color={color} />

  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline' }} accessible accessibilityRole='image' accessibilityLabel='nowry'>
      <Typography level={level} weight='xl' color={color} style={{ letterSpacing: WORDMARK_TRACKING }}>
        n
      </Typography>
      <View style={{ marginHorizontal: fit.side, transform: [{ translateY: fit.drop }] }}>
        <Coil mark={fit.mark} size={fit.size} fill={fill} />
      </View>
      <Typography level={level} weight='xl' color={color} style={{ letterSpacing: WORDMARK_TRACKING }}>
        wry
      </Typography>
    </View>
  )
}

export default BrandMark

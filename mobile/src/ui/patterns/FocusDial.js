/**
 * The focus dial: the clock, and the cycle as the ring around it (MOB-104).
 *
 * Direction A of the Focus tab canvas — "the clock is the screen". The phone
 * drew the web's corner widget at full width: a 28pt clock, a 6pt dot per
 * session, and two thirds of a screen empty underneath. Here the time takes the
 * space and the four dots become the ring, so one object says how far through
 * this session and how far through the cycle you are. The arcs come from
 * `ringArcs` in the shared package.
 *
 * The ring is one image with one sentence for a screen reader — the same
 * sentence the dots carried — and the clock beside it stays live text.
 */
import { View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { useTheme } from '../../theme'
import { Typography, resolveColor } from '../Typography'

/** The ring's stroke, in points. Thick enough to read as a track at arm's length. */
const STROKE = 8

export function FocusDial({ size, arcs, clock, caption, ringLabel }) {
  const theme = useTheme()
  const radius = (size - STROKE) / 2
  const circumference = 2 * Math.PI * radius
  const track = resolveColor(theme, 'background.level2')
  const fill = resolveColor(theme, 'primary.solidBg')

  // A dash of `length` starting `start` of the way round. SVG dashes run from
  // three o'clock, so the whole drawing is turned a quarter back to twelve.
  const arc = (start, length, color, key) => (
    <Circle
      key={key}
      cx={size / 2}
      cy={size / 2}
      r={radius}
      fill='none'
      stroke={color}
      strokeWidth={STROKE}
      strokeDasharray={`${length * circumference} ${circumference}`}
      strokeDashoffset={-start * circumference}
    />
  )

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View accessible accessibilityRole='image' accessibilityLabel={ringLabel} style={{ position: 'absolute', top: 0, left: 0 }}>
        <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
          {arcs.map(({ start, length }, index) => arc(start, length, track, `track-${index}`))}
          {arcs.map(({ start, length, fill: share }, index) => (share > 0 ? arc(start, length * share, fill, `fill-${index}`) : null))}
        </Svg>
      </View>

      <Typography level='display-lg' style={{ fontVariant: ['tabular-nums'] }}>
        {clock}
      </Typography>
      <Typography level='body-sm' color='text.tertiary'>
        {caption}
      </Typography>
    </View>
  )
}

export default FocusDial

/**
 * Chip — a small, non-key control for filters and counts.
 *
 * Deliberately NOT a button: it carries no edge and does not travel. The key's
 * signature belongs to actions, and a filter row of eight travelling keys would
 * turn a quiet toolbar into a keyboard (BUTTONS.md §1, §9).
 *
 * State is a ground, never a hue (§15.5): a selected chip sits on `level2` and
 * says so with `selected`, rather than turning the accent colour.
 *
 * `size='sm'` is the house default for filter chips, per the frontend rules.
 */
import { Pressable, View } from 'react-native'
import { useTheme } from '../theme'
import { Typography, resolveColor } from './Typography'
import { MIN_TOUCH_TARGET } from './buttonSpec'

const SIZES = {
  sm: { height: 28, paddingX: 10, level: 'body-xs' },
  md: { height: 32, paddingX: 12, level: 'title-sm' }
}

export function Chip({ children, onPress, selected = false, size = 'sm', accessibilityLabel, startGlyph, style, ...rest }) {
  const theme = useTheme()
  const spec = SIZES[size]

  if (__DEV__ && !spec) throw new Error(`Chip: unknown size "${size}". Use sm or md.`)

  const shortfall = Math.max(0, MIN_TOUCH_TARGET - spec.height)
  const slop = shortfall / 2

  const body = (
    <View
      style={{
        height: spec.height,
        paddingHorizontal: spec.paddingX,
        borderRadius: theme.radius.sm,
        backgroundColor: resolveColor(theme, selected ? 'background.level2' : 'background.level1'),
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
      }}
    >
      {startGlyph}
      <Typography level={spec.level} color={selected ? 'text.primary' : 'text.secondary'} numberOfLines={1}>
        {children}
      </Typography>
    </View>
  )

  if (!onPress) return <View style={style}>{body}</View>

  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: slop, bottom: slop, left: 0, right: 0 }}
      accessibilityRole='button'
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? (typeof children === 'string' ? children : undefined)}
      style={style}
      {...rest}
    >
      {body}
    </Pressable>
  )
}

export default Chip

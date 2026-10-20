/**
 * The session's count, as the door to its queue (MOB-108, MOB-117; ADR-042).
 *
 * Shaped after `MarkToggle`, `SpeakToggle` and `AskToggle`, which share its
 * row. It was a 32-high chip beside three 44-high keys, so the one control that
 * opens the queue was the smallest thing on the row and read as a label. Same
 * height, radius and ground as its neighbours now; the chevron is what says it
 * opens, and `selected` holds while the sheet is up.
 */
import { Pressable } from 'react-native'
import { useTheme } from '../../theme'
import { Typography, resolveColor } from '../Typography'
import { Icon } from '../icons'
import { MIN_TOUCH_TARGET } from '../buttonSpec'

export function QueueReadout({ children, open = false, onPress, accessibilityLabel, style }) {
  const theme = useTheme()

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole='button'
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ expanded: open, selected: open }}
      style={({ pressed }) => [
        {
          minHeight: MIN_TOUCH_TARGET,
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing[0.5],
          paddingHorizontal: theme.spacing[1.5],
          borderRadius: theme.radius.md,
          opacity: pressed ? 0.7 : 1,
          backgroundColor: resolveColor(theme, open ? 'background.level2' : 'background.level1')
        },
        style
      ]}
    >
      <Typography level='title-sm' color='text.primary' style={{ fontVariant: ['tabular-nums'] }}>
        {children}
      </Typography>
      <Icon name='ChevronDown' size='sm' color='text.tertiary' />
    </Pressable>
  )
}

export default QueueReadout

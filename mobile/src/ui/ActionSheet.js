/**
 * ActionSheet — the mobile answer to the web's Menu and Dropdown.
 *
 * A dropdown anchored to its trigger is a pointer idea: it needs somewhere to
 * open into and something precise to open from. On a phone the same choice is a
 * list from the bottom edge, where the thumb already is.
 *
 * Destructive rows are named, not coloured only — `danger.plainColor` on the
 * label plus its own position at the end, so the row that deletes is not one
 * pixel from the row that renames.
 */
import { View } from 'react-native'
import { BottomSheet } from './BottomSheet'
import { Divider } from './Divider'
import { Typography } from './Typography'
import { useTheme } from '../theme'
import { MIN_TOUCH_TARGET } from './buttonSpec'
import { Pressable } from 'react-native'

export function ActionSheet({ visible, onClose, title, actions = [], accessibilityLabel }) {
  const theme = useTheme()

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} accessibilityLabel={accessibilityLabel ?? title}>
      <View>
        {actions.map((action, i) => (
          <View key={action.id ?? action.label}>
            {i > 0 ? <Divider /> : null}
            <Pressable
              onPress={() => {
                onClose?.()
                action.onPress?.()
              }}
              disabled={action.disabled}
              accessibilityRole='menuitem'
              accessibilityLabel={action.label}
              accessibilityState={{ disabled: Boolean(action.disabled) }}
              style={({ pressed }) => ({
                minHeight: MIN_TOUCH_TARGET,
                justifyContent: 'center',
                paddingHorizontal: theme.spacing[1],
                borderRadius: theme.radius.md,
                opacity: action.disabled ? 0.45 : 1,
                backgroundColor: pressed ? theme.palette.background.level2 : 'transparent'
              })}
            >
              <Typography level='body-md' color={action.destructive ? 'danger.plainColor' : 'text.primary'}>
                {action.label}
              </Typography>
            </Pressable>
          </View>
        ))}
      </View>
    </BottomSheet>
  )
}

export default ActionSheet

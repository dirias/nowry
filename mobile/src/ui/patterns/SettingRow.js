/**
 * One setting: what it is, what it does, and the control that changes it
 * (MOB-091).
 *
 * The shape a phone settings screen is made of, and the reason it is a pattern
 * rather than three elements written out twelve times: the DESCRIPTION is the
 * part that gets dropped. The web has room for a paragraph under every label
 * and uses it; a phone screen that drops them leaves a column of switches whose
 * names are the only explanation, and "Focus mode" explains nothing.
 *
 * **The whole row is the target when the control is a switch.** A 51pt switch
 * at the right edge of a 390pt screen is a small target a long way from where
 * the eye is reading. Pressing the row does what pressing the switch does,
 * which is what both platforms' settings apps do, and the row carries the
 * accessible name and state so a screen reader hears one control rather than a
 * label and a switch separately.
 */
import { Pressable, View } from 'react-native'
import { useTheme } from '../../theme'
import { Typography } from '../Typography'
import { MIN_TOUCH_TARGET } from '../buttonSpec'

export function SettingRow({ label, description, children, onPress, value, disabled = false, style }) {
  const theme = useTheme()

  const body = (
    <View style={{ flex: 1, minWidth: 0, gap: theme.spacing[0.5] }}>
      <Typography level='title-sm' color={disabled ? 'text.tertiary' : 'text.primary'}>
        {label}
      </Typography>
      {description ? (
        <Typography level='body-xs' color='text.tertiary'>
          {description}
        </Typography>
      ) : null}
    </View>
  )

  const layout = [
    {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[2],
      minHeight: MIN_TOUCH_TARGET,
      paddingVertical: theme.spacing[1],
      opacity: disabled ? 0.45 : 1
    },
    style
  ]

  // Without a press handler this is a row that happens to hold a control the
  // caller wires itself — a name and a description beside something.
  if (!onPress) {
    return (
      <View style={layout}>
        {body}
        {children}
      </View>
    )
  }

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole='switch'
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={label}
      accessibilityHint={description}
      style={({ pressed }) => [...layout, { opacity: disabled ? 0.45 : pressed ? 0.7 : 1 }]}
    >
      {body}
      {/* The control is drawn but not reachable on its own: the row already
          announces itself as the switch, and two focus stops for one setting is
          how a screen reader user hears every option twice. */}
      <View pointerEvents='none' importantForAccessibility='no-hide-descendants' accessible={false}>
        {children}
      </View>
    </Pressable>
  )
}

export default SettingRow

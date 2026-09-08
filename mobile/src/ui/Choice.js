/**
 * Checkbox and Radio.
 *
 * One file, because they are the same control with two shapes and two
 * accessibility roles, and splitting them would duplicate the part that
 * matters: the 44pt target, the label that is part of the hit area, and the
 * state a screen reader reads.
 *
 * State is a ground and a mark, never a hue alone (§15.5) — which also means
 * the control is legible to someone who cannot distinguish the accent.
 */
import { Pressable, View } from 'react-native'
import { useTheme } from '../theme'
import { Typography, resolveColor } from './Typography'
import { MIN_TOUCH_TARGET } from './buttonSpec'

const BOX = 22

function Control({ checked, round, disabled, label, onPress, accessibilityRole, style, ...rest }) {
  const theme = useTheme()

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={typeof label === 'string' ? label : undefined}
      // The label is part of the target, not decoration beside it.
      style={[
        { minHeight: MIN_TOUCH_TARGET, flexDirection: 'row', alignItems: 'center', gap: theme.spacing[1], opacity: disabled ? 0.45 : 1 },
        style
      ]}
      {...rest}
    >
      <View
        style={{
          width: BOX,
          height: BOX,
          borderRadius: round ? BOX / 2 : theme.radius.sm,
          borderWidth: 2,
          borderColor: resolveColor(theme, checked ? 'primary.solidBg' : 'neutral.outlinedBorder'),
          backgroundColor: checked ? resolveColor(theme, 'primary.solidBg') : 'transparent',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {checked ? (
          round ? (
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: resolveColor(theme, 'primary.solidColor') }} />
          ) : (
            // A mark, not only a fill: the state must survive a palette the
            // viewer cannot distinguish.
            <Typography level='body-xs' color='primary.solidColor'>
              ✓
            </Typography>
          )
        ) : null}
      </View>
      {typeof label === 'string' ? (
        <Typography level='body-md' color='text.primary'>
          {label}
        </Typography>
      ) : (
        label
      )}
    </Pressable>
  )
}

export function Checkbox({ checked = false, ...rest }) {
  return <Control checked={checked} round={false} accessibilityRole='checkbox' {...rest} />
}

export function Radio({ checked = false, ...rest }) {
  return <Control checked={checked} round accessibilityRole='radio' {...rest} />
}

export default Checkbox

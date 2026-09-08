/**
 * Input — a text field that is told what keyboard to raise.
 *
 * `keyboardType`, `returnKeyType` and `autoCapitalize` are props with no
 * defaults worth guessing. A guess here is not a small mistake: an email field
 * that capitalises the first letter, or a number field that raises a QWERTY
 * keyboard, is a field the user has to fight on every entry.
 *
 * The field is 44 tall at minimum, and grows with the OS font setting rather
 * than clipping, which is why the height is a floor and not a fixed value.
 */
import { forwardRef } from 'react'
import { TextInput } from 'react-native'
import { useTheme } from '../theme'
import { resolveColor } from './Typography'
import { MIN_TOUCH_TARGET } from './buttonSpec'
import { TYPE_LEVELS } from './typeLevels'

export const Input = forwardRef(function Input(
  { value, onChangeText, placeholder, invalid = false, multiline = false, accessibilityLabel, editable = true, style, ...rest },
  ref
) {
  const theme = useTheme()
  const level = TYPE_LEVELS['body-md']

  return (
    <TextInput
      ref={ref}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={resolveColor(theme, 'text.tertiary')}
      editable={editable}
      multiline={multiline}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !editable }}
      // React Native has no aria-invalid; this is what a screen reader reads.
      accessibilityHint={invalid ? 'Invalid' : undefined}
      style={[
        {
          minHeight: multiline ? MIN_TOUCH_TARGET * 2 : MIN_TOUCH_TARGET,
          paddingHorizontal: theme.spacing[1.5],
          paddingVertical: theme.spacing[1],
          borderRadius: theme.radius.md,
          borderWidth: 1,
          // Colour is added to the message, never instead of it.
          borderColor: resolveColor(theme, invalid ? 'danger.plainColor' : 'neutral.outlinedBorder'),
          backgroundColor: resolveColor(theme, 'background.surface'),
          color: resolveColor(theme, 'text.primary'),
          fontSize: level.fontSize,
          textAlignVertical: multiline ? 'top' : 'center'
        },
        style
      ]}
      {...rest}
    />
  )
})

export default Input

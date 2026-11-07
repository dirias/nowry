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
 *
 * **The frame is a row, not the TextInput itself** (MOB-126). The web's fields
 * carry a leading glyph and, on a password, a show/hide toggle; the phone's
 * drew bare rectangles, which was one of the eight faults on the front-door
 * canvas. `startGlyph` names an icon drawn inside the frame at the rail;
 * `secure` hides the text, shows the web's dots as the placeholder, and offers
 * the eye. A plain field renders exactly as before.
 */
import { forwardRef, useState } from 'react'
import { TextInput, View } from 'react-native'
import { useTheme } from '../theme'
import { resolveColor } from './Typography'
import { IconButton } from './IconButton'
import { Icon } from './icons'
import { MIN_TOUCH_TARGET } from './buttonSpec'
import { TYPE_LEVELS } from './typeLevels'
import { useTranslation } from 'react-i18next'

/** What a password field shows before anything is typed — the web's own placeholder. */
const PASSWORD_DOTS = '••••••••'

export const Input = forwardRef(function Input(
  {
    value,
    onChangeText,
    placeholder,
    invalid = false,
    multiline = false,
    accessibilityLabel,
    editable = true,
    startGlyph = null,
    secure = false,
    style,
    ...rest
  },
  ref
) {
  const { t } = useTranslation()
  const theme = useTheme()
  const level = TYPE_LEVELS['body-md']
  const [shown, setShown] = useState(false)

  return (
    <View
      style={[
        {
          minHeight: multiline ? MIN_TOUCH_TARGET * 2 : MIN_TOUCH_TARGET,
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          gap: theme.spacing[1],
          paddingHorizontal: theme.spacing[1.5],
          borderRadius: theme.radius.md,
          borderWidth: 1,
          // Colour is added to the message, never instead of it.
          borderColor: resolveColor(theme, invalid ? 'danger.plainColor' : 'neutral.outlinedBorder'),
          backgroundColor: resolveColor(theme, 'background.surface')
        },
        style
      ]}
    >
      {startGlyph ? (
        <View style={multiline ? { paddingTop: theme.spacing[1.5] } : null}>
          <Icon name={startGlyph} size='md' color='text.tertiary' />
        </View>
      ) : null}

      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? (secure ? PASSWORD_DOTS : undefined)}
        placeholderTextColor={resolveColor(theme, 'text.tertiary')}
        editable={editable}
        multiline={multiline}
        secureTextEntry={secure && !shown}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: !editable }}
        // React Native has no aria-invalid; this is what a screen reader reads,
        // so it is a translated string like everything else a person hears.
        accessibilityHint={invalid ? t('form.invalidField') : undefined}
        style={{
          flex: 1,
          minHeight: multiline ? MIN_TOUCH_TARGET * 2 - 2 : MIN_TOUCH_TARGET - 2,
          paddingHorizontal: 0,
          paddingVertical: theme.spacing[1],
          color: resolveColor(theme, 'text.primary'),
          fontSize: level.fontSize,
          textAlignVertical: multiline ? 'top' : 'center'
        }}
        {...rest}
      />

      {secure ? (
        // The toggle is a key of its own inside the frame, pulled to the rail
        // so its 32-point face sits where the eye expects it (BUTTONS.md §5).
        <IconButton
          size='sm'
          onPress={() => setShown((current) => !current)}
          accessibilityLabel={t(shown ? 'auth.hidePassword' : 'auth.showPassword')}
          style={{ marginRight: -theme.spacing[1] }}
        >
          <Icon name={shown ? 'EyeOff' : 'Eye'} size='sm' color='text.tertiary' />
        </IconButton>
      ) : null}
    </View>
  )
})

export default Input

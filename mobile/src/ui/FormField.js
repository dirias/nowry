/**
 * FormField — label, control, and the one line under it.
 *
 * The web's `FormFieldFrame` exists because wiring `aria-invalid` and
 * `aria-describedby` by hand at every call site is how a field ends up
 * announcing nothing. This is the same idea with React Native's vocabulary,
 * and the same contract:
 *
 *   - `labelKey`, `helperKey`, `errorKey` are translation KEYS, never rendered
 *     strings. The state core that produces them has no `t()` and must not.
 *   - The error REPLACES the helper. Two lines under one field is a field
 *     arguing with itself.
 *   - **The error is text.** Colour is added on top, never instead: a red
 *     outline alone says something is wrong to some people and nothing at all
 *     to others.
 */
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../theme'
import { Typography } from './Typography'
import { messageFor } from './formMessage'

export function FormField({ labelKey, helperKey = null, errorKey = null, required = false, children, style }) {
  const { t } = useTranslation()
  const theme = useTheme()
  // The error replaces the helper; never both. The rule lives in formMessage.js
  // so it can be tested without a device runtime.
  const { key: messageKey, invalid } = messageFor(errorKey, helperKey)

  return (
    <View style={[{ gap: 6 }, style]}>
      <Typography level='title-sm' color='text.secondary'>
        {t(labelKey)}
        {required ? ' *' : ''}
      </Typography>

      {typeof children === 'function' ? children({ invalid, theme }) : children}

      {messageKey ? (
        <Typography
          level='body-xs'
          color={invalid ? 'danger.plainColor' : 'text.tertiary'}
          accessibilityLiveRegion={invalid ? 'polite' : 'none'}
        >
          {t(messageKey)}
        </Typography>
      ) : null}
    </View>
  )
}

export default FormField

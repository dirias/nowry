/**
 * Read this card aloud, as one labelled key (MOB-077).
 *
 * Shaped after `MarkToggle`, which shares the session's header row with it, for
 * the reason that file records: an unnamed glyph at the edge of a row is how a
 * feature goes undiscovered for a cycle. Two controls side by side that are the
 * same object with different words read as a pair; a pill beside a bare icon
 * reads as a mistake.
 *
 * **The word changes with the state**, and it is the accessible name — so the
 * name a screen reader announces is the one on screen (WCAG 2.5.3), and
 * `selected` carries the state instead of a longer label.
 *
 * **Stop, not pause.** `Speech.pause()` is iOS-only; on Android a pause control
 * would do nothing at all. One honest verb on both platforms beats one that
 * works on the minority of these devices.
 */
import { Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../theme'
import { Typography, resolveColor } from '../Typography'
import { Icon } from '../icons'
import { MIN_TOUCH_TARGET } from '../buttonSpec'

export function SpeakToggle({ speaking = false, onPress, style }) {
  const { t } = useTranslation()
  const theme = useTheme()

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole='button'
      accessibilityState={{ selected: speaking }}
      style={({ pressed }) => [
        {
          minHeight: MIN_TOUCH_TARGET,
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing[0.5],
          paddingHorizontal: theme.spacing[1],
          borderRadius: theme.radius.md,
          opacity: pressed ? 0.7 : 1,
          backgroundColor: resolveColor(theme, speaking ? 'background.level2' : 'background.level1')
        },
        style
      ]}
    >
      <Icon name={speaking ? 'Pause' : 'Volume2'} size='sm' color={speaking ? 'text.primary' : 'text.tertiary'} />
      <Typography level='body-sm' color={speaking ? 'text.primary' : 'text.secondary'}>
        {speaking ? t('tts.stop') : t('tts.listen')}
      </Typography>
    </Pressable>
  )
}

export default SpeakToggle

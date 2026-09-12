/**
 * Ask the companion about this card (MOB-086).
 *
 * Shaped after `MarkToggle` and `SpeakToggle`, which share the session's header
 * row with it. Three controls that act on the same card should be one object
 * repeated, not three drawings of three ideas — and `MarkToggle`'s own note
 * records why none of them is a bare glyph: an unnamed icon at the edge of a
 * row is how a feature goes undiscovered for a whole cycle.
 *
 * It carries no state, so unlike its two neighbours it has no `selected` and no
 * second word. Pressing it leaves the screen.
 */
import { Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../theme'
import { Typography, resolveColor } from '../Typography'
import { Icon } from '../icons'
import { MIN_TOUCH_TARGET } from '../buttonSpec'

export function AskToggle({ onPress, style }) {
  const { t } = useTranslation()
  const theme = useTheme()

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole='button'
      accessibilityLabel={t('agent.aria.openBuddy')}
      style={({ pressed }) => [
        {
          minHeight: MIN_TOUCH_TARGET,
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing[0.5],
          paddingHorizontal: theme.spacing[1],
          borderRadius: theme.radius.md,
          opacity: pressed ? 0.7 : 1,
          backgroundColor: resolveColor(theme, 'background.level1')
        },
        style
      ]}
    >
      <Icon name='MessageSquareText' size='sm' color='text.tertiary' />
      <Typography level='body-sm' color='text.secondary'>
        {t('agent.chat.ask')}
      </Typography>
    </Pressable>
  )
}

export default AskToggle

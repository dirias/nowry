/**
 * The user's mark on a card, as one labelled key (ADR-010, ADR-011).
 *
 * This is the INTENT axis, not the difficulty one: it records that the user
 * wants to come back to this card. It never grades and the scheduler never
 * reads it. The optimism, the rollback and the follow-the-card behaviour are
 * `useCardMark` in the shared package, which the web's own toggle uses too.
 *
 * **Labelled, not a glyph.** The web has both appearances and its comment says
 * why this one is here: an unnamed glyph out at the edge of a row is how the
 * feature went undiscovered for a whole cycle. A phone's session header has
 * room for one control and no tooltip to explain it, so the label is not
 * optional here the way it is on a wide screen.
 *
 * **Deliberately monochrome.** The four semantic colours are Again, Hard, Good
 * and Easy on this exact screen, so a tinted mark would read as a grade. State
 * is the glyph fill, the ground and the word.
 */
import { Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useCardMark } from '@nowry/core/hooks/useCardMark'
import { useTheme } from '../../theme'
import { Typography, resolveColor } from '../Typography'
import { Icon } from '../icons'
import { MIN_TOUCH_TARGET } from '../buttonSpec'

export function MarkToggle({ card, onMarkChange, style }) {
  const { t } = useTranslation()
  const theme = useTheme()
  const { cardId, marked, pending, toggle } = useCardMark(card, onMarkChange)

  if (!cardId) return null

  return (
    <Pressable
      onPress={toggle}
      disabled={pending}
      accessibilityRole='button'
      /*
       * No `accessibilityLabel`. The visible word IS the accessible name, and
       * keeping "Remove mark" as the name beside a visible "Marked" fails WCAG
       * 2.5.3 (Label in Name). `selected` carries the state the longer name
       * was there to convey.
       */
      accessibilityState={{ selected: marked, disabled: pending }}
      style={({ pressed }) => [
        {
          minHeight: MIN_TOUCH_TARGET,
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing[0.5],
          paddingHorizontal: theme.spacing[1],
          borderRadius: theme.radius.md,
          opacity: pressed || pending ? 0.7 : 1,
          backgroundColor: resolveColor(theme, marked ? 'background.level2' : 'background.level1')
        },
        style
      ]}
    >
      {/* Filled when it is on, outline when it is off — the web's own
          Bookmark/BookmarkBorder pair, which lucide draws as one glyph with a
          fill. `fill` takes a colour, so it is resolved from the same token the
          stroke uses rather than left as a boolean. */}
      <Icon
        name='Bookmark'
        size='sm'
        color={marked ? 'text.primary' : 'text.tertiary'}
        fill={marked ? resolveColor(theme, 'text.primary') : 'none'}
      />
      <Typography level='body-sm' color={marked ? 'text.primary' : 'text.secondary'}>
        {marked ? t('cards.mark.actionOn') : t('cards.mark.action')}
      </Typography>
    </Pressable>
  )
}

export default MarkToggle

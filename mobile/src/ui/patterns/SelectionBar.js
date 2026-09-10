/**
 * What you can do to the cards you picked (PhoneSelection artboard).
 *
 * A bar across the foot of the screen, full-bleed, above the list it acts on.
 * Four columns of an icon over a word, because four labelled keys do not fit
 * across 390px in a row and four unlabelled glyphs are a guessing game.
 *
 * **No solid.** The Management board says so outright, and the reason is that
 * none of these four is the obvious one — Move, Tag, Mark and Delete are four
 * different intentions, and a solid would pick one for the user. Delete carries
 * the danger colour instead, which is a warning rather than an invitation.
 *
 * The bar replaces the toolbar rather than sitting under it, so the list never
 * moves when a selection starts.
 */
import { Pressable, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../theme'
import { Typography, resolveColor } from '../Typography'
import { Icon } from '../icons'

const COLUMN_HEIGHT = 56

/** The board's four, in its order. Delete last, and the only one in danger. */
export const BULK_ACTIONS = [
  { action: 'move', glyph: 'FolderInput', labelKey: 'cards.select.moveTo' },
  { action: 'tag', glyph: 'Tag', labelKey: 'cards.select.tag' },
  { action: 'mark', glyph: 'Bookmark', labelKey: 'cards.mark.action', unmarkKey: 'cards.select.unmark' },
  { action: 'delete', glyph: 'Trash', labelKey: 'cards.deck.delete', danger: true }
]

/** Mark reads Unmark once everything picked is already marked, as on the web. */
export function SelectionBar({ onAction, allMarked = false, disabled = false, style }) {
  const { t } = useTranslation()
  const theme = useTheme()

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          borderTopWidth: 1,
          borderTopColor: resolveColor(theme, 'divider'),
          backgroundColor: resolveColor(theme, 'background.body'),
          paddingTop: theme.spacing[0.5],
          paddingHorizontal: theme.spacing[1],
          paddingBottom: theme.spacing[1.5]
        },
        style
      ]}
    >
      {BULK_ACTIONS.map(({ action, glyph, labelKey, unmarkKey, danger }) => {
        const color = danger ? 'danger.plainColor' : 'text.primary'
        const label = t(allMarked && unmarkKey ? unmarkKey : labelKey)
        return (
          <Pressable
            key={action}
            onPress={disabled ? undefined : () => onAction?.(action)}
            disabled={disabled}
            accessibilityRole='button'
            accessibilityLabel={label}
            accessibilityState={{ disabled }}
            style={({ pressed }) => ({
              flex: 1,
              height: COLUMN_HEIGHT,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              opacity: disabled ? 0.45 : 1,
              borderRadius: theme.radius.md,
              backgroundColor: pressed ? resolveColor(theme, 'background.level1') : 'transparent'
            })}
          >
            <Icon name={glyph} size='sm' color={color} />
            <Typography level='body-xs' color={color}>
              {label}
            </Typography>
          </Pressable>
        )
      })}
    </View>
  )
}

export default SelectionBar

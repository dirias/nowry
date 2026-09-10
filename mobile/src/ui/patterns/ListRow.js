/**
 * ListRow — one row for every list (ADR-021 §2, §15.11).
 *
 * `identityTile` · name with a meta line · measure · readout · action, at the
 * `xs` row height, with hairlines between rows. The eye reads *same shape means
 * same class of thing*, so a deck, an event and a book are all this row; four
 * drawings of one deck cannot be learned, and one row can.
 *
 * The web's hover ground becomes a pressed ground here, since a phone has no
 * pointer to hover with. Everything else is the same grammar.
 */
import { Pressable, View } from 'react-native'
import { useTheme } from '../../theme'
import { Typography, resolveColor } from '../Typography'
import { LIST_ROW_HEIGHT } from './rowSpec'

export function ListRow({ tile, name, meta, measure, readout, action, onPress, onLongPress, accessibilityLabel, style }) {
  const theme = useTheme()

  const body = (pressed) => (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing[2],
          minHeight: LIST_ROW_HEIGHT,
          paddingHorizontal: theme.spacing[1.5],
          borderRadius: theme.radius.md,
          backgroundColor: pressed ? resolveColor(theme, 'background.level1') : 'transparent'
        },
        style
      ]}
    >
      {tile}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Typography level='title-sm' color='text.primary' numberOfLines={1}>
          {name}
        </Typography>
        {meta ? (
          <Typography level='body-xs' color='text.tertiary' numberOfLines={1}>
            {meta}
          </Typography>
        ) : null}
      </View>
      {measure}
      {readout}
      {action}
    </View>
  )

  if (!onPress && !onLongPress) return body(false)

  return (
    <Pressable
      onPress={onPress}
      // A long press is how a phone starts a selection; the web uses a hover
      // checkbox, which a phone has no pointer for.
      onLongPress={onLongPress}
      accessibilityRole='button'
      accessibilityLabel={accessibilityLabel ?? (typeof name === 'string' ? name : undefined)}
    >
      {({ pressed }) => body(pressed)}
    </Pressable>
  )
}

export default ListRow

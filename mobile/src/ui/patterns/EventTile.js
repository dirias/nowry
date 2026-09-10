/**
 * The tile a calendar event wears: its area's colour, its type's glyph.
 *
 * The web's own anatomy (ADR-019), 28pt here as there. Colour keeps its full
 * identity in a small area while the title sits on a neutral surface, so a
 * dense agenda stays readable and the row never becomes a coloured band.
 *
 * The fill is a focus area's colour — user data, not a token — which is the one
 * case `Icon` takes a literal: the glyph's colour is derived from the fill it
 * sits on with the same helper the accent swatches use, so a pale area does not
 * get a white glyph.
 *
 * Out of the accessibility tree on purpose. The row already says the type in
 * words, and a tile that repeats it is a second announcement of one fact.
 */
import { View } from 'react-native'
import { readableTextOn } from '@nowry/core/tokens/colorSchemeGenerator'
import { eventType } from '@nowry/core/domain/calendar/eventTypes'
import { Icon } from '../icons'
import { KEY_TO_LUCIDE } from '../icons/iconMap'
import { useTheme } from '../../theme'

export const EVENT_TILE_SIZE = 28

export function EventTile({ type, color, size = EVENT_TILE_SIZE }) {
  const theme = useTheme()
  const { iconKey } = eventType(type)

  return (
    <View
      importantForAccessibility='no'
      accessible={false}
      style={{
        width: size,
        height: size,
        borderRadius: theme.radius.sm,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: color
      }}
    >
      <Icon name={KEY_TO_LUCIDE[iconKey]} size='sm' literalColor={readableTextOn(color)} />
    </View>
  )
}

export default EventTile

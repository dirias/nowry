/**
 * The 2px edge under a house key (BUTTONS.md §1), shared by Button and
 * IconButton.
 *
 * Its own layer behind the surface, hidden by opacity while pressed, never by a
 * transparent background. On Android a rounded background that goes to
 * transparent and comes back is redrawn without its radius, so every key that
 * had been pressed once showed a square tile behind its corners.
 */
import { View } from 'react-native'
import { EDGE } from './buttonSpec'

export function KeyEdge({ color, radius, pressed }) {
  return (
    <View
      pointerEvents='none'
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: EDGE,
        bottom: 0,
        borderRadius: radius,
        backgroundColor: color,
        opacity: pressed ? 0 : 1
      }}
    />
  )
}

export default KeyEdge

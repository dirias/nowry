/**
 * IdentityTile — the small square that says which thing this is (ADR-021 §2).
 *
 * 16px on the `sm` radius, carrying the item's own colour. It is what lets the
 * calendar's event and the study centre's deck share one row: the tile is the
 * identity, so the row itself never has to change shape per feature.
 */
import { View } from 'react-native'
import { useTheme } from '../../theme'
import { resolveColor } from '../Typography'

export function IdentityTile({ color = 'primary.solidBg', size = 16, style }) {
  const theme = useTheme()
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: theme.radius.sm,
          flexShrink: 0,
          backgroundColor: color.includes('.') ? resolveColor(theme, color) : color
        },
        style
      ]}
    />
  )
}

export default IdentityTile

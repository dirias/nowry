/**
 * Divider — one hairline, on the semantic `divider` colour.
 *
 * A hairline on a phone is `StyleSheet.hairlineWidth`, not 1: on a 3x screen a
 * one-pixel border is three device pixels and reads as a rule rather than a
 * separation.
 */
import { StyleSheet, View } from 'react-native'
import { useTheme } from '../theme'
import { resolveColor } from './Typography'

export function Divider({ orientation = 'horizontal', style, ...rest }) {
  const theme = useTheme()
  const color = resolveColor(theme, 'divider')
  const size = StyleSheet.hairlineWidth

  return (
    <View
      accessibilityRole='none'
      style={[
        orientation === 'vertical' ? { width: size, alignSelf: 'stretch' } : { height: size, alignSelf: 'stretch' },
        { backgroundColor: color },
        style
      ]}
      {...rest}
    />
  )
}

export default Divider

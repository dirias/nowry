/**
 * Box — a View that speaks tokens.
 *
 * Spacing, radius, colour and elevation are named, never numbers. That is the
 * whole job: a component that reaches for `padding: 13` or `#F0F4F8` has left
 * the design system, and there is no reason to make that easy.
 */
import { View } from 'react-native'
import { useTheme } from '../theme'
import { resolveColor } from './Typography'

export function Box({ bg, padding, paddingX, paddingY, margin, marginX, marginY, radius, border, elevation, style, children, ...rest }) {
  const theme = useTheme()
  const space = (name) => (name === undefined ? undefined : theme.spacing[name])

  const resolved = {
    backgroundColor: bg ? resolveColor(theme, bg) : undefined,
    padding: space(padding),
    paddingHorizontal: space(paddingX),
    paddingVertical: space(paddingY),
    margin: space(margin),
    marginHorizontal: space(marginX),
    marginVertical: space(marginY),
    borderRadius: radius === undefined ? undefined : theme.radius[radius],
    borderWidth: border ? 1 : undefined,
    borderColor: border ? resolveColor(theme, border === true ? 'divider' : border) : undefined,
    ...(elevation ? theme.elevation[elevation] : null)
  }

  return (
    <View style={[resolved, style]} {...rest}>
      {children}
    </View>
  )
}

export default Box

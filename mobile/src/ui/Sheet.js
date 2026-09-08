/**
 * Sheet and Card — the two surfaces.
 *
 * `Sheet` is a plain ground: `background.surface`, `radius.lg`, no border and no
 * shadow. That is what the summary object sits on (ADR-021 §15.10), and it is
 * the default for anything that is a region of the page rather than a thing on
 * it.
 *
 * `Card` is a thing on the page: `level1` with a hairline. It takes an elevation
 * only when it is genuinely lifted, and the default is `none` — depth is spent,
 * not applied (ELEVATION.md §1).
 *
 * Neither accepts a raw shadow. Elevation is a layer name or it is nothing.
 */
import { StyleSheet, View } from 'react-native'
import { useTheme } from '../theme'
import { resolveColor } from './Typography'

export function Sheet({ children, padding = 2, radius = 'lg', bg = 'background.surface', elevation = 'none', style, ...rest }) {
  const theme = useTheme()

  if (__DEV__ && !theme.elevation[elevation]) {
    throw new Error(`Sheet: "${elevation}" is not a layer. Use none, xs, sm, md or lg (ELEVATION.md).`)
  }

  return (
    <View
      style={[
        {
          backgroundColor: resolveColor(theme, bg),
          borderRadius: theme.radius[radius],
          padding: theme.spacing[padding],
          ...theme.elevation[elevation]
        },
        style
      ]}
      {...rest}
    >
      {children}
    </View>
  )
}

export function Card({ children, padding = 2, radius = 'md', elevation = 'none', style, ...rest }) {
  const theme = useTheme()

  return (
    <View
      style={[
        {
          backgroundColor: resolveColor(theme, 'background.level1'),
          borderRadius: theme.radius[radius],
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: resolveColor(theme, 'divider'),
          padding: theme.spacing[padding],
          ...theme.elevation[elevation]
        },
        style
      ]}
      {...rest}
    >
      {children}
    </View>
  )
}

export default Sheet

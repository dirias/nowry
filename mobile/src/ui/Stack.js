/**
 * Stack — the layout primitive, matching the props the web app already writes.
 *
 * Measured across the web client before building this: `spacing` (407 uses),
 * `direction` (326), `alignItems` (243), `justifyContent` (100), `gap` (26) and
 * `flexWrap` (24). Those are the props, and they mean the same things here, so
 * a screen ported from the web reads the same.
 *
 * `spacing` and `gap` are both accepted because both are in use over there;
 * they are the same thing and resolve through the spacing scale.
 */
import { View } from 'react-native'
import { useTheme } from '../theme'

export function Stack({ direction = 'column', spacing, gap, alignItems, justifyContent, flexWrap, flex, style, children, ...rest }) {
  const theme = useTheme()
  const amount = spacing ?? gap
  // A number is a scale KEY, not pixels — `spacing={2}` is the scale's 2.
  const resolvedGap = amount === undefined ? undefined : (theme.spacing[amount] ?? theme.spacing[String(amount)])

  return (
    <View
      style={[
        {
          flexDirection: direction === 'row' ? 'row' : 'column',
          gap: resolvedGap,
          alignItems,
          justifyContent,
          flexWrap,
          flex
        },
        style
      ]}
      {...rest}
    >
      {children}
    </View>
  )
}

export default Stack

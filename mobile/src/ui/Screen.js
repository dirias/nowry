/**
 * Screen — what every route mounts inside.
 *
 * Owns the three things a phone screen gets wrong if each route handles them
 * itself:
 *
 *   - **The notch and the home indicator.** Insets come from
 *     `react-native-safe-area-context`, applied as padding rather than a
 *     `SafeAreaView` wrapper, so a screen can still paint its background edge to
 *     edge while its content stays clear.
 *   - **The keyboard.** `KeyboardAvoidingView` behaves differently per platform
 *     and getting it wrong means a form field under the keyboard, which is the
 *     single most common mobile form bug.
 *   - **The ground.** `background.body`, so no screen paints its own.
 *
 * `scroll` is on by default. At 200% font scale almost everything scrolls, and a
 * screen that assumed it fit is a screen with unreachable content.
 */
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme'
import { resolveColor } from './Typography'

export function Screen({ children, scroll = true, padding = 3, edges = ['top', 'bottom'], style, contentContainerStyle, ...rest }) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()

  const ground = { flex: 1, backgroundColor: resolveColor(theme, 'background.body') }
  const inset = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: insets.left,
    paddingRight: insets.right
  }
  const pad = { padding: theme.spacing[padding] }

  const body = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[{ flexGrow: 1 }, pad, contentContainerStyle]}
      keyboardShouldPersistTaps='handled'
      {...rest}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, pad, contentContainerStyle]} {...rest}>
      {children}
    </View>
  )

  return (
    <KeyboardAvoidingView
      // iOS moves the whole view; Android resizes it. Using one on both puts a
      // field under the keyboard on the other.
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[ground, inset, style]}
    >
      {body}
    </KeyboardAvoidingView>
  )
}

export default Screen

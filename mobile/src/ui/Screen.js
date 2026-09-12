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
 *
 *     An inset is only this screen's when nothing else holds that edge. Under
 *     the tab bar the bottom one belongs to the bar and under the app bar the
 *     top one does; a screen that claimed either again would leave a band of
 *     dead space against chrome that is already clear. `useScreenEdges` answers
 *     which are left; passing `edges` still overrides it.
 *   - **The keyboard.** `KeyboardAvoidingView` behaves differently per platform
 *     and getting it wrong means a form field under the keyboard, which is the
 *     single most common mobile form bug. It works for a screen whose fields
 *     are in the flow and scroll; it does NOT work for one with a control
 *     pinned to the bottom edge under edge-to-edge, which is the case the
 *     bottom sheet already had to solve by measuring. `keyboard='ignore'` opts
 *     out for those, and they pad by `useKeyboardHeight` instead (MOB-085).
 *   - **The ground.** `background.body`, so no screen paints its own.
 *
 * `scroll` is on by default. At 200% font scale almost everything scrolls, and a
 * screen that assumed it fit is a screen with unreachable content.
 */
import { forwardRef } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme'
import { PET_BUBBLE_CLEARANCE } from './patterns/PetBubble'
import { useScreenEdges } from './screenChrome'
import { resolveColor } from './Typography'

/*
 * A ref reaches the SCROLL VIEW, not the outer frame. A screen that needs one
 * needs it to scroll itself — the reader resuming at a saved section is the
 * first — and handing back the keyboard-avoiding wrapper would give a caller
 * something with no `scrollTo` on it (MOB-067).
 */
export const Screen = forwardRef(function Screen(
  { children, scroll = true, padding = 3, edges, keyboard = 'avoid', style, contentContainerStyle, ...rest },
  ref
) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  // Which edges are still this screen's to inset for. See `screenChrome.js`.
  const owned = useScreenEdges()
  const applied = edges ?? owned

  const ground = { flex: 1, backgroundColor: resolveColor(theme, 'background.body') }
  const inset = {
    paddingTop: applied.includes('top') ? insets.top : 0,
    paddingBottom: applied.includes('bottom') ? insets.bottom : 0,
    paddingLeft: insets.left,
    paddingRight: insets.right
  }
  const pad = { padding: theme.spacing[padding] }

  /*
   * Room under the last row for the companion, which floats in that corner on
   * every tab (MOB-089). Reserved in the SCROLL padding only: a screen that
   * does not scroll is one whose content is already sized to the window — the
   * study session is the case, and it does not carry the bubble at all.
   */
  const clearance = { paddingBottom: theme.spacing[padding] + PET_BUBBLE_CLEARANCE }

  const body = scroll ? (
    <ScrollView
      ref={ref}
      style={{ flex: 1 }}
      contentContainerStyle={[{ flexGrow: 1 }, pad, clearance, contentContainerStyle]}
      keyboardShouldPersistTaps='handled'
      {...rest}
    >
      {children}
    </ScrollView>
  ) : (
    <View ref={ref} style={[{ flex: 1 }, pad, contentContainerStyle]} {...rest}>
      {children}
    </View>
  )

  // A screen that measures the keyboard itself must not also be avoided for,
  // or it is compensated twice and its content lands above the keyboard's top.
  if (keyboard === 'ignore') return <View style={[ground, inset, style]}>{body}</View>

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
})

export default Screen

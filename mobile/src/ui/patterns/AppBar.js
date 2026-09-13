/**
 * The app bar every phone artboard draws (Study Center canvas).
 *
 * 56 tall on the accent, the wordmark at the left, the account at the right.
 * It was missing: the phone had navigation at the foot and nothing at the head,
 * so the product's name never appeared anywhere in it.
 *
 * **It is not navigation, and that is why it can coexist with the tab bar.**
 * The web puts its menu in the header because a mouse has a pointer and a wide
 * screen; a phone puts navigation at the bottom, where a thumb reaches. What
 * the header carries on both is identity — the mark, and whose account this is.
 * Splitting them that way is the only reason a phone can have two bars without
 * one of them being redundant.
 *
 * **The bar holds the top inset**, for the same reason the tab bar holds the
 * bottom one: it is the chrome closest to that edge. It grows by the inset
 * rather than moving down, so its ground reaches the top of the window and the
 * status bar sits on the accent rather than on a seam.
 */
import { Image, Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useSegments } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@nowry/core/context/AuthContext'
import { useUserProfile } from '@nowry/core/hooks/useUserProfile'
import { useTheme } from '../../theme'
import { Typography, resolveColor } from '../Typography'
import { Avatar } from './Avatar'
import { Icon } from '../icons'

export const APP_BAR_HEIGHT = 56
const AVATAR = 32

/**
 * Routes that live in the tab group but are pushed rather than tabbed, so they
 * are one level deep even though their path is only two segments.
 *
 * `annual-planning` was in this list and is not a screen: it is a `Redirect`
 * onto the Plan tab's second segment, so it never stays on screen to want a
 * back control, and a redirect that asked for one would be asking on behalf of
 * a tab root. Removed on the chrome pass, and `routes.test.js` now refuses a
 * redirect in this list (MOB-072).
 *
 * `agent` was in this list for one day. The companion's chat is opened from two
 * different tabs and must return to the one it came from, which this shared
 * arrow cannot know: it pops the tab navigator and lands on Home. The chat
 * carries its own close control instead (MOB-087).
 */
const PUSHED_IN_TABS = ['profile', 'settings']

/**
 * Whether this screen was reached from another one.
 *
 * Read off the ROUTE rather than asked of the navigator, because the navigator
 * would say yes on a tab root too: switching tabs is history, and a back arrow
 * on Home pointing at whichever tab you came from is not what a back arrow
 * means. A tab's root is its first two segments; anything deeper was pushed.
 */
const isPushed = (segments) => {
  if (segments[0] !== '(tabs)') return true
  if (segments.length > 2) return true
  return PUSHED_IN_TABS.includes(segments[1])
}

export function AppBar() {
  const { t } = useTranslation()
  const theme = useTheme()
  const router = useRouter()
  const segments = useSegments()
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const { profile } = useUserProfile()

  const photo = profile?.avatar_url || profile?.photo_url || null

  return (
    <View
      style={{
        height: APP_BAR_HEIGHT + insets.top,
        paddingTop: insets.top,
        paddingHorizontal: theme.spacing[2],
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[1.5],
        backgroundColor: resolveColor(theme, 'primary.solidBg')
      }}
    >
      {/*
       * The way back, where a thumb reaches for it.
       *
       * Most screens had none: the goal, the area, the deck, the card editor
       * and settings were all reached by a push and left only the system
       * gesture to return, which is invisible on Android and an edge swipe on
       * iOS. Material would drop the wordmark beside it on a detail screen;
       * this keeps it, because every phone artboard draws the mark in this bar
       * and the row has the width for both.
       */}
      {isPushed(segments) && router.canGoBack() ? (
        <Pressable
          onPress={() => router.back()}
          accessibilityRole='button'
          accessibilityLabel={t('common.goBack')}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, marginLeft: -theme.spacing[1] })}
        >
          <Icon name='ArrowLeft' size='md' color='primary.solidColor' />
        </Pressable>
      ) : null}

      {/* One name, read once: the glyph is decorative beside the word. */}
      <View
        accessibilityRole='header'
        accessibilityLabel='Nowry'
        style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[1] }}
      >
        <Icon name='Leaf' size='md' color='warning.solidBg' />
        <Typography level='title-lg' color='primary.solidColor'>
          Nowry
        </Typography>
      </View>

      <View style={{ flex: 1 }} />

      <Pressable
        onPress={() => router.push('/profile')}
        accessibilityRole='button'
        accessibilityLabel={t('nav.profile')}
        hitSlop={8}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <Avatar uri={photo} name={profile?.username || user?.email || ''} size={AVATAR} />
      </Pressable>
    </View>
  )
}

export default AppBar

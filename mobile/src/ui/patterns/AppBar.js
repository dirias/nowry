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
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@nowry/core/context/AuthContext'
import { useUserProfile } from '@nowry/core/hooks/useUserProfile'
import { useTheme } from '../../theme'
import { Typography, resolveColor } from '../Typography'
import { Icon } from '../icons'

export const APP_BAR_HEIGHT = 56
const AVATAR = 32

export function AppBar() {
  const { t } = useTranslation()
  const theme = useTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const { profile } = useUserProfile()

  const photo = profile?.avatar_url || profile?.photo_url || null
  const initial = (profile?.username || user?.email || '?').trim().charAt(0).toUpperCase()

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
        {photo ? (
          <Image source={{ uri: photo }} style={{ width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2 }} />
        ) : (
          // An initial, not a silhouette: it says whose account this is.
          <View
            style={{
              width: AVATAR,
              height: AVATAR,
              borderRadius: AVATAR / 2,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: resolveColor(theme, 'primary.softBg')
            }}
          >
            <Typography level='title-sm' color='primary.plainColor'>
              {initial}
            </Typography>
          </View>
        )}
      </Pressable>
    </View>
  )
}

export default AppBar

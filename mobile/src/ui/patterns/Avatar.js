/**
 * Whose account this is (MOB-092).
 *
 * The picture if there is one, and the first letter of the name if there is
 * not — an INITIAL rather than a silhouette, because a silhouette says "a
 * person" and an initial says "you". The app bar has drawn exactly this since
 * MOB-048 and the profile needs the same thing four times the size, so it is a
 * pattern rather than a second drawing of one.
 *
 * `size` is a diameter. The ring is always half of it, because a portrait that
 * is nearly round reads as a mistake rather than as a choice.
 */
import { Image, View } from 'react-native'
import { useTheme } from '../../theme'
import { Typography, resolveColor } from '../Typography'

export function Avatar({ uri = null, name = '', size = 32, style }) {
  const theme = useTheme()
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?'

  const shape = [{ width: size, height: size, borderRadius: size / 2 }, style]

  if (uri) return <Image source={{ uri }} style={shape} accessible={false} />

  return (
    <View style={[...shape, { alignItems: 'center', justifyContent: 'center', backgroundColor: resolveColor(theme, 'primary.softBg') }]}>
      <Typography level={size >= 64 ? 'h4' : 'title-sm'} color='primary.plainColor'>
        {initial}
      </Typography>
    </View>
  )
}

export default Avatar

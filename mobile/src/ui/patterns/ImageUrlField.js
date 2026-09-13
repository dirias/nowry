/**
 * An image, given as its web address (MOB-103).
 *
 * The web's `FormImageField`, and this corrects what MOB-102 said about it. That
 * task recorded the cover image as needing an image picker — a native module
 * and a rebuilt binary. It never did: the web's cover image is a URL pasted into
 * a field, with a preview above it. Matching it on a phone is a text field and
 * an `Image`, both already in this client.
 *
 * Its two decisions carry over from the web's own note, because both are right:
 *
 * - **No skeleton over the preview.** An absent image is not a pending one, and
 *   a skeleton would invent a wait for a field that is usually empty.
 * - **A broken URL gets a sentence, not an empty frame.** The server stores any
 *   string, so there is nothing to validate before sending; the only honest
 *   signal is whether the image actually loaded.
 *
 * `preview={false}` keeps the check and drops the picture, for a surface that
 * already shows the image somewhere better — the details sheet draws it on the
 * cover itself.
 */
import { useEffect, useState } from 'react'
import { Image, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../theme'
import { FormField } from '../FormField'
import { Input } from '../Input'
import { Typography } from '../Typography'

export function ImageUrlField({ labelKey, placeholderKey, altKey, errorMessageKey, value = '', onChange, preview = true, inputRef }) {
  const { t } = useTranslation()
  const theme = useTheme()
  const [broken, setBroken] = useState(false)
  const url = (value ?? '').trim()

  /*
   * A new address deserves a fresh attempt. Without a preview there is no
   * `Image` to report an error, so the address is asked for its size instead —
   * the same fetch, and a failure means the same thing.
   */
  useEffect(() => {
    setBroken(false)
    if (!url || preview) return undefined
    let live = true
    Image.getSize(
      url,
      () => {},
      () => live && setBroken(true)
    )
    return () => {
      live = false
    }
  }, [url, preview])

  return (
    <FormField labelKey={labelKey}>
      <View style={{ gap: theme.spacing[1] }}>
        {url && preview && !broken ? (
          <Image
            source={{ uri: url }}
            onError={() => setBroken(true)}
            accessibilityLabel={t(altKey)}
            resizeMode='cover'
            style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: theme.radius.md, backgroundColor: theme.palette.background.level1 }}
          />
        ) : null}

        {url && broken ? (
          <Typography level='body-xs' color='text.tertiary' accessibilityLiveRegion='polite'>
            {t(errorMessageKey)}
          </Typography>
        ) : null}

        <Input
          ref={inputRef}
          value={value ?? ''}
          onChangeText={onChange}
          placeholder={t(placeholderKey)}
          accessibilityLabel={t(labelKey)}
          autoCapitalize='none'
          autoCorrect={false}
          keyboardType='url'
        />
      </View>
    </FormField>
  )
}

export default ImageUrlField

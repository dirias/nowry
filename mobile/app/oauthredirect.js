/**
 * Where Google's callback actually lands (MOB-017).
 *
 * Not a screen anyone navigates to: a route that exists because the redirect
 * arrives here whatever else is tried. `openAuthSessionAsync` was given four
 * different addresses to wait on and caught none of them, and each attempt
 * ended the same way — the authorization code sitting in a URL on an
 * "Unmatched Route" page. This is that page, doing its job instead.
 *
 * It draws almost nothing on purpose. The exchange takes a moment and then the
 * app replaces this route, so anything more would be a screen that flashes.
 */
import { useEffect } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { completeGoogleSignIn } from '../src/platform/googleSignIn'
import { Screen, Skeleton, Stack, Typography } from '../src/ui'

export default function OAuthRedirect() {
  const params = useLocalSearchParams()
  const router = useRouter()
  const { t } = useTranslation()

  useEffect(() => {
    /*
     * The promise this settles belongs to whoever called `signInWithGoogle`,
     * and it handles its own errors — a failure there already reaches the user
     * through the sign-in screen. This only has to leave.
     */
    completeGoogleSignIn(params).finally(() => router.replace('/'))
    // Params are stable for one delivery of this route; re-running on every
    // render would exchange the same code twice, and a code is single-use.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Screen>
      <Stack spacing={2}>
        <Typography level='body-md' color='text.secondary' accessibilityLiveRegion='polite'>
          {t('common.loading')}
        </Typography>
        <Skeleton width='60%' height={20} />
      </Stack>
    </Screen>
  )
}

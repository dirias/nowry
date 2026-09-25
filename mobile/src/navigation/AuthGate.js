/**
 * Holds the first render until Firebase says whether there is a session.
 *
 * This exists because of a failure that is invisible when it happens. Firebase
 * restores a session asynchronously, so for the first frames `currentUser` is
 * null even for a signed-in user. Rendering on that produces a sign-in screen
 * that flashes and vanishes — and worse, any API call made in those frames goes
 * out unauthenticated and comes back 401.
 *
 * `AuthContext` already has the rule: no API call fires before
 * `onAuthStateChanged`. This is that rule expressed as navigation.
 *
 * The splash is deliberately not a spinner. A spinner on a cold start says "this
 * is slow"; a plain ground says nothing, which is the truth — the wait is
 * usually a few frames.
 */
import { useEffect } from 'react'
import { View } from 'react-native'
import { useRouter, useSegments } from 'expo-router'
import { useAuth } from '@nowry/core/context/AuthContext'
import { useTheme } from '../theme'
import { resolveColor } from '../ui/Typography'

/** Routes reachable without a session. Everything else needs one. */
const PUBLIC_GROUP = '(auth)'

export function AuthGate({ children }) {
  const { loading, isAuthenticated } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  const inPublicGroup = segments[0] === PUBLIC_GROUP

  useEffect(() => {
    // Never redirect while the answer is still unknown; that is the flash.
    if (loading) return

    if (!isAuthenticated && !inPublicGroup) {
      // Welcome, not the sign-in form (docs/prd-public-site.md D-M1): a stranger
      // who installs the app meets the product before the gate; a returning
      // user taps Sign in once. A literal, so routes.test can see the target.
      router.replace('/welcome')
    } else if (isAuthenticated && inPublicGroup) {
      router.replace('/')
    }
  }, [loading, isAuthenticated, inPublicGroup, router])

  if (loading) return <Splash />

  return children
}

function Splash() {
  const theme = useTheme()
  return <View style={{ flex: 1, backgroundColor: resolveColor(theme, 'background.body') }} />
}

export default AuthGate

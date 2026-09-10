/**
 * Push, wired to the app's edges (MOB-028). Renders nothing.
 *
 * Two things happen here and nowhere else:
 *
 *   - **Register on sign-in.** Not at launch, and not with a prompt: the device
 *     is registered only if notifications are already permitted, which they are
 *     once the user has started a focus timer or said yes in Settings.
 *   - **Open the screen a tap asks for.** The route comes from a closed table
 *     in `push.js`, not from the payload, so a notification can choose among
 *     the app's screens but cannot invent a destination.
 *
 * Sign-out is deliberately NOT here. Withdrawing the token is an authenticated
 * request, so it has to happen before the session ends — which means at the
 * button the user pressed, not in an effect that runs after `user` becomes null.
 */
import { useEffect } from 'react'
import { useRouter } from 'expo-router'
import { useAuth } from '@nowry/core/context/AuthContext'
import { registerForPush, subscribeToNotificationTaps } from './push'

export function PushBridge() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) return
    registerForPush()
  }, [user])

  useEffect(() => subscribeToNotificationTaps((route) => router.push(route)), [router])

  return null
}

export default PushBridge

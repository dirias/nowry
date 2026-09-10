/**
 * Push registration and the notification tap (MOB-028).
 *
 * v1 sends nothing on a schedule. This is the pipe, established so that when
 * there is something to say the app is already reachable.
 *
 * **Registration follows permission; it never asks for it.** That is the whole
 * of "in context, not at launch": the only reason this app has to notify anyone
 * today is the focus timer's alarm, and the timer asks when a timer starts,
 * which is a moment with an obvious reason. Settings has a second, deliberate
 * ask. Signing in asks nothing — it checks, and registers only if the answer is
 * already yes. Deny, and every screen works exactly as before; there is no
 * gate, no banner and no second prompt.
 *
 * **A tap opens a route from an allowlist, never a URL from the payload.** A
 * notification's `data` is input from outside the app. Following an arbitrary
 * path out of it would let whatever can reach the send path choose a screen —
 * so a payload names a KIND and an id, and this file decides what that means.
 */
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { getLocales } from 'expo-localization'
import { userService } from '@nowry/core/api/services'
import { storage } from '@nowry/core'

/** The last token handed to the server, so sign-out knows what to withdraw. */
const TOKEN_KEY = 'NOWRY_PUSH_TOKEN'

/**
 * What a notification may ask for, and what each one opens.
 *
 * A closed table on purpose. Adding a destination is a deliberate edit here,
 * not something a payload can do on its own.
 */
const DESTINATIONS = {
  study: () => '/study',
  deck: (id) => (id ? `/study/deck/${encodeURIComponent(id)}` : '/study'),
  session: (id) => (id ? `/study/${encodeURIComponent(id)}` : '/study'),
  focus: () => '/pomodoro'
}

/**
 * The route a notification's payload asks for, or null when it asks for
 * something this version does not know how to open.
 */
export const routeFor = (data) => {
  const build = DESTINATIONS[data?.kind]
  if (!build) return null
  const id = data?.id
  // An id is a path segment, so it may not BE a path.
  if (id != null && (typeof id !== 'string' || id.includes('/'))) return null
  return build(id)
}

const projectId = () => Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? null

/**
 * Register this device, but only if notifications are already permitted.
 *
 * Returns the token on success and null on every other outcome — permission not
 * granted, no project id, a simulator with no push service, a failed request.
 * None of those is an error the user should see: push is an extra.
 */
export const registerForPush = async () => {
  try {
    const { granted } = await Notifications.getPermissionsAsync()
    if (!granted) return null

    const id = projectId()
    if (!id) return null

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id })
    if (!token) return null

    await userService.registerDevice({
      token,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      // The phone's language, not the account's: this is where the person is.
      locale: getLocales()[0]?.languageTag ?? 'en'
    })

    storage.set(TOKEN_KEY, token)
    return token
  } catch {
    return null
  }
}

/**
 * Withdraw this device. Must run BEFORE the session ends: the request is
 * authenticated, so a token deregistered after sign-out is a 401 and a row left
 * behind on the server.
 */
export const unregisterFromPush = async () => {
  const token = storage.get(TOKEN_KEY)
  if (!token) return
  try {
    await userService.deregisterDevice(token)
  } catch {
    // The row will be pruned by the send path the first time it fails. Losing
    // the local record is the important half, and it happens either way.
  } finally {
    storage.remove(TOKEN_KEY)
  }
}

/**
 * Listen for a tap. `onRoute` is called with a path this file chose, never one
 * the payload supplied.
 */
export const subscribeToNotificationTaps = (onRoute) => {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const route = routeFor(response?.notification?.request?.content?.data)
    if (route) onRoute(route)
  })
  return () => subscription.remove()
}

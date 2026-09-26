/**
 * The mobile alerts adapter, and the timer alarm behind it (MOB-024).
 *
 * **The alarm is scheduled, not announced.** The web fires its notification at
 * the moment the timer reaches zero, because a browser tab keeps ticking. A
 * backgrounded app does not: JavaScript timers are suspended, so nothing runs
 * at zero to announce anything. The alert has to be handed to the OS when the
 * timer STARTS, with a delay, and withdrawn if the timer is paused or reset.
 * That is `scheduleEndAlarm` / `cancelEndAlarm`, called by the Focus screen.
 *
 * **So `announce` does nothing here, on purpose.** The shared context calls it
 * at completion. In the foreground the scheduled alarm is already firing at
 * that same instant, and announcing again would ring twice for one session.
 *
 * **`play` does nothing either, and there is no audio dependency.** The sound
 * is the notification's own. That is not a shortcut: a notification sound is
 * muted by the iPhone's ring/silent switch and by the OS notification settings
 * for this app, which is exactly the behaviour asked for, and a second sound
 * played through an audio session would have to re-implement both rules and
 * would get them wrong on at least one platform.
 */
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

const CHANNEL_ID = 'nowry-focus'
/*
 * Android fixes a channel's sound at creation, so "no sound" is a second
 * channel rather than a flag on the first (POMO-008).
 */
const QUIET_CHANNEL_ID = 'nowry-focus-quiet'

/*
 * Show the alarm even when the app is open. The timer's zero is worth seeing
 * whether or not the user is looking at the Focus tab, and this is the only
 * notification the app schedules.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
})

/**
 * Android delivers nothing without a channel, and silently.
 *
 * No `sound` key: a channel's `sound` is the FILENAME of a custom sound bundled
 * into the native app, not a mode. Passing 'default' asks Android for a file
 * called "default", which does not exist, and expo-notifications says so on
 * every call. Omitting it is what selects the system default.
 */
const ensureChannel = async (sound = true) => {
  if (Platform.OS !== 'android') return
  if (sound) {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Focus timer',
      importance: Notifications.AndroidImportance.HIGH
    })
    return
  }
  // `null` here IS a mode: no sound on this channel, ever.
  await Notifications.setNotificationChannelAsync(QUIET_CHANNEL_ID, {
    name: 'Focus timer (quiet)',
    importance: Notifications.AndroidImportance.HIGH,
    sound: null
  })
}

export const requestNotificationPermission = async () => {
  try {
    await ensureChannel()
    const existing = await Notifications.getPermissionsAsync()
    if (existing.granted) return 'granted'
    const asked = await Notifications.requestPermissionsAsync()
    return asked.granted ? 'granted' : 'denied'
  } catch {
    // A device that cannot be asked is a device that will not ring. The timer
    // itself is unaffected.
    return 'denied'
  }
}

/**
 * Hand the OS one alert, `seconds` from now, replacing any alert already
 * standing. Returns nothing: a caller cannot do anything useful with a failure
 * here that it would not already do by watching its own clock.
 */
export const scheduleEndAlarm = async ({ seconds, title, body, sound = true }) => {
  try {
    await cancelEndAlarm()
    if (!(seconds > 0)) return
    await ensureChannel(sound)
    await Notifications.scheduleNotificationAsync({
      // The content's `sound` IS a mode — iOS reads 'default' as its own
      // enum and `null` as silent. Android ignores it and uses the channel's:
      // the system default on the first channel, nothing on the quiet one.
      content: { title, body, sound: sound ? 'default' : null },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.ceil(seconds),
        channelId: sound ? CHANNEL_ID : QUIET_CHANNEL_ID
      }
    })
  } catch {
    // As above.
  }
}

export const cancelEndAlarm = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync()
  } catch {
    // As above.
  }
}

/**
 * The port's shape. See the file comment for why `play` and `announce` are
 * empty; `prime` and `stop` are empty for the same reason — there is no sound
 * of ours to open or stop, and `play` returning `false` tells the shared timer so (ADR-036).
 */
export const mobileAlerts = {
  prime: () => {},
  play: () => false,
  stop: () => {},
  announce: () => {},
  requestPermission: requestNotificationPermission
}

export default mobileAlerts

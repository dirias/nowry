/**
 * The focus timer's sound and OS notification, on the web (ADR-036).
 *
 * **The chime is a cue, not an alarm.** One pass of the melody, about six
 * seconds, at one gain. The version before this scheduled six repeats over
 * 32 seconds and kept no reference to any of it, so nothing in the app could
 * silence it — not Pause, Reset, Skip nor Close. The handle below is the whole
 * fix: `play` keeps the context it opened, `stop` closes it, and the shared
 * timer calls `stop` from every action the user can take at the end of a
 * session. Nothing loops; the promoted sheet is the interruption, the sound
 * only announces it.
 *
 * **One sound source at a time.** The browser notification takes `silent`, so
 * the OS does not add its own tone on top of the chime, and its click focuses
 * the tab where the sheet is waiting.
 */

const NOTES = {
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  G5: 783.99,
  A5: 880.0,
  B5: 987.77,
  C6: 1046.5
}

/** One pass, wind-chime shaped: up, down, a wave, a resolution. Rests are 0. */
export const MELODY = [
  { note: NOTES.C5, duration: 0.3 },
  { note: NOTES.E5, duration: 0.3 },
  { note: NOTES.G5, duration: 0.3 },
  { note: NOTES.C6, duration: 0.4 },
  { note: 0, duration: 0.2 },
  { note: NOTES.B5, duration: 0.3 },
  { note: NOTES.G5, duration: 0.3 },
  { note: NOTES.E5, duration: 0.3 },
  { note: NOTES.C5, duration: 0.4 },
  { note: 0, duration: 0.2 },
  { note: NOTES.D5, duration: 0.3 },
  { note: NOTES.F5, duration: 0.3 },
  { note: NOTES.A5, duration: 0.3 },
  { note: NOTES.F5, duration: 0.3 },
  { note: 0, duration: 0.2 },
  { note: NOTES.E5, duration: 0.3 },
  { note: NOTES.G5, duration: 0.3 },
  { note: NOTES.C6, duration: 0.6 },
  { note: 0, duration: 0.4 }
]

const GAIN = 0.3
/** Seconds the chime lasts: the melody plus its last note's tail. */
export const CHIME_SECONDS = MELODY.reduce((sum, step) => sum + step.duration, 0)
const TAIL_MS = 500

/** The chime currently sounding, if any: its context and the timer that closes it. */
let current = null

const closeQuietly = (context) => {
  try {
    const result = context.close()
    if (result && typeof result.catch === 'function') result.catch(() => {})
  } catch {
    // Already closed, or a context that never opened. Nothing is sounding.
  }
}

/** Silence the chime if it is sounding. Safe to call at any time. */
export const stopPomodoroNotification = () => {
  if (!current) return
  const { context, timeoutId } = current
  current = null
  clearTimeout(timeoutId)
  closeQuietly(context)
}

const playTone = (context, frequency, startTime, duration) => {
  const oscillator = context.createOscillator()
  const gainNode = context.createGain()
  oscillator.connect(gainNode)
  gainNode.connect(context.destination)
  oscillator.type = 'sine'
  oscillator.frequency.value = frequency
  gainNode.gain.setValueAtTime(0, startTime)
  gainNode.gain.linearRampToValueAtTime(GAIN, startTime + 0.01)
  gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration)
  oscillator.start(startTime)
  oscillator.stop(startTime + duration)
}

/**
 * Play the chime once. Returns `true` when it started, so the caller knows the
 * notification should stay silent; `false` when this browser has no Web Audio
 * or refused it, in which case the notification's own sound is the cue.
 *
 * @returns {boolean}
 */
export const playPomodoroNotification = () => {
  stopPomodoroNotification()
  try {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext
    if (!AudioContextCtor) return false
    const context = new AudioContextCtor()

    let at = context.currentTime
    for (const { note, duration } of MELODY) {
      if (note > 0) playTone(context, note, at, duration)
      at += duration
    }

    const timeoutId = setTimeout(
      () => {
        if (current && current.context === context) current = null
        closeQuietly(context)
      },
      CHIME_SECONDS * 1000 + TAIL_MS
    )
    current = { context, timeoutId }
    return true
  } catch (error) {
    console.error('Failed to play notification sound:', error)
    return false
  }
}

/**
 * The OS-level notice, when permission was granted. `silent` keeps the OS from
 * adding its own tone while the chime plays; a click brings the tab forward,
 * where the promoted sheet is waiting.
 *
 * @param {string} title
 * @param {string} body
 * @param {{ silent?: boolean }} [options]
 */
export const showBrowserNotification = (title, body, { silent = false } = {}) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  try {
    const notification = new Notification(title, {
      body,
      silent,
      icon: `${process.env.PUBLIC_URL}/logo192.png`,
      // A badge is drawn as a single-colour silhouette, so it is the compact
      // coil in white on transparent, not the opaque app icon (BRAND.md).
      badge: `${process.env.PUBLIC_URL}/badge.png`,
      tag: 'pomodoro-complete'
    })
    notification.onclick = () => {
      window.focus()
      notification.close()
    }
  } catch (error) {
    // Some browsers throw from the constructor outside a service worker; the
    // in-app sheet is the primary signal either way.
    console.error('Failed to show notification:', error)
  }
}

/**
 * Request notification permission if not already granted
 */
export const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission === 'default') {
    try {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    } catch (error) {
      console.error('Failed to request notification permission:', error)
      return false
    }
  }
  return Notification.permission === 'granted'
}

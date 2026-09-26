/**
 * The focus timer's sound and OS notification, on the web (ADR-036).
 *
 * **The chime is a cue, not an alarm.** One pass of the melody, about six
 * seconds, at one gain. The version before this scheduled six repeats over
 * 32 seconds and kept no reference to any of it, so nothing in the app could
 * silence it — not Pause, Reset, Skip nor Close. `play` keeps the oscillators
 * it started, `stop` stops them, and the shared timer calls `stop` from every
 * action the user can take at the end of a session. Nothing loops; the
 * promoted sheet is the interruption, the sound only announces it.
 *
 * **One context, opened on a click.** A browser lets Web Audio run only after
 * the page has been interacted with, and a context created outside a gesture
 * can start `suspended` — which plays nothing and throws nothing. So the
 * context is opened once, by `prime`, from the click that starts a timer, and
 * kept for the page's life. `play` still copes with a suspended context: it
 * asks it to resume and reports the truth, as a promise, so the caller can
 * leave the OS notification its own sound when the chime could not start.
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

/** The page's one audio context, opened by `prime` or the first `play`. */
let context = null
/** The chime currently sounding, if any: its oscillators and the timer that forgets them. */
let current = null

const swallow = (maybePromise) => {
  if (maybePromise && typeof maybePromise.catch === 'function') maybePromise.catch(() => {})
}

const getContext = () => {
  if (context && context.state !== 'closed') return context
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext
  if (!AudioContextCtor) return null
  context = new AudioContextCtor()
  return context
}

/**
 * Open the audio context from a user gesture so the chime is allowed to sound
 * later, outside one. Call it from the click that starts a timer. Harmless
 * when called again, or on a browser without Web Audio.
 */
export const primePomodoroNotification = () => {
  try {
    const ctx = getContext()
    if (!ctx) return false
    if (ctx.state === 'suspended') swallow(ctx.resume())
    return true
  } catch {
    return false
  }
}

/** Silence the chime if it is sounding. Safe to call at any time. */
export const stopPomodoroNotification = () => {
  if (!current) return
  const { oscillators, timeoutId } = current
  current = null
  clearTimeout(timeoutId)
  oscillators.forEach((oscillator) => {
    try {
      oscillator.stop()
    } catch {
      // Already stopped: its scheduled end came first.
    }
    try {
      oscillator.disconnect()
    } catch {
      // Never connected, or gone with a closed context.
    }
  })
}

const playTone = (ctx, frequency, startTime, duration) => {
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()
  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)
  oscillator.type = 'sine'
  oscillator.frequency.value = frequency
  gainNode.gain.setValueAtTime(0, startTime)
  gainNode.gain.linearRampToValueAtTime(GAIN, startTime + 0.01)
  gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration)
  oscillator.start(startTime)
  oscillator.stop(startTime + duration)
  return oscillator
}

const schedule = (ctx) => {
  const oscillators = []
  let at = ctx.currentTime
  for (const { note, duration } of MELODY) {
    if (note > 0) oscillators.push(playTone(ctx, note, at, duration))
    at += duration
  }
  const pass = { oscillators, timeoutId: null }
  pass.timeoutId = setTimeout(
    () => {
      if (current === pass) current = null
    },
    CHIME_SECONDS * 1000 + TAIL_MS
  )
  current = pass
}

/**
 * Play the chime once. Resolves to `true` when it started, so the caller knows
 * the notification should stay silent; `false` when this browser has no Web
 * Audio, refused it, or would not let the context run — in which case the
 * notification's own sound is the cue. Synchronous (a plain boolean) whenever
 * the answer is known at once; a promise only when the context has to be
 * resumed first.
 *
 * @returns {boolean | Promise<boolean>}
 */
export const playPomodoroNotification = () => {
  stopPomodoroNotification()
  try {
    const ctx = getContext()
    if (!ctx) return false
    if (ctx.state === 'running') {
      schedule(ctx)
      return true
    }
    if (ctx.state !== 'suspended') return false
    return Promise.resolve(ctx.resume())
      .then(() => {
        if (ctx.state !== 'running') return false
        schedule(ctx)
        return true
      })
      .catch(() => false)
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

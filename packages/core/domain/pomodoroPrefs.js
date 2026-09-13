/**
 * The timer's settings: their keys, their bounds, their defaults (MOB-093).
 *
 * `settingsFromProfile` already reads them — off the `pomodoro` sub-document,
 * falling back to the flat `pomodoro_*` keys older accounts carry. Nothing
 * shared knew how to WRITE them, so the phone honoured a focus length it gave
 * no way to change, which is exactly the state the five intervention switches
 * were in before MOB-091.
 *
 * **The bounds are the web's inputs' own** `min` and `max`, which existed only
 * as `slotProps` on three number fields — invisible to anything that did not
 * render that component, and therefore not a rule so much as a habit. A
 * five-hour focus session or a zero-minute one is not a preference, it is a
 * broken timer, and the server does not refuse either.
 */
import { DEFAULT_SETTINGS } from './pomodoroCycle'

/**
 * Each setting, as `name → {key, fallback, min, max}`.
 *
 * `key` is what `PUT /users/preferences/general` takes; the read comes back
 * under the sub-document's shorter names, which is `settingsFromProfile`'s job
 * and not repeated here.
 */
export const POMODORO_PREFS = {
  enabled: { key: 'pomodoro_enabled', fallback: DEFAULT_SETTINGS.enabled },
  work: { key: 'pomodoro_work_minutes', fallback: DEFAULT_SETTINGS.work, min: 1, max: 60 },
  shortBreak: { key: 'pomodoro_short_break_minutes', fallback: DEFAULT_SETTINGS.shortBreak, min: 1, max: 30 },
  longBreak: { key: 'pomodoro_long_break_minutes', fallback: DEFAULT_SETTINGS.longBreak, min: 5, max: 60 },
  autoStart: { key: 'pomodoro_auto_start', fallback: DEFAULT_SETTINGS.autoStart }
}

/** The three that are durations, in the order a settings page lists them. */
export const POMODORO_DURATIONS = ['work', 'shortBreak', 'longBreak']

/**
 * A typed length, held inside what the timer can actually run.
 *
 * Anything that is not a number at all becomes the default rather than zero:
 * an emptied field is someone midway through typing, and committing nought
 * would start a timer that ends the instant it begins.
 *
 * @param {string} name - a key of `POMODORO_PREFS`
 * @param {*} value
 * @returns {number}
 */
export function clampMinutes(name, value) {
  const field = POMODORO_PREFS[name]
  if (!field || field.min === undefined) return value
  // An empty field is somebody midway through typing, and `Number('')` is 0 —
  // which is finite, so it would clamp to the minimum rather than fall back and
  // a cleared field would silently become one minute.
  if (value === '' || value === null || value === undefined) return field.fallback
  const minutes = Math.round(Number(value))
  if (!Number.isFinite(minutes)) return field.fallback
  return Math.min(field.max, Math.max(field.min, minutes))
}

/** The patch one setting sends, with a duration already held in range. */
export const pomodoroPatch = (name, value) => {
  const field = POMODORO_PREFS[name]
  if (!field) return {}
  return { [field.key]: field.min === undefined ? value : clampMinutes(name, value) }
}

export default POMODORO_PREFS

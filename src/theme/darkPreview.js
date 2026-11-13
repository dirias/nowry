/**
 * The preview flag for a member's near-black dark mode (ADR-082 §9).
 *
 * Temporary: it lets the new ladder be judged on a real phone before it becomes
 * the default. `?dark-preview=final` turns it on for this device and
 * `?dark-preview=off` turns it off; the choice is kept in localStorage so it
 * survives navigation and reloads. It is never read on the production hosts or
 * in a production build, so production behaves exactly as before.
 *
 * Storage can be unavailable (private windows, blocked site data): every call
 * is guarded, and without it the flag is simply off.
 */
const KEY = 'nowry-dark-preview'
const PARAM = 'dark-preview'
const ON = 'final'
const PRODUCTION_HOSTS = ['nowry.app', 'www.nowry.app']

export const previewAllowed = (hostname = window.location.hostname, environment = process.env.REACT_APP_ENVIRONMENT) =>
  environment !== 'production' && !PRODUCTION_HOSTS.includes(hostname)

/** Read the flag, applying `?dark-preview=` from the address first. */
export function readDarkPreview(search = window.location.search, hostname = window.location.hostname) {
  if (!previewAllowed(hostname)) return false
  try {
    const asked = new URLSearchParams(search).get(PARAM)
    if (asked === ON) window.localStorage.setItem(KEY, ON)
    if (asked === 'off') window.localStorage.removeItem(KEY)
    return window.localStorage.getItem(KEY) === ON
  } catch (error) {
    return false
  }
}

/**
 * Where the learner is, as the server needs it told (MOB-098).
 *
 * A day is a local thing. Studying at 08:20 in Tokyo is 23:20 UTC the day
 * before, so an endpoint that buckets reviews into days has to be told the zone
 * or it will end the day at some other hour — which is exactly what happened:
 * the streak and the day's progress both reset at 09:00 local every morning,
 * because that is midnight in Greenwich.
 *
 * `Intl` is in both runtimes — a browser and Hermes — and neither needs a
 * platform port for it. It is read here rather than at each call site so that
 * "which zone do we claim to be in" has one answer, and so a runtime that
 * cannot say is handled once.
 */

/**
 * The IANA zone name, or null when the runtime will not say.
 *
 * Null rather than "UTC": the server already defaults to UTC, and sending it
 * explicitly would claim to know something we do not.
 */
export function localTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null
  } catch {
    return null
  }
}

/** `?tz=…` for a request that buckets by day, or '' when we cannot say. */
export function timeZoneParam() {
  const zone = localTimeZone()
  return zone ? `?tz=${encodeURIComponent(zone)}` : ''
}

export default localTimeZone

/**
 * Dates on the Invitations tab, in the admin's language and local time zone.
 * Every helper answers an empty string for a missing or unreadable date.
 */
const format = (value, language, options) => {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  try {
    return new Intl.DateTimeFormat(language || undefined, options).format(date)
  } catch {
    return new Intl.DateTimeFormat(undefined, options).format(date)
  }
}

/** "12 Nov" — a row's sent, ends and used dates. */
export const shortDate = (value, language) => format(value, language, { day: 'numeric', month: 'short' })

/** "15:40" — when a resend opens again. */
export const localTime = (value, language) => format(value, language, { hour: '2-digit', minute: '2-digit' })

/** "28 November" — when a link sent today with this lifetime stops working. */
export const endsAfter = (days, language, now = new Date()) =>
  format(new Date(now.getTime() + Number(days || 0) * 86400000), language, { day: 'numeric', month: 'long' })

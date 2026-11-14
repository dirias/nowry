/**
 * An instant from the API. Its datetimes are UTC written without a zone
 * ("2026-10-17T20:00:00"), which a JavaScript engine reads as local time; one
 * without a zone is read as UTC here. A value that is already a Date is kept.
 * Answers null for a missing or unreadable value.
 */
export const apiInstant = (value) => {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const text = String(value)
  const zoned = /[zZ]|[+-]\d{2}:?\d{2}$/.test(text) || !text.includes('T') ? text : `${text}Z`
  const date = new Date(zoned)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Milliseconds since the epoch for an API instant, or NaN. */
export const apiTime = (value) => apiInstant(value)?.getTime() ?? NaN

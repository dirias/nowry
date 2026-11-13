/**
 * The re-registration notice (ADR-089, FR-041): the dates of a deleted account
 * with this address, in the reader's language. The API sends `previous_account`
 * only when the notice may be shown; this module only formats it.
 */

/** `{deletedOn, erasedOn}` as long dates in `language`, or null when there is nothing to say. */
export const previousAccountDates = (previous, language = 'en') => {
  if (!previous?.deleted_at || !previous?.erased_at) return null
  const deleted = new Date(previous.deleted_at)
  const erased = new Date(previous.erased_at)
  if (Number.isNaN(deleted.getTime()) || Number.isNaN(erased.getTime())) return null
  const format = new Intl.DateTimeFormat(language || 'en', { dateStyle: 'long' })
  return { deletedOn: format.format(deleted), erasedOn: format.format(erased) }
}

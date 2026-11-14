/**
 * The admin Moderation tab's rules (ADMIN-003, FR-004, FR-011 Moderation, board B).
 *
 * The queue comes from `GET /moderation/admin/queue` by state. An item is kept
 * public (its reports dismissed) or unpublished for good with a reason and an
 * optional note; an unpublish takes the item's public copies with it.
 * Platform-free: labels are translation keys, colours are Joy colour names.
 */

/** The states of the queue, in the filter order (board B). */
export const MODERATION_STATES = Object.freeze(['to_review', 'kept', 'removed'])

/** The reasons a report gives and a removal records (FR-004). */
export const REMOVAL_REASONS = Object.freeze(['copyright', 'inappropriate', 'spam', 'misinformation', 'other'])

/** The longest note for the owner. */
export const NOTE_MAX = 500

const knownReason = (reason) => (REMOVAL_REASONS.includes(reason) ? reason : 'other')

/** One key per item: a deck and a book may share an id. */
export const itemKey = (item) => (item ? `${item.content_type}:${item.content_id}` : null)

/** Where Browse shows the item: `/public/decks/:id` or `/public/books/:id`. */
export const publicPath = (item) => `/public/${item.content_type === 'book' ? 'books' : 'decks'}/${item.content_id}`

const time = (value) => {
  const ms = value ? Date.parse(value) : NaN
  return Number.isNaN(ms) ? -Infinity : ms
}

const newestFirst = (reports) => [...(reports ?? [])].sort((a, b) => time(b.created_at) - time(a.created_at))

/** The latest report on an item, or null. */
export const newestReport = (item) => newestFirst(item?.reports)[0] ?? null

/** The reason the removal form opens on: the newest report's, else `other`. */
export const defaultRemovalReason = (item) => knownReason(newestReport(item)?.reason)

/** The tag colour of a reason, as the board tags it: a named reason warns, `other` is quiet. */
export const reasonColor = (reason) => (REMOVAL_REASONS.includes(reason) && reason !== 'other' ? 'warning' : 'neutral')

/**
 * The reports grouped by reason, the group with the newest report first:
 * `[{reason, count, notes}]`, notes being the reporters' non-empty words.
 */
export const reportGroups = (item) => {
  const groups = new Map()
  newestFirst(item?.reports).forEach((report) => {
    const reason = knownReason(report.reason)
    const group = groups.get(reason) ?? { reason, count: 0, notes: [] }
    group.count += 1
    const note = String(report.note ?? '').trim()
    if (note) group.notes.push(note)
    groups.set(reason, group)
  })
  return [...groups.values()]
}

/** How many items an unpublish takes: the item and each of its public copies. */
export const unpublishCount = (item) => 1 + Math.max(0, Number(item?.public_copies) || 0)

const howMany = (value) => (Array.isArray(value) ? value.length : Math.max(0, Number(value) || 0))

/** What a keep answered: how many reports it closed. */
export const keepSummary = (answer) => ({ closed: howMany(answer?.dismissed) })

/** What an unpublish answered: how many items went, how many owners were emailed and how many could not be. */
export const removalSummary = (answer) => ({
  count: Array.isArray(answer?.removed) && answer.removed.length > 0 ? answer.removed.length : 1,
  told: howMany(answer?.owners_told),
  notTold: howMany(answer?.owners_not_told)
})

/**
 * The item to select in a list: the selected one while it is listed; after it
 * left (from position `leftAt`), the one that took its place, or the last;
 * otherwise the first. Null on an empty list.
 */
export const nextSelection = (items, selectedKey, leftAt) => {
  if (!items?.length) return null
  if (selectedKey && items.some((item) => itemKey(item) === selectedKey)) return selectedKey
  if (Number.isInteger(leftAt)) return itemKey(items[Math.min(leftAt, items.length - 1)])
  return itemKey(items[0])
}

/**
 * A write the API refused because the item changed under the admin: already
 * removed (409 `already_removed`) or gone (404 `not_found`). Null otherwise.
 */
export const moderationRefusal = (error) => {
  const code = error?.response?.data?.detail?.code
  if (code === 'already_removed') return 'alreadyRemoved'
  if (code === 'not_found') return 'notFound'
  return null
}

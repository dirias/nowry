/**
 * The admin Waitlist tab's rules (WAIT-002, WAIT-006, FR-012, board E).
 *
 * Rows come from `GET /beta/admin/waitlist`, oldest first. Only a waiting row
 * can be ticked, and at most one batch is ticked at a time; the ticked rows go
 * to `POST /beta/admin/invites/batch` as `waitlist_ids`, each in its own
 * language. Platform-free: labels are translation keys with their values.
 */
import { MAX_BATCH } from './invitations'

/** The states a row can be in, in the filter order (board E). */
export const WAITLIST_STATES = Object.freeze(['waiting', 'invited', 'joined', 'left'])

/** The tag colour per state, as the board's tag classes map it. */
export const WAITLIST_STATE_COLOR = Object.freeze({ waiting: 'primary', invited: 'warning', joined: 'success', left: 'neutral' })

/** Whether a row can be ticked: only someone still waiting can be invited from here. */
export const isSelectable = (row) => row?.status === 'waiting'

/** Tick or untick one row; a row that cannot be ticked, or one past a full batch, changes nothing. */
export const toggleRow = (selected, row) => {
  if (!isSelectable(row)) return selected
  if (selected.includes(row.id)) return selected.filter((id) => id !== row.id)
  if (selected.length >= MAX_BATCH) return selected
  return [...selected, row.id]
}

/** The rows the select-all box ticks: the oldest waiting ones, one batch at most. */
const firstBatch = (rows) =>
  rows
    .filter(isSelectable)
    .slice(0, MAX_BATCH)
    .map((row) => row.id)

/** The select-all box: none, some, or all of what it would tick. */
export const selectAllState = (rows, selected) => {
  const batch = firstBatch(rows)
  const ticked = batch.filter((id) => selected.includes(id)).length
  if (batch.length === 0 || selected.length === 0) return 'none'
  return ticked === batch.length ? 'all' : 'some'
}

/** The select-all box pressed: everything it would tick, or nothing once that is ticked. */
export const toggleAll = (rows, selected) => (selectAllState(rows, selected) === 'all' ? [] : firstBatch(rows))

/** The selection kept to rows still listed and still waiting; the same array when nothing goes. */
export const pruneSelection = (selected, rows) => {
  const waiting = new Set(rows.filter(isSelectable).map((row) => row.id))
  const kept = selected.filter((id) => waiting.has(id))
  return kept.length === selected.length ? selected : kept
}

/** "3 selected · Spanish · oldest first": the language part only when one language is filtered. */
export const selectionLabel = (count, locale) => ({
  key: 'admin.wl.bar.selected',
  values: { count },
  languageKey: locale ? `admin.inv.languages.${locale}` : null
})

/** "Invite 3 to c1-waitlist", or "Invite to c1-waitlist" while nothing is ticked. */
export const inviteKeyLabel = (count, cohort) =>
  count > 0 ? { key: 'admin.wl.bar.invite', values: { count, cohort } } : { key: 'admin.wl.bar.inviteNone', values: { cohort } }

const SOURCES = Object.freeze({ '': 'hero', hero: 'hero', register: 'register', pricing: 'pricing', invitation: 'invitation' })

/** Where a row came from, as a known key (`/` is the landing hero), or null for a source this screen does not name. */
export const sourceKey = (source) => {
  if (typeof source !== 'string') return null
  return SOURCES[source.replace(/^\/+/, '').toLowerCase()] ?? null
}

/** A row's language as the board writes it: "ES"; null when the row has none. */
export const localeCode = (locale) => {
  const base = String(locale ?? '')
    .split('-')[0]
    .trim()
  return base ? base.toUpperCase() : null
}

const STEP_DATE = Object.freeze({
  invited: { field: 'invited_at', key: 'admin.wl.list.meta.invited' },
  joined: { field: 'joined_at', key: 'admin.wl.list.meta.joined' }
})

/**
 * The date on a row's phone meta line ("ES · hero · 2 Nov", "… · invited 12 Nov"):
 * the step it reached when it has one, otherwise when it joined the list.
 */
export const rowMeta = (row) => {
  const step = STEP_DATE[row?.status]
  if (step && row[step.field]) return { date: row[step.field], dateKey: step.key }
  return { date: row?.created_at ?? null, dateKey: null }
}

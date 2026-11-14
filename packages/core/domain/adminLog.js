import { apiInstant, apiTime } from './apiInstant'
import { REMOVAL_REASONS } from './moderation'
import { BUG_STATUSES } from './bugReports'

/**
 * The admin log and the Overview (ADMIN-007c, FR-003, FR-011; boards A and K).
 *
 * Platform-free: a row is described as a sentence id and its values, which
 * each client turns into words under `admin.log.what.*` (the log, no subject)
 * or `admin.log.you.*` (the Overview, "You …"). Every datetime is read with
 * `apiInstant`: the API writes UTC without a zone.
 */

/** The log's filters, in the chips' order (board K). */
export const LOG_KINDS = Object.freeze(['invitations', 'moderation', 'bugs', 'access'])

const KIND_OF = Object.freeze({
  'invite.create': 'invitations',
  'invite.send': 'invitations',
  'invite.resend': 'invitations',
  'invite.revoke': 'invitations',
  'report.review': 'moderation',
  'content.remove': 'moderation',
  'curation.review': 'moderation',
  'bug.status': 'bugs',
  'admin.grant': 'access',
  'admin.revoke': 'access'
})

/** Whether a value is one of the log's filters. */
export const isLogKind = (kind) => LOG_KINDS.includes(kind)

/** The filter an action belongs to, or null for one this client does not know. */
export const actionKind = (action) => KIND_OF[action] ?? null

/** Who did it: `{key: 'you'|'script'|'someone'}` or `{name}`; an account that is gone has no username and is "someone". */
export const actorOf = (actor) => {
  if (actor?.kind === 'script') return { key: 'script' }
  if (actor?.is_you) return { key: 'you' }
  if (actor?.username) return { name: actor.username }
  return { key: 'someone' }
}

// An address appears only in `target_title` (the API keeps none in `details`).
const emailOf = (row) => row.target_title || row.target_id || ''
const titleOf = (row) => row.target_title || row.target_id || ''
const copiesOf = (details) => Math.max(0, Number(details?.copies) || 0)
const TYPE_WORD = Object.freeze({ deck: 'Deck', book: 'Book' })

const describeRemoval = (row) => {
  const type = TYPE_WORD[row.target_type] ?? 'Item'
  const count = copiesOf(row.details)
  const title = titleOf(row)
  return count > 0 ? { id: `remove${type}Copies`, values: { title, count } } : { id: `remove${type}`, values: { title } }
}

const describeBug = (row) => {
  const { from, to, note_added: noteAdded } = row.details ?? {}
  const values = { title: titleOf(row) }
  if (!BUG_STATUSES.includes(to) || to === from) return { id: 'bugNote', values }
  return noteAdded ? { id: `bugStatus.${to}`, values, withNote: true } : { id: `bugStatus.${to}`, values }
}

const describeInvite = (row, withCohort, plain = 'inviteSendPlain') => {
  const email = emailOf(row)
  const cohort = row.details?.cohort
  return cohort ? { id: withCohort, values: { email, cohort } } : { id: plain, values: { email } }
}

const DESCRIBE = Object.freeze({
  'invite.send': (row) => describeInvite(row, 'inviteSend'),
  'invite.create': (row) => describeInvite(row, 'inviteCreate'),
  'invite.resend': (row) => ({ id: 'inviteResend', values: { email: emailOf(row) } }),
  'invite.revoke': (row) => ({ id: 'inviteRevoke', values: { email: emailOf(row) } }),
  'admin.grant': (row) => ({ id: 'adminGrant', values: { email: emailOf(row) } }),
  'admin.revoke': (row) => ({ id: 'adminRevoke', values: { email: emailOf(row) } }),
  'content.remove': describeRemoval,
  'report.review': (row) => ({
    id: row.details?.decision === 'removed' ? 'reportRemoved' : 'reportKept',
    values: { title: titleOf(row) }
  }),
  'curation.review': (row) => ({ id: 'curationReview', values: { title: titleOf(row) } }),
  'bug.status': describeBug
})

/**
 * One row as a sentence: `{id, values, withNote?}`. An action this client does
 * not know is named rather than hidden (`other`).
 */
export const describeAction = (row) => {
  const describe = DESCRIBE[row?.action]
  return describe ? describe(row) : { id: 'other', values: { action: row?.action ?? '', title: titleOf(row ?? {}) } }
}

/** A row's reason: a moderation reason by its code, any other text as written, or null. */
export const reasonOf = (row) => {
  const reason = typeof row?.reason === 'string' ? row.reason.trim() : ''
  if (!reason) return null
  return REMOVAL_REASONS.includes(reason) ? { code: reason } : { text: reason }
}

/* ── The Overview's recent actions (board A) ────────────────────────────── */

const minuteOf = (value) => Math.floor(apiTime(value) / 60000)
const actorKey = (actor) => (actor?.kind === 'script' ? 'script' : `admin:${actor?.username ?? ''}:${actor?.is_you ? 1 : 0}`)

const joins = (entry, row) => {
  const first = entry.rows[0]
  return (
    row.action === 'invite.send' &&
    first.action === 'invite.send' &&
    actorKey(row.actor) === actorKey(first.actor) &&
    (row.details?.cohort ?? null) === (first.details?.cohort ?? null) &&
    minuteOf(row.at) === minuteOf(first.at)
  )
}

/**
 * The Overview's lines: consecutive `invite.send` rows by the same actor, to
 * the same cohort, within the same minute read as one line (board A); every
 * other row is its own. Each entry is `{id, at, actor, rows}`.
 */
export const groupRecent = (rows) =>
  (rows ?? []).reduce((entries, row) => {
    const last = entries[entries.length - 1]
    if (last && joins(last, row)) {
      last.rows.push(row)
      return entries
    }
    return [...entries, { id: row.id, at: row.at, actor: row.actor, rows: [row] }]
  }, [])

/** An Overview entry as a sentence: "Invited 12 addresses to c1-waitlist", or its one row's. */
export const describeEntry = (entry) => {
  if (entry.rows.length > 1) return { id: 'inviteGroup', values: { count: entry.rows.length, cohort: entry.rows[0].details?.cohort ?? '' } }
  return describeAction(entry.rows[0])
}

/* ── When ───────────────────────────────────────────────────────────────── */

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()

/** How many calendar days, in local time, lie between an API instant and now; null for no date. */
export const dayGap = (value, now = new Date()) => {
  const date = apiInstant(value)
  if (!date) return null
  return Math.round((startOfDay(now) - startOfDay(date)) / 86400000)
}

/**
 * The Overview's short time (board A: "2 h", "Yest.", "Tue"):
 * `{unit: 'now'|'minute'|'hour'|'yesterday'|'weekday'|'date', amount?}`; null for no date.
 */
export const shortWhen = (value, now = new Date()) => {
  const ms = apiTime(value)
  if (Number.isNaN(ms)) return null
  const minutes = Math.floor(Math.max(0, now.getTime() - ms) / 60000)
  const gap = dayGap(value, now)
  if (minutes < 1) return { unit: 'now' }
  if (minutes < 60) return { unit: 'minute', amount: minutes }
  if (gap <= 0) return { unit: 'hour', amount: Math.floor(minutes / 60) }
  if (gap === 1) return { unit: 'yesterday' }
  if (gap < 7) return { unit: 'weekday' }
  return { unit: 'date' }
}

/* ── Needs you and the email meters (board A) ──────────────────────────── */

const count = (value) => Math.max(0, Number(value) || 0)

/** The four "Needs you" rows in the board's order, each with its count (zero included). */
export const needsRows = (overview) => {
  const needs = overview?.needs ?? {}
  const reports = needs.reports_to_review ?? {}
  return [
    {
      kind: 'reports',
      count: count(reports.count),
      oldestAt: reports.oldest_at ?? null,
      reasons: (reports.reasons ?? []).filter((reason) => REMOVAL_REASONS.includes(reason))
    },
    { kind: 'bugs', count: count(needs.new_bugs?.count), critical: count(needs.new_bugs?.critical) },
    { kind: 'invitations', count: count(needs.invitations_ending?.count), cohorts: needs.invitations_ending?.cohorts ?? [] },
    { kind: 'waiting', count: count(needs.waiting?.count), sinceLastBatch: count(needs.waiting?.since_last_batch) }
  ]
}

/** How many rows need something ("Needs you · 4 things"). */
export const needsCount = (rows) => rows.filter((row) => row.count > 0).length

const meter = (entry) => {
  const sent = count(entry?.sent)
  const share = count(entry?.share)
  const percent = share > 0 ? Math.min(100, Math.round((sent / share) * 100)) : sent > 0 ? 100 : 0
  return { sent, share, percent }
}

/** Today's email meters: invitations and waitlist confirmations against their shares. */
export const emailMeters = (overview) => {
  const emails = overview?.emails_today ?? {}
  return { invitations: meter(emails.invitations), confirmations: meter(emails.confirmations), resetsAt: emails.resets_at ?? null }
}

/**
 * The Bug reports tab's composed lines (board C), in the admin's language.
 * Each helper takes `t` and answers a plain string; parts are joined with " · ".
 */
import { REPORT_AREAS, bugDevice, bugFacts, isAppReport, isOwnNote } from '@nowry/core/domain/bugReports'
import { timeAgo } from '../moderation/moderationText'
import { apiTime } from '@nowry/core/domain/apiInstant'

const SEP = ' · '
const HOUR = 3600
const DAY = 86400

const secondsSince = (value, now) => {
  const ms = apiTime(value)
  return Number.isNaN(ms) ? null : Math.max(0, Math.round((now - ms) / 1000))
}

const unitFormat = (language, unit, amount) => {
  try {
    return new Intl.NumberFormat(language || undefined, { style: 'unit', unit, unitDisplay: 'narrow' }).format(amount)
  } catch {
    return new Intl.NumberFormat(undefined, { style: 'unit', unit, unitDisplay: 'narrow' }).format(amount)
  }
}

/** A row's age, short: "2h", "1d", "5m"; empty for no date. */
export const ageShort = (value, language, now = Date.now()) => {
  const seconds = secondsSince(value, now)
  if (seconds === null) return ''
  if (seconds >= DAY) return unitFormat(language, 'day', Math.floor(seconds / DAY))
  if (seconds >= HOUR) return unitFormat(language, 'hour', Math.floor(seconds / HOUR))
  return unitFormat(language, 'minute', Math.floor(seconds / 60))
}

/** When a note was written: "2h ago" today, "yesterday", "3 days ago". Empty for no date. */
export const noteWhen = (value, language, now = Date.now()) => {
  const seconds = secondsSince(value, now)
  if (seconds === null) return ''
  if (seconds < DAY) return timeAgo(value, language, now)
  try {
    return new Intl.RelativeTimeFormat(language || undefined, { numeric: 'auto' }).format(-Math.floor(seconds / DAY), 'day')
  } catch {
    return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(-Math.floor(seconds / DAY), 'day')
  }
}

/** Where it happened: the page for the web, the area for the phone. */
const place = (t, bug) => {
  if (!isAppReport(bug) && bug.url) return bug.url
  return REPORT_AREAS.includes(bug.category) ? t(`report.areas.${bug.category}`) : ''
}

/** A row's meta line: "/study · by marta_l". */
export const rowMeta = (t, bug) =>
  [place(t, bug), bug.reporter_username ? t('admin.bugs.list.by', { name: bug.reporter_username }) : null].filter(Boolean).join(SEP)

/** A row's device: "Android · Chrome", or "Android app". */
export const rowDevice = (t, bug) => {
  const device = bugDevice(bug)
  if (device.app) return t('admin.bugs.list.app', { os: device.os })
  return [device.os, device.browser].filter(Boolean).join(SEP)
}

/** The card's caption: "Reported 2h ago · Android 15 · Chrome 131 · 412 × 915", or "… · Android app 1.0 (31) · Pixel 7". */
export const bugCaption = (t, bug, language, now = Date.now()) => {
  const facts = bugFacts(bug)
  const when = timeAgo(bug.created_at, language, now)
  const lead = when ? t('admin.bugs.item.reported', { when }) : null
  const rest = facts.app ? [t('admin.bugs.item.app', { os: bugDevice(bug).os, version: facts.version }).trim(), facts.device] : facts.parts
  return [lead, ...rest].filter(Boolean).join(SEP)
}

/** A note's head: "You · yesterday", "Another admin · 3 days ago"; null for an old note that says neither. */
export const noteHead = (t, note, user, language, now = Date.now()) => {
  if (!note.by && !note.at) return null
  const when = noteWhen(note.at, language, now)
  return t(isOwnNote(note, user) ? 'admin.bugs.item.you' : 'admin.bugs.item.someone', { when })
}

/** What a save answered, as the alert says it, and its colour. */
export const saveText = (t, outcome) => t(`admin.bugs.result.${outcome.kind}`)
export const saveColor = (outcome) => (outcome.kind === 'saved' ? 'success' : outcome.kind === 'nothing' ? 'neutral' : 'danger')

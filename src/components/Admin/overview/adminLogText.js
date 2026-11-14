/**
 * The Overview's and the admin log's composed words (boards A and K), in the
 * admin's language. Sentences come from `@nowry/core/domain/adminLog`; a
 * sentence's title travels as `TITLE_MARK` so `ActionText` can set it bold
 * without putting markup in a translation.
 */
import { actorOf, dayGap, describeAction, describeEntry, reasonOf, shortWhen } from '@nowry/core/domain/adminLog'
import { apiInstant } from '@nowry/core/domain/apiInstant'
import { localTime, shortDate } from '../invitations/inviteDates'

/** An invisible separator standing in for the title inside a translated sentence. */
export const TITLE_MARK = '⁣'
const SEP = ' · '

const dateText = (value, language, options) => {
  const date = apiInstant(value)
  if (!date) return ''
  try {
    return new Intl.DateTimeFormat(language || undefined, options).format(date)
  } catch {
    return new Intl.DateTimeFormat(undefined, options).format(date)
  }
}

const unitText = (language, unit, amount) => {
  try {
    return new Intl.NumberFormat(language || undefined, { style: 'unit', unit, unitDisplay: 'narrow' }).format(amount)
  } catch {
    return new Intl.NumberFormat(undefined, { style: 'unit', unit, unitDisplay: 'narrow' }).format(amount)
  }
}

/** The Overview's short time (board A): "2h", "Yest.", "Tue", "13 Nov". */
export const shortWhenText = (t, value, language, now = new Date()) => {
  const when = shortWhen(value, now)
  if (!when) return ''
  if (when.unit === 'now') return t('admin.overview.when.now')
  if (when.unit === 'minute' || when.unit === 'hour') return unitText(language, when.unit, when.amount)
  if (when.unit === 'yesterday') return t('admin.overview.when.yesterday')
  if (when.unit === 'weekday') return dateText(value, language, { weekday: 'short' })
  return shortDate(value, language)
}

/** The log's When (board K): "Today 14:02", "Yest. 18:15", "Tue 09:30", "13 Nov 22:41". */
export const logWhenText = (t, value, language, now = new Date()) => {
  const gap = dayGap(value, now)
  if (gap === null) return ''
  const time = localTime(value, language)
  if (gap <= 0) return t('admin.log.when.today', { time })
  if (gap === 1) return t('admin.log.when.yesterday', { time })
  const day = gap < 7 ? { weekday: 'short' } : { day: 'numeric', month: 'short' }
  return dateText(value, language, { ...day, hour: '2-digit', minute: '2-digit' })
}

/** Who did it: "You", "Script", "Someone" (an account that is gone), or the admin's username. */
export const actorText = (t, actor) => {
  const who = actorOf(actor)
  return who.name ?? t(`admin.log.actor.${who.key}`)
}

/** Why: a moderation reason in words, any other reason as written, or ''. */
export const reasonText = (t, row) => {
  const reason = reasonOf(row)
  if (!reason) return ''
  return reason.code ? t(`admin.mod.reasons.${reason.code}`) : reason.text
}

/** A described action in one family: `what` (the log, no subject) or `you` (the Overview). */
const sentence = (t, described, family) => {
  const values = described.values.title === undefined ? described.values : { ...described.values, title: TITLE_MARK }
  const text = t(`admin.log.${family}.${described.id}`, values)
  return described.withNote ? t('admin.log.withNote', { what: text }) : text
}

/** A log row's What (board K): `{text, title}`. */
export const logLine = (t, row) => {
  const described = describeAction(row)
  return { text: sentence(t, described, 'what'), title: described.values.title }
}

const byOther = (t, actor, what) => {
  const who = actorOf(actor)
  if (who.name) return t('admin.overview.recent.by', { what, name: who.name })
  return t(who.key === 'script' ? 'admin.overview.recent.byScript' : 'admin.overview.recent.bySomeone', { what })
}

/**
 * An Overview line (board A): "You unpublished the deck … · copyright report",
 * "You invited 12 addresses to c1-waitlist"; another admin's reads "… — by ana".
 * `{text, title}`.
 */
export const overviewLine = (t, entry) => {
  const described = describeEntry(entry)
  const text = actorOf(entry.actor).key === 'you' ? sentence(t, described, 'you') : byOther(t, entry.actor, sentence(t, described, 'what'))
  const reason = entry.rows.length === 1 ? reasonOf(entry.rows[0]) : null
  return {
    text: reason?.code ? [text, t(`admin.overview.recent.reason.${reason.code}`)].join(SEP) : text,
    title: described.values.title
  }
}

/** When the day's email shares reset, in UTC: "00:00". */
export const resetTime = (value, language) =>
  dateText(value, language, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC' }) || '00:00'

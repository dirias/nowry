/**
 * The Moderation tab's composed lines (board B), in the admin's language.
 * Each helper takes `t` and answers a plain string; parts are joined with " · ".
 */
import { newestReport } from '@nowry/core/domain/moderation'
import { shortDate } from '../invitations/inviteDates'
import { apiTime } from '@nowry/core/domain/apiInstant'

const SEP = ' · '
const UNITS = [
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60]
]

/** "3 h ago" / "hace 3 h": how long ago, in the largest whole unit; empty for no date. */
export const timeAgo = (value, language, now = Date.now()) => {
  const ms = apiTime(value)
  if (Number.isNaN(ms)) return ''
  const seconds = Math.max(0, Math.round((now - ms) / 1000))
  const [unit, size] = UNITS.find(([, length]) => seconds >= length) ?? UNITS[UNITS.length - 1]
  const amount = -Math.floor(seconds / size)
  try {
    return new Intl.RelativeTimeFormat(language || undefined, { style: 'narrow', numeric: 'always' }).format(amount, unit)
  } catch {
    return new Intl.RelativeTimeFormat(undefined, { style: 'narrow', numeric: 'always' }).format(amount, unit)
  }
}

/** When a row last changed: the removal for a removed item, else its newest report. */
const rowTime = (item) => item.removal?.removed_at ?? newestReport(item)?.created_at ?? item.oldest_report_at

/** A row's meta line: "Deck · by rin_study · 1 report · 3 h ago". */
export const rowMeta = (t, item, language) =>
  [
    t(`admin.mod.types.${item.content_type}`),
    item.owner_username ? t('admin.mod.list.by', { owner: item.owner_username }) : null,
    t('admin.mod.list.reports', { count: item.report_count ?? item.reports?.length ?? 0 }),
    timeAgo(rowTime(item), language)
  ]
    .filter(Boolean)
    .join(SEP)

/** The card's caption: "Deck · public since 2 Nov · 214 cards · 3 learners" (pages for a book). */
export const itemCaption = (t, item, language) => {
  const since = shortDate(item.public_since, language)
  const sizeKey = item.content_type === 'book' ? 'admin.mod.item.pages' : 'admin.mod.item.cards'
  return [
    t(`admin.mod.types.${item.content_type}`),
    since ? t('admin.mod.item.publicSince', { date: since }) : null,
    Number.isFinite(item.size) ? t(sizeKey, { count: item.size }) : null,
    Number.isFinite(item.learners) ? t('admin.mod.item.learners', { count: item.learners }) : null
  ]
    .filter(Boolean)
    .join(SEP)
}

/** A report group's caption: "Copyright · 1 reporter". */
export const groupCaption = (t, group) =>
  [t(`admin.mod.reasons.${group.reason}`), t('admin.mod.item.reporters', { count: group.count })].join(SEP)

/** The confirmation's sentences: what happens, the public copies that go too, the log. */
export const confirmBody = (t, item, total) =>
  [
    t('admin.mod.confirm.body'),
    item.public_copies > 0 ? t('admin.mod.confirm.copies', { count: item.public_copies }) : null,
    t('admin.mod.confirm.log', { count: total })
  ]
    .filter(Boolean)
    .join(' ')

/** What a keep or an unpublish answered, as the alert says it. */
export const outcomeText = (t, outcome) => {
  if (outcome.kind === 'kept') return t('admin.mod.result.kept', { count: outcome.closed })
  if (outcome.kind === 'removed')
    return [
      t('admin.mod.result.removed', { count: outcome.count }),
      t('admin.mod.result.emailed', { count: outcome.told, notTold: outcome.notTold })
    ].join(' ')
  if (outcome.kind === 'alreadyRemoved' || outcome.kind === 'notFound') return t(`admin.mod.result.${outcome.kind}`)
  return t('admin.mod.result.failed')
}

/** The alert's colour: a write that went is success, an item that changed meanwhile a warning, a failure danger. */
export const outcomeColor = (outcome) => {
  if (outcome.kind === 'kept' || outcome.kind === 'removed') return 'success'
  return outcome.kind === 'failed' ? 'danger' : 'warning'
}

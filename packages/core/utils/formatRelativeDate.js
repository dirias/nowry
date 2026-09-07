/**
 * "Today", "Yesterday", "3 days ago", "2 weeks ago" — the house relative date,
 * the same words the Study Center uses on its rows (`study.dates.*`).
 */
export default function formatRelativeDate(t, value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return t('study.dates.today')
  if (diffDays === 1) return t('study.dates.yesterday')
  if (diffDays < 7) return t('study.dates.daysAgo', { count: diffDays })
  return t('study.dates.weeksAgo', { count: Math.floor(diffDays / 7) })
}

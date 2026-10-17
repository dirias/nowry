/**
 * A tile's meta line (PRD D1, canvas board 1): when it was edited, what it
 * holds and what it made, and who it is shared with —
 * "Edited 2 h ago · 12 notes · 3 cards made · shared with 1 person".
 */
const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export const editedAgo = (t, value, { now = Date.now(), locale = 'en' } = {}) => {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const diff = Math.max(0, now - date.getTime())
  if (diff < MINUTE) return t('boards.tile.edited.justNow')
  if (diff < HOUR) return t('boards.tile.edited.minutes', { count: Math.floor(diff / MINUTE) })
  if (diff < DAY) return t('boards.tile.edited.hours', { count: Math.floor(diff / HOUR) })
  if (diff < 2 * DAY) return t('boards.tile.edited.yesterday')
  const sameYear = date.getFullYear() === new Date(now).getFullYear()
  const formatted = new Intl.DateTimeFormat(
    locale,
    sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' }
  ).format(date)
  return t('boards.tile.edited.on', { date: formatted })
}

export const metaLine = (t, board, options = {}) => {
  const parts = [editedAgo(t, board.updatedAt, options), t('boards.tile.notes', { count: board.counts?.notes ?? 0 })]
  if (board.counts?.items) parts.push(t('boards.tile.items', { count: board.counts.items }))
  if (board.counts?.cards) parts.push(t('boards.tile.cards', { count: board.counts.cards }))
  if (!board.isOwner && board.ownerName) parts.push(t('boards.tile.sharedBy', { name: board.ownerName }))
  else if (board.collaborators?.length) parts.push(t('boards.tile.sharedWith', { count: board.collaborators.length }))
  return parts.filter(Boolean).join(' · ')
}

/** The first line of the first note: what a new board is called until it is renamed (PRD D1). */
export const firstNoteName = (nodes) => {
  const note = nodes.find((n) => n.kind === 'note')
  if (!note) return null
  return (note.text ?? '').split('\n')[0].trim().slice(0, 200)
}

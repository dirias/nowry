/**
 * ADMIN-003 — the Moderation tab's rules (FR-004, FR-011 Moderation, board B):
 * the states and reasons, the newest report and the reason it prefills, the
 * reports grouped by reason, what an unpublish takes with it, what an answer
 * says, and which item is selected after one leaves the list.
 */
import {
  MODERATION_STATES,
  NOTE_MAX,
  REMOVAL_REASONS,
  defaultRemovalReason,
  itemKey,
  keepSummary,
  moderationRefusal,
  newestReport,
  nextSelection,
  publicPath,
  reasonColor,
  removalSummary,
  reportGroups,
  unpublishCount
} from '../moderation'

const report = (id, reason, created_at, note = '') => ({ id, reason, note, created_at })
const ITEM = {
  content_type: 'deck',
  content_id: 'd1',
  title: 'JLPT N5 kanji (copy)',
  public_copies: 1,
  reports: [
    report('r1', 'spam', '2026-11-10T10:00:00Z', 'Looks like spam'),
    report('r2', 'copyright', '2026-11-13T10:00:00Z', 'Copied from my paid deck'),
    report('r3', 'spam', '2026-11-11T10:00:00Z')
  ]
}

it('lists the states in the filter order and the five reasons', () => {
  expect(MODERATION_STATES).toEqual(['to_review', 'kept', 'removed'])
  expect(REMOVAL_REASONS).toEqual(['copyright', 'inappropriate', 'spam', 'misinformation', 'other'])
  expect(NOTE_MAX).toBe(500)
})

it('keys an item by its type and id', () => {
  expect(itemKey(ITEM)).toBe('deck:d1')
  expect(itemKey(null)).toBeNull()
})

it('opens a deck or a book where Browse shows it', () => {
  expect(publicPath(ITEM)).toBe('/public/decks/d1')
  expect(publicPath({ content_type: 'book', content_id: 'b1' })).toBe('/public/books/b1')
})

describe('newestReport and defaultRemovalReason', () => {
  it('finds the latest report and prefills its reason', () => {
    expect(newestReport(ITEM).id).toBe('r2')
    expect(defaultRemovalReason(ITEM)).toBe('copyright')
  })

  it('falls back to other with no report or an unknown reason', () => {
    expect(newestReport({ reports: [] })).toBeNull()
    expect(newestReport({})).toBeNull()
    expect(defaultRemovalReason({ reports: [] })).toBe('other')
    expect(defaultRemovalReason({ reports: [report('x', 'weird', '2026-11-01T00:00:00Z')] })).toBe('other')
  })

  it('reads a report without a date as the oldest', () => {
    expect(newestReport({ reports: [report('a', 'spam', null), report('b', 'other', '2026-01-01T00:00:00Z')] }).id).toBe('b')
  })
})

it('colours a reason as the board tags it: named reasons warn, other is neutral', () => {
  expect(reasonColor('copyright')).toBe('warning')
  expect(reasonColor('spam')).toBe('warning')
  expect(reasonColor('other')).toBe('neutral')
  expect(reasonColor('unknown')).toBe('neutral')
})

it('groups the reports by reason, newest group first, with their notes and how many reported', () => {
  expect(reportGroups(ITEM)).toEqual([
    { reason: 'copyright', count: 1, notes: ['Copied from my paid deck'] },
    { reason: 'spam', count: 2, notes: ['Looks like spam'] }
  ])
  expect(reportGroups({})).toEqual([])
  expect(reportGroups({ reports: [report('z', 'weird', null, '  ')] })).toEqual([{ reason: 'other', count: 1, notes: [] }])
})

it('counts the item and its public copies', () => {
  expect(unpublishCount(ITEM)).toBe(2)
  expect(unpublishCount({ public_copies: 0 })).toBe(1)
  expect(unpublishCount({})).toBe(1)
})

describe('answers', () => {
  it('says how many reports a keep closed', () => {
    expect(keepSummary({ dismissed: 2 })).toEqual({ closed: 2 })
    expect(keepSummary(undefined)).toEqual({ closed: 0 })
  })

  it('says how many went and how many owners were told, as counts or lists', () => {
    expect(removalSummary({ removed: [{}, {}], copies_removed: 1, owners_told: 2, owners_not_told: 0 })).toEqual({
      count: 2,
      told: 2,
      notTold: 0
    })
    expect(removalSummary({ removed: [{}], owners_told: ['u1'], owners_not_told: [{ id: 'u2' }] })).toEqual({
      count: 1,
      told: 1,
      notTold: 1
    })
    expect(removalSummary({})).toEqual({ count: 1, told: 0, notTold: 0 })
  })
})

describe('nextSelection', () => {
  const a = { content_type: 'deck', content_id: 'a' }
  const b = { content_type: 'book', content_id: 'b' }
  const c = { content_type: 'deck', content_id: 'c' }

  it('keeps the selection while it is listed', () => {
    expect(nextSelection([a, b, c], 'book:b', null)).toBe('book:b')
  })

  it('selects the first item when nothing is selected', () => {
    expect(nextSelection([a, b], null, null)).toBe('deck:a')
    expect(nextSelection([], null, null)).toBeNull()
  })

  it('after an item leaves, selects the one that took its place, or the last', () => {
    expect(nextSelection([a, c], 'book:b', 1)).toBe('deck:c')
    expect(nextSelection([a], 'book:b', 1)).toBe('deck:a')
    expect(nextSelection([], 'book:b', 1)).toBeNull()
    expect(nextSelection([a, c], 'book:b', null)).toBe('deck:a')
  })
})

describe('moderationRefusal', () => {
  const refused = (status, code) => ({ response: { status, data: { detail: { code } } } })
  it('reads an item already removed, or gone, as the API names them', () => {
    expect(moderationRefusal(refused(409, 'already_removed'))).toBe('alreadyRemoved')
    expect(moderationRefusal(refused(404, 'not_found'))).toBe('notFound')
  })
  it('is null for anything else', () => {
    expect(moderationRefusal(refused(400, 'bad_id'))).toBeNull()
    expect(moderationRefusal(new Error('down'))).toBeNull()
    expect(moderationRefusal(null)).toBeNull()
  })
})

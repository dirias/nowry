/**
 * DEBT-005 — `patchCardInCache`, the seam that replaced ManageContent's overlay.
 *
 * A component holding `cards` as a prop cannot write back into it. Before this
 * helper, `ManageContent` kept a private id-keyed overlay of pending marks and
 * merged it during render — correct, but a second source of truth for one
 * field, and a trick every future per-card mutation would have had to repeat.
 *
 * What matters here is the shape: the cache holds an infinite query
 * (`{ pages: [{ cards }] }`), and the patch has to reach every filter variant,
 * because a card marked under one filter is the same card under the others.
 */
import { queryClient } from './queryClient'
import { patchCardInCache } from './cardCache'

const page = (...cards) => ({ cards, total: cards.length, has_more: false })
const card = (id, extra = {}) => ({ _id: id, title: id, marked_at: null, ...extra })

beforeEach(() => queryClient.clear())

describe('patchCardInCache', () => {
  it('merges the change into the matching card', () => {
    const key = ['cards', 'user-1', { tags: [], search: '', markedOnly: false }]
    queryClient.setQueryData(key, { pages: [page(card('c1'), card('c2'))], pageParams: [0] })

    patchCardInCache('c1', { marked_at: '2026-08-31T10:00:00' })

    const [first, second] = queryClient.getQueryData(key).pages[0].cards
    expect(first.marked_at).toBe('2026-08-31T10:00:00')
    expect(first.title).toBe('c1') // merged, not replaced
    expect(second.marked_at).toBeNull()
  })

  it('reaches every filter variant, not just the one on screen', () => {
    // These differ in `search` and `markedOnly` rather than only in `tags`.
    // React Query matches key filters PARTIALLY, and an empty array partially
    // matches any array — so two variants differing only by `tags: []` vs
    // `tags: ['verbs']` would both match even a narrowly-scoped key, and this
    // test would pass while proving nothing.
    const unfiltered = ['cards', 'user-1', { tags: [], search: '', markedOnly: false }]
    const searched = ['cards', 'user-1', { tags: [], search: 'mitochondria', markedOnly: false }]
    const markedView = ['cards', 'user-1', { tags: [], search: '', markedOnly: true }]
    for (const key of [unfiltered, searched, markedView]) {
      queryClient.setQueryData(key, { pages: [page(card('c1'))], pageParams: [0] })
    }

    patchCardInCache('c1', { marked_at: '2026-08-31T10:00:00' })

    for (const key of [unfiltered, searched, markedView]) {
      expect(queryClient.getQueryData(key).pages[0].cards[0].marked_at).toBe('2026-08-31T10:00:00')
    }
  })

  it('finds the card on any page, not only the first', () => {
    const key = ['cards', 'user-1', { tags: [], search: '', markedOnly: false }]
    queryClient.setQueryData(key, { pages: [page(card('c1')), page(card('c2'))], pageParams: [0, 1] })

    patchCardInCache('c2', { marked_at: '2026-08-31T10:00:00' })

    expect(queryClient.getQueryData(key).pages[1].cards[0].marked_at).toBe('2026-08-31T10:00:00')
  })

  it('does not disturb the cached reference when nothing matches', () => {
    const key = ['cards', 'user-1', { tags: [], search: '', markedOnly: false }]
    const data = { pages: [page(card('c1'))], pageParams: [0] }
    queryClient.setQueryData(key, data)

    patchCardInCache('not-here', { marked_at: 'x' })

    // React Query's structural sharing is what provides this, not the helper —
    // pinned because consumers depend on the reference staying stable, and a
    // future rewrite that bypasses setQueriesData would lose it silently.
    expect(queryClient.getQueryData(key)).toEqual(data)
    expect(queryClient.getQueryData(key).pages[0].cards[0].marked_at).toBeNull()
  })

  it('ignores cache entries that are not paginated card lists', () => {
    queryClient.setQueryData(['cards', 'user-1', 'weird'], { not: 'pages' })

    expect(() => patchCardInCache('c1', { marked_at: 'x' })).not.toThrow()
  })
})

import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { MemoryRouter, useSearchParams } from 'react-router-dom'

import { useSessionFilters } from './useSessionFilters'

const card = (id, tags, markedAt = null) => ({
  _id: id,
  id,
  title: id,
  marked_at: markedAt,
  ...(tags === undefined ? {} : { tags })
})

const MARKED_AT = '2026-08-30T10:00:00'

// c1 and c4 are marked; c1 also carries a tag, so the two dimensions can be
// shown to compose rather than merely coexist.
const CARDS = [card('c1', ['verbs'], MARKED_AT), card('c2', ['nouns']), card('c3', ['verbs', 'nouns']), card('c4', undefined, MARKED_AT)]

/**
 * Renders the hook under a real router at `initialUrl`, and also surfaces the
 * live search params so tests can assert on what was actually written to the
 * URL (rather than trusting the hook's own view of it).
 */
function renderFilter({ url = '/study/deck-1', cards = CARDS, tagsEnabled = true, markEnabled = true } = {}) {
  const wrapper = ({ children }) => <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
  return renderHook(
    () => {
      const [searchParams] = useSearchParams()
      return { filter: useSessionFilters({ cards, tagsEnabled, markEnabled }), searchParams }
    },
    { wrapper }
  )
}

describe('useSessionFilters — both gates closed', () => {
  it('reports no tags and hands back the IDENTICAL cards reference even when ?tags= is populated', () => {
    const { result } = renderFilter({ url: '/study/deck-1?mode=study&tags=verbs', tagsEnabled: false, markEnabled: false })

    expect(result.current.filter.availableTags).toEqual([])
    expect(result.current.filter.selectedTags).toEqual([])
    expect(result.current.filter.isFiltering).toBe(false)
    // toBe — the SM-2 queue must be the exact array StudySession loaded.
    expect(result.current.filter.visibleCards).toBe(CARDS)
  })
})

describe('useSessionFilters — the tag dimension, gate open', () => {
  it('exposes the deck tag tally', () => {
    const { result } = renderFilter({ url: '/study/deck-1?mode=browse' })

    expect(result.current.filter.availableTags).toEqual([
      { tag: 'nouns', count: 2 },
      { tag: 'verbs', count: 2 }
    ])
  })

  it('returns the identical cards reference when nothing is selected', () => {
    const { result } = renderFilter({ url: '/study/deck-1?mode=browse' })

    expect(result.current.filter.visibleCards).toBe(CARDS)
    expect(result.current.filter.isFiltering).toBe(false)
  })

  it('parses ?tags= into a selection and narrows the visible cards', () => {
    const { result } = renderFilter({ url: '/study/deck-1?mode=browse&tags=verbs' })

    expect(result.current.filter.selectedTags).toEqual(['verbs'])
    expect(result.current.filter.visibleCards.map((entry) => entry.id)).toEqual(['c1', 'c3'])
    expect(result.current.filter.isFiltering).toBe(true)
  })

  it('drops stale tags that the deck no longer has (shared-link resilience)', () => {
    const { result } = renderFilter({ url: '/study/deck-1?mode=browse&tags=verbs,retired-tag' })

    expect(result.current.filter.selectedTags).toEqual(['verbs'])
  })

  it('degrades a fully stale or malformed ?tags= to no filter, never to an error', () => {
    const { result } = renderFilter({ url: '/study/deck-1?mode=browse&tags=,,%20,retired-tag' })

    expect(result.current.filter.selectedTags).toEqual([])
    expect(result.current.filter.visibleCards).toBe(CARDS)
  })

  it('trims and dedupes repeated tags', () => {
    const { result } = renderFilter({ url: '/study/deck-1?mode=browse&tags=%20verbs%20,verbs,nouns' })

    expect(result.current.filter.selectedTags).toEqual(['verbs', 'nouns'])
  })

  it('preserves mode when writing the tags param', () => {
    const { result } = renderFilter({ url: '/study/deck-1?mode=browse' })

    act(() => result.current.filter.setTags(['verbs']))

    expect(result.current.searchParams.get('mode')).toBe('browse')
    expect(result.current.searchParams.get('tags')).toBe('verbs')
  })

  it('removes the tags param entirely when the selection empties (no ?tags= litter)', () => {
    const { result } = renderFilter({ url: '/study/deck-1?mode=browse&tags=verbs' })

    act(() => result.current.filter.clearTags())

    expect(result.current.searchParams.has('tags')).toBe(false)
    expect(result.current.searchParams.get('mode')).toBe('browse')
    expect(result.current.filter.visibleCards).toBe(CARDS)
  })

  it('toggleTag adds then removes a tag', () => {
    const { result } = renderFilter({ url: '/study/deck-1?mode=browse' })

    act(() => result.current.filter.toggleTag('nouns'))
    expect(result.current.filter.selectedTags).toEqual(['nouns'])

    act(() => result.current.filter.toggleTag('nouns'))
    expect(result.current.filter.selectedTags).toEqual([])
    expect(result.current.searchParams.has('tags')).toBe(false)
  })

  it('writes multiple tags as a comma-separated list', () => {
    const { result } = renderFilter({ url: '/study/deck-1?mode=browse' })

    act(() => result.current.filter.setTags(['verbs', 'nouns']))

    expect(result.current.searchParams.get('tags')).toBe('verbs,nouns')
    expect(result.current.filter.visibleCards.map((entry) => entry.id)).toEqual(['c1', 'c2', 'c3'])
  })
})

/**
 * MARK-003 — the mark as a second dimension.
 *
 * The first block is the one that matters: the mark must be as unable to reach
 * the SM-2 queue as the tag filter already is (ADR-010). The rest pin
 * composition, URL round-tripping, and the identity guarantee that both
 * dimensions share.
 */
describe('useSessionFilters — the tag gate open, the mark gate closed (ADR-014 study mode)', () => {
  it('narrows by ?tags= while ignoring ?marked=1 on the same URL', () => {
    const { result } = renderFilter({ url: '/study/deck-1?mode=study&tags=verbs&marked=1', markEnabled: false })

    // The tag dimension is live …
    expect(result.current.filter.visibleCards.map((c) => c.id)).toEqual(['c1', 'c3'])
    expect(result.current.filter.isFiltering).toBe(true)
    // … and the mark dimension is not: no filter, no count, nothing to render.
    expect(result.current.filter.markedOnly).toBe(false)
    expect(result.current.filter.markedCount).toBe(0)
  })

  it('keeps the server order of the cards it keeps — it narrows, it never sorts', () => {
    const reversed = [...CARDS].reverse()
    const { result } = renderFilter({ url: '/study/deck-1?mode=study&tags=verbs', cards: reversed, markEnabled: false })

    expect(result.current.filter.visibleCards.map((c) => c.id)).toEqual(['c3', 'c1'])
  })

  it('still hands back the IDENTICAL cards reference when no tag is selected', () => {
    const { result } = renderFilter({ url: '/study/deck-1?mode=study&marked=1', markEnabled: false })

    expect(result.current.filter.visibleCards).toBe(CARDS)
  })

  it('toggleMarkedOnly cannot switch the mark on while its gate is closed', () => {
    const { result } = renderFilter({ url: '/study/deck-1?mode=study', markEnabled: false })

    act(() => result.current.filter.toggleMarkedOnly())

    // The URL took the write — the gate is on the READ side, which is what
    // makes a hand-crafted URL and a stray click the same non-event.
    expect(result.current.searchParams.get('marked')).toBe('1')
    expect(result.current.filter.markedOnly).toBe(false)
    expect(result.current.filter.visibleCards).toBe(CARDS)
  })
})

describe('useSessionFilters — the mark dimension, gate closed (study mode)', () => {
  it('ignores ?marked=1 entirely and hands back the IDENTICAL cards reference', () => {
    const { result } = renderFilter({ url: '/study/deck-1?mode=study&marked=1', markEnabled: false })

    expect(result.current.filter.markedOnly).toBe(false)
    expect(result.current.filter.isFiltering).toBe(false)
    // toBe — a crafted URL must not shrink what the scheduler chose.
    expect(result.current.filter.visibleCards).toBe(CARDS)
  })

  it('ignores ?marked=1 combined with ?tags=, which is the same attack twice', () => {
    const { result } = renderFilter({ url: '/study/deck-1?mode=study&marked=1&tags=verbs', tagsEnabled: false, markEnabled: false })

    expect(result.current.filter.visibleCards).toBe(CARDS)
    expect(result.current.filter.markedCount).toBe(0)
  })
})

describe('useSessionFilters — the mark dimension, gate open (browse mode)', () => {
  it('narrows to marked cards on ?marked=1', () => {
    const { result } = renderFilter({ url: '/study/deck-1?mode=browse&marked=1' })

    expect(result.current.filter.markedOnly).toBe(true)
    expect(result.current.filter.isFiltering).toBe(true)
    expect(result.current.filter.visibleCards.map((entry) => entry.id)).toEqual(['c1', 'c4'])
  })

  it('reports how many cards are marked before any filter narrows them', () => {
    const { result } = renderFilter({ url: '/study/deck-1?mode=browse' })

    // Counted over the whole deck, not the visible subset — this is what tells
    // "nothing is marked" apart from "this combination matched nothing".
    expect(result.current.filter.markedCount).toBe(2)
    expect(result.current.filter.visibleCards).toBe(CARDS)
  })

  it('composes with tags using AND', () => {
    const { result } = renderFilter({ url: '/study/deck-1?mode=browse&marked=1&tags=verbs' })

    // c1 is both marked and tagged; c3 is tagged but unmarked; c4 is marked but untagged.
    expect(result.current.filter.visibleCards.map((entry) => entry.id)).toEqual(['c1'])
  })

  it('treats any value other than 1 as off', () => {
    const { result } = renderFilter({ url: '/study/deck-1?mode=browse&marked=true' })

    expect(result.current.filter.markedOnly).toBe(false)
    expect(result.current.filter.visibleCards).toBe(CARDS)
  })

  it('keeps the identical cards reference when neither dimension is active', () => {
    const { result } = renderFilter({ url: '/study/deck-1?mode=browse' })

    expect(result.current.filter.visibleCards).toBe(CARDS)
  })

  it('setMarkedOnly writes and clears the param without disturbing mode or tags', () => {
    const { result } = renderFilter({ url: '/study/deck-1?mode=browse&tags=verbs' })

    act(() => result.current.filter.setMarkedOnly(true))
    expect(result.current.searchParams.get('marked')).toBe('1')
    expect(result.current.searchParams.get('mode')).toBe('browse')
    expect(result.current.searchParams.get('tags')).toBe('verbs')

    act(() => result.current.filter.setMarkedOnly(false))
    expect(result.current.searchParams.has('marked')).toBe(false)
    expect(result.current.searchParams.get('tags')).toBe('verbs')
  })

  it('toggleMarkedOnly flips the dimension on then off', () => {
    const { result } = renderFilter({ url: '/study/deck-1?mode=browse' })

    act(() => result.current.filter.toggleMarkedOnly())
    expect(result.current.filter.markedOnly).toBe(true)

    act(() => result.current.filter.toggleMarkedOnly())
    expect(result.current.filter.markedOnly).toBe(false)
    expect(result.current.searchParams.has('marked')).toBe(false)
  })

  it('clearFilters drops both dimensions and restores the identical reference', () => {
    const { result } = renderFilter({ url: '/study/deck-1?mode=browse&marked=1&tags=verbs' })

    act(() => result.current.filter.clearFilters())

    expect(result.current.searchParams.has('marked')).toBe(false)
    expect(result.current.searchParams.has('tags')).toBe(false)
    expect(result.current.searchParams.get('mode')).toBe('browse')
    expect(result.current.filter.visibleCards).toBe(CARDS)
  })

  it('does not push a history entry per filter change', () => {
    const { result } = renderFilter({ url: '/study/deck-1?mode=browse' })

    act(() => result.current.filter.setMarkedOnly(true))

    // replace, not push — the way out of the session must stay one click away.
    expect(result.current.searchParams.get('mode')).toBe('browse')
    expect(result.current.filter.markedOnly).toBe(true)
  })
})

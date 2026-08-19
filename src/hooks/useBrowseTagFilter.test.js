import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { MemoryRouter, useSearchParams } from 'react-router-dom'

import { useBrowseTagFilter } from './useBrowseTagFilter'

const card = (id, tags) => ({ _id: id, id, title: id, ...(tags === undefined ? {} : { tags }) })

const CARDS = [card('c1', ['verbs']), card('c2', ['nouns']), card('c3', ['verbs', 'nouns']), card('c4')]

/**
 * Renders the hook under a real router at `initialUrl`, and also surfaces the
 * live search params so tests can assert on what was actually written to the
 * URL (rather than trusting the hook's own view of it).
 */
function renderFilter({ url = '/study/deck-1', cards = CARDS, enabled = true } = {}) {
  const wrapper = ({ children }) => <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
  return renderHook(
    () => {
      const [searchParams] = useSearchParams()
      return { filter: useBrowseTagFilter({ cards, enabled }), searchParams }
    },
    { wrapper }
  )
}

describe('useBrowseTagFilter — disabled (study mode)', () => {
  it('reports no tags and hands back the IDENTICAL cards reference even when ?tags= is populated', () => {
    const { result } = renderFilter({ url: '/study/deck-1?mode=study&tags=verbs', enabled: false })

    expect(result.current.filter.availableTags).toEqual([])
    expect(result.current.filter.selectedTags).toEqual([])
    expect(result.current.filter.isFiltering).toBe(false)
    // toBe — the SM-2 queue must be the exact array StudySession loaded.
    expect(result.current.filter.visibleCards).toBe(CARDS)
  })
})

describe('useBrowseTagFilter — enabled (browse mode)', () => {
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

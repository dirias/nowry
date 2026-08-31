/**
 * HDR-002 — the Browse session's view filters as one segmented control.
 *
 * What is pinned here is the taxonomy, not the pixels: that a segment with
 * nothing to control does not exist (§11), that each segment names itself by
 * its visible text and carries its own pressed state, and that a deck with more
 * tags than anyone can scan gets a way to search them.
 *
 * `t` is a prop, so no i18n mock is needed — the keys ARE the assertions.
 */
import React from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'

import BrowseFilterBar from '../BrowseFilterBar'

const t = (key, opts) => (opts ? `${key}:${JSON.stringify(opts)}` : key)

const TAGS = [
  { tag: 'verbs', count: 12 },
  { tag: 'nouns', count: 9 }
]

const setup = (props = {}) =>
  render(
    <BrowseFilterBar
      availableTags={TAGS}
      selectedTags={[]}
      onTagsChange={jest.fn()}
      markedOnly={false}
      markedCount={3}
      onToggleMarked={jest.fn()}
      shown={3}
      total={28}
      t={t}
      {...props}
    />
  )

const tagsSegment = () => screen.queryByRole('button', { name: /^cards\.session\.filters\.tags/ })
const markSegment = () => screen.queryByTestId('marked-filter-segment')
const openTags = () => fireEvent.click(tagsSegment())

describe('progressive disclosure', () => {
  it('renders nothing at all when neither dimension has anything to control', () => {
    const { container } = setup({ availableTags: [], markedCount: 0 })
    expect(container).toBeEmptyDOMElement()
  })

  it('drops the tag segment on a deck with no tags, keeping the mark one', () => {
    setup({ availableTags: [] })
    expect(tagsSegment()).not.toBeInTheDocument()
    expect(markSegment()).toBeInTheDocument()
  })

  it('drops the mark segment when nothing is marked, keeping the tag one', () => {
    setup({ markedCount: 0 })
    expect(markSegment()).not.toBeInTheDocument()
    expect(tagsSegment()).toBeInTheDocument()
  })

  it('keeps the mark segment while the filter is on, so it can be switched off', () => {
    setup({ markedCount: 0, markedOnly: true })
    expect(markSegment()).toBeInTheDocument()
  })

  it('shows the narrowed count only once a filter is actually narrowing', () => {
    const { rerender } = setup()
    expect(screen.queryByText(/showing/)).not.toBeInTheDocument()

    rerender(
      <BrowseFilterBar
        availableTags={TAGS}
        selectedTags={[]}
        onTagsChange={jest.fn()}
        markedOnly
        markedCount={3}
        onToggleMarked={jest.fn()}
        shown={3}
        total={28}
        t={t}
      />
    )
    expect(screen.getByText(/cards\.session\.markFilter\.showing/)).toBeInTheDocument()
  })
})

describe('the mark segment', () => {
  it('names itself by what it is, and reports direction through aria-pressed', () => {
    setup()
    // WCAG 2.5.3: no aria-label to contradict the visible label. The chip this
    // replaced was named "Show only marked cards" over a visible "Marked".
    expect(markSegment()).not.toHaveAttribute('aria-label')
    expect(markSegment()).toHaveAttribute('aria-pressed', 'false')
    expect(markSegment()).toHaveTextContent('cards.session.markFilter.label')
  })

  it('reports itself pressed while the filter is on', () => {
    setup({ markedOnly: true })
    expect(markSegment()).toHaveAttribute('aria-pressed', 'true')
  })

  it('asks the parent to toggle rather than deciding for itself', () => {
    const onToggleMarked = jest.fn()
    setup({ onToggleMarked })
    fireEvent.click(markSegment())
    expect(onToggleMarked).toHaveBeenCalledTimes(1)
  })
})

describe('the tag segment', () => {
  it('lists every tag with its count', async () => {
    setup()
    openTags()

    const verbs = await screen.findByRole('menuitemcheckbox', { name: /^verbs/ })
    expect(within(verbs).getByText('12')).toBeInTheDocument()
    expect(screen.getByRole('menuitemcheckbox', { name: /^nouns/ })).toBeInTheDocument()
  })

  it('adds a tag to the selection rather than replacing it', async () => {
    const onTagsChange = jest.fn()
    setup({ selectedTags: ['verbs'], onTagsChange })
    openTags()

    fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: /^nouns/ }))
    expect(onTagsChange).toHaveBeenCalledWith(['verbs', 'nouns'])
  })

  it('removes a tag that was already selected', async () => {
    const onTagsChange = jest.fn()
    setup({ selectedTags: ['verbs', 'nouns'], onTagsChange })
    openTags()

    fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: /^verbs/ }))
    expect(onTagsChange).toHaveBeenCalledWith(['nouns'])
  })

  it('reports the checked state of each row', async () => {
    setup({ selectedTags: ['verbs'] })
    openTags()

    expect(await screen.findByRole('menuitemcheckbox', { name: /^verbs/ })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('menuitemcheckbox', { name: /^nouns/ })).toHaveAttribute('aria-checked', 'false')
  })

  it('counts the selection in its own label', () => {
    setup({ selectedTags: ['verbs', 'nouns'] })
    expect(tagsSegment()).toHaveTextContent('cards.session.filters.tagsSelected')
  })

  it('offers a way to clear the whole selection, and only once there is one', async () => {
    const onTagsChange = jest.fn()
    const { rerender } = setup({ onTagsChange })
    openTags()
    expect(screen.queryByText('cards.session.tagFilter.clear')).not.toBeInTheDocument()

    rerender(
      <BrowseFilterBar
        availableTags={TAGS}
        selectedTags={['verbs']}
        onTagsChange={onTagsChange}
        markedOnly={false}
        markedCount={3}
        onToggleMarked={jest.fn()}
        shown={1}
        total={28}
        t={t}
      />
    )
    fireEvent.click(await screen.findByText('cards.session.tagFilter.clear'))
    expect(onTagsChange).toHaveBeenCalledWith([])
  })
})

describe('tag-heavy decks', () => {
  const manyTags = Array.from({ length: 12 }, (_, i) => ({ tag: `tag-${i}`, count: i + 1 }))

  it('offers no search on a deck small enough to scan', async () => {
    setup()
    openTags()
    await screen.findByRole('menuitemcheckbox', { name: /^verbs/ })

    expect(screen.queryByLabelText('cards.session.filters.searchTags')).not.toBeInTheDocument()
  })

  it('offers one once picking from a flat list stops being picking', async () => {
    setup({ availableTags: manyTags })
    openTags()

    expect(await screen.findByLabelText('cards.session.filters.searchTags')).toBeInTheDocument()
  })

  it('narrows the list to what was typed', async () => {
    setup({ availableTags: manyTags })
    openTags()

    fireEvent.change(await screen.findByLabelText('cards.session.filters.searchTags'), { target: { value: 'tag-1' } })

    // tag-1, tag-10 and tag-11 — a substring match, not a prefix one.
    expect(screen.getAllByRole('menuitemcheckbox')).toHaveLength(3)
  })

  it('says so when nothing matches, rather than showing an empty menu', async () => {
    setup({ availableTags: manyTags })
    openTags()

    fireEvent.change(await screen.findByLabelText('cards.session.filters.searchTags'), { target: { value: 'zzz' } })

    expect(screen.getByText('cards.session.tagFilter.noOptions')).toBeInTheDocument()
    expect(screen.queryAllByRole('menuitemcheckbox')).toHaveLength(0)
  })
})

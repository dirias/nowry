/**
 * SelectionBar — the toolbar's replacement while a selection exists (PRD D16, MGMT-004).
 */
import React from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, opts) => (opts ? `${k}:${JSON.stringify(opts)}` : k) })
}))

const SelectionBar = require('../SelectionBar').default

const card = (id, overrides = {}) => ({ _id: id, title: id, tags: [], ...overrides })
const TAGS = [
  { tag: 'verbs', count: 4 },
  { tag: 'asia', count: 9 }
]

const renderBar = (props = {}) => {
  const handlers = {
    onClear: jest.fn(),
    onSelectAll: jest.fn(),
    onMove: jest.fn(),
    onTag: jest.fn(),
    onUntag: jest.fn(),
    onMark: jest.fn(),
    onUnmark: jest.fn(),
    onDelete: jest.fn()
  }
  render(<SelectionBar selectedCards={[card('c1'), card('c2')]} total={5} availableTags={TAGS} {...handlers} {...props} />)
  return handlers
}

describe('the row', () => {
  it('reads ✕ · "N selected" · Move to · Tag ▾ · Mark · Delete … Select all N, with no solid key', () => {
    const handlers = renderBar()
    const bar = screen.getByTestId('selection-bar')
    expect(bar).toHaveTextContent('cards.select.count:{"count":2}')
    expect(within(bar).queryByRole('button', { name: /solid/ })).toBeNull()
    expect(bar.querySelector('.MuiButton-variantSolid')).toBeNull()
    fireEvent.click(within(bar).getByRole('button', { name: 'cards.select.clear' }))
    expect(handlers.onClear).toHaveBeenCalledTimes(1)
    fireEvent.click(within(bar).getByRole('button', { name: 'cards.select.moveTo' }))
    expect(handlers.onMove).toHaveBeenCalledTimes(1)
    fireEvent.click(within(bar).getByRole('button', { name: 'cards.deck.delete' }))
    expect(handlers.onDelete).toHaveBeenCalledTimes(1)
    fireEvent.click(within(bar).getByRole('button', { name: 'cards.select.all:{"count":5}' }))
    expect(handlers.onSelectAll).toHaveBeenCalledTimes(1)
  })

  it('reads Mark until every selected card is marked, then Unmark', () => {
    const some = renderBar({ selectedCards: [card('c1', { marked_at: '2026-09-01' }), card('c2')] })
    fireEvent.click(screen.getByRole('button', { name: 'cards.mark.action' }))
    expect(some.onMark).toHaveBeenCalledTimes(1)
    expect(some.onUnmark).not.toHaveBeenCalled()
  })

  it('offers Unmark when all are marked', () => {
    const all = renderBar({ selectedCards: [card('c1', { marked_at: '2026-09-01' }), card('c2', { marked_at: '2026-09-02' })] })
    fireEvent.click(screen.getByRole('button', { name: 'cards.select.unmark' }))
    expect(all.onUnmark).toHaveBeenCalledTimes(1)
  })
})

describe('Tag ▾', () => {
  it('shows a full check only where every selected card carries the tag, and a dash where some do', () => {
    const handlers = renderBar({
      selectedCards: [card('c1', { tags: ['verbs', 'asia'] }), card('c2', { tags: ['verbs'] })]
    })
    fireEvent.click(screen.getByRole('button', { name: 'cards.select.tagAria' }))
    const verbs = screen.getByRole('menuitemcheckbox', { name: /verbs/ })
    const asia = screen.getByRole('menuitemcheckbox', { name: /asia/ })
    expect(verbs).toHaveAttribute('aria-checked', 'true')
    expect(within(verbs).getByTestId('tag-every')).toBeInTheDocument()
    expect(asia).toHaveAttribute('aria-checked', 'mixed')
    expect(within(asia).getByTestId('tag-some')).toBeInTheDocument()
    fireEvent.click(verbs)
    expect(handlers.onUntag).toHaveBeenCalledWith('verbs')
    fireEvent.click(asia)
    expect(handlers.onTag).toHaveBeenCalledWith('asia')
    // The menu stays open across picks.
    expect(screen.getByTestId('tag-menu')).toBeInTheDocument()
  })
})

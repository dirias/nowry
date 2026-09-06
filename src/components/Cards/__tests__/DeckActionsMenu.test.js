/**
 * DeckActionsMenu — MGMT-006 (PRD D18, US-010). Archive sits above Delete,
 * after a hairline, and needs no confirm of its own.
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, opts) => (opts ? `${k}:${JSON.stringify(opts)}` : k) })
}))

const DeckActionsMenu = require('../DeckActionsMenu').default

const deck = { _id: 'd1', name: 'Spanish Vocabulary', is_public: false }

const renderMenu = (props = {}) => {
  const handlers = {
    onAddCard: jest.fn(),
    onDeckSettings: jest.fn(),
    onEditDeck: jest.fn(),
    onPublishDeck: jest.fn(),
    onAnalyzeDeck: jest.fn(),
    onArchiveDeck: jest.fn(),
    onDeleteDeck: jest.fn(),
    openUpgradeModal: jest.fn(),
    ...props
  }
  render(<DeckActionsMenu deck={deck} tier='pro' {...handlers} />)
  fireEvent.click(screen.getByLabelText('cards.manage_content.aria.deckActions:{"name":"Spanish Vocabulary"}'))
  return handlers
}

it('offers Archive above Delete, each after its own hairline', () => {
  renderMenu()
  const items = screen.getAllByRole('menuitem').map((item) => item.textContent)
  const archiveAt = items.indexOf('cards.deck.archive')
  const deleteAt = items.indexOf('cards.deck.delete')
  expect(archiveAt).toBeGreaterThan(-1)
  expect(deleteAt).toBe(archiveAt + 1)
  expect(items[items.length - 1]).toBe('cards.deck.delete')

  const archive = screen.getByText('cards.deck.archive').closest('[role="menuitem"]')
  expect(archive.previousElementSibling).toHaveAttribute('role', 'separator')
  expect(archive.nextElementSibling).toHaveAttribute('role', 'separator')
})

it('reports Archive to its owner with the deck and asks nothing itself', () => {
  const handlers = renderMenu()
  fireEvent.click(screen.getByText('cards.deck.archive'))
  expect(handlers.onArchiveDeck).toHaveBeenCalledWith(deck)
  expect(handlers.onDeleteDeck).not.toHaveBeenCalled()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

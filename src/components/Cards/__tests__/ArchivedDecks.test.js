/**
 * ArchivedDecks — MGMT-006 (PRD D18, ADR-023 point 4). A disclosure row at
 * the foot of the Decks view: absent at zero, remembered for the session,
 * keyboard-operable, archived rows with a Restore key each.
 */
import React from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, opts) => (opts ? `${k}:${JSON.stringify(opts)}` : k) })
}))
const mockUseDeckData = jest.fn()
jest.mock('../../../hooks/useDeckData', () => ({ useDeckData: (...args) => mockUseDeckData(...args) }))

const ArchivedDecks = require('../ArchivedDecks').default

const ARCHIVED = [
  { _id: 'a1', name: 'Old Kanji', deck_type: 'flashcard', total_cards: 48, due_cards: 3, mastery: 62, archived_at: '2026-08-12T10:00:00Z' },
  { _id: 'a2', name: 'Retired quiz', deck_type: 'quiz', total_cards: 10, due_cards: 0, mastery: 90, archived_at: '2026-09-01T10:00:00Z' }
]

beforeEach(() => {
  sessionStorage.clear()
  mockUseDeckData.mockReset().mockReturnValue({ decks: ARCHIVED, loading: false, error: null, reload: jest.fn() })
})

it('reads the archived list on its own key and renders nothing at zero or while loading', () => {
  mockUseDeckData.mockReturnValue({ decks: [], loading: false })
  const { unmount } = render(<ArchivedDecks onRestore={jest.fn()} />)
  expect(mockUseDeckData).toHaveBeenCalledWith(undefined, { archived: true })
  expect(screen.queryByTestId('archived-decks')).not.toBeInTheDocument()
  unmount()

  mockUseDeckData.mockReturnValue({ decks: ARCHIVED, loading: true })
  render(<ArchivedDecks onRestore={jest.fn()} />)
  expect(screen.queryByTestId('archived-decks')).not.toBeInTheDocument()
})

it('is a collapsed row "Archived · N" that opens into archived rows with a Restore key each', () => {
  const onRestore = jest.fn()
  render(<ArchivedDecks onRestore={onRestore} />)
  const row = screen.getByRole('button', { expanded: false })
  expect(row).toHaveTextContent('cards.archived.title')
  expect(row).toHaveTextContent('2')
  expect(row).toHaveTextContent('cards.archived.meta')
  expect(screen.queryByTestId('deck-row')).not.toBeInTheDocument()

  fireEvent.click(row)
  expect(row).toHaveAttribute('aria-expanded', 'true')
  const rows = screen.getAllByTestId('deck-row')
  expect(rows).toHaveLength(2)
  expect(rows[0]).toHaveAttribute('data-archived', 'true')
  expect(rows[0]).toHaveTextContent('study.deck.historyKept')
  expect(rows[0]).toHaveTextContent(/study\.deck\.archivedOn:\{"date":"/)
  expect(within(rows[0]).queryByText('study.deck.study')).not.toBeInTheDocument()
  expect(within(rows[0]).queryByText('study.dueCount')).not.toBeInTheDocument()

  fireEvent.click(within(rows[0]).getByRole('button', { name: 'study.deck.restoreAria:{"name":"Old Kanji"}' }))
  expect(onRestore).toHaveBeenCalledWith(expect.objectContaining({ _id: 'a1' }))
})

it('opens and closes from the keyboard and remembers the state for the session', () => {
  const first = render(<ArchivedDecks onRestore={jest.fn()} />)
  const row = screen.getByRole('button', { expanded: false })
  fireEvent.keyDown(row, { key: 'Enter' })
  expect(row).toHaveAttribute('aria-expanded', 'true')
  expect(sessionStorage.getItem('nowry_archived_decks_open')).toBe('1')
  fireEvent.keyDown(row, { key: ' ' })
  expect(row).toHaveAttribute('aria-expanded', 'false')
  fireEvent.keyDown(row, { key: 'Enter' })
  first.unmount()

  render(<ArchivedDecks onRestore={jest.fn()} />)
  expect(screen.getByRole('button', { expanded: true })).toBeInTheDocument()
  expect(screen.getAllByTestId('deck-row')).toHaveLength(2)
})

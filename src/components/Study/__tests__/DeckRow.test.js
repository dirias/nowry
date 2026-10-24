/**
 * SR-003 — a rested deck's row says it rests, never "Up to date".
 */
import React from 'react'
import { render, screen } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => (options?.date ? `${key}:${options.date}` : options?.count !== undefined ? `${key}:${options.count}` : key),
    i18n: { language: 'en' }
  })
}))

const DeckRow = require('../DeckRow').default

const DECK = { _id: 'deck-1', name: 'ビスニス日本語', deck_type: 'flashcard', total_cards: 23, due_cards: 0, new_cards: 0 }
const row = (deck) => render(<DeckRow deck={deck} onStudy={jest.fn()} onBrowse={jest.fn()} />)

it('reads Resting for a deck resting until woken', () => {
  row({ ...DECK, rest_until: '9999-12-31T00:00:00Z' })
  expect(screen.getByText('cards.rest.resting')).toBeInTheDocument()
  expect(screen.queryByText('study.deck.upToDate')).toBeNull()
})

it('reads the date for a deck resting until a day', () => {
  const until = new Date(Date.now() + 7 * 86400000).toISOString()
  row({ ...DECK, rest_until: until })
  expect(screen.getByText(/^cards\.rest\.restingUntil:/)).toBeInTheDocument()
})

it('counts resting cards on an awake deck with nothing asked', () => {
  row({ ...DECK, resting_cards: 4 })
  expect(screen.getByText('cards.rest.count:4')).toBeInTheDocument()
})

it('reads Up to date when nothing rests and nothing is asked', () => {
  row(DECK)
  expect(screen.getByText('study.deck.upToDate')).toBeInTheDocument()
})

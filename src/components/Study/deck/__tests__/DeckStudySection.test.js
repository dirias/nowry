/**
 * SR-003 — the deck's rest control shows one thing per state.
 *
 * Awake, it offers the lengths; resting, it reads its date and offers Wake.
 * The picker never sits empty beside a rest that is already on.
 */
import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: 'en' } })
}))

const DeckStudySection = require('../DeckStudySection').default

const CONFIG = { pace_mode: 'balanced', new_per_day: 20, max_reviews_per_day: 100 }
const AWAKE = { _id: 'deck-1', rest_until: null }
const RESTING = { _id: 'deck-1', rest_until: '9999-12-31T00:00:00Z' }

const renderSection = (deck, handlers = {}) =>
  render(
    <DeckStudySection
      loading={false}
      config={CONFIG}
      onChange={jest.fn()}
      deck={deck}
      onRest={handlers.onRest ?? jest.fn()}
      onWake={handlers.onWake ?? jest.fn()}
    />
  )

describe('awake', () => {
  it('offers the lengths and no Wake', () => {
    renderSection(AWAKE)
    expect(screen.getByRole('combobox', { name: 'cards.rest.restDeck' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'cards.rest.wake' })).toBeNull()
    expect(screen.queryByTestId('deck-rest-status')).toBeNull()
    expect(screen.getByText('cards.rest.restDeckHint')).toBeInTheDocument()
  })
})

describe('resting', () => {
  it('reads its state, offers Wake, and no picker', () => {
    renderSection(RESTING)
    expect(screen.getByTestId('deck-rest-status')).toHaveTextContent('cards.rest.resting')
    expect(screen.getByRole('button', { name: 'cards.rest.wake' })).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'cards.rest.restDeck' })).toBeNull()
    expect(screen.getByText('cards.rest.restingDeckHint')).toBeInTheDocument()
  })

  it('returns to the picker once woken', async () => {
    const onWake = jest.fn().mockResolvedValue(AWAKE)
    renderSection(RESTING, { onWake })
    fireEvent.click(screen.getByRole('button', { name: 'cards.rest.wake' }))
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'cards.rest.restDeck' })).toBeInTheDocument())
    expect(onWake).toHaveBeenCalled()
  })
})

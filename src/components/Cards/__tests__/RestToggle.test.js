/**
 * SR-003 — the rest control's contract on the web.
 *
 * It reads the card's rest, offers the four lengths, offers Wake only while
 * resting, writes through the dedicated routes, and never fires the row it
 * sits inside. What it must NOT do belongs to the API suite: tests/test_rest.py
 * asserts a rest never writes scheduler state (ADR-043).
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k })
}))

jest.mock('@nowry/core/api/services', () => ({
  cardsService: {
    rest: jest.fn(),
    wake: jest.fn()
  }
}))

jest.mock('@nowry/core/api/cardCache', () => ({
  CARD_WRITE_RESOURCES: ['cards'],
  invalidateCardCaches: jest.fn(() => Promise.resolve())
}))

const { cardsService } = require('@nowry/core/api/services')
const RestToggle = require('../RestToggle').default

const AWAKE = { _id: 'card-1', title: 'Mitochondrion', rest_until: null }
const RESTING = { _id: 'card-2', title: 'Ribosome', rest_until: '9999-12-31T00:00:00Z' }

const toggle = () => screen.getByTestId('rest-toggle')

beforeEach(() => {
  jest.clearAllMocks()
  cardsService.rest.mockResolvedValue({ _id: 'card-1', rest_until: '9999-12-31T00:00:00Z' })
  cardsService.wake.mockResolvedValue({ _id: 'card-2', rest_until: null })
})

describe('state it reports', () => {
  it('reads awake and resting from rest_until', () => {
    const { unmount } = render(<RestToggle card={AWAKE} />)
    expect(toggle()).toHaveAttribute('aria-pressed', 'false')
    expect(toggle()).toHaveTextContent('cards.rest.action')
    unmount()
    render(<RestToggle card={RESTING} />)
    expect(toggle()).toHaveAttribute('aria-pressed', 'true')
    expect(toggle()).toHaveTextContent('cards.rest.actionOn')
  })

  it('renders nothing without a card id', () => {
    const { container } = render(<RestToggle card={{}} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('the menu', () => {
  it('offers the four lengths, and Wake only while resting', () => {
    render(<RestToggle card={AWAKE} />)
    fireEvent.click(toggle())
    expect(screen.getByRole('menuitem', { name: 'cards.rest.untilWoken' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'cards.rest.month' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'cards.rest.wake' })).toBeNull()
  })

  it('rests until woken through the dedicated route and tells the owner', async () => {
    const onRestChange = jest.fn()
    render(<RestToggle card={AWAKE} onRestChange={onRestChange} />)
    fireEvent.click(toggle())
    fireEvent.click(screen.getByRole('menuitem', { name: 'cards.rest.untilWoken' }))
    await waitFor(() => expect(cardsService.rest).toHaveBeenCalledWith('card-1', null))
    await waitFor(() => expect(onRestChange).toHaveBeenCalledWith('card-1', expect.objectContaining({ _id: 'card-1' })))
  })

  it('rests for a week with a date a week out', async () => {
    render(<RestToggle card={AWAKE} />)
    fireEvent.click(toggle())
    fireEvent.click(screen.getByRole('menuitem', { name: 'cards.rest.week' }))
    await waitFor(() => expect(cardsService.rest).toHaveBeenCalled())
    const until = cardsService.rest.mock.calls[0][1]
    expect(until).toBeInstanceOf(Date)
    expect((until - Date.now()) / 86400000).toBeCloseTo(7, 0)
  })

  it('wakes through the dedicated route', async () => {
    render(<RestToggle card={RESTING} />)
    fireEvent.click(toggle())
    fireEvent.click(screen.getByRole('menuitem', { name: 'cards.rest.wake' }))
    await waitFor(() => expect(cardsService.wake).toHaveBeenCalledWith('card-2'))
  })

  it('does not fire the row it sits inside', () => {
    const onRow = jest.fn()
    render(
      <div onClick={onRow}>
        <RestToggle card={AWAKE} />
      </div>
    )
    fireEvent.click(toggle())
    expect(onRow).not.toHaveBeenCalled()
  })
})

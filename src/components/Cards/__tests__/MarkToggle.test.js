/**
 * MARK-002 — the mark control's contract.
 *
 * The behaviours pinned here are the ones that make the mark feel like a
 * bookmark rather than a form field: it flips before the network answers, it
 * puts itself back if the network refuses, it does not fire the row or card it
 * sits inside, and it follows the card it is given rather than the mount.
 *
 * What it must NOT do belongs to the backend suite: `tests/test_marked_cards.py`
 * asserts that marking never writes scheduler state (ADR-010).
 *
 * Harness idiom: react-i18next mock + a mocked services module, mirroring
 * ManageContent.test.js. require-after-mock at the bottom.
 */
import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k })
}))

jest.mock('../../../api/services', () => ({
  cardsService: {
    mark: jest.fn(),
    unmark: jest.fn()
  }
}))

const { cardsService } = require('../../../api/services')
const MarkToggle = require('../MarkToggle').default

const UNMARKED = { _id: 'card-1', title: 'Mitochondrion', marked_at: null }
const MARKED = { _id: 'card-2', title: 'Ribosome', marked_at: '2026-08-30T10:00:00' }

const toggle = () => screen.getByTestId('mark-toggle')

beforeEach(() => {
  jest.clearAllMocks()
  cardsService.mark.mockResolvedValue({ _id: 'card-1', marked_at: '2026-08-30T12:00:00' })
  cardsService.unmark.mockResolvedValue({ _id: 'card-2', marked_at: null })
})

describe('state it reports', () => {
  it('reads unmarked from a card with no marked_at', () => {
    render(<MarkToggle card={UNMARKED} />)
    expect(toggle()).toHaveAttribute('aria-pressed', 'false')
    expect(toggle()).toHaveAttribute('aria-label', 'cards.mark.mark')
  })

  it('reads marked from a card carrying a marked_at', () => {
    render(<MarkToggle card={MARKED} />)
    expect(toggle()).toHaveAttribute('aria-pressed', 'true')
    expect(toggle()).toHaveAttribute('aria-label', 'cards.mark.unmark')
  })

  it('renders nothing at all without a card id', () => {
    const { container } = render(<MarkToggle card={{}} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('toggling', () => {
  it('flips before the request resolves', async () => {
    let resolve
    cardsService.mark.mockReturnValue(
      new Promise((r) => {
        resolve = r
      })
    )

    render(<MarkToggle card={UNMARKED} />)
    fireEvent.click(toggle())

    // The point of the optimistic write: pressed already, network still open.
    expect(toggle()).toHaveAttribute('aria-pressed', 'true')

    await act(async () => resolve({ marked_at: '2026-08-30T12:00:00' }))
    expect(cardsService.mark).toHaveBeenCalledWith('card-1')
  })

  it('reports the server timestamp rather than its own guess', async () => {
    const onMarkChange = jest.fn()
    render(<MarkToggle card={UNMARKED} onMarkChange={onMarkChange} />)

    fireEvent.click(toggle())

    await waitFor(() => expect(onMarkChange).toHaveBeenCalledWith('card-1', '2026-08-30T12:00:00'))
  })

  it('clears a marked card through unmark, not mark', async () => {
    const onMarkChange = jest.fn()
    render(<MarkToggle card={MARKED} onMarkChange={onMarkChange} />)

    fireEvent.click(toggle())

    await waitFor(() => expect(cardsService.unmark).toHaveBeenCalledWith('card-2'))
    expect(cardsService.mark).not.toHaveBeenCalled()
    await waitFor(() => expect(onMarkChange).toHaveBeenCalledWith('card-2', null))
  })

  it('puts itself back when the request fails', async () => {
    cardsService.mark.mockRejectedValue(new Error('network'))
    const onMarkChange = jest.fn()

    render(<MarkToggle card={UNMARKED} onMarkChange={onMarkChange} />)
    fireEvent.click(toggle())

    await waitFor(() => expect(toggle()).toHaveAttribute('aria-pressed', 'false'))
    // A failed mark is not a mark: the list must not be told one happened.
    expect(onMarkChange).not.toHaveBeenCalled()
  })

  it('ignores a second click while the first is still open', async () => {
    let resolve
    cardsService.mark.mockReturnValue(
      new Promise((r) => {
        resolve = r
      })
    )

    render(<MarkToggle card={UNMARKED} />)
    fireEvent.click(toggle())
    fireEvent.click(toggle())

    expect(cardsService.mark).toHaveBeenCalledTimes(1)
    expect(cardsService.unmark).not.toHaveBeenCalled()

    await act(async () => resolve({ marked_at: '2026-08-30T12:00:00' }))
    expect(toggle()).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('living inside a clickable row', () => {
  it('does not fire the surrounding click target', async () => {
    const onRowClick = jest.fn()

    render(
      <div onClick={onRowClick}>
        <MarkToggle card={UNMARKED} />
      </div>
    )
    fireEvent.click(toggle())

    expect(onRowClick).not.toHaveBeenCalled()
    await waitFor(() => expect(cardsService.mark).toHaveBeenCalled())
  })
})

describe('following the card', () => {
  it('re-reads when a different card is swapped in underneath it', () => {
    const { rerender } = render(<MarkToggle card={UNMARKED} />)
    expect(toggle()).toHaveAttribute('aria-pressed', 'false')

    // What a session does when the user steps to the next card.
    rerender(<MarkToggle card={MARKED} />)
    expect(toggle()).toHaveAttribute('aria-pressed', 'true')
  })

  it('re-reads when the same card arrives with a new value', () => {
    const { rerender } = render(<MarkToggle card={UNMARKED} />)

    rerender(<MarkToggle card={{ ...UNMARKED, marked_at: '2026-08-30T12:00:00' }} />)

    expect(toggle()).toHaveAttribute('aria-pressed', 'true')
  })
})

/**
 * BOOK-003 — Make cards by section: what is pre-ticked, what the run costs,
 * and what a free account is offered (docs/prd-book-cards.md D5, D10).
 */
import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => {
      if (!options) return key
      const pairs = Object.entries(options)
        .filter(([k]) => k !== 'defaultValue')
        .map(([k, v]) => `${k}=${v}`)
      return pairs.length ? `${key}:${pairs.join(',')}` : key
    },
    i18n: { language: 'en' }
  })
}))

const mockGetSections = jest.fn()
jest.mock('../../../api/services', () => ({
  booksService: { getSections: (...args) => mockGetSections(...args) }
}))

const MakeCardsSheet = require('../MakeCardsSheet').default
const { needsCards, preTicked } = require('../MakeCardsSheet')

const SECTIONS = [
  { index: 0, heading: 'Grammar', level: 'h1', words: 600, cards: 3, changed: false, estimate: 3 },
  { index: 1, heading: 'Particles', level: 'h2', words: 900, cards: 0, changed: false, estimate: 4 },
  { index: 2, heading: 'Verbs', level: 'h2', words: 500, cards: 2, changed: true, estimate: 3 }
]

const BOOK = { _id: 'b1', title: 'N3 Grammar' }

beforeEach(() => {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false
  })
  mockGetSections.mockReset().mockResolvedValue({ book_id: 'b1', title: 'N3 Grammar', sections: SECTIONS })
})

const renderSheet = async (props = {}) => {
  const onGenerate = jest.fn()
  const onUpgrade = jest.fn()
  await act(async () => {
    render(
      <MakeCardsSheet
        open
        onClose={() => {}}
        book={BOOK}
        tier='plus'
        aiUsageCount={7}
        onGenerate={onGenerate}
        onUpgrade={onUpgrade}
        {...props}
      />
    )
  })
  await screen.findByText('Particles')
  return { onGenerate, onUpgrade }
}

describe('what needs cards (D5)', () => {
  it('is a section with none, or one changed since its cards', () => {
    expect(SECTIONS.map(needsCards)).toEqual([false, true, true])
    expect(preTicked(SECTIONS)).toEqual([1, 2])
  })
})

describe('the sheet', () => {
  it('lists every section with its words and cards, pre-ticking the ones that need cards', async () => {
    await renderSheet()
    const boxes = screen.getAllByRole('checkbox')
    expect(boxes.map((box) => box.checked)).toEqual([false, true, true])
    expect(screen.getByText(/books.makeCards.words:count=900,words=900/)).toBeInTheDocument()
    expect(screen.queryByText(/noCards/)).toBeNull()
    expect(screen.getByText(/books.makeCards.changed/)).toBeInTheDocument()
    expect(mockGetSections).toHaveBeenCalledWith('b1')
  })

  it('on Plus, says what the run makes and what is left this month, then runs for the ticked sections', async () => {
    const { onGenerate } = await renderSheet()
    expect(screen.getByText('books.makeCards.budget:cards=7,sections=2,left=93,limit=100')).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('checkbox')[0])
    expect(screen.getByText('books.makeCards.budget:cards=10,sections=3,left=93,limit=100')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'books.makeCards.action:count=3' }))
    expect(onGenerate).toHaveBeenCalledWith([1, 2, 0])
  })

  it('on a free account keeps the readout on a locked key that opens the upgrade sheet', async () => {
    const { onGenerate, onUpgrade } = await renderSheet({ tier: 'free' })
    const key = screen.getByRole('button', { name: 'books.makeCards.actionLockedAria' })
    expect(key).toHaveTextContent('books.makeCards.action:count=2')
    expect(key).toHaveTextContent('plans.plus')

    fireEvent.click(key)
    expect(onUpgrade).toHaveBeenCalled()
    expect(onGenerate).not.toHaveBeenCalled()
  })

  it('on Plus with nothing left this month says so and refuses the run', async () => {
    await renderSheet({ aiUsageCount: 100 })
    expect(screen.getByText('books.makeCards.budgetSpent:limit=100')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'books.makeCards.action:count=2' })).toBeDisabled()
  })

  it('asks for a section when none is ticked', async () => {
    await renderSheet()
    fireEvent.click(screen.getByRole('button', { name: 'books.makeCards.selectAll' }))
    fireEvent.click(screen.getByRole('button', { name: 'books.makeCards.selectNone' }))
    expect(screen.getByText('books.makeCards.pick')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'books.makeCards.action:count=0' })).toBeDisabled()
  })

  it('shows the empty state for a document without sections', async () => {
    mockGetSections.mockResolvedValue({ book_id: 'b1', title: 'N3', sections: [] })
    await act(async () => {
      render(<MakeCardsSheet open onClose={() => {}} book={BOOK} tier='plus' />)
    })
    expect(await screen.findByText('books.makeCards.empty')).toBeInTheDocument()
  })

  it('shows the error and reloads on retry', async () => {
    mockGetSections.mockRejectedValueOnce(new Error('down'))
    await act(async () => {
      render(<MakeCardsSheet open onClose={() => {}} book={BOOK} tier='plus' />)
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('books.makeCards.loadError')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'books.makeCards.retry' }))
    })
    await waitFor(() => expect(screen.getByText('Particles')).toBeInTheDocument())
  })
})

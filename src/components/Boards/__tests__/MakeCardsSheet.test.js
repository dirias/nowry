/**
 * BOARD-006 — Make cards (PRD D7, Study board): the generated pairs as rows,
 * ticked and editable, a deck row, and "Add N cards" making each ticked card
 * with its board and note; errors in words, a plan limit as a sentence.
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CssVarsProvider } from '@mui/joy/styles'
import MakeCardsSheet, { generationError } from '../MakeCardsSheet'
import { blackboardService } from '@nowry/core/api/services/blackboard.service'
import { cardsService } from '@nowry/core/api/services/cards.service'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => {
      if (options?.title !== undefined) return `${key}:${options.title}`
      if (options?.count !== undefined) return `${key}:${options.count}`
      if (options?.limit !== undefined) return `${key}:${options.limit}`
      return key
    },
    i18n: { language: 'en' }
  })
}))
jest.mock('@nowry/core/api/services/blackboard.service', () => ({ blackboardService: { generateCards: jest.fn() } }))
jest.mock('@nowry/core/api/services/cards.service', () => ({ cardsService: { create: jest.fn() } }))
const mockDecks = { decks: [], loading: false, error: null }
jest.mock('@nowry/core/hooks/useDeckData', () => ({ useDeckData: () => mockDecks }))

const NOTES = [
  { id: 'light', text: 'Light reactions\nIn the thylakoids; make ATP and NADPH' },
  { id: 'calvin', text: 'Calvin cycle\nIn the stroma; fixes CO2 into sugar' }
]
const CARDS = [
  { front: 'Where do the light reactions happen?', back: 'In the thylakoids.' },
  { front: 'What does the Calvin cycle fix?', back: 'CO2, into sugar, in the stroma.' },
  { front: 'What do the light reactions make?', back: 'ATP and NADPH.' }
]

const mount = (props = {}) => {
  const handlers = { onClose: jest.fn(), onLinked: jest.fn(), onDone: jest.fn() }
  render(
    <MemoryRouter>
      <CssVarsProvider>
        <MakeCardsSheet open boardId='b1' notes={NOTES} {...handlers} {...props} />
      </CssVarsProvider>
    </MemoryRouter>
  )
  return handlers
}

const rows = () => screen.getAllByTestId('make-cards-row')

beforeEach(() => {
  mockDecks.decks = [
    { _id: 'd1', name: 'Biology · unit 3' },
    { _id: 'd2', name: 'Chemistry' }
  ]
  mockDecks.loading = false
  mockDecks.error = null
})

describe('MakeCardsSheet', () => {
  it('generates, lists the pairs, and adds the ticked ones to the deck with their board and note', async () => {
    blackboardService.generateCards.mockResolvedValue({ cards: CARDS, nodes_truncated: false })
    let n = 0
    cardsService.create.mockImplementation(async () => {
      n += 1
      return { _id: `card${n}` }
    })
    const { onLinked, onDone } = mount({ initialDeckId: 'd2' })

    expect(screen.getByTestId('make-cards-loading')).toBeInTheDocument()
    expect(blackboardService.generateCards).toHaveBeenCalledWith('b1', {
      nodeIds: ['light', 'calvin'],
      nodeTexts: [NOTES[0].text, NOTES[1].text]
    })
    await waitFor(() => expect(rows()).toHaveLength(3))
    expect(screen.getByText('boards.cards.fromNotes:2 · boards.cards.toAdd:3')).toBeInTheDocument()
    // The deck used last on this board.
    expect(screen.getByText('Chemistry')).toBeInTheDocument()
    expect(rows()[0]).toHaveTextContent('boards.cards.from:Light reactions')
    expect(rows()[1]).toHaveTextContent('boards.cards.from:Calvin cycle')

    // Leave the third out, and rewrite the first front in place.
    fireEvent.click(screen.getAllByRole('checkbox')[2])
    expect(rows()[2]).toHaveTextContent('boards.cards.leftOut:Light reactions')
    fireEvent.click(screen.getAllByRole('button', { name: 'boards.cards.editFront' })[0])
    const field = screen.getByRole('textbox', { name: 'boards.cards.editFront' })
    fireEvent.change(field, { target: { value: 'Where in the leaf do the light reactions happen?' } })
    fireEvent.keyDown(field, { key: 'Enter' })
    expect(rows()[0]).toHaveTextContent('Where in the leaf do the light reactions happen?')

    fireEvent.click(screen.getByRole('button', { name: 'boards.cards.add:2' }))
    await waitFor(() => expect(onDone).toHaveBeenCalledWith({ count: 2, deckId: 'd2', deckName: 'Chemistry' }))
    expect(cardsService.create).toHaveBeenNthCalledWith(1, {
      deck_id: 'd2',
      title: 'Where in the leaf do the light reactions happen?',
      content: 'In the thylakoids.',
      source_board_id: 'b1',
      source_board_node_id: 'light'
    })
    expect(cardsService.create).toHaveBeenNthCalledWith(2, expect.objectContaining({ source_board_node_id: 'calvin', deck_id: 'd2' }))
    expect(onLinked).toHaveBeenCalledWith([
      expect.objectContaining({ nodeId: 'light', cardId: 'card1' }),
      expect.objectContaining({ nodeId: 'calvin', cardId: 'card2' })
    ])
  })

  it('with no deck at all, a link makes one, and Add says why it waits instead of greying out', async () => {
    blackboardService.generateCards.mockResolvedValue({ cards: CARDS.slice(0, 1) })
    mockDecks.decks = []
    mount()
    await waitFor(() => expect(rows()).toHaveLength(1))
    expect(screen.getByRole('link', { name: 'boards.cards.makeDeck' })).toHaveAttribute('href', '/study?view=library&new=deck')
    const add = screen.getByRole('button', { name: 'boards.cards.add:1' })
    expect(add).not.toBeDisabled()
    fireEvent.click(add)
    expect(screen.getByText('boards.cards.needDeck')).toBeInTheDocument()
    expect(cardsService.create).not.toHaveBeenCalled()
  })

  it('a card added by hand joins the rows, and Make again asks again', async () => {
    blackboardService.generateCards.mockResolvedValue({ cards: CARDS.slice(0, 1) })
    mount()
    await waitFor(() => expect(rows()).toHaveLength(1))
    fireEvent.click(screen.getByRole('button', { name: 'boards.cards.addByHand' }))
    expect(rows()).toHaveLength(2)
    expect(screen.getByRole('textbox', { name: 'boards.cards.editFront' })).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'boards.cards.makeAgain' }))
    expect(blackboardService.generateCards).toHaveBeenCalledTimes(2)
  })

  it('a failure shows a banner whose retry asks again', async () => {
    blackboardService.generateCards.mockRejectedValueOnce({ response: { status: 502 } }).mockResolvedValueOnce({ cards: CARDS })
    mount()
    const banner = await screen.findByText('boards.cards.errorTitle')
    expect(banner).toBeInTheDocument()
    expect(screen.getByText('boards.cards.errorFailed')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }))
    await waitFor(() => expect(rows()).toHaveLength(3))
    expect(screen.queryByText('boards.cards.errorTitle')).toBeNull()
  })

  it('a plan limit is a sentence naming it, with nothing to retry', async () => {
    blackboardService.generateCards.mockRejectedValue({
      response: { status: 429, data: { detail: { code: 'ai_limit_reached', limit: 50 } } }
    })
    mount()
    expect(await screen.findByText('subscription.errors.aiLimitReached:50')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'common.retry' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'boards.cards.makeAgain' })).toBeNull()
    expect(screen.getByRole('button', { name: 'boards.cards.addByHand' })).toBeInTheDocument()
  })

  it('a card that fails to save stays, the ones made are linked, and the banner retries', async () => {
    blackboardService.generateCards.mockResolvedValue({ cards: CARDS.slice(0, 2) })
    cardsService.create.mockResolvedValueOnce({ _id: 'ok' }).mockRejectedValueOnce(new Error('offline'))
    const { onLinked, onDone } = mount()
    await waitFor(() => expect(rows()).toHaveLength(2))
    fireEvent.click(screen.getByRole('button', { name: 'boards.cards.add:2' }))
    expect(await screen.findByText('boards.cards.addErrorTitle')).toBeInTheDocument()
    expect(onLinked).toHaveBeenCalledWith([expect.objectContaining({ cardId: 'ok' })])
    expect(onDone).not.toHaveBeenCalled()
    expect(rows()).toHaveLength(1)
  })
})

describe('generationError', () => {
  it.each([
    [{ response: { status: 402 } }, { kind: 'limit', key: 'subscription.errors.upgradeToUse' }],
    [{ response: { status: 429 } }, { kind: 'limit', key: 'subscription.errors.aiLimitReached', options: { limit: 50 } }],
    [{ response: { status: 422 } }, { kind: 'empty' }],
    [{ response: { status: 504 } }, { kind: 'retry', detailKey: 'boards.cards.errorTimeout' }],
    [{ code: 'ECONNABORTED' }, { kind: 'retry', detailKey: 'boards.cards.errorTimeout' }],
    [new Error('x'), { kind: 'retry', detailKey: 'boards.cards.errorFailed' }]
  ])('%p reads as %p', (err, expected) => {
    expect(generationError(err)).toMatchObject(expected)
  })
})

/**
 * `GeneratedCards` — the save contract its callers depend on.
 *
 * This modal has always closed itself on a successful save by calling
 * `onCancel`, which is also what a dismissal calls. A caller that needs to know
 * whether anything actually reached the library — onboarding's AI fallback does,
 * because its confirmation copy differs in the two cases — could not tell those
 * apart. `onSaved` is that distinction, and this suite pins it: it fires with
 * the number written, it fires for a partial write at the plan limit (some cards
 * *are* in the library then), and it does not fire for a dismissal.
 *
 * Everything else here is the pre-existing sequential-insert behaviour, asserted
 * only where `onSaved` depends on it.
 */
import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => (options?.count !== undefined ? `${key}:${options.count}` : key),
    i18n: { language: 'en' }
  })
}))

const mockCreate = jest.fn()
const mockGetTags = jest.fn()
const mockDeckCreate = jest.fn()
jest.mock('../../../api/services', () => ({
  cardsService: {
    create: (...args) => mockCreate(...args),
    getTags: (...args) => mockGetTags(...args)
  },
  decksService: {
    create: (...args) => mockDeckCreate(...args)
  }
}))

jest.mock('../../../hooks/useDeckData', () => ({
  useDeckData: () => ({
    decks: [{ _id: 'deck-1', name: 'Biology', deck_type: 'flashcard' }],
    loading: false,
    error: null,
    reload: jest.fn()
  })
}))

jest.mock('../../../hooks/useSubscription', () => ({
  useSubscription: () => ({ tier: 'plus', flashcardLimit: Infinity, flashcardCount: 0 })
}))

jest.mock('../../../context/SubscriptionContext', () => ({
  useSubscriptionContext: () => ({
    upgradeDismissed: true,
    dismissUpgrade: jest.fn(),
    isUpgradeModalOpen: false,
    openUpgradeModal: jest.fn(),
    closeUpgradeModal: jest.fn()
  })
}))

import GeneratedCards from '../GeneratedCards'

const CARDS = [
  { title: 'Mitosis', content: 'Cell division producing two identical nuclei.' },
  { title: 'Osmosis', content: 'Solvent movement across a semipermeable membrane.' }
]

let onSaved
let onCancel

/** `useSaveToDeck` fetches the tag pool on mount, so the render is awaited. */
const renderModal = async (props = {}) => {
  let view
  await act(async () => {
    view = render(<GeneratedCards cards={CARDS} onCancel={onCancel} onSaved={onSaved} {...props} />)
  })
  return view
}

/** Select every card, advance to the deck step and confirm the save. */
const saveEverything = async () => {
  fireEvent.click(screen.getByLabelText('cards.generatedCards.selectAllAria'))
  fireEvent.click(screen.getByRole('button', { name: `cards.generatedCards.proceedCount:${CARDS.length}` }))
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'cards.generatedCards.confirmSave' }))
  })
}

beforeEach(() => {
  onSaved = jest.fn()
  onCancel = jest.fn()
  mockCreate.mockReset().mockResolvedValue({ _id: 'card-1' })
  mockGetTags.mockReset().mockResolvedValue([])
  mockDeckCreate.mockReset()
})

describe('reporting what reached the library', () => {
  it('reports the number written on a full save, then closes', async () => {
    await renderModal()
    await saveEverything()

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(CARDS.length))
    expect(mockCreate).toHaveBeenCalledTimes(CARDS.length)
    expect(onCancel).toHaveBeenCalled()
  })

  it('reports the partial write when the plan limit stops the sequence', async () => {
    // The first insert lands, the second is refused. Those cards are genuinely
    // in the library, so a caller told "nothing happened" would contradict the
    // user's own deck list.
    mockCreate.mockResolvedValueOnce({ _id: 'card-1' }).mockRejectedValueOnce({ response: { status: 403 } })

    await renderModal()
    await saveEverything()

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(1))
    // The modal stays open on a partial save — the selection is preserved.
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('stays silent when the plan limit refuses the very first card', async () => {
    mockCreate.mockRejectedValueOnce({ response: { status: 403 } })

    await renderModal()
    await saveEverything()

    await waitFor(() => expect(mockCreate).toHaveBeenCalled())
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('stays silent when the save fails outright', async () => {
    mockCreate.mockRejectedValue(new Error('boom'))
    jest.spyOn(console, 'error').mockImplementation(() => {})

    await renderModal()
    await saveEverything()

    await waitFor(() => expect(screen.getByText('cards.generatedCards.saveError')).toBeInTheDocument())
    expect(onSaved).not.toHaveBeenCalled()
    console.error.mockRestore()
  })

  it('stays silent when the user dismisses without saving', async () => {
    await renderModal()

    fireEvent.click(screen.getByRole('button', { name: 'cards.generatedCards.cancelButton' }))
    expect(onCancel).toHaveBeenCalled()
    expect(onSaved).not.toHaveBeenCalled()
  })
})

describe('the create-deck name pre-fill', () => {
  it('prefers an explicit default over the source book title', async () => {
    await renderModal({ book: { title: 'Campbell Biology' }, newDeckNameDefault: 'Science' })

    fireEvent.click(screen.getByLabelText('cards.generatedCards.selectAllAria'))
    fireEvent.click(screen.getByRole('button', { name: `cards.generatedCards.proceedCount:${CARDS.length}` }))
    fireEvent.click(screen.getByRole('button', { name: 'cards.saveToDeck.createNewDeck' }))

    // Onboarding's fallback has no book; the topic is the only sensible name.
    await waitFor(() => expect(screen.getByLabelText('cards.saveToDeck.namePlaceholder')).toHaveValue('Science'))
  })

  it('still falls back to the book title for the callers that pass one', async () => {
    await renderModal({ book: { title: 'Campbell Biology' } })

    fireEvent.click(screen.getByLabelText('cards.generatedCards.selectAllAria'))
    fireEvent.click(screen.getByRole('button', { name: `cards.generatedCards.proceedCount:${CARDS.length}` }))
    fireEvent.click(screen.getByRole('button', { name: 'cards.saveToDeck.createNewDeck' }))

    await waitFor(() => expect(screen.getByLabelText('cards.saveToDeck.namePlaceholder')).toHaveValue('Campbell Biology'))
  })
})

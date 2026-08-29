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
  return {
    ...view,
    /** Hand the dialog a new `cards` prop, the way a stream or a regenerate does. */
    withCards: async (cards) => {
      await act(async () => {
        view.rerender(<GeneratedCards cards={cards} onCancel={onCancel} onSaved={onSaved} {...props} />)
      })
    }
  }
}

/**
 * Advance to the deck step and confirm the save.
 *
 * CURATE-001 inverted the model: cards arrive kept, so there is nothing to
 * select first and the primary action is enabled on open.
 */
const saveEverything = async (count = CARDS.length) => {
  fireEvent.click(screen.getByRole('button', { name: `cards.generatedCards.continueCount:${count}` }))
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
    // The modal stays open on a partial save — curation is preserved.
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

describe('discarding a card', () => {
  it('drops it from the count and from the save, and puts it back on undo', async () => {
    await renderModal()

    // Two cards arrive kept, so the primary action opens at the full count.
    expect(screen.getByRole('button', { name: `cards.generatedCards.continueCount:${CARDS.length}` })).toBeEnabled()

    fireEvent.click(screen.getAllByLabelText('cards.generatedCards.discardCardAria')[0])
    expect(screen.getByRole('button', { name: 'cards.generatedCards.continueCount:1' })).toBeEnabled()

    // The discarded card collapses in place rather than leaving the grid, so its
    // undo affordance is still there to be found.
    fireEvent.click(screen.getByLabelText('cards.generatedCards.restoreCardAria'))
    expect(screen.getByRole('button', { name: `cards.generatedCards.continueCount:${CARDS.length}` })).toBeEnabled()
  })

  it('saves only what is still kept', async () => {
    await renderModal()

    fireEvent.click(screen.getAllByLabelText('cards.generatedCards.discardCardAria')[0])
    fireEvent.click(screen.getByRole('button', { name: 'cards.generatedCards.continueCount:1' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'cards.generatedCards.confirmSave' }))
    })

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(1))
    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ title: CARDS[1].title }))
  })

  it('disables the primary action once everything has been discarded', async () => {
    await renderModal()

    fireEvent.click(screen.getByRole('button', { name: 'cards.generatedCards.discardAll' }))

    expect(screen.getByRole('button', { name: 'cards.generatedCards.continueCount:0' })).toBeDisabled()
    // The same control turns around and offers everything back.
    fireEvent.click(screen.getByRole('button', { name: 'cards.generatedCards.restoreAll' }))
    expect(screen.getByRole('button', { name: `cards.generatedCards.continueCount:${CARDS.length}` })).toBeEnabled()
  })
})

describe('editing a card in place', () => {
  /** Open the first card's editor through the cluster control. */
  const openFirstEditor = () => fireEvent.click(screen.getAllByLabelText('cards.generatedCards.editCardAria')[0])

  const frontField = () => screen.getByLabelText('cards.flashcard.frontLabel')
  const backField = () => screen.getByLabelText('cards.flashcard.backLabel')

  it('opens both halves in place and commits the new text', async () => {
    await renderModal()
    openFirstEditor()

    expect(frontField()).toHaveValue(CARDS[0].title)
    expect(backField()).toHaveValue(CARDS[0].content)

    fireEvent.change(backField(), { target: { value: 'Two identical nuclei.' } })
    fireEvent.click(screen.getByRole('button', { name: 'cards.generatedCards.doneEditing' }))

    // Back to display form, showing the edit.
    expect(screen.queryByLabelText('cards.flashcard.backLabel')).not.toBeInTheDocument()
    expect(screen.getByText('Two identical nuclei.')).toBeInTheDocument()
  })

  it('puts the text back when the edit is cancelled', async () => {
    await renderModal()
    openFirstEditor()

    fireEvent.change(backField(), { target: { value: 'scratch' } })
    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }))

    expect(screen.getByText(CARDS[0].content)).toBeInTheDocument()
    expect(screen.queryByText('scratch')).not.toBeInTheDocument()
  })

  it('cancels the edit on Escape without closing the dialog', async () => {
    await renderModal()
    openFirstEditor()

    fireEvent.change(backField(), { target: { value: 'scratch' } })
    fireEvent.keyDown(backField(), { key: 'Escape' })

    // The dialog above closes on Escape too. Cancelling one card must not throw
    // away the whole batch.
    expect(onCancel).not.toHaveBeenCalled()
    expect(screen.getByText(CARDS[0].content)).toBeInTheDocument()
  })

  it("keeps the first card's changes when the user moves straight to another", async () => {
    await renderModal()
    openFirstEditor()
    fireEvent.change(backField(), { target: { value: 'Committed by moving on.' } })

    fireEvent.click(screen.getAllByLabelText('cards.generatedCards.editCardAria')[0])

    expect(screen.getByText('Committed by moving on.')).toBeInTheDocument()
  })

  it('writes the edited text, and touches no API while curating', async () => {
    await renderModal()
    openFirstEditor()
    fireEvent.change(frontField(), { target: { value: 'Mitosis (edited)' } })
    fireEvent.click(screen.getByRole('button', { name: 'cards.generatedCards.doneEditing' }))

    expect(mockCreate).not.toHaveBeenCalled()

    await saveEverything()

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(CARDS.length))
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ title: 'Mitosis (edited)' }))
  })
})

describe('marking an edited card', () => {
  const openFirstEditor = () => fireEvent.click(screen.getAllByLabelText('cards.generatedCards.editCardAria')[0])

  it('marks the card, and reverting restores the generated text', async () => {
    await renderModal()
    expect(screen.queryByText('cards.generatedCards.editedBadge')).not.toBeInTheDocument()

    openFirstEditor()
    fireEvent.change(screen.getByLabelText('cards.flashcard.backLabel'), { target: { value: 'rewritten' } })
    fireEvent.click(screen.getByRole('button', { name: 'cards.generatedCards.doneEditing' }))

    expect(screen.getByText('cards.generatedCards.editedBadge')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'cards.generatedCards.revertCardAria' }))

    expect(screen.queryByText('cards.generatedCards.editedBadge')).not.toBeInTheDocument()
    expect(screen.getByText(CARDS[0].content)).toBeInTheDocument()
  })

  it('drops the marking when the card is typed back to the generated wording', async () => {
    await renderModal()
    openFirstEditor()

    const back = () => screen.getByLabelText('cards.flashcard.backLabel')
    fireEvent.change(back(), { target: { value: 'rewritten' } })
    fireEvent.change(back(), { target: { value: CARDS[0].content } })
    fireEvent.click(screen.getByRole('button', { name: 'cards.generatedCards.doneEditing' }))

    expect(screen.queryByText('cards.generatedCards.editedBadge')).not.toBeInTheDocument()
  })
})

describe('keyboard reach and focus', () => {
  const editButtons = () => screen.getAllByLabelText('cards.generatedCards.editCardAria')

  it('moves focus to the undo control when a card is discarded, and back on restore', async () => {
    await renderModal()

    // Discarding unmounts the button that was just pressed. Without a handover,
    // focus lands on <body> and the user tabs in from the top of the dialog
    // again after every single decision.
    fireEvent.click(screen.getAllByLabelText('cards.generatedCards.discardCardAria')[0])
    expect(screen.getByLabelText('cards.generatedCards.restoreCardAria')).toHaveFocus()
    expect(document.body).not.toHaveFocus()

    fireEvent.click(screen.getByLabelText('cards.generatedCards.restoreCardAria'))
    expect(editButtons()[0]).toHaveFocus()
  })

  it('returns focus to the card after an edit is committed', async () => {
    await renderModal()

    fireEvent.click(editButtons()[0])
    fireEvent.click(screen.getByRole('button', { name: 'cards.generatedCards.doneEditing' }))

    expect(editButtons()[0]).toHaveFocus()
  })

  it('returns focus to the card after an edit is cancelled', async () => {
    await renderModal()

    fireEvent.click(editButtons()[0])
    fireEvent.keyDown(screen.getByLabelText('cards.flashcard.backLabel'), { key: 'Escape' })

    expect(editButtons()[0]).toHaveFocus()
  })

  it('commits and opens the next card on Cmd+Enter, and closes on the last one', async () => {
    await renderModal()

    fireEvent.click(editButtons()[0])
    fireEvent.change(screen.getByLabelText('cards.flashcard.backLabel'), { target: { value: 'first edit' } })
    fireEvent.keyDown(screen.getByLabelText('cards.flashcard.backLabel'), { key: 'Enter', metaKey: true })

    // The first card is committed and the second is now open.
    expect(screen.getByText('first edit')).toBeInTheDocument()
    expect(screen.getByLabelText('cards.flashcard.frontLabel')).toHaveValue(CARDS[1].title)

    // Nowhere left to go: the editor closes rather than trapping the user.
    fireEvent.keyDown(screen.getByLabelText('cards.flashcard.backLabel'), { key: 'Enter', ctrlKey: true })
    expect(screen.queryByLabelText('cards.flashcard.frontLabel')).not.toBeInTheDocument()
  })

  it('gives every control an accessible name', async () => {
    await renderModal()

    // A button whose name is its own i18n key is a button with a name; one with
    // no name at all is what this guards against.
    screen.getAllByRole('button').forEach((button) => {
      expect(button).toHaveAccessibleName()
    })
  })
})

describe('an emptied card', () => {
  const openFirstEditor = () => fireEvent.click(screen.getAllByLabelText('cards.generatedCards.editCardAria')[0])

  const emptyTheBack = () => {
    openFirstEditor()
    fireEvent.change(screen.getByLabelText('cards.flashcard.backLabel'), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'cards.generatedCards.doneEditing' }))
  }

  it('drops out of the count, says so, and is never written', async () => {
    await renderModal()
    emptyTheBack()

    // Whitespace is empty: a card whose back is a single space is as useless in
    // a study session as one whose back is nothing.
    expect(screen.getByText('cards.generatedCards.incompleteCount:1')).toBeInTheDocument()
    expect(screen.getByText('cards.flashcard.backRequired')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'cards.generatedCards.continueCount:1' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'cards.generatedCards.confirmSave' }))
    })

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(1))
    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ title: CARDS[1].title }))
  })

  it('rejoins the count once the missing half is filled in', async () => {
    await renderModal()
    emptyTheBack()

    openFirstEditor()
    fireEvent.change(screen.getByLabelText('cards.flashcard.backLabel'), { target: { value: 'filled back in' } })
    fireEvent.click(screen.getByRole('button', { name: 'cards.generatedCards.doneEditing' }))

    expect(screen.queryByText('cards.generatedCards.incompleteCount:1')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: `cards.generatedCards.continueCount:${CARDS.length}` })).toBeEnabled()
  })

  it('disables the primary action when nothing kept is complete', async () => {
    await renderModal({ cards: [CARDS[0]] })
    emptyTheBack()

    expect(screen.getByRole('button', { name: 'cards.generatedCards.continueCount:0' })).toBeDisabled()
  })
})

describe('curation against a moving card list', () => {
  const THIRD = { title: 'Diffusion', content: 'Movement down a concentration gradient.' }

  const openEditor = (index) => fireEvent.click(screen.getAllByLabelText('cards.generatedCards.editCardAria')[index])

  const editBackOfFirst = (text) => {
    openEditor(0)
    fireEvent.change(screen.getByLabelText('cards.flashcard.backLabel'), { target: { value: text } })
    fireEvent.click(screen.getByRole('button', { name: 'cards.generatedCards.doneEditing' }))
  }

  it('keeps an edit and a discard when another card arrives', async () => {
    const { withCards } = await renderModal()

    editBackOfFirst('edited before the next card landed')
    fireEvent.click(screen.getAllByLabelText('cards.generatedCards.discardCardAria')[1])

    // The spread keeps the original card objects, which is exactly what a
    // streaming append or "Generate more" produces. Under the old index-keyed
    // model this is where an edit would reattach itself to the wrong card.
    await withCards([...CARDS, THIRD])

    expect(screen.getByText('edited before the next card landed')).toBeInTheDocument()
    expect(screen.getByLabelText('cards.generatedCards.restoreCardAria')).toBeInTheDocument()
    expect(screen.getByText(THIRD.content)).toBeInTheDocument()
    // Three cards, one of them discarded.
    expect(screen.getByRole('button', { name: 'cards.generatedCards.continueCount:2' })).toBeEnabled()
  })

  it('writes the surviving edit to the right card after an append', async () => {
    const { withCards } = await renderModal()

    editBackOfFirst('still mine')
    await withCards([...CARDS, THIRD])
    await saveEverything(3)

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(3))
    expect(mockCreate).toHaveBeenNthCalledWith(1, expect.objectContaining({ title: CARDS[0].title, content: 'still mine' }))
    expect(mockCreate).toHaveBeenNthCalledWith(3, expect.objectContaining({ title: THIRD.title }))
  })

  it('drops curation when the batch is regenerated rather than extended', async () => {
    const { withCards } = await renderModal()

    editBackOfFirst('belongs to the old batch')
    fireEvent.click(screen.getAllByLabelText('cards.generatedCards.discardCardAria')[1])

    // "Generate again" hands back freshly parsed objects, so nothing matches.
    await withCards([{ ...CARDS[0] }, { ...CARDS[1] }])

    expect(screen.queryByText('belongs to the old batch')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('cards.generatedCards.restoreCardAria')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: `cards.generatedCards.continueCount:${CARDS.length}` })).toBeEnabled()
  })

  it('keeps an edit through a discard and a restore', async () => {
    await renderModal()

    editBackOfFirst('survives the round trip')
    fireEvent.click(screen.getAllByLabelText('cards.generatedCards.discardCardAria')[0])
    fireEvent.click(screen.getByLabelText('cards.generatedCards.restoreCardAria'))

    expect(screen.getByText('survives the round trip')).toBeInTheDocument()
    expect(screen.getByText('cards.generatedCards.editedBadge')).toBeInTheDocument()
  })
})

describe('the create-deck name pre-fill', () => {
  it('prefers an explicit default over the source book title', async () => {
    await renderModal({ book: { title: 'Campbell Biology' }, newDeckNameDefault: 'Science' })

    fireEvent.click(screen.getByRole('button', { name: `cards.generatedCards.continueCount:${CARDS.length}` }))
    fireEvent.click(screen.getByRole('button', { name: 'cards.saveToDeck.createNewDeck' }))

    // Onboarding's fallback has no book; the topic is the only sensible name.
    await waitFor(() => expect(screen.getByLabelText('cards.saveToDeck.namePlaceholder')).toHaveValue('Science'))
  })

  it('still falls back to the book title for the callers that pass one', async () => {
    await renderModal({ book: { title: 'Campbell Biology' } })

    fireEvent.click(screen.getByRole('button', { name: `cards.generatedCards.continueCount:${CARDS.length}` }))
    fireEvent.click(screen.getByRole('button', { name: 'cards.saveToDeck.createNewDeck' }))

    await waitFor(() => expect(screen.getByLabelText('cards.saveToDeck.namePlaceholder')).toHaveValue('Campbell Biology'))
  })
})

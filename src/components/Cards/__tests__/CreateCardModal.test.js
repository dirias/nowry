/**
 * FE-C1 — the assembled card sheet (CARDS.md §2, §6, §7, UX-CONTRACT §9.3).
 *
 * This is the file that proves the parts are wired, not just present. What it
 * pins is the authoring loop — the sheet stays open, the required fields
 * clear, the deck and tags survive, focus comes back, the count climbs — and
 * the four shipped defects that only exist once the shell is real: a save
 * failure the user could not see, a form that wiped itself when the deck list
 * refreshed, correctness that unset itself when an option was edited, and
 * English strings in four non-English locales.
 *
 * jsdom CANNOT verify: that `100dvh` tracks the visual viewport, that the
 * footer clears an open keyboard at 375px, that focus survives Joy's focus
 * trap on a real browser's open animation, or that the loop is comfortable
 * one-handed. Those need a device.
 */
import React from 'react'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { injectedCss } from '../../Common/Form/__testHelpers__/cssRules'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => {
      if (options?.count !== undefined) return `${key}:${options.count}`
      if (options?.number !== undefined) return `${key}:${options.number}`
      return key
    },
    i18n: { language: 'en' }
  })
}))

const mockCreate = jest.fn()
const mockUpdate = jest.fn()
const mockGetTags = jest.fn()
jest.mock('../../../api/services', () => ({
  cardsService: {
    create: (...args) => mockCreate(...args),
    update: (...args) => mockUpdate(...args),
    getTags: (...args) => mockGetTags(...args)
  }
}))

jest.mock('mermaid', () => ({ initialize: jest.fn(), render: jest.fn().mockResolvedValue({ svg: '<svg />' }) }))
jest.mock('dompurify', () => ({ sanitize: (html) => html }))

const CreateCardModal = require('../CreateCardModal').default

const DECKS = [
  { _id: 'deck-1', name: 'Japanese' },
  { _id: 'deck-2', name: 'Chemistry' }
]

const setViewport = (mobile = false) => {
  window.matchMedia = (query) => ({
    matches: mobile && query.includes('max-width: 599px'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false
  })
}

const renderModal = (props = {}) => {
  const onClose = jest.fn()
  const onCardSaved = jest.fn()
  const view = render(
    <MemoryRouter>
      <CreateCardModal open onClose={onClose} onCardSaved={onCardSaved} decks={DECKS} card={null} {...props} />
    </MemoryRouter>
  )
  const rerenderWith = (next = {}) =>
    view.rerender(
      <MemoryRouter>
        <CreateCardModal open onClose={onClose} onCardSaved={onCardSaved} decks={DECKS} card={null} {...props} {...next} />
      </MemoryRouter>
    )
  return { ...view, onClose, onCardSaved, rerenderWith }
}

const front = () => screen.getByRole('textbox', { name: /cards.flashcard.frontLabel/ })
const back = () => screen.getByRole('textbox', { name: /cards.flashcard.backLabel/ })
const chip = (name) => screen.getByRole('button', { name })
// The deck `Select` and the tag `Autocomplete` both expose `role="combobox"`
// once their groups are revealed together, so `getByRole('combobox')` alone
// is ambiguous from that point on. The tag one always carries the
// `form.tagAddAria` label; the deck one never does — that is the one stable
// way to tell them apart regardless of which deck name is currently showing.
const deckTrigger = () => screen.getAllByRole('combobox').find((el) => el.getAttribute('aria-label') !== 'form.tagAddAria')
const clickAsync = async (button) => {
  await act(async () => {
    fireEvent.click(button)
  })
}
const saveAndNext = () => clickAsync(screen.getByRole('button', { name: 'form.saveAndNext' }))

beforeEach(() => {
  setViewport(false)
  mockCreate.mockReset().mockResolvedValue({ _id: 'card-1' })
  mockUpdate.mockReset().mockResolvedValue({ _id: 'card-1' })
  mockGetTags.mockReset().mockResolvedValue([])
})

describe('CreateCardModal — add mode', () => {
  it('renders one sheet, titled by key, with the flashcard body by default', () => {
    renderModal()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('cards.flashcard.createTitle')).toBeInTheDocument()
    expect(front()).toBeInTheDocument()
    expect(back()).toBeInTheDocument()
  })

  it('offers the type as a control, since the shell now outlives the choice', () => {
    renderModal()
    expect(screen.getByRole('radiogroup', { name: 'cards.common.typeSelectorAria' })).toBeInTheDocument()
  })

  it('sends the card the API already expects', async () => {
    renderModal()
    fireEvent.change(front(), { target: { value: 'Capital of France' } })
    fireEvent.change(back(), { target: { value: 'Paris' } })
    await saveAndNext()

    expect(mockCreate).toHaveBeenCalledWith({
      title: 'Capital of France',
      content: 'Paris',
      tags: [],
      deck_id: null,
      card_type: 'flashcard'
    })
  })
})

describe('the authoring loop', () => {
  const fillAndSave = async () => {
    fireEvent.change(front(), { target: { value: 'Q' } })
    fireEvent.change(back(), { target: { value: 'A' } })
    await saveAndNext()
  }

  it('does not close the sheet', async () => {
    const { onClose } = renderModal()
    await fillAndSave()
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('clears both required fields, ready for the next card', async () => {
    renderModal()
    await fillAndSave()
    expect(front()).toHaveValue('')
    expect(back()).toHaveValue('')
  })

  it('keeps the deck and the tags, so ten cards mean one deck choice', async () => {
    renderModal()
    await clickAsync(chip('cards.common.chooseDeck'))
    await clickAsync(screen.getByRole('combobox'))
    await clickAsync(await screen.findByRole('option', { name: 'Japanese' }))

    await clickAsync(chip('cards.common.addTags'))
    const tagInput = screen.getByRole('combobox', { name: 'form.tagAddAria' })
    fireEvent.change(tagInput, { target: { value: 'geography' } })
    fireEvent.keyDown(tagInput, { key: 'Enter' })

    await fillAndSave()

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ deck_id: 'deck-1', tags: ['geography'] }))
    // Still on screen for the next card, not re-chosen.
    expect(deckTrigger()).toHaveTextContent('Japanese')
    expect(screen.getByText('geography')).toBeInTheDocument()
  })

  it('counts what it has added, politely', async () => {
    renderModal()
    await fillAndSave()
    expect(screen.getByText('form.addedCount:1')).toBeInTheDocument()

    await fillAndSave()
    expect(screen.getByText('form.addedCount:2')).toBeInTheDocument()
  })

  it('returns focus to the first required field', async () => {
    renderModal()
    await fillAndSave()
    await waitFor(() => expect(front()).toHaveFocus())
  })

  it('saves and closes from the secondary action instead', async () => {
    const { onClose, onCardSaved } = renderModal()
    fireEvent.change(front(), { target: { value: 'Q' } })
    fireEvent.change(back(), { target: { value: 'A' } })
    await clickAsync(screen.getByRole('button', { name: 'form.saveAndClose' }))

    expect(onCardSaved).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('is bound to Cmd/Ctrl+Enter from anywhere in the form', async () => {
    renderModal()
    fireEvent.change(front(), { target: { value: 'Q' } })
    fireEvent.change(back(), { target: { value: 'A' } })
    await act(async () => {
      fireEvent.keyDown(document, { key: 'Enter', metaKey: true })
    })
    expect(mockCreate).toHaveBeenCalledTimes(1)
  })

  it('is not bound to bare Enter, which would save a half-composed card', async () => {
    renderModal()
    fireEvent.change(front(), { target: { value: 'Q' } })
    await act(async () => {
      fireEvent.keyDown(document, { key: 'Enter' })
    })
    expect(mockCreate).not.toHaveBeenCalled()
  })
})

describe('validation', () => {
  it('fires no request, and says which half is missing', async () => {
    renderModal()
    await saveAndNext()

    expect(mockCreate).not.toHaveBeenCalled()
    expect(screen.getByText('cards.flashcard.frontRequired')).toBeInTheDocument()
    await waitFor(() => expect(front()).toHaveFocus())
  })

  it('blames the second half when the first is filled', async () => {
    renderModal()
    fireEvent.change(front(), { target: { value: 'Q' } })
    await saveAndNext()

    expect(screen.getByText('cards.flashcard.backRequired')).toBeInTheDocument()
    await waitFor(() => expect(back()).toHaveFocus())
  })

  it('never disables the primary action for a validation reason', async () => {
    renderModal()
    expect(screen.getByRole('button', { name: 'form.saveAndNext' })).not.toBeDisabled()
  })

  it('clears the complaint when the user fixes that field', async () => {
    renderModal()
    await saveAndNext()
    fireEvent.change(front(), { target: { value: 'Q' } })
    expect(screen.queryByText('cards.flashcard.frontRequired')).not.toBeInTheDocument()
  })
})

describe('a failed save', () => {
  const failWith = (response) => {
    const error = new Error('Request failed')
    error.response = response
    mockCreate.mockRejectedValue(error)
  }

  const attempt = async () => {
    renderModal()
    fireEvent.change(front(), { target: { value: 'Q' } })
    fireEvent.change(back(), { target: { value: 'A' } })
    await saveAndNext()
  }

  it('is visible — the silent console.error is gone', async () => {
    failWith({ status: 500, data: { detail: 'Server exploded' } })
    await attempt()

    const alert = screen.getByRole('alert')
    expect(within(alert).getByText('form.saveErrorTitle')).toBeInTheDocument()
    expect(within(alert).getByText('Server exploded')).toBeInTheDocument()
  })

  it('costs the user nothing they typed', async () => {
    failWith({ status: 500, data: { detail: 'nope' } })
    await attempt()

    expect(front()).toHaveValue('Q')
    expect(back()).toHaveValue('A')
  })

  it('offers Upgrade on a plan limit, on every card type rather than two of three', async () => {
    failWith({ status: 403, data: { detail: 'Flashcards limit reached' } })
    await attempt()

    const alert = screen.getByRole('alert')
    expect(within(alert).getByText('subscription.errors.limitReached')).toBeInTheDocument()
    expect(within(alert).getByRole('button', { name: 'subscription.upgrade' })).toBeInTheDocument()
  })

  it('does not count a card that was not saved', async () => {
    failWith({ status: 500, data: { detail: 'nope' } })
    await attempt()
    expect(screen.queryByText(/form.addedCount/)).not.toBeInTheDocument()
  })
})

describe('the reset-on-decks-change data loss', () => {
  it('keeps typed input when the deck list is refetched into a new array', () => {
    const { rerenderWith } = renderModal()
    fireEvent.change(front(), { target: { value: 'Half-written question' } })

    // Exactly what CardHome does on a background refresh: same decks, new array.
    rerenderWith({ decks: [...DECKS] })

    expect(front()).toHaveValue('Half-written question')
  })
})

describe('edit mode', () => {
  const CARD = { _id: 'card-9', card_type: 'flashcard', title: 'Q', content: 'A', tags: ['geo'], deck_id: 'deck-2' }

  it('offers Save and Cancel, and no loop', () => {
    renderModal({ card: CARD })
    expect(screen.getByRole('button', { name: 'common.save' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'common.cancel' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'form.saveAndNext' })).not.toBeInTheDocument()
  })

  it('states the type rather than offering it', () => {
    renderModal({ card: CARD })
    expect(screen.queryByRole('radiogroup', { name: 'cards.common.typeSelectorAria' })).not.toBeInTheDocument()
    expect(screen.getByText('cards.common.typeFlashcard')).toBeInTheDocument()
  })

  it('opens showing the content the card already holds, never hiding writing', () => {
    renderModal({ card: CARD })
    expect(screen.getByText('geo')).toBeInTheDocument()
    expect(deckTrigger()).toHaveTextContent('Chemistry')
    expect(screen.queryByRole('button', { name: 'cards.common.addTags' })).not.toBeInTheDocument()
  })

  it('updates the card and closes', async () => {
    const { onClose } = renderModal({ card: CARD })
    fireEvent.change(back(), { target: { value: 'Paris' } })
    await clickAsync(screen.getByRole('button', { name: 'common.save' }))

    expect(mockUpdate).toHaveBeenCalledWith('card-9', expect.objectContaining({ content: 'Paris', deck_id: 'deck-2' }))
    expect(onClose).toHaveBeenCalled()
  })
})

describe('a deck the caller pre-supplied', () => {
  it('opens with the deck shown rather than behind a chip', () => {
    renderModal({ card: { deck_id: 'deck-1' } })
    expect(screen.getByRole('combobox')).toHaveTextContent('Japanese')
    expect(screen.queryByRole('button', { name: 'cards.common.chooseDeck' })).not.toBeInTheDocument()
  })

  it('is still an add, not an edit', () => {
    renderModal({ card: { deck_id: 'deck-1' } })
    expect(screen.getByRole('button', { name: 'form.saveAndNext' })).toBeInTheDocument()
  })
})

describe('switching type', () => {
  it('switches silently when there is nothing to discard', async () => {
    renderModal()
    await clickAsync(screen.getByRole('radio', { name: 'cards.common.typeQuiz' }))
    expect(screen.getByRole('radiogroup', { name: 'cards.quiz.optionsAria' })).toBeInTheDocument()
  })

  it('asks first when the type-specific field has writing in it', async () => {
    renderModal()
    fireEvent.change(back(), { target: { value: 'Paris' } })
    await clickAsync(screen.getByRole('radio', { name: 'cards.common.typeQuiz' }))

    expect(screen.getByText('cards.common.switchTypeWarning')).toBeInTheDocument()
    expect(back()).toBeInTheDocument()
  })

  it('keeps the title, tags and deck across the switch', async () => {
    renderModal({ card: { deck_id: 'deck-1' } })
    fireEvent.change(front(), { target: { value: 'Shared stem' } })
    await clickAsync(screen.getByRole('radio', { name: 'cards.common.typeVisual' }))

    expect(screen.getByRole('textbox', { name: /cards.visual.titleLabel/ })).toHaveValue('Shared stem')
    expect(screen.getByRole('combobox')).toHaveTextContent('Japanese')
  })

  it('backs out without discarding anything', async () => {
    renderModal()
    fireEvent.change(back(), { target: { value: 'Paris' } })
    await clickAsync(screen.getByRole('radio', { name: 'cards.common.typeQuiz' }))
    await clickAsync(screen.getByRole('button', { name: 'common.cancel' }))

    expect(back()).toHaveValue('Paris')
  })
})

describe('quiz, through the shipped path', () => {
  const openQuiz = async () => {
    renderModal({ card: { card_type: 'quiz' } })
  }

  it('sends the option the user designated, even after they retype it', async () => {
    await openQuiz()
    fireEvent.change(screen.getByRole('textbox', { name: /cards.quiz.questionLabel/ }), { target: { value: 'Capital?' } })

    const options = screen.getAllByPlaceholderText(/cards.quiz.optionPlaceholder/)
    fireEvent.change(options[0], { target: { value: 'Paris' } })
    fireEvent.change(options[1], { target: { value: 'Lyon' } })

    fireEvent.click(screen.getAllByRole('radio', { name: /correctAria/ })[1])
    // The edit that used to silently unset correctness.
    fireEvent.change(screen.getAllByPlaceholderText(/cards.quiz.optionPlaceholder/)[1], { target: { value: 'Lyons' } })

    await saveAndNext()

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ options: ['Paris', 'Lyons'], correct_answer: 'Lyons', card_type: 'quiz' })
    )
  })

  it('explains a missing designation instead of greying the button out', async () => {
    await openQuiz()
    fireEvent.change(screen.getByRole('textbox', { name: /cards.quiz.questionLabel/ }), { target: { value: 'Capital?' } })
    const options = screen.getAllByPlaceholderText(/cards.quiz.optionPlaceholder/)
    fireEvent.change(options[0], { target: { value: 'Paris' } })
    fireEvent.change(options[1], { target: { value: 'Lyon' } })

    await saveAndNext()

    expect(mockCreate).not.toHaveBeenCalled()
    expect(screen.getByText('cards.quiz.needCorrectAnswer')).toBeInTheDocument()
  })
})

describe('visual, through the shipped path', () => {
  it('saves a diagram that does not render yet', async () => {
    jest.requireMock('mermaid').render.mockRejectedValue(new Error('Parse error'))
    renderModal({ card: { card_type: 'visual' } })

    fireEvent.change(screen.getByRole('textbox', { name: /cards.visual.titleLabel/ }), { target: { value: 'Flow' } })
    fireEvent.change(screen.getByRole('textbox', { name: /cards.visual.codeLabel/ }), { target: { value: 'not a diagram' } })
    await saveAndNext()

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ diagram_code: 'not a diagram', card_type: 'visual' }))
  })
})

/**
 * The blank-sheet regression.
 *
 * `CardTypeSelector` passed Joy's `overlay` to its `Radio`s. `overlay` sets the
 * Radio root to `position: initial`, so the action — `position: absolute`,
 * `z-index: 1`, and when checked an opaque `background.surface` — resolved its
 * containing block against the nearest *positioned* ancestor. Inside FormSheet
 * that is the ModalDialog, so the checked segment painted a full-sheet
 * rectangle over the header, every field and the footer. Measured in Chrome:
 * a 197x44 segment whose action was 700x624.
 *
 * Every assertion above this line still passed while that shipped, because the
 * form was entirely in the DOM and entirely invisible. jsdom has no layout and
 * cannot see the overlap, so what is pinned instead is the cause it cannot
 * miss: which element establishes the containing block for that paint.
 */
describe('the checked segment does not paint over the sheet', () => {
  /** The generated rule for one emotion class, so this cannot match a neighbour's. */
  const ruleFor = (node, suffix) => {
    const generated = Array.from(node.classList).find((name) => name.startsWith('css-') && name.endsWith(suffix))
    return injectedCss()
      .split('\n')
      .filter((rule) => rule.startsWith(`.${generated} `) || rule.startsWith(`.${generated}{`))
      .join('\n')
  }

  const checkedSegment = () => {
    renderModal()
    const selector = screen.getByRole('radiogroup', { name: 'cards.common.typeSelectorAria' })
    const root = within(selector).getByRole('radio', { checked: true }).closest('.MuiRadio-root')
    return { root, action: root.querySelector('.MuiRadio-action') }
  }

  it('paints it from an absolutely positioned action', () => {
    const { action } = checkedSegment()
    expect(ruleFor(action, '-JoyRadio-action')).toMatch(/position:absolute/)
  })

  it('contains that action in the segment, not in the ModalDialog', () => {
    const { root } = checkedSegment()
    const rule = ruleFor(root, '-JoyRadio-root')

    // `position: initial` here is the bug: the action escapes to the sheet.
    expect(rule).toMatch(/position:relative/)
    expect(rule).not.toMatch(/position:initial/)
  })
})

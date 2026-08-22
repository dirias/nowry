/**
 * FE-D1 — deck creation on the shared form system (DECKS.md §2).
 *
 * What this pins is the surface's reason for existing: four elements at rest
 * instead of eleven, a name that explains itself instead of a form that fails
 * silently, and a create that continues into card authoring rather than
 * returning the user to a list holding an empty deck.
 *
 * Two shipped defects are pinned as regressions: `CreateDeckModal.js:64`
 * swallowed every save failure into a `console.error`, so a deck that was never
 * created looked exactly like one that was; and the publish block it carried
 * duplicated deck settings' own implementation with hardcoded metadata.
 *
 * jsdom CANNOT verify: that the footer clears an open keyboard at 375px, that
 * `100dvh` tracks the visual viewport, or that Joy's focus trap leaves the
 * revealed field focused through a real browser's open animation.
 */
import React from 'react'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => {
      if (options?.tag !== undefined) return `${key}:${options.tag}`
      return key
    },
    i18n: { language: 'en' }
  })
}))

const mockCreate = jest.fn()
jest.mock('../../../api/services', () => ({
  decksService: { create: (...args) => mockCreate(...args) }
}))

const DeckCreateSheet = require('../DeckCreateSheet').default

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

const renderSheet = (props = {}) => {
  const onClose = jest.fn()
  const onSaved = jest.fn()
  const onAddCards = jest.fn()
  const view = render(
    <MemoryRouter>
      <DeckCreateSheet open onClose={onClose} onSaved={onSaved} onAddCards={onAddCards} {...props} />
    </MemoryRouter>
  )
  return { ...view, onClose, onSaved, onAddCards }
}

const nameField = () => screen.getByRole('textbox', { name: /cards.create.fields.name/ })
const clickAsync = async (button) => {
  await act(async () => {
    fireEvent.click(button)
  })
}
const createDeck = () => clickAsync(screen.getByRole('button', { name: 'cards.create.create' }))

beforeEach(() => {
  setViewport(false)
  mockCreate.mockReset().mockResolvedValue({ _id: 'deck-1', name: 'Japanese' })
})

describe('at rest', () => {
  it('asks for a name and offers the rest — four elements, not eleven', () => {
    renderSheet()

    expect(screen.getByText('cards.create.newTitle')).toBeInTheDocument()
    expect(nameField()).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'cards.create.addDescription' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'cards.create.addTags' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'cards.create.addImage' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'cards.create.create' })).toBeInTheDocument()

    // One textbox at rest: the optional fields are offers, not obligations.
    expect(screen.getAllByRole('textbox')).toHaveLength(1)
  })

  it('carries no publish control — publishing has one home, and it is settings', () => {
    renderSheet()
    expect(screen.queryByRole('button', { name: /publish/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('separator')).not.toBeInTheDocument()
  })
})

describe('the disclosure rail', () => {
  it('reveals only its own group and spends its chip', async () => {
    renderSheet()
    await clickAsync(screen.getByRole('button', { name: 'cards.create.addDescription' }))

    expect(screen.getByRole('textbox', { name: /cards.create.fields.description/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'cards.create.addDescription' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'cards.create.addTags' })).toBeInTheDocument()
  })

  it('moves focus into what it revealed, since the chip it was on is gone', async () => {
    renderSheet()
    await clickAsync(screen.getByRole('button', { name: 'cards.create.addDescription' }))

    await waitFor(() => expect(screen.getByRole('textbox', { name: /cards.create.fields.description/ })).toHaveFocus())
  })

  it('collects tags as chips rather than as a comma-separated sentence', async () => {
    renderSheet()
    await clickAsync(screen.getByRole('button', { name: 'cards.create.addTags' }))

    const tagInput = screen.getByRole('combobox', { name: 'form.tagAddAria' })
    fireEvent.change(tagInput, { target: { value: 'japanese' } })
    fireEvent.keyDown(tagInput, { key: 'Enter' })

    expect(screen.getByText('japanese')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'form.tagRemoveAria:japanese' })).toBeInTheDocument()
  })

  it('previews an image, and explains a broken one instead of showing a broken glyph', async () => {
    renderSheet()
    await clickAsync(screen.getByRole('button', { name: 'cards.create.addImage' }))
    fireEvent.change(screen.getByRole('textbox', { name: /cards.create.addImage/ }), { target: { value: 'https://x/y.png' } })

    const preview = screen.getByRole('img', { name: 'cards.create.imagePreviewAlt' })
    expect(preview).toBeInTheDocument()

    fireEvent.error(preview)
    expect(screen.getByText('cards.create.imagePreviewError')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})

describe('creating', () => {
  it('sends the deck the API already expects', async () => {
    renderSheet()
    fireEvent.change(nameField(), { target: { value: '  Japanese  ' } })
    await createDeck()

    expect(mockCreate).toHaveBeenCalledWith({ name: 'Japanese', description: '', image_url: null, tags: [] })
  })

  it('rescues a tag typed but never Entered, rather than dropping it on save', async () => {
    renderSheet()
    fireEvent.change(nameField(), { target: { value: 'Japanese' } })
    await clickAsync(screen.getByRole('button', { name: 'cards.create.addTags' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'form.tagAddAria' }), { target: { value: 'kanji' } })

    await createDeck()

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ tags: ['kanji'] }))
  })

  it('offers the first card rather than closing onto an empty deck', async () => {
    const { onClose, onAddCards, onSaved } = renderSheet()
    fireEvent.change(nameField(), { target: { value: 'Japanese' } })
    await createDeck()

    expect(onSaved).toHaveBeenCalledWith({ _id: 'deck-1', name: 'Japanese' })
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByText('cards.create.createdTitle')).toBeInTheDocument()

    await clickAsync(screen.getByRole('button', { name: 'cards.create.addCards' }))
    expect(onAddCards).toHaveBeenCalledWith({ _id: 'deck-1', name: 'Japanese' })
    expect(onClose).toHaveBeenCalled()
  })

  it('lets the user stop at the deck instead', async () => {
    const { onClose, onAddCards } = renderSheet()
    fireEvent.change(nameField(), { target: { value: 'Japanese' } })
    await createDeck()
    await clickAsync(screen.getByRole('button', { name: 'cards.create.done' }))

    expect(onClose).toHaveBeenCalled()
    expect(onAddCards).not.toHaveBeenCalled()
  })
})

describe('validation', () => {
  it('fires no request, names the field, and puts the cursor back in it', async () => {
    renderSheet()
    await createDeck()

    expect(mockCreate).not.toHaveBeenCalled()
    expect(screen.getByText('cards.create.nameRequired')).toBeInTheDocument()
    await waitFor(() => expect(nameField()).toHaveFocus())
  })

  it('never disables the primary action for a validation reason', () => {
    renderSheet()
    expect(screen.getByRole('button', { name: 'cards.create.create' })).not.toBeDisabled()
  })

  it('clears the complaint as soon as the user fixes it', async () => {
    renderSheet()
    await createDeck()
    fireEvent.change(nameField(), { target: { value: 'J' } })

    expect(screen.queryByText('cards.create.nameRequired')).not.toBeInTheDocument()
  })

  it('re-focuses the field on a second rejected save', async () => {
    renderSheet()
    await createDeck()
    await clickAsync(screen.getByRole('button', { name: 'cards.create.addTags' }))
    screen.getByRole('combobox', { name: 'form.tagAddAria' }).focus()

    await createDeck()
    await waitFor(() => expect(nameField()).toHaveFocus())
  })
})

describe('a failed save', () => {
  const failWith = (response) => {
    const error = new Error('Request failed')
    error.response = response
    mockCreate.mockRejectedValue(error)
  }

  const attempt = async () => {
    renderSheet()
    fireEvent.change(nameField(), { target: { value: 'Japanese' } })
    await createDeck()
  }

  it('is visible — the silent console.error is gone', async () => {
    failWith({ status: 500, data: { detail: 'Server exploded' } })
    await attempt()

    const alert = screen.getByRole('alert')
    expect(within(alert).getByText('form.saveErrorTitle')).toBeInTheDocument()
    expect(within(alert).getByText('Server exploded')).toBeInTheDocument()
  })

  it('keeps the sheet open with the name intact', async () => {
    failWith({ status: 500, data: { detail: 'nope' } })
    await attempt()

    expect(nameField()).toHaveValue('Japanese')
    expect(screen.queryByText('cards.create.createdTitle')).not.toBeInTheDocument()
  })

  it('offers Upgrade on a plan limit, which this surface never handled at all', async () => {
    failWith({ status: 403, data: { detail: 'Deck limit reached' } })
    await attempt()

    const alert = screen.getByRole('alert')
    expect(within(alert).getByText('subscription.errors.limitReached')).toBeInTheDocument()
    expect(within(alert).getByRole('button', { name: 'subscription.upgrade' })).toBeInTheDocument()
  })
})

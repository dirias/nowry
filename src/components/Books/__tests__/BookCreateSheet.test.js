/**
 * FE-B1 — book creation, Variant A′ (BOOKS.md §2).
 *
 * There was no book-create form before this one, so what these pin is a build
 * rather than a refactor — and above all the thing the ruling put at risk. A
 * book used to be one click away, and the form is only acceptable if it stays
 * two interactions away: open, Enter. The empty-title case is therefore a
 * success path here and nowhere else in the system.
 *
 * Three defects are pinned as data regressions, because all three were written
 * into the database rather than merely displayed: a count-based title that
 * repeated itself after any delete, the English literal `'Unknown'`, and the
 * Spanish literal `'Sin ISBN'` — sent for every user in every locale.
 *
 * jsdom CANNOT verify: that `Create & write` clears an open keyboard at 375px,
 * that `100dvh` tracks the visual viewport, or that Joy's focus trap survives a
 * real browser's open animation.
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

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}))

let mockUser = { username: 'ada' }
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser })
}))

const mockCreate = jest.fn()
jest.mock('../../../api/services', () => ({
  booksService: { create: (...args) => mockCreate(...args) }
}))

const BookCreateSheet = require('../BookCreateSheet').default

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
  const view = render(
    <MemoryRouter>
      <BookCreateSheet open onClose={onClose} {...props} />
    </MemoryRouter>
  )
  return { ...view, onClose }
}

const titleField = () => screen.getByRole('textbox', { name: /books.titleLabel/ })
const authorField = () => screen.getByRole('textbox', { name: /books.authorLabel/ })
const clickAsync = async (button) => {
  await act(async () => {
    fireEvent.click(button)
  })
}
const createBook = () => clickAsync(screen.getByRole('button', { name: 'books.createAction' }))
const pressEnter = async (field) => {
  await act(async () => {
    fireEvent.keyDown(field, { key: 'Enter' })
  })
}

beforeEach(() => {
  setViewport(false)
  mockUser = { username: 'ada' }
  mockNavigate.mockReset()
  mockCreate.mockReset().mockResolvedValue({ _id: 'book-1', title: 'Meditations' })
})

describe('at rest', () => {
  it('is four elements: a heading, one field, one chip, and the actions', () => {
    renderSheet()

    expect(screen.getByText('books.createTitle')).toBeInTheDocument()
    expect(titleField()).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'books.setAuthor' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'books.createAction' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'common.cancel' })).toBeInTheDocument()

    // One field, one chip. Cover, tags and summary are edit-time concerns and
    // are not offered here at all.
    expect(screen.getAllByRole('textbox')).toHaveLength(1)
    expect(screen.queryByRole('button', { name: /books.changeCover|books.addTags|books.addSummary/ })).not.toBeInTheDocument()
  })

  it('shows the default it will save, so the outcome is visible before acting', () => {
    renderSheet()
    // The placeholder and the saved default are the same key; if they ever
    // drifted, the placeholder would be lying about what Enter produces.
    expect(titleField()).toHaveAttribute('placeholder', 'books.untitled')
  })
})

describe('the fast path — two interactions', () => {
  it('treats an empty title as valid and names the book from the default', async () => {
    renderSheet()
    await createBook()

    expect(mockCreate).toHaveBeenCalledWith({ title: 'books.untitled', author: 'ada', isbn: null })
  })

  it('saves and navigates on Enter in the title, without a click', async () => {
    renderSheet()
    await pressEnter(titleField())

    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(mockNavigate).toHaveBeenCalledWith('/book/book-1', { state: { book: { _id: 'book-1', title: 'Meditations' } } })
  })

  it('opens with the cursor already in the title, so the path is open then Enter', () => {
    renderSheet()
    expect(titleField()).toHaveFocus()
  })
})

describe('the named path', () => {
  it('saves the title the user typed, trimmed', async () => {
    renderSheet()
    fireEvent.change(titleField(), { target: { value: '  Meditations  ' } })
    await pressEnter(titleField())

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ title: 'Meditations' }))
  })

  it('never derives a name from how many books exist', async () => {
    renderSheet()
    await createBook()

    expect(mockCreate.mock.calls[0][0].title).not.toMatch(/New book|\d/)
  })
})

describe('what reaches the database', () => {
  it('sends isbn as null — the Spanish literal is gone', async () => {
    renderSheet()
    await createBook()

    const payload = mockCreate.mock.calls[0][0]
    expect(payload.isbn).toBeNull()
    expect(JSON.stringify(payload)).not.toContain('Sin ISBN')
  })

  it('sends a null author rather than the English word "Unknown"', async () => {
    mockUser = { username: null }
    renderSheet()
    await createBook()

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ author: null }))
  })

  it('sends null when the user clears the author they were offered', async () => {
    renderSheet()
    await clickAsync(screen.getByRole('button', { name: 'books.setAuthor' }))
    fireEvent.change(authorField(), { target: { value: '   ' } })
    await createBook()

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ author: null }))
  })
})

describe('the author chip', () => {
  it('reveals a field already carrying the signed-in user, and spends itself', async () => {
    renderSheet()
    await clickAsync(screen.getByRole('button', { name: 'books.setAuthor' }))

    expect(authorField()).toHaveValue('ada')
    expect(screen.queryByRole('button', { name: 'books.setAuthor' })).not.toBeInTheDocument()
  })

  it('moves focus into what it revealed, since the chip it was on is gone', async () => {
    renderSheet()
    await clickAsync(screen.getByRole('button', { name: 'books.setAuthor' }))

    await waitFor(() => expect(authorField()).toHaveFocus())
  })

  it('does not inherit Enter-to-save — the exception is scoped to the title', async () => {
    renderSheet()
    await clickAsync(screen.getByRole('button', { name: 'books.setAuthor' }))
    await pressEnter(authorField())

    expect(mockCreate).not.toHaveBeenCalled()
  })
})

describe('validation', () => {
  it('has none: there is no invalid state to explain', async () => {
    renderSheet()
    await createBook()

    expect(screen.queryByText('books.titleRequired')).not.toBeInTheDocument()
    expect(mockCreate).toHaveBeenCalled()
  })

  it('never disables the primary action except while saving', () => {
    renderSheet()
    expect(screen.getByRole('button', { name: 'books.createAction' })).not.toBeDisabled()
  })
})

describe('a failed create', () => {
  const failWith = (response) => {
    const error = new Error('Request failed')
    error.response = response
    mockCreate.mockRejectedValue(error)
  }

  const attempt = async () => {
    renderSheet()
    fireEvent.change(titleField(), { target: { value: 'Meditations' } })
    await createBook()
  }

  it('is visible, and names the failure', async () => {
    failWith({ status: 500, data: { detail: 'Server exploded' } })
    await attempt()

    const alert = screen.getByRole('alert')
    expect(within(alert).getByText('books.createFailed')).toBeInTheDocument()
    expect(within(alert).getByText('Server exploded')).toBeInTheDocument()
  })

  it('keeps the sheet open with the typed title intact, and does not navigate', async () => {
    failWith({ status: 500, data: { detail: 'nope' } })
    await attempt()

    expect(titleField()).toHaveValue('Meditations')
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('offers Upgrade on the plan limit — the regression the ruling accepted', async () => {
    failWith({ status: 403, data: { detail: 'Book limit reached' } })
    await attempt()

    const alert = screen.getByRole('alert')
    expect(within(alert).getByText('subscription.errors.bookLimit')).toBeInTheDocument()
    expect(within(alert).getByRole('button', { name: 'subscription.upgrade' })).toBeInTheDocument()

    // The title survives the retry, which is what makes the regression
    // survivable: upgrade, press Create again, nothing was lost.
    expect(titleField()).toHaveValue('Meditations')
  })
})

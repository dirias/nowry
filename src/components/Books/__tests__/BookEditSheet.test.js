/**
 * FE-B3 — book editing on the shared shell (BOOKS.md §3).
 *
 * Fourteen elements at rest became four. The 1000px two-column layout is gone,
 * and with it the "LIVE PREVIEW" heading over a 200px book, the created and
 * edited dates — metadata about a record, not fields being edited — and the tag
 * box's fixed `minHeight: 80`, which reserved an empty container on every
 * untagged book.
 *
 * The regression these exist to prevent is the silent one: `BookEditor.js:87`
 * caught every save failure and only `console.error`d it, so a book whose save
 * failed looked exactly like one that succeeded.
 *
 * jsdom CANNOT verify: that Save clears an open keyboard at 375px, that
 * `100dvh` tracks the visual viewport, or the sheet's rendering under a dark
 * colour scheme — Joy resolves tokens through CSS variables that jsdom does not
 * flip, so dark mode is argued from exclusive semantic-token use, not observed.
 */
import React from 'react'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => {
      if (options?.tag !== undefined) return `${key}:${options.tag}`
      return key
    },
    i18n: { language: 'en' }
  })
}))

const mockUpdate = jest.fn()
const mockPublish = jest.fn()
const mockUnpublish = jest.fn()
jest.mock('../../../api/services', () => ({
  booksService: { update: (...args) => mockUpdate(...args) },
  publicContentService: {
    publishBook: (...args) => mockPublish(...args),
    unpublishBook: (...args) => mockUnpublish(...args)
  }
}))

jest.mock('../../../theme/DynamicThemeProvider', () => ({
  useThemePreferences: () => ({ themeColor: '#2a6971' })
}))

jest.mock('../../Public/PublishModal', () => {
  const Stub = ({ open }) => (open ? <div data-testid='publish-modal' /> : null)
  Stub.displayName = 'PublishModalStub'
  return Stub
})

jest.mock('react-color', () => ({ SketchPicker: () => <div data-testid='sketch-picker' /> }))

const BookEditSheet = require('../BookEditSheet').default

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

const BOOK = {
  _id: 'book-1',
  title: 'Meditations',
  cover_color: '#0B6BCB',
  cover_image: '',
  summary: '',
  tags: [],
  is_public: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-02-01T00:00:00Z'
}

const renderSheet = (book = {}) => {
  const onClose = jest.fn()
  const onSaved = jest.fn()
  const view = render(<BookEditSheet book={{ ...BOOK, ...book }} onSaved={onSaved} onClose={onClose} />)
  return { ...view, onClose, onSaved }
}

const titleField = () => screen.getByRole('textbox', { name: /books.titleLabel/ })
const clickAsync = async (button) => {
  await act(async () => {
    fireEvent.click(button)
  })
}
const save = () => clickAsync(screen.getByRole('button', { name: 'common.save' }))

beforeEach(() => {
  setViewport(false)
  mockUpdate.mockReset().mockResolvedValue({ ...BOOK })
  mockPublish.mockReset().mockResolvedValue({})
  mockUnpublish.mockReset().mockResolvedValue({})
})

describe('at rest', () => {
  it('is four elements: a heading, the title, three chips, and the actions', () => {
    renderSheet()

    expect(screen.getByText('books.editTitle')).toBeInTheDocument()
    expect(titleField()).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'books.changeCover' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'books.addTags' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'books.addSummary' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'common.save' })).toBeInTheDocument()

    // One field. Cover, tags and summary are offers until asked for.
    expect(screen.getAllByRole('textbox')).toHaveLength(1)
  })

  it('drops the preview column, its heading, and the record dates', () => {
    renderSheet()

    expect(screen.queryByText(/live preview/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/created/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/last edited/i)).not.toBeInTheDocument()
  })

  it('keeps the cover visible as a header swatch, which is what a preview was for', () => {
    renderSheet()
    expect(screen.getByRole('img', { name: 'books.coverImageAlt' })).toBeInTheDocument()
  })

  it('does not stand publishing beside Save as a peer action', () => {
    renderSheet()

    const publish = screen.getByRole('button', { name: /public.publish/ })
    const saveButton = screen.getByRole('button', { name: 'common.save' })
    expect(publish.closest('div')).not.toBe(saveButton.closest('div'))
  })
})

describe('revealing at open (S3)', () => {
  it('never hides content the user already wrote', () => {
    renderSheet({ tags: ['stoicism'], summary: 'A working notebook.' })

    expect(screen.getByText('stoicism')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /books.summaryLabel/ })).toHaveValue('A working notebook.')

    // Both chips are spent; only the cover is still on offer.
    expect(screen.queryByRole('button', { name: 'books.addTags' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'books.addSummary' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'books.changeCover' })).toBeInTheDocument()
  })

  it('opens the cover group for a book that carries an image', () => {
    renderSheet({ cover_image: 'https://example.com/cover.png' })

    expect(screen.getByRole('radiogroup', { name: 'books.coverColorLabel' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'books.changeCover' })).not.toBeInTheDocument()
  })

  it('moves focus into a group it reveals, since the chip is gone', async () => {
    renderSheet()
    await clickAsync(screen.getByRole('button', { name: 'books.addSummary' }))

    await waitFor(() => expect(screen.getByRole('textbox', { name: /books.summaryLabel/ })).toHaveFocus())
  })
})

describe('saving', () => {
  it('sends what the API already expects', async () => {
    renderSheet({ tags: ['stoicism'] })
    fireEvent.change(titleField(), { target: { value: '  Meditations  ' } })
    await save()

    expect(mockUpdate).toHaveBeenCalledWith('book-1', {
      title: 'Meditations',
      coverColor: '#0B6BCB',
      coverImage: null,
      summary: '',
      tags: ['stoicism']
    })
  })

  it('rescues a tag typed but never Entered — the behaviour worth keeping', async () => {
    renderSheet()
    await clickAsync(screen.getByRole('button', { name: 'books.addTags' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'form.tagAddAria' }), { target: { value: 'stoicism' } })

    await save()

    expect(mockUpdate).toHaveBeenCalledWith('book-1', expect.objectContaining({ tags: ['stoicism'] }))
  })

  it('reports the save upward and closes', async () => {
    const { onSaved, onClose } = renderSheet()
    await save()

    expect(onSaved).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
})

describe('validation', () => {
  it('will not let an empty title overwrite a book that had one', async () => {
    const { onClose } = renderSheet()
    fireEvent.change(titleField(), { target: { value: '   ' } })
    await save()

    expect(mockUpdate).not.toHaveBeenCalled()
    expect(screen.getByText('books.titleRequired')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    await waitFor(() => expect(titleField()).toHaveFocus())
  })

  it('never disables Save for a validation reason', () => {
    renderSheet()
    fireEvent.change(titleField(), { target: { value: '' } })
    expect(screen.getByRole('button', { name: 'common.save' })).not.toBeDisabled()
  })
})

describe('a failed save', () => {
  it('is visible — the silent console.error is gone', async () => {
    const error = new Error('Request failed')
    error.response = { status: 500, data: { detail: 'Server exploded' } }
    mockUpdate.mockRejectedValue(error)

    const { onClose } = renderSheet()
    await save()

    const alert = screen.getByRole('alert')
    expect(within(alert).getByText('books.saveFailed')).toBeInTheDocument()
    expect(within(alert).getByText('Server exploded')).toBeInTheDocument()
    // The sheet stays open with everything intact rather than closing on a
    // book that was never saved.
    expect(onClose).not.toHaveBeenCalled()
    expect(titleField()).toHaveValue('Meditations')
  })
})

describe('publishing', () => {
  it('opens the publish flow rather than publishing blind', async () => {
    renderSheet()
    await clickAsync(screen.getByRole('button', { name: 'public.publish' }))

    expect(screen.getByTestId('publish-modal')).toBeInTheDocument()
  })

  it('unpublishes directly, and says so in the banner when it fails', async () => {
    const error = new Error('nope')
    error.response = { status: 500, data: { detail: 'Still public' } }
    mockUnpublish.mockRejectedValue(error)

    renderSheet({ is_public: true })
    await clickAsync(screen.getByRole('button', { name: 'public.unpublish' }))

    const alert = screen.getByRole('alert')
    expect(within(alert).getByText('books.unpublishFailed')).toBeInTheDocument()
    expect(within(alert).getByText('Still public')).toBeInTheDocument()
  })
})

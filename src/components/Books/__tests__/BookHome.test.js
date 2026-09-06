/**
 * BookHome — the four states (docs/prd-books-library.md NFR tests): loading,
 * empty, list, error. The sheets and the import flow are mocked away; what
 * this pins is that the page opens on the Continue object and draws every
 * document as one row.
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => (options?.count !== undefined ? `${key}:${options.count}` : key),
    i18n: { language: 'en' }
  })
}))
jest.mock('react-dropzone', () => ({
  useDropzone: () => ({ getRootProps: () => ({}), getInputProps: () => ({}), isDragActive: false, open: jest.fn() })
}))
jest.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', username: 'didier' } }) }))
jest.mock('../../../hooks/useSubscription', () => ({ useSubscription: () => ({ tier: 'plus' }) }))
jest.mock('../../../context/SubscriptionContext', () => ({ useSubscriptionContext: () => ({ openUpgradeModal: jest.fn() }) }))
jest.mock('../BookCreateSheet', () => () => null)
jest.mock('../BookEditSheet', () => () => null)
jest.mock('../ImportPreviewModal', () => () => null)
jest.mock('../../Messages', () => ({ Error: ({ error_msg }) => <div role='alert'>{error_msg}</div> }))
jest.mock('../../../api/services', () => ({ booksService: {} }))

const mockUseBooks = jest.fn()
jest.mock('../../../hooks/useBooks', () => ({ __esModule: true, default: () => mockUseBooks(), useBooks: () => mockUseBooks() }))

const BookHome = require('../BookHome').default

const BOOKS = [
  {
    _id: 'w',
    title: 'N3 Grammar',
    updated_at: '2026-09-05T00:00:00Z',
    word_count: 2400,
    section_count: 6,
    sections_with_cards: 4,
    cards: 18,
    due: 4,
    tags: ['jp']
  },
  { _id: 'i', title: 'Deep Work', source: 'imported', updated_at: '2026-09-01T00:00:00Z', page_count: 296, reading_position: 139, cards: 0 }
]

const renderPage = () =>
  render(
    <MemoryRouter>
      <BookHome />
    </MemoryRouter>
  )

beforeEach(() => {
  localStorage.setItem('book_view_mode', 'list')
  mockUseBooks.mockReset()
})

describe('BookHome (BOOK-008)', () => {
  it('loading: the object skeleton and row skeletons, no action', () => {
    mockUseBooks.mockReturnValue({ books: [], loading: true, error: null, reload: jest.fn() })
    renderPage()
    expect(screen.getByTestId('documents-loading')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'books.lib.continue' })).toBeNull()
  })

  it('empty: the object with one sentence and the two ways in, no toolbar', () => {
    mockUseBooks.mockReturnValue({ books: [], loading: false, error: null, reload: jest.fn() })
    renderPage()
    expect(screen.getByText('books.lib.emptySentence')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'books.lib.newDocument' })).toBeInTheDocument()
    expect(screen.queryByTestId('documents-kind')).toBeNull()
  })

  it('list: opens on the last-edited document, counts the kinds, and draws every document as a row', () => {
    mockUseBooks.mockReturnValue({ books: BOOKS, loading: false, error: null, reload: jest.fn() })
    renderPage()
    expect(screen.getByText('books.lib.continueWriting')).toBeInTheDocument()
    expect(screen.getAllByTestId('document-row')).toHaveLength(2)
    expect(screen.getByTestId('documents-kind')).toHaveTextContent('books.lib.kind.written1')
    expect(screen.getByTestId('documents-kind')).toHaveTextContent('books.lib.kind.imported1')
  })

  it('error: says the list could not load', () => {
    mockUseBooks.mockReturnValue({ books: [], loading: false, error: new Error('down'), reload: jest.fn() })
    renderPage()
    expect(screen.getByRole('alert')).toHaveTextContent('books.lib.loadError')
  })
})

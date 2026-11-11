/**
 * BookHome — the import flow (IMPORT-007, IMPORT-008). A drop can hold several
 * files and any of them can be refused: each is answered on its own, by name,
 * and the ones that can be imported are.
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { act, render, screen, waitFor } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => (options?.name ? `${key}(${options.name})` : options?.count !== undefined ? `${key}:${options.count}` : key),
    i18n: { language: 'en' }
  })
}))
let mockDropzone
jest.mock('react-dropzone', () => ({
  useDropzone: (config) => {
    mockDropzone = config
    return { getRootProps: () => ({}), getInputProps: () => ({}), isDragActive: false, open: jest.fn() }
  }
}))
jest.mock('@nowry/core/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', username: 'didier' } }) }))
jest.mock('@nowry/core/hooks/useSubscription', () => ({ useSubscription: () => ({ tier: 'plus' }) }))
jest.mock('../../../context/SubscriptionContext', () => ({ useSubscriptionContext: () => ({ openUpgradeModal: jest.fn() }) }))
jest.mock('../BookCreateSheet', () => () => null)
jest.mock('../BookEditSheet', () => () => null)
let mockPreview
jest.mock('../ImportPreviewModal', () => (props) => {
  mockPreview = props
  return props.open ? <div data-testid='preview'>{props.previewData?.title}</div> : null
})
let mockDuplicates
jest.mock('../DuplicateImportsDialog', () => (props) => {
  mockDuplicates = props
  return props.duplicates.length ? <div data-testid='duplicates'>{props.duplicates.map((d) => `${d.file.name}=${d.existing.title}`).join(',')}</div> : null
})
jest.mock('../../Messages', () => ({ Error: ({ error_msg }) => <div role='alert'>{error_msg}</div> }))
const mockImportFile = jest.fn()
const mockNotify = jest.fn()
jest.mock('@nowry/core/platform', () => ({ notify: (...args) => mockNotify(...args) }))
jest.mock('@nowry/core/api/services', () => ({ booksService: { importFile: (...args) => mockImportFile(...args) } }))
const mockReload = jest.fn()
let mockLibraryError = null
jest.mock('@nowry/core/hooks/useLibrary', () => {
  const useLibrary = () => ({
    rows: [],
    total: 0,
    counts: { all: 0, written: 0, imported: 0 },
    tags: [],
    continueBook: null,
    loading: false,
    refreshing: false,
    loadingMore: false,
    hasMore: false,
    loadMore: jest.fn(),
    error: mockLibraryError,
    reload: mockReload
  })
  return { __esModule: true, default: useLibrary, useLibrary }
})

const BookHome = require('../BookHome').default

const file = (name) => ({ name })
const refused = (code) => ({ response: { status: 400, data: { detail: { code } } } })

const renderPage = () =>
  render(
    <MemoryRouter>
      <BookHome />
    </MemoryRouter>
  )

beforeEach(() => {
  mockImportFile.mockReset()
  mockReload.mockReset().mockResolvedValue(undefined)
  mockLibraryError = null
  mockNotify.mockReset()
})

describe('BookHome import', () => {
  it('does not offer the old .doc format to the picker', () => {
    renderPage()
    expect(Object.values(mockDropzone.accept).flat()).toEqual(['.txt', '.pdf', '.docx'])
  })

  it('answers a file of a type it does not take, by name, instead of doing nothing', async () => {
    renderPage()
    await act(() => mockDropzone.onDrop([], [{ file: file('notes.md') }, { file: file('thesis.doc') }]))
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('books.import.unsupportedType(notes.md)')
    expect(alert).toHaveTextContent('books.import.legacyDoc(thesis.doc)')
    expect(mockImportFile).not.toHaveBeenCalled()
  })

  it('previews the next file when the first cannot be read, and names the one it set aside', async () => {
    mockImportFile.mockImplementation((f) => (f.name === 'bad.pdf' ? Promise.reject(refused('import_unreadable')) : Promise.resolve({ title: 'good' })))
    renderPage()
    await act(() => mockDropzone.onDrop([file('bad.pdf'), file('good.txt')], []))
    expect(screen.getByTestId('preview')).toHaveTextContent('good')
    expect(screen.getByRole('alert')).toHaveTextContent('books.import.unreadable(bad.pdf)')
  })

  it('imports the files that can be, names the one that cannot, and reads the library again', async () => {
    renderPage()
    mockImportFile.mockResolvedValue({ title: 'one' })
    await act(() => mockDropzone.onDrop([file('one.txt'), file('locked.pdf'), file('three.txt')], []))
    mockImportFile.mockReset().mockImplementation((f) =>
      f.name === 'locked.pdf' ? Promise.reject(refused('import_password_protected')) : Promise.resolve({ _id: f.name })
    )
    await act(() => mockPreview.onConfirm('ignored for a batch'))
    expect(mockImportFile.mock.calls.map(([f, , preview]) => [f.name, preview])).toEqual([
      ['one.txt', false],
      ['locked.pdf', false],
      ['three.txt', false]
    ])
    await waitFor(() => expect(mockReload).toHaveBeenCalled())
    expect(screen.getByText('books.lib.importedToast:2')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('books.import.passwordProtected(locked.pdf)')
    expect(screen.queryByTestId('preview')).toBeNull()
  })

  it('opens the sheet while the first file is still being read, and closes it if nothing can be', async () => {
    let answer
    mockImportFile.mockImplementation(() => new Promise((resolve, reject) => (answer = { resolve, reject })))
    renderPage()
    let dropped
    act(() => {
      dropped = mockDropzone.onDrop([file('slow.pdf')], [])
    })
    expect(mockPreview.open).toBe(true)
    expect(mockPreview.preparing).toBe(true)
    expect(mockPreview.fileNames).toEqual(['slow.pdf'])
    await act(async () => {
      answer.reject(refused('import_empty'))
      await dropped
    })
    expect(mockPreview.open).toBe(false)
    expect(screen.getByRole('alert')).toHaveTextContent('books.import.empty(slow.pdf)')
  })

  it('ignores a preview that arrives after the reader closed the sheet', async () => {
    let answer
    mockImportFile.mockImplementation(() => new Promise((resolve) => (answer = { resolve })))
    renderPage()
    let dropped
    act(() => {
      dropped = mockDropzone.onDrop([file('slow.pdf')], [])
    })
    act(() => mockPreview.onClose())
    await act(async () => {
      answer.resolve({ title: 'slow' })
      await dropped
    })
    expect(mockPreview.open).toBe(false)
    expect(mockPreview.previewData).toBeNull()
  })

  it('asks about files already in the library instead of copying or dropping them (ADR-066)', async () => {
    const duplicate = (title) => ({ response: { status: 409, data: { detail: { code: 'import_duplicate', existing: { _id: 'old', title } } } } })
    renderPage()
    mockImportFile.mockResolvedValue({ title: 'new' })
    await act(() => mockDropzone.onDrop([file('new.txt'), file('seen.pdf'), file('seen.pdf')], []))
    mockImportFile.mockReset().mockImplementation((f, _user, _preview, _title, onDuplicate) =>
      f.name === 'seen.pdf' && onDuplicate === 'ask' ? Promise.reject(duplicate('Seen before')) : Promise.resolve({ _id: f.name })
    )
    await act(() => mockPreview.onConfirm(''))
    expect(mockImportFile.mock.calls.map(([f, , , , onDuplicate]) => [f.name, onDuplicate])).toEqual([
      ['new.txt', 'ask'],
      ['seen.pdf', 'ask'],
      ['seen.pdf', 'ask']
    ])
    expect(screen.getByText('books.lib.importedToast:1')).toBeInTheDocument()
    expect(screen.getByTestId('duplicates')).toHaveTextContent('seen.pdf=Seen before,seen.pdf=Seen before')
    expect(screen.queryByRole('alert')).toBeNull()

    await act(() => mockDuplicates.onImportCopies())
    expect(mockImportFile.mock.calls.slice(3).map(([f, , , , onDuplicate]) => [f.name, onDuplicate])).toEqual([
      ['seen.pdf', 'copy'],
      ['seen.pdf', 'copy']
    ])
    expect(screen.queryByTestId('duplicates')).toBeNull()
    expect(screen.getByText('books.lib.importedToast:2')).toBeInTheDocument()
  })

  it('skipping the duplicates imports nothing more', async () => {
    renderPage()
    mockImportFile.mockResolvedValue({ title: 'seen' })
    await act(() => mockDropzone.onDrop([file('seen.pdf'), file('other.txt')], []))
    mockImportFile.mockReset().mockImplementation((f) =>
      f.name === 'seen.pdf'
        ? Promise.reject({ response: { status: 409, data: { detail: { code: 'import_duplicate', existing: { _id: 'old', title: 'Seen' } } } } })
        : Promise.resolve({ _id: 'o' })
    )
    await act(() => mockPreview.onConfirm(''))
    const calls = mockImportFile.mock.calls.length
    act(() => mockDuplicates.onSkip())
    expect(screen.queryByTestId('duplicates')).toBeNull()
    expect(mockImportFile).toHaveBeenCalledTimes(calls)
  })

  it('one file the preview already called a duplicate is imported as a copy when the reader presses the key', async () => {
    renderPage()
    mockImportFile.mockResolvedValue({ title: 'seen', duplicate_of: { _id: 'old', title: 'Seen', created_at: null } })
    await act(() => mockDropzone.onDrop([file('seen.pdf')], []))
    mockImportFile.mockReset().mockResolvedValue({ _id: 'copy' })
    await act(() => mockPreview.onConfirm('Seen (2)'))
    expect(mockImportFile.mock.calls[0].slice(3)).toEqual(['Seen (2)', 'copy'])
    expect(screen.queryByTestId('duplicates')).toBeNull()
  })

  it('keeps the per-file report when the library cannot be reloaded either (IMPORT-023)', async () => {
    renderPage()
    mockImportFile.mockResolvedValue({ title: 'a' })
    await act(() => mockDropzone.onDrop([file('a.pdf'), file('b.txt')], []))
    // The server goes down after the first file: the second gets no answer, and neither does the reload.
    mockImportFile.mockReset().mockImplementation((f) => (f.name === 'a.pdf' ? Promise.resolve({ _id: 'a' }) : Promise.reject({ code: 'ERR_NETWORK' })))
    mockReload.mockImplementation(async () => {
      mockLibraryError = new Error('Network Error')
    })
    await act(() => mockPreview.onConfirm(''))
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('books.import.notReached(b.txt)')
    expect(alert).not.toHaveTextContent('books.lib.loadError')
    expect(screen.getByText('books.lib.importedToast:1')).toBeInTheDocument()
  })

  it('says the library could not be loaded when that is all that went wrong', () => {
    mockLibraryError = new Error('Network Error')
    renderPage()
    expect(screen.getByRole('alert')).toHaveTextContent('books.lib.loadError')
  })

  it('starts one import however fast the key is pressed (IMPORT-028)', async () => {
    renderPage()
    mockImportFile.mockResolvedValue({ title: 'a' })
    await act(() => mockDropzone.onDrop([file('a.pdf')], []))
    let finish
    mockImportFile.mockReset().mockImplementation(() => new Promise((resolve) => (finish = resolve)))
    let first
    act(() => {
      first = mockPreview.onConfirm('')
      mockPreview.onConfirm('')
      mockPreview.onConfirm('')
    })
    expect(mockImportFile).toHaveBeenCalledTimes(1)
    await act(async () => {
      finish({ _id: 'a' })
      await first
    })
    expect(screen.getByText('books.lib.importedToast:1')).toBeInTheDocument()
  })

  it('says the import finished on whatever page the reader went to', async () => {
    const { unmount } = renderPage()
    mockImportFile.mockResolvedValue({ title: 'a' })
    await act(() => mockDropzone.onDrop([file('a.pdf')], []))
    let finish
    mockImportFile.mockReset().mockImplementation(() => new Promise((resolve) => (finish = resolve)))
    let running
    act(() => {
      running = mockPreview.onConfirm('')
    })
    unmount()
    await act(async () => {
      finish({ _id: 'a' })
      await running
    })
    expect(mockNotify).toHaveBeenCalledWith('books.lib.importedToast:1', 'success')
  })

  it('says the library could not be loaded, with a way to retry, instead of calling it empty', () => {
    mockLibraryError = new Error('Network Error')
    renderPage()
    const failed = screen.getByTestId('library-load-failed')
    expect(failed).toHaveTextContent('books.lib.loadError')
    expect(screen.queryByText('books.lib.emptySentence')).toBeNull()
    screen.getByRole('button', { name: 'books.lib.retry' }).click()
    expect(mockReload).toHaveBeenCalled()
  })

  it('says the connection failed, not the file, when no answer comes back', async () => {
    mockImportFile.mockRejectedValue({ code: 'ERR_NETWORK' })
    renderPage()
    await act(() => mockDropzone.onDrop([file('a.pdf')], []))
    expect(screen.getByRole('alert')).toHaveTextContent('books.import.notReached(a.pdf)')
  })
})

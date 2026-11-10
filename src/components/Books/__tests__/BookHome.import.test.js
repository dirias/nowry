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
jest.mock('../../Messages', () => ({ Error: ({ error_msg }) => <div role='alert'>{error_msg}</div> }))
const mockImportFile = jest.fn()
jest.mock('@nowry/core/api/services', () => ({ booksService: { importFile: (...args) => mockImportFile(...args) } }))
const mockReload = jest.fn()
jest.mock('@nowry/core/hooks/useBooks', () => {
  const useBooks = () => ({ books: [], loading: false, error: null, reload: mockReload })
  return { __esModule: true, default: useBooks, useBooks }
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

  it('says the connection failed, not the file, when no answer comes back', async () => {
    mockImportFile.mockRejectedValue({ code: 'ERR_NETWORK' })
    renderPage()
    await act(() => mockDropzone.onDrop([file('a.pdf')], []))
    expect(screen.getByRole('alert')).toHaveTextContent('books.import.notReached(a.pdf)')
  })
})

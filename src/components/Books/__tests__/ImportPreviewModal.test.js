/**
 * ImportPreviewModal — IMPORT-013, IMPORT-014. The look before an import says
 * facts (pages, words, pictures), never a made-up quality score; it is on
 * screen while the file is still being read; and it cannot be closed out from
 * under an import that is running.
 */
import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => {
      if (!options) return key
      const parts = Object.entries(options).map(([name, value]) => `${name}=${value}`)
      return parts.length ? `${key}(${parts.join(',')})` : key
    },
    i18n: { language: 'en' }
  })
}))
jest.mock('../../../hooks/useIsMobile', () => ({ __esModule: true, default: () => false }))

const ImportPreviewModal = require('../ImportPreviewModal').default

const PREVIEW = {
  title: 'notes',
  total_pages: 3,
  facts: { pages: 3, words: 1234, pictures: 2, scanned: false },
  file_info: { original_filename: 'notes.pdf', type: 'PDF', size: 2 * 1024 * 1024 },
  sample_pages: [
    { content_preview: '<h1>Topic</h1><p>First <strong>page</strong></p>' },
    { content_preview: '<p>Second page</p>' },
    { content_preview: '' }
  ]
}

const renderSheet = (props = {}) => {
  const handlers = { onClose: jest.fn(), onConfirm: jest.fn() }
  render(<ImportPreviewModal open previewData={PREVIEW} fileNames={['notes.pdf']} {...handlers} {...props} />)
  return handlers
}

describe('ImportPreviewModal', () => {
  it('says pages, words and pictures, and none of the old scores or warnings', () => {
    renderSheet()
    const facts = screen.getByTestId('import-facts')
    expect(facts).toHaveTextContent('books.lib.pages(count=3)')
    expect(facts).toHaveTextContent('books.lib.words(count=1234,words=1,234)')
    expect(facts).toHaveTextContent('books.import.pictures(count=2)')
    expect(screen.getByText('notes.pdf')).toBeInTheDocument()
    expect(screen.getByText('2.0 MB')).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent(/quality|Low word count|column/i)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('warns about a scan, which imports as pictures', () => {
    renderSheet({ previewData: { ...PREVIEW, facts: { pages: 2, words: 0, pictures: 2, scanned: true } } })
    expect(screen.getByRole('alert')).toHaveTextContent('books.import.scanned')
  })

  it('pages through the preview and says when a page has no text', () => {
    renderSheet()
    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'books.import.previousPage' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'books.import.nextPage' }))
    expect(screen.getByText('Second page')).toBeInTheDocument()
    expect(screen.getByText('books.lib.pageOf(page=2,total=3)')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'books.import.nextPage' }))
    expect(screen.getByText('books.import.pageWithoutText')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'books.import.nextPage' })).toBeDisabled()
  })

  it('says so when only the first pages are shown', () => {
    renderSheet({ previewData: { ...PREVIEW, total_pages: 500, facts: { ...PREVIEW.facts, pages: 500 } } })
    expect(screen.getByText('books.import.previewLimited(shown=3,total=500)')).toBeInTheDocument()
  })

  it('imports under the title the reader typed', () => {
    const { onConfirm } = renderSheet()
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Biology, topic 3' } })
    fireEvent.click(screen.getByRole('button', { name: 'books.import.action(count=1)' }))
    expect(onConfirm).toHaveBeenCalledWith('Biology, topic 3')
  })

  it('offers no title for several files, and says how many will be imported', () => {
    renderSheet({ fileNames: ['a.pdf', 'b.txt', 'c.docx'] })
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.getByTestId('import-batch-note')).toHaveTextContent('books.import.batchNote(count=3)')
    expect(screen.getByRole('button', { name: 'books.import.action(count=3)' })).toBeInTheDocument()
    expect(screen.getByText('books.import.sheetTitle(count=3)')).toBeInTheDocument()
  })

  it('says when this very file is already in the library, offers to open it, and its key imports a copy (ADR-066)', () => {
    const onOpenExisting = jest.fn()
    const duplicate = { _id: 'old', title: 'Biology notes', created_at: '2026-11-01T10:00:00' }
    const { onConfirm } = renderSheet({ previewData: { ...PREVIEW, duplicate_of: duplicate }, onOpenExisting, formatWhen: () => 'yesterday' })
    expect(screen.getByTestId('import-duplicate')).toHaveTextContent('books.import.duplicateNotice(title=Biology notes,when=yesterday)')
    fireEvent.click(screen.getByRole('button', { name: 'books.import.duplicateOpen' }))
    expect(onOpenExisting).toHaveBeenCalledWith(duplicate)
    fireEvent.click(screen.getByRole('button', { name: 'books.import.actionCopy' }))
    expect(onConfirm).toHaveBeenCalled()
  })

  it('says nothing about duplicates for a drop of several files: that question comes after the import', () => {
    renderSheet({ previewData: { ...PREVIEW, duplicate_of: { _id: 'old', title: 'x' } }, fileNames: ['a.pdf', 'b.pdf'] })
    expect(screen.queryByTestId('import-duplicate')).toBeNull()
    expect(screen.getByRole('button', { name: 'books.import.action(count=2)' })).toBeInTheDocument()
  })

  it('is on screen while the file is being read: its name, a skeleton, and no import yet', () => {
    renderSheet({ previewData: null, preparing: true })
    expect(screen.getByText('books.import.reading(name=notes.pdf)')).toBeInTheDocument()
    expect(screen.getByTestId('import-preparing')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'books.import.action(count=1)' })).toBeDisabled()
    expect(screen.queryByTestId('import-facts')).toBeNull()
  })

  it('cannot be closed while the import is running', () => {
    const { onClose } = renderSheet({ loading: true })
    expect(screen.getByRole('button', { name: 'common.cancel' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'common.close' }))
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes when nothing is running', () => {
    const { onClose } = renderSheet()
    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

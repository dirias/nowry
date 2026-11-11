/** DuplicateImportsDialog — ADR-066: the reader is asked; nothing is copied or dropped silently. */
import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => (options ? `${key}(${Object.entries(options).map(([k, v]) => `${k}=${v}`).join(',')})` : key),
    i18n: { language: 'en' }
  })
}))
jest.mock('../../../hooks/useIsMobile', () => ({ __esModule: true, default: () => false }))

const DuplicateImportsDialog = require('../DuplicateImportsDialog').default

const DUPLICATES = [
  { file: { name: 'notes.pdf' }, existing: { _id: 'a', title: 'Biology notes' } },
  { file: { name: 'notes.pdf' }, existing: { _id: 'a', title: 'Biology notes' } },
  { file: { name: 'untitled.txt' }, existing: { _id: 'b', title: '' } }
]

describe('DuplicateImportsDialog', () => {
  it('is not there when there is nothing to ask', () => {
    render(<DuplicateImportsDialog duplicates={[]} onSkip={jest.fn()} onImportCopies={jest.fn()} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('lists each file beside the document it would duplicate and offers both answers', () => {
    const onSkip = jest.fn()
    const onImportCopies = jest.fn()
    render(<DuplicateImportsDialog duplicates={DUPLICATES} onSkip={onSkip} onImportCopies={onImportCopies} />)
    const list = screen.getByTestId('import-duplicates')
    expect(list).toHaveTextContent('books.import.duplicateRow(name=notes.pdf,title=Biology notes)')
    expect(list).toHaveTextContent('books.import.duplicateRow(name=untitled.txt,title=books.untitled)')
    expect(screen.getByText('books.import.duplicatesBody(count=3)')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'books.import.duplicatesImport(count=3)' }))
    expect(onImportCopies).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'books.import.duplicatesSkip' }))
    expect(onSkip).toHaveBeenCalledTimes(1)
  })

  it('cannot be dismissed while the copies are being imported', () => {
    const onSkip = jest.fn()
    render(<DuplicateImportsDialog duplicates={DUPLICATES} loading onSkip={onSkip} onImportCopies={jest.fn()} />)
    expect(screen.getByRole('button', { name: 'books.import.duplicatesSkip' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'common.close' }))
    expect(onSkip).not.toHaveBeenCalled()
  })
})

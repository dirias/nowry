import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) =>
      options
        ? `${key}:${Object.entries(options)
            .map(([k, v]) => `${k}=${v}`)
            .join(',')}`
        : key,
    i18n: { language: 'en' }
  })
}))

const ContinueObject = require('../ContinueObject').default

const rel = () => 'Yesterday'
const WRITTEN = {
  _id: 'w',
  title: 'N3 Grammar',
  updated_at: '2026-09-05',
  last_section: 'Particles',
  word_count: 2400,
  section_count: 6,
  sections_with_cards: 4,
  cards: 18,
  due: 4,
  cover_color: '#123456'
}
const IMPORTED = {
  _id: 'i',
  title: 'Deep Work',
  source: 'imported',
  updated_at: '2026-09-04',
  page_count: 296,
  reading_position: 139,
  cards: 12
}

describe('ContinueObject (BOOK-007)', () => {
  it('draws the skeleton while the list loads, and no action', () => {
    render(<ContinueObject loading book={null} />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByText('books.lib.emptySentence')).toBeNull()
  })

  it('a written document: section · edited · words in sections · cards · due, the gap as the secondary, coverage as the edge', () => {
    const onMakeCards = jest.fn()
    const onContinue = jest.fn()
    render(<ContinueObject book={WRITTEN} tier='plus' formatRelativeDate={rel} onMakeCards={onMakeCards} onContinue={onContinue} />)
    expect(screen.getByText('books.lib.continueWriting')).toBeInTheDocument()
    expect(screen.getByText('Particles')).toBeInTheDocument()
    expect(screen.getByText('books.lib.editedAt:when=Yesterday')).toBeInTheDocument()
    expect(screen.getByText('books.lib.wordsInSections:words=2,400,count=6')).toBeInTheDocument()
    expect(screen.getByText('books.lib.dueToday:count=4')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'books.lib.makeCardsSections:count=2' }))
    fireEvent.click(screen.getByRole('button', { name: 'books.lib.continue' }))
    expect(onMakeCards).toHaveBeenCalled()
    expect(onContinue).toHaveBeenCalled()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '67')
  })

  it('hides the gap key when every section has cards', () => {
    render(<ContinueObject book={{ ...WRITTEN, sections_with_cards: 6 }} tier='plus' formatRelativeDate={rel} />)
    expect(screen.queryByRole('button', { name: /makeCardsSections/ })).toBeNull()
  })

  it('an import: page N of M, Listen, the page as the edge', () => {
    render(<ContinueObject book={IMPORTED} tier='pro' formatRelativeDate={rel} />)
    expect(screen.getByText('books.lib.continueReading')).toBeInTheDocument()
    expect(screen.getByText('books.lib.pageOf:page=140,total=296')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'books.lib.listen' })).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '47')
  })

  it('a free account keeps the readout on a locked key that opens the upgrade sheet (D10)', () => {
    const onUpgrade = jest.fn()
    const onMakeCards = jest.fn()
    render(<ContinueObject book={WRITTEN} tier='free' formatRelativeDate={rel} onUpgrade={onUpgrade} onMakeCards={onMakeCards} />)
    const key = screen.getByRole('button', { name: 'books.lib.makeCardsLockedAria' })
    expect(key).toHaveTextContent('books.lib.makeCardsSections:count=2')
    fireEvent.click(key)
    expect(onUpgrade).toHaveBeenCalled()
    expect(onMakeCards).not.toHaveBeenCalled()
  })

  it('empty: one sentence and the two ways in, no edge; dragging: the drop state', () => {
    const { rerender } = render(<ContinueObject book={null} />)
    expect(screen.getByText('books.lib.emptySentence')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'books.lib.newDocument' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'books.lib.importFiles' })).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).toBeNull()
    rerender(<ContinueObject book={WRITTEN} isDragActive formatRelativeDate={rel} />)
    expect(screen.getByText('books.lib.dropTitle')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).toBeNull()
  })
})

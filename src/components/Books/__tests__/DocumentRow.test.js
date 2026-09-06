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

const DocumentRow = require('../DocumentRow').default
const DocumentActionsMenu = require('../DocumentActionsMenu').default
const { cardsReadout, metaLine, measureOf } = require('../documentCopy')

const rel = () => 'Yesterday'
const WRITTEN = {
  _id: 'w',
  title: 'N3 Grammar',
  updated_at: '2026-09-05',
  word_count: 2400,
  section_count: 6,
  sections_with_cards: 4,
  cards: 18,
  due: 4,
  is_public: true
}
const IMPORTED = {
  _id: 'i',
  title: 'Deep Work',
  author: 'Cal Newport',
  source: 'imported',
  created_at: '2026-09-01',
  page_count: 296,
  reading_position: 139,
  cards: 0
}
const t = (key, options) =>
  options
    ? `${key}:${Object.entries(options)
        .map(([k, v]) => `${k}=${v}`)
        .join(',')}`
    : key

describe('documentCopy (BOOK-008, D6–D8)', () => {
  it('a written row reads words · sections · edited · Published, and cards · due', () => {
    expect(metaLine(t, WRITTEN, rel)).toBe(
      'books.lib.words:count=2400,words=2,400 · books.lib.sections:count=6 · books.lib.editedAt:when=Yesterday · books.lib.published'
    )
    expect(cardsReadout(t, WRITTEN)).toEqual({ strong: 'books.lib.due:count=4', rest: 'books.lib.cards:count=18' })
    expect(measureOf(WRITTEN)).toBe(67)
  })

  it('an imported row reads author · pages · imported, and the page position; the author never the account name', () => {
    expect(metaLine(t, IMPORTED, rel)).toBe('Cal Newport · books.lib.pages:count=296 · books.lib.importedAt:when=Yesterday')
    expect(metaLine(t, { ...IMPORTED, author: 'didier' }, rel, { username: 'didier' })).toBe(
      'books.lib.pages:count=296 · books.lib.importedAt:when=Yesterday'
    )
    expect(cardsReadout(t, IMPORTED)).toEqual({ strong: null, rest: 'books.lib.pageOf:page=140,total=296' })
    expect(cardsReadout(t, { ...IMPORTED, reading_position: 295 })).toEqual({ strong: null, rest: 'books.lib.read' })
    expect(measureOf(IMPORTED)).toBe(47)
  })

  it('stays silent on a document without cards — no readout, no measure (D8); the gap is named once, on the summary object', () => {
    expect(cardsReadout(t, { ...WRITTEN, cards: 0, due: 0 })).toBeNull()
    expect(measureOf({ ...WRITTEN, cards: 0 })).toBeNull()
    expect(measureOf({ ...WRITTEN, section_count: null })).toBeNull()
    expect(cardsReadout(t, { ...IMPORTED, page_count: null, cards: 0 })).toBeNull()
  })

  it('an empty row keeps its slots but says nothing in them', () => {
    render(<DocumentRow book={{ ...WRITTEN, cards: 0, due: 0 }} relative={rel} />)
    expect(screen.queryByText(/noCardsYet/)).toBeNull()
    expect(screen.queryByText(/%/)).toBeNull()
  })
})

describe('DocumentRow', () => {
  it('opens on click, on Open, and keeps the kebab from opening the row', () => {
    const onOpen = jest.fn()
    const onDelete = jest.fn()
    render(
      <DocumentRow
        book={WRITTEN}
        relative={rel}
        onOpen={onOpen}
        actions={<DocumentActionsMenu book={WRITTEN} tier='plus' onDelete={onDelete} />}
      />
    )
    fireEvent.click(screen.getByTestId('document-row'))
    expect(onOpen).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'books.lib.menuAria:title=N3 Grammar' }))
    expect(onOpen).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('menuitem', { name: /deleteAction/ }))
    expect(onDelete).toHaveBeenCalledWith(WRITTEN)
  })

  it('a free account sees Make cards and Make a quiz locked with the plan, and Listen only on imports', () => {
    const onUpgrade = jest.fn()
    const onMakeCards = jest.fn()
    const { unmount } = render(<DocumentActionsMenu book={IMPORTED} tier='free' onUpgrade={onUpgrade} onMakeCards={onMakeCards} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('menuitem', { name: 'books.lib.listenLockedAria' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('menuitem', { name: 'books.lib.makeCardsLockedAria' }))
    expect(onUpgrade).toHaveBeenCalledWith('makeCards')
    expect(onMakeCards).not.toHaveBeenCalled()
    unmount()
    render(<DocumentActionsMenu book={WRITTEN} tier='plus' />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.queryByRole('menuitem', { name: /listen/i })).toBeNull()
    expect(screen.getByRole('menuitem', { name: 'books.lib.makeCards' })).toBeInTheDocument()
  })
})

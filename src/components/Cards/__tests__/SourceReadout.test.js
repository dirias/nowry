import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { fireEvent, render, screen } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => (options ? `${key}:${Object.values(options).join('|')}` : key),
    i18n: { language: 'en' }
  })
}))

const SourceReadout = require('../SourceReadout').default
const { sectionHref } = require('../SourceReadout')

const CARD = { source_book_id: 'b1', source_book_title: 'N3 Grammar', source_section: { heading: 'Particles', index: 1, hash: 'h' } }

const renderIn = (node) => render(<MemoryRouter>{node}</MemoryRouter>)

describe('SourceReadout (BOOK-004)', () => {
  it('renders nothing for a card without a source', () => {
    const { container } = renderIn(<SourceReadout card={{ title: 'x' }} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('reads "from document · section", or the document alone when the card has no section', () => {
    renderIn(<SourceReadout card={CARD} />)
    expect(screen.getByText('cards.session.source.from:N3 Grammar|Particles')).toBeInTheDocument()
    renderIn(<SourceReadout card={{ ...CARD, source_section: null }} />)
    expect(screen.getByText('cards.session.source.fromDocument:N3 Grammar')).toBeInTheDocument()
  })

  it('links to the section by its heading text, and keeps the click from the row', () => {
    const onRow = jest.fn()
    renderIn(
      <div role='button' onClick={onRow}>
        <SourceReadout card={CARD} link />
      </div>
    )
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/book/b1?section=Particles')
    fireEvent.click(link)
    expect(onRow).not.toHaveBeenCalled()
    expect(sectionHref({ source_book_id: 'b1', source_section: { heading: 'は vs が' } })).toBe(
      '/book/b1?section=%E3%81%AF%20vs%20%E3%81%8C'
    )
  })

  it('keeps the readout and drops the link once the document is deleted (D12)', () => {
    renderIn(<SourceReadout card={{ ...CARD, source_book_deleted: true }} link />)
    expect(screen.getByText('cards.session.source.deleted')).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
  })
})

import { cardSource } from '../cardSource'

describe('cardSource', () => {
  it('is null for a card not made from a document', () => {
    expect(cardSource({})).toBeNull()
    expect(cardSource(null)).toBeNull()
    expect(cardSource({ source_book_title: 'orphan title' })).toBeNull()
  })

  it('reads the document, the section and the deleted flag', () => {
    expect(
      cardSource({
        source_book_id: 'b1',
        source_book_title: 'Genki II',
        source_section: { heading: 'Lesson 14' },
        source_book_deleted: true
      })
    ).toEqual({ bookId: 'b1', title: 'Genki II', section: 'Lesson 14', deleted: true })
  })

  it('tolerates a missing title and section', () => {
    expect(cardSource({ source_book_id: 'b1' })).toEqual({ bookId: 'b1', title: '', section: null, deleted: false })
  })
})

/**
 * The source line under a card reads the web's three fields (MOB-111).
 */
const { sourceLineFor } = require('../cardSource')

const t = (key, options) => (options ? `${key}:${JSON.stringify(options)}` : key)

describe('the source line', () => {
  it('is absent for a card with no source', () => {
    expect(sourceLineFor(t, {})).toBeNull()
    expect(sourceLineFor(t, null)).toBeNull()
    expect(sourceLineFor(t, { source_book_title: 'Genki' })).toBeNull()
  })

  it('names the document and the section when there is one', () => {
    const card = { source_book_id: 'b1', source_book_title: 'Genki II', source_section: { heading: 'Lesson 14' } }
    expect(sourceLineFor(t, card)).toBe('cards.session.source.from:{"document":"Genki II","section":"Lesson 14"}')
  })

  it('names the document alone when the section is missing', () => {
    const card = { source_book_id: 'b1', source_book_title: 'Genki II' }
    expect(sourceLineFor(t, card)).toBe('cards.session.source.fromDocument:{"document":"Genki II"}')
  })

  it('says so when the document was deleted, before anything else', () => {
    const card = { source_book_id: 'b1', source_book_title: 'Gone', source_book_deleted: true, source_section: { heading: 'x' } }
    expect(sourceLineFor(t, card)).toBe('cards.session.source.deleted')
  })
})

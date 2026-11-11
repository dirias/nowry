import { chosenCoverColor, importFacts, importFactsLine, ownSummary } from '../books/importFacts'

const t = (key, options = {}) =>
  `${key}(${Object.entries(options)
    .map(([k, v]) => `${k}=${v}`)
    .join(',')})`

const NEW = { source: 'imported', source_filename: 'notes.pdf', page_count: 12, summary: '', cover_color: '' }
const OLD = { source: 'imported', page_count: 3, summary: 'Imported from old notes - v2.docx - 3 pages', cover_color: '#4A90E2' }
const WRITTEN = { source: 'written', summary: 'Imported from nothing - 2 pages', cover_color: '#4A90E2' }

describe('importFacts (ADR-067)', () => {
  it('reads the facts an import stores', () => {
    expect(importFacts(NEW)).toEqual({ fileName: 'notes.pdf', pages: 12 })
    expect(importFactsLine(t, NEW)).toBe('books.importedFrom(name=notes.pdf) · books.lib.pages(count=12)')
  })

  it('reads them out of the sentence an older import stored, without rewriting anything', () => {
    expect(importFacts(OLD)).toEqual({ fileName: 'old notes - v2.docx', pages: 3 })
    expect(importFacts({ source: 'imported', summary: 'Imported from a.txt - 7 pages' })).toEqual({ fileName: 'a.txt', pages: 7 })
  })

  it('says only that it was imported when nothing more is known', () => {
    expect(importFactsLine(t, { source: 'imported' })).toBe('books.importedDocument()')
    expect(importFactsLine(t, { source: 'imported', page_count: 4 })).toBe('books.importedDocument() · books.lib.pages(count=4)')
  })

  it('has nothing to say about a written document', () => {
    expect(importFacts(WRITTEN)).toBeNull()
    expect(importFactsLine(t, WRITTEN)).toBeNull()
  })
})

describe('ownSummary and chosenCoverColor', () => {
  it("never offers the importer's old sentence as the reader's summary", () => {
    expect(ownSummary(OLD)).toBe('')
    expect(ownSummary({ source: 'imported', summary: 'My notes on chapter 3' })).toBe('My notes on chapter 3')
    expect(ownSummary(WRITTEN)).toBe('Imported from nothing - 2 pages') // a writer may type anything
    expect(ownSummary({})).toBe('')
  })

  it("never takes the importer's old colour for a choice", () => {
    expect(chosenCoverColor(OLD)).toBeNull()
    expect(chosenCoverColor({ source: 'imported', cover_color: '#4a90e2' })).toBeNull()
    expect(chosenCoverColor({ source: 'imported', cover_color: '#112233' })).toBe('#112233')
    expect(chosenCoverColor(WRITTEN)).toBe('#4A90E2')
    expect(chosenCoverColor(NEW)).toBeNull()
  })
})

import { kindOf, readingPage } from './libraryQuery'

/**
 * The words on a document's row (docs/prd-books-library.md D6, D7): a meta line
 * that is true for its kind, and a readout that says what the deck has or
 * names the gap. Pure, so the row and the tile cannot disagree.
 */
export const metaLine = (t, book, relative, { username = null, locale = undefined } = {}) => {
  if (kindOf(book) === 'imported') {
    const author = book.author && book.author !== username ? book.author : null
    return [
      author,
      book.page_count ? t('books.lib.pages', { count: book.page_count }) : null,
      t('books.lib.importedAt', { when: relative(book.created_at || book.updated_at) })
    ]
      .filter(Boolean)
      .join(' · ')
  }
  return [
    book.word_count != null ? t('books.lib.words', { count: book.word_count, words: book.word_count.toLocaleString(locale) }) : null,
    book.section_count != null ? t('books.lib.sections', { count: book.section_count }) : null,
    t('books.lib.editedAt', { when: relative(book.updated_at) }),
    book.is_public ? t('books.lib.published') : null
  ]
    .filter(Boolean)
    .join(' · ')
}

/**
 * `{ strong, rest }`: the part in text.primary (the number that asks something) and the rest —
 * or null when there is nothing to report. A readout reports a fact that changes what you do;
 * the absence of cards is the default and stays silent on the row (prd-book-cards.md D8). The
 * gap is named once, on the summary object. An import's page position is a fact and shows.
 */
export const cardsReadout = (t, book) => {
  if (kindOf(book) === 'imported') {
    const position = readingPage(book)
    if (!position) return book.cards > 0 ? { strong: null, rest: t('books.lib.cards', { count: book.cards }) } : null
    if (position.done) return { strong: null, rest: t('books.lib.read') }
    return { strong: null, rest: t('books.lib.pageOf', { page: position.page, total: position.total }) }
  }
  if (!book.cards) return null
  return { strong: book.due > 0 ? t('books.lib.due', { count: book.due }) : null, rest: t('books.lib.cards', { count: book.cards }) }
}

/** The measure's value: coverage for a written document with cards, the page for an import; null draws nothing. */
export const measureOf = (book) => {
  if (kindOf(book) === 'imported') return readingPage(book)?.pct ?? null
  if (!book.section_count || !book.cards) return null
  return Math.round((Math.min(book.sections_with_cards || 0, book.section_count) / book.section_count) * 100)
}

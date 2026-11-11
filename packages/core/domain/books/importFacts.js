/**
 * What an imported document is, as facts each client words itself (ADR-067).
 *
 * The importer used to store prose: `summary = "Imported from notes.pdf - 12
 * pages"` (English, in every language), and a fixed cover colour nobody chose.
 * It now stores the file name and the page count as fields. Documents imported
 * before that are not rewritten; their old shapes are recognised here, so the
 * sentence is never shown as the reader's own summary and the colour is never
 * taken for a choice.
 */
import { kindOf } from './libraryQuery'

/** The sentence the importer used to write into `summary`. */
const LEGACY_SUMMARY = /^Imported from (.+) - (\d+) pages$/
/** The colour the importer used to write into `cover_color`. */
export const LEGACY_IMPORT_COLOR = '#4A90E2'

const legacy = (book) => (kindOf(book) === 'imported' ? LEGACY_SUMMARY.exec(book?.summary || '') : null)

/**
 * The file an import came from and how many pages it has, or null for a written document.
 * @returns {{fileName: string|null, pages: number|null}|null}
 */
export function importFacts(book) {
  if (kindOf(book) !== 'imported') return null
  const old = legacy(book)
  const pages = book.page_count ?? (old ? Number(old[2]) : null)
  return { fileName: book.source_filename || (old ? old[1] : null), pages: pages || null }
}

/** The summary the reader wrote: never the importer's old sentence. */
export const ownSummary = (book) => (legacy(book) ? '' : book?.summary || '')

/** The cover colour the reader chose: never the importer's old default. */
export const chosenCoverColor = (book) => {
  const color = book?.cover_color || null
  if (color && kindOf(book) === 'imported' && color.toLowerCase() === LEGACY_IMPORT_COLOR.toLowerCase()) return null
  return color
}

/**
 * The facts as one line, in the reader's language: "Imported from notes.pdf · 12 pages".
 * @param {Function} t
 * @returns {string|null}
 */
export function importFactsLine(t, book) {
  const facts = importFacts(book)
  if (!facts) return null
  const origin = facts.fileName ? t('books.importedFrom', { name: facts.fileName }) : t('books.importedDocument')
  return facts.pages ? `${origin} · ${t('books.lib.pages', { count: facts.pages })}` : origin
}

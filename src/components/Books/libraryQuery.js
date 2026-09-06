/**
 * What the library knows about a document, computed from the list the API
 * already returns (docs/prd-books-library.md D1, D2, D5–D8). Pure; the page
 * and the summary object read these so the two never disagree.
 */
export const KINDS = ['all', 'written', 'imported']
export const SORTS = ['edited', 'title', 'cards']

export const kindOf = (book) => (book?.source === 'imported' ? 'imported' : 'written')

const time = (value) => {
  const ms = value ? new Date(value).getTime() : 0
  return Number.isNaN(ms) ? 0 : ms
}

/** The document the page opens on: the most recently edited one (D1). */
export const pickContinue = (books = []) =>
  books.reduce((best, book) => (best == null || time(book.updated_at) > time(best.updated_at) ? book : best), null)

/** Sections with cards over sections, or null when the count is unknown (D8). */
export const coverage = (book) => {
  const total = book?.section_count
  if (!total) return null
  const covered = Math.min(book.sections_with_cards || 0, total)
  return { covered, total, pct: Math.round((covered / total) * 100) }
}

/** The gap the secondary names: sections without cards (D1). */
export const sectionsWithoutCards = (book) => {
  const c = coverage(book)
  return c ? c.total - c.covered : 0
}

/** Page position of an import, 1-based, clamped to the page count (D2). */
export const readingPage = (book) => {
  const total = book?.page_count || 0
  if (!total) return null
  const page = Math.min(Math.max((book.reading_position ?? 0) + 1, 1), total)
  return { page, total, pct: Math.round((page / total) * 100), done: page >= total }
}

/** Where Continue goes: the section for a written document, the page for an import (D2). */
export const resumeHref = (book, extra = {}) => {
  const params = new URLSearchParams()
  if (kindOf(book) === 'imported') {
    const position = readingPage(book)
    if (position && position.page > 1) params.set('page', String(position.page))
  } else if (book?.last_section) {
    params.set('section', book.last_section)
  }
  Object.entries(extra).forEach(([key, value]) => params.set(key, String(value)))
  const query = params.toString()
  return `/book/${book._id}${query ? `?${query}` : ''}`
}

export const kindCounts = (books = []) =>
  books.reduce(
    (acc, book) => {
      acc.all += 1
      acc[kindOf(book)] += 1
      return acc
    },
    { all: 0, written: 0, imported: 0 }
  )

export const tagCounts = (books = []) => {
  const counts = new Map()
  books.forEach((book) => (book.tags || []).forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1)))
  return Array.from(counts, ([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}

export const filterDocuments = (books = [], { kind = 'all', search = '', tags = [] } = {}) => {
  const needle = search.trim().toLowerCase()
  return books.filter((book) => {
    if (kind !== 'all' && kindOf(book) !== kind) return false
    if (tags.length > 0 && !tags.some((tag) => book.tags?.includes(tag))) return false
    if (!needle) return true
    const haystack = [book.title, kindOf(book) === 'imported' ? book.author : null].filter(Boolean).join(' ').toLowerCase()
    return haystack.includes(needle)
  })
}

export const sortDocuments = (books = [], sort = 'edited') => {
  const rows = [...books]
  if (sort === 'title') rows.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
  else if (sort === 'cards') rows.sort((a, b) => (b.cards || 0) - (a.cards || 0) || time(b.updated_at) - time(a.updated_at))
  else rows.sort((a, b) => time(b.updated_at) - time(a.updated_at))
  return rows
}

/**
 * Which decks the library is showing, for both clients.
 *
 * The web has filtered its deck list by search, type and tag since the library
 * was redesigned; the phone did not filter at all, and had no search field on
 * the decks view to filter with (MOB-062). Four decks hide that. Forty do not.
 *
 * The predicate is the web's own, moved here rather than reimplemented, for the
 * same reason `libraryQuery` was: a second copy is a second library, and the
 * two drift the first time either is touched.
 *
 * **The query's grammar is part of the predicate.** A comma is OR, a space is
 * AND, and a term matches a deck's name or any of its tags — so "jp, kanji n5"
 * means "Japanese decks, or decks tagged both kanji and n5". That is not
 * obvious from the field, and it is the kind of behaviour that quietly
 * disappears when a screen writes its own `includes()`.
 */

/** The deck's own type, defaulted the way the API's older records need. */
export const deckTypeOf = (deck) => deck?.deck_type || 'flashcard'

const matchesQuery = (deck, query) => {
  const trimmed = (query || '').trim().toLowerCase()
  if (trimmed === '') return true
  return trimmed.split(',').some((group) => {
    const terms = group.trim().split(/\s+/).filter(Boolean)
    if (terms.length === 0) return false
    return terms.every(
      (term) => (deck?.name || '').toLowerCase().includes(term) || (deck?.tags ?? []).some((tag) => tag.toLowerCase().includes(term))
    )
  })
}

/**
 * @param {Array} decks
 * @param {{ search?: string, type?: string, tags?: Array<string> }} filters
 * @returns {Array} the decks that match all three
 */
export const filterDecks = (decks, { search = '', type = 'all', tags = [] } = {}) =>
  (decks ?? []).filter((deck) => {
    const matchesType = type === 'all' || deckTypeOf(deck) === type
    const matchesTags = tags.length === 0 || tags.some((tag) => (deck?.tags ?? []).includes(tag))
    return matchesQuery(deck, search) && matchesType && matchesTags
  })

export default filterDecks

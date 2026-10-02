/**
 * What a document or deck says about itself when it is published (MOB-103).
 *
 * The listing — category, tags, language, difficulty, licence, whether it is
 * the author's own work — lived inside the web's `PublishModal`, a component,
 * so the phone could not publish without a second copy of four option lists
 * and two rules. This is the one copy.
 *
 * **The payload is built here, not by the form.** The web form sent its own
 * state straight to the API, and its state held `difficulty_level: ''` until a
 * difficulty was picked. The API takes that field as one of three words or
 * nothing, so every publish that left difficulty at "Optional" — the default —
 * came back 422 and read "Couldn't publish your book". `listingPayload` sends
 * `null` for an unchosen difficulty, on both clients.
 */

export const PUBLISH_CATEGORIES = [
  'science',
  'math',
  'languages',
  'history',
  'literature',
  'technology',
  'art',
  'music',
  'business',
  'health'
]

export const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced']

/**
 * `all_rights` is the word every published record so far was stored with, so
 * it stays, although the API's own default spells it `all_rights_reserved`.
 */
export const LICENSES = ['all_rights', 'cc_by', 'cc_by_sa', 'cc0']

/**
 * A language is named in itself: someone looking for Japanese material reads
 * 日本語 whatever language the app is in, so these are not translated.
 */
export const CONTENT_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'ja', name: '日本語' },
  { code: 'zh', name: '中文' },
  { code: 'pt', name: 'Português' },
  { code: 'ru', name: 'Русский' },
  { code: 'ar', name: 'العربية' },
  { code: 'hi', name: 'हिन्दी' }
]

/** A new listing. The language follows the app's when it is one on offer. */
export const emptyListing = (appLanguage = 'en') => {
  const base = String(appLanguage ?? '').split('-')[0]
  return {
    category: '',
    tags: [],
    language: CONTENT_LANGUAGES.some((language) => language.code === base) ? base : 'en',
    difficulty: '',
    license: 'all_rights',
    original: true
  }
}

const cleanTags = (tags) => [...new Set((tags ?? []).map((tag) => String(tag).trim()).filter(Boolean))]

/**
 * What stops a listing from being published, as translation keys by field.
 * Empty when it can be sent.
 */
export const listingErrors = (listing) => {
  const errors = {}
  if (!listing?.category) errors.category = 'public.publishModal.categoryRequired'
  if (cleanTags(listing?.tags).length === 0) errors.tags = 'public.publishModal.tagsRequired'
  return errors
}

/** The body `POST /public/{books|decks}/{id}/publish` takes. */
export const listingPayload = (listing) => ({
  category: listing.category,
  tags: cleanTags(listing.tags),
  language: listing.language || 'en',
  difficulty_level: DIFFICULTY_LEVELS.includes(listing.difficulty) ? listing.difficulty : null,
  license_type: listing.license || 'all_rights',
  is_original_content: listing.original !== false
})

/** Whether a document or deck is in the public library. */
export const isPublished = (content) => Boolean(content?.is_public)

/**
 * Why the library may refuse a listing (ADR-037).
 *
 * The server answers `409 {"code": "source_not_publishable", "reason"}` for
 * content that arrived from a file: an imported deck, an imported book, or a
 * deck whose cards were made from an imported book. The code-to-key mapping
 * lives here once so the deck sheet, the book sheet and the phone all say the
 * same sentence — and say it before asking, when the content itself already
 * shows a file origin.
 */
export const PUBLISH_BLOCK_CODE = 'source_not_publishable'

export const PUBLISH_BLOCK_REASONS = ['imported_deck', 'imported_book', 'cards_from_imported_book']

/** Whether a deck or document came from a file rather than being written here. */
export const hasFileOrigin = (content) => content?.source === 'imported'

/** The reason the server refused a listing, or null when the error is something else. */
export const publishBlockReason = (error) => {
  const detail = error?.response?.data?.detail
  if (!detail || typeof detail !== 'object' || Array.isArray(detail)) return null
  if (detail.code !== PUBLISH_BLOCK_CODE) return null
  return PUBLISH_BLOCK_REASONS.includes(detail.reason) ? detail.reason : PUBLISH_BLOCK_REASONS[0]
}

/** The translation key that explains a refusal, by reason. */
export const publishBlockKey = (reason) =>
  `public.publishBlocked.${PUBLISH_BLOCK_REASONS.includes(reason) ? reason : PUBLISH_BLOCK_REASONS[0]}`

/** The sentence to show instead of the publish control, or null when publishing may be offered. */
export const publishBlockKeyFor = (contentType, content) => {
  if (!hasFileOrigin(content) || isPublished(content)) return null
  return publishBlockKey(contentType === 'book' ? 'imported_book' : 'imported_deck')
}

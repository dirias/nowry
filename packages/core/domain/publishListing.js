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

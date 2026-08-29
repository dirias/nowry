/**
 * learningTaxonomy — the single source of truth for the learning taxonomy.
 *
 * Every surface that lets a user pick a subject (the onboarding wizard, account
 * settings, the news feed, the public deck browser) reads from here. Do not
 * redeclare these lists locally: a second copy is how the interests casing
 * mismatch shipped, where the wizard wrote 'technology' and settings wrote
 * 'Technology', leaving users unable to see or edit what they had chosen.
 *
 * The canonical wire format is lowercase snake_case. It matches what the
 * wizard already persists and the `Literal` constraint the API enforces.
 * `constants/__tests__/learningTaxonomy.test.js` fails the build if that
 * invariant or an i18n key ever drifts.
 */

/**
 * @typedef  {Object} Topic
 * @property {string} value        Canonical wire value — persisted and sent to the API.
 * @property {string} i18nKey      Translation key; resolves in all five locales.
 * @property {string} icon         Emoji shown on the selection chips.
 * @property {string} newsCategory RSS feed category backing the home feed; every
 *                                 value resolves in `Nowry-API/app/routers/news.py`'s
 *                                 NEWS_FEEDS for all supported languages.
 * @property {string} deckCategory Category passed to `GET /public/decks?category=`.
 */

/** @type {Topic[]} */
export const TOPICS = [
  {
    value: 'artificial_intelligence',
    i18nKey: 'taxonomy.topics.artificial_intelligence',
    icon: '🤖',
    newsCategory: 'technology',
    deckCategory: 'artificial_intelligence'
  },
  {
    value: 'technology',
    i18nKey: 'taxonomy.topics.technology',
    icon: '💻',
    newsCategory: 'technology',
    deckCategory: 'technology'
  },
  {
    value: 'science',
    i18nKey: 'taxonomy.topics.science',
    icon: '🔬',
    newsCategory: 'science',
    deckCategory: 'science'
  },
  {
    value: 'mathematics',
    i18nKey: 'taxonomy.topics.mathematics',
    icon: '📐',
    newsCategory: 'mathematics',
    deckCategory: 'mathematics'
  },
  {
    value: 'history',
    i18nKey: 'taxonomy.topics.history',
    icon: '📜',
    newsCategory: 'history',
    deckCategory: 'history'
  },
  {
    value: 'languages',
    i18nKey: 'taxonomy.topics.languages',
    icon: '🌐',
    newsCategory: 'languages',
    deckCategory: 'languages'
  },
  {
    value: 'literature',
    i18nKey: 'taxonomy.topics.literature',
    icon: '📚',
    newsCategory: 'entertainment',
    deckCategory: 'literature'
  },
  {
    value: 'art',
    i18nKey: 'taxonomy.topics.art',
    icon: '🎨',
    newsCategory: 'entertainment',
    deckCategory: 'art'
  },
  {
    value: 'music',
    i18nKey: 'taxonomy.topics.music',
    icon: '🎵',
    newsCategory: 'entertainment',
    deckCategory: 'music'
  },
  {
    value: 'business',
    i18nKey: 'taxonomy.topics.business',
    icon: '💼',
    newsCategory: 'business',
    deckCategory: 'business'
  },
  {
    value: 'health',
    i18nKey: 'taxonomy.topics.health',
    icon: '🏃',
    newsCategory: 'health',
    deckCategory: 'health'
  },
  {
    value: 'philosophy',
    i18nKey: 'taxonomy.topics.philosophy',
    icon: '🧠',
    newsCategory: 'philosophy',
    deckCategory: 'philosophy'
  },
  {
    value: 'design',
    i18nKey: 'taxonomy.topics.design',
    icon: '✏️',
    newsCategory: 'design',
    deckCategory: 'design'
  },
  {
    value: 'psychology',
    i18nKey: 'taxonomy.topics.psychology',
    icon: '💭',
    newsCategory: 'psychology',
    deckCategory: 'psychology'
  }
]

/**
 * @typedef  {Object} StudyGoal
 * @property {string} value   Canonical wire value.
 * @property {string} i18nKey Translation key; resolves in all five locales.
 */

/** @type {StudyGoal[]} */
export const STUDY_GOALS = [
  { value: 'general', i18nKey: 'taxonomy.goals.general' },
  { value: 'academic', i18nKey: 'taxonomy.goals.academic' },
  { value: 'career', i18nKey: 'taxonomy.goals.career' },
  { value: 'language', i18nKey: 'taxonomy.goals.language' },
  { value: 'hobby', i18nKey: 'taxonomy.goals.hobby' }
]

/** Maximum number of topics a user may select. */
export const MAX_TOPICS = 5

/** Fallback news category when a topic has no dedicated feed. */
export const DEFAULT_NEWS_CATEGORY = 'general'

const TOPIC_VALUES = new Set(TOPICS.map((topic) => topic.value))

/**
 * The user's leading interest, used to seed recommendations.
 *
 * @param   {string[]}     interests Selected topic values, most important first.
 * @returns {string|null}            The first interest, or null when none are selected.
 */
export const derivePrimaryTopic = (interests) => {
  if (!Array.isArray(interests) || interests.length === 0) return null
  return interests[0] ?? null
}

/**
 * @param   {string}  value Candidate topic value.
 * @returns {boolean}       Whether the value is part of the canonical taxonomy.
 */
export const isValidTopic = (value) => TOPIC_VALUES.has(value)

/**
 * Resolve the news feed category for a stored interest.
 *
 * Tolerates legacy mixed-case values (`'Technology'`) that predate the
 * canonical snake_case form so the feed keeps working before the API's
 * one-time normalizer has run over a given account.
 *
 * @param   {string} interest Stored interest value.
 * @returns {string}          A NewsAPI category; `'general'` when unmapped.
 */
export const getNewsCategory = (interest) => {
  if (!interest || typeof interest !== 'string') return DEFAULT_NEWS_CATEGORY
  const normalized = interest.toLowerCase().trim()
  const topic = TOPICS.find((entry) => entry.value === normalized)
  return topic ? topic.newsCategory : DEFAULT_NEWS_CATEGORY
}

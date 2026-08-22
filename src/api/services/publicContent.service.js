import { apiClient } from '../client'

/**
 * Onboarding First Deck shows at most three curated options (FR-024).
 * Exported so the screen and this adapter cannot drift apart.
 */
export const OFFICIAL_DECK_PAGE_SIZE = 3

/**
 * Opt out of the client's global error toast for the two onboarding adapters
 * below (ONB-014). First Deck already distinguishes a browse failure from an
 * empty shelf, and gives `activation_failed` its own non-alarming copy because
 * the deck really is in the library — a generic red toast beside either one
 * destroys that distinction. Ordinary browse and library forks are untouched.
 */
const ONBOARDING_OWNS_ITS_ERRORS = { suppressErrorToast: true }

/**
 * Public Content Service
 * Handles all public content sharing API operations
 */
export const publicContentService = {
  /**
   * Browse public books
   * @param {Object} filters - Search filters
   * @returns {Promise<Object>} Paginated results
   */
  async browseBooks(filters = {}) {
    const params = new URLSearchParams()
    if (filters.search) params.append('search', filters.search)
    if (filters.category) params.append('category', filters.category)
    if (filters.tags?.length) params.append('tags', filters.tags.join(','))
    if (filters.language) params.append('language', filters.language)
    if (filters.difficulty) params.append('difficulty', filters.difficulty)
    if (filters.sort_by) params.append('sort_by', filters.sort_by)
    if (filters.skip) params.append('skip', filters.skip)
    if (filters.limit) params.append('limit', filters.limit)

    const { data } = await apiClient.get(`/public/books?${params}`)
    return data
  },

  /**
   * Browse public decks
   * @param {Object} filters - Search filters
   * @returns {Promise<Object>} Paginated results
   */
  async browseDecks(filters = {}) {
    const params = new URLSearchParams()
    if (filters.search) params.append('search', filters.search)
    if (filters.category) params.append('category', filters.category)
    if (filters.tags?.length) params.append('tags', filters.tags.join(','))
    if (filters.language) params.append('language', filters.language)
    if (filters.difficulty) params.append('difficulty', filters.difficulty)
    if (filters.sort_by) params.append('sort_by', filters.sort_by)
    if (filters.skip) params.append('skip', filters.skip)
    if (filters.limit) params.append('limit', filters.limit)

    const { data } = await apiClient.get(`/public/decks?${params}`)
    return data
  },

  /**
   * Browse the editorially approved official decks for one canonical topic
   * (ADR-004, FR-024).
   *
   * `official=true` and `sort_by=curated` travel together — the server rejects
   * `curated` without `official` with a `400`, and orders the page by ascending
   * editorial rank then stable deck id, never by popularity. `is_official` on
   * each item is server-derived and must be read, never assumed.
   *
   * An empty `items` with `total: 0` is a *successful* result meaning the topic
   * has no curated coverage yet. It is the expected state for most topics at
   * launch and must be rendered as empty, never as an error (NFR-018).
   *
   * @param {Object} options
   * @param {string} [options.category] - Canonical taxonomy topic (`deckCategory`)
   * @param {number} [options.page=1]
   * @param {number} [options.pageSize=3]
   * @returns {Promise<{items: Array, total: number, page: number, page_size: number, total_pages: number}>}
   */
  async browseOfficialDecks({ category, page = 1, pageSize = OFFICIAL_DECK_PAGE_SIZE } = {}) {
    const params = new URLSearchParams()
    if (category) params.append('category', category)
    params.append('official', 'true')
    params.append('sort_by', 'curated')
    params.append('page', String(page))
    params.append('page_size', String(pageSize))

    const { data } = await apiClient.get(`/public/decks?${params}`, ONBOARDING_OWNS_ITS_ERRORS)
    return data
  },

  /**
   * Fork a curated deck as the onboarding activation step (ADR-005, ADR-006).
   *
   * Unlike {@link publicContentService.forkDeck} this returns the whole
   * envelope, because the caller needs three separate facts:
   *
   * - `forkedDeck` — the private copy to navigate to.
   * - `created` — `false` marks an idempotent replay of a fork this user
   *   already owns. It is a success, not a duplicate attempt.
   * - `onboarding` — the *server's* activation verdict. It is present on the
   *   first completion **and on every replay**, so a client that lost the first
   *   response learns it is activated simply by repeating the request. This is
   *   the only trustworthy source of activation (FR-006); reaching a screen or
   *   generating cards with AI never activates.
   *
   * The idempotency key only correlates retries for diagnostics — uniqueness
   * rests on the server's durable `(deck, user)` key, so a lost or regenerated
   * key still cannot produce a second deck (NFR-017). Pass the *same* key for
   * every retry of one user-selected fork.
   *
   * @param {string} id - Source (public) deck ID
   * @param {string} [idempotencyKey] - UUID generated once per selected action
   * @returns {Promise<{created: boolean, forkedDeck: Object|null, onboarding: {status: string, activated_at: string}|null}>}
   */
  async forkDeckForOnboarding(id, idempotencyKey) {
    const config = idempotencyKey
      ? { ...ONBOARDING_OWNS_ITS_ERRORS, headers: { 'Idempotency-Key': idempotencyKey } }
      : { ...ONBOARDING_OWNS_ITS_ERRORS }

    const { data } = await apiClient.post(`/public/decks/${id}/fork`, { context: 'onboarding' }, config)

    return {
      created: Boolean(data?.created),
      forkedDeck: data?.forked_deck ?? null,
      onboarding: data?.onboarding ?? null
    }
  },

  /**
   * Get single public book by ID
   * @param {string} id - Book ID
   * @returns {Promise<Object>} Book object
   */
  async getPublicBook(id) {
    const { data } = await apiClient.get(`/public/books/${id}`)
    return data
  },

  /**
   * Get single public deck by ID
   * @param {string} id - Deck ID
   * @returns {Promise<Object>} Deck object
   */
  async getPublicDeck(id) {
    const { data } = await apiClient.get(`/public/decks/${id}`)
    return data
  },

  /**
   * Get cards for a public deck (preview)
   * @param {string} deckId - Deck ID
   * @param {Object} options - Query options (limit, etc.)
   * @returns {Promise<Object>} Cards list
   */
  async getDeckCards(deckId, options = {}) {
    const params = new URLSearchParams()
    if (options.limit) params.append('limit', options.limit)

    const { data } = await apiClient.get(`/decks/${deckId}/cards?${params}`)
    return data
  },

  /**
   * Get cards for a public deck without ownership required (browse preview)
   * @param {string} deckId - Deck ID
   * @param {number} limit - Max number of cards to return
   * @returns {Promise<Object>} Cards list
   */
  getPublicDeckCards: (deckId, limit = 6) => apiClient.get(`/public/decks/${deckId}/cards`, { params: { limit } }).then((r) => r.data),

  /**
   * Publish a book
   * @param {string} id - Book ID
   * @param {Object} metadata - Public metadata
   * @returns {Promise<Object>} Updated book
   */
  async publishBook(id, metadata) {
    const { data } = await apiClient.post(`/public/books/${id}/publish`, metadata)
    return data
  },

  /**
   * Publish a deck
   * @param {string} id - Deck ID
   * @param {Object} metadata - Public metadata
   * @returns {Promise<Object>} Updated deck
   */
  async publishDeck(id, metadata) {
    const { data } = await apiClient.post(`/public/decks/${id}/publish`, metadata)
    return data
  },

  /**
   * Unpublish a book
   * @param {string} id - Book ID
   * @returns {Promise<Object>} Updated book
   */
  async unpublishBook(id) {
    const { data } = await apiClient.post(`/public/books/${id}/unpublish`)
    return data
  },

  /**
   * Unpublish a deck
   * @param {string} id - Deck ID
   * @returns {Promise<Object>} Updated deck
   */
  async unpublishDeck(id) {
    const { data } = await apiClient.post(`/public/decks/${id}/unpublish`)
    return data
  },

  /**
   * Like a book
   * @param {string} id - Book ID
   * @returns {Promise<Object>} Result
   */
  async likeBook(id) {
    const { data } = await apiClient.post(`/public/books/${id}/like`)
    return data
  },

  /**
   * Unlike a book
   * @param {string} id - Book ID
   * @returns {Promise<Object>} Result
   */
  async unlikeBook(id) {
    const { data } = await apiClient.delete(`/public/books/${id}/like`)
    return data
  },

  /**
   * Like a deck
   * @param {string} id - Deck ID
   * @returns {Promise<Object>} Result
   */
  async likeDeck(id) {
    const { data } = await apiClient.post(`/public/decks/${id}/like`)
    return data
  },

  /**
   * Unlike a deck
   * @param {string} id - Deck ID
   * @returns {Promise<Object>} Result
   */
  async unlikeDeck(id) {
    const { data } = await apiClient.delete(`/public/decks/${id}/like`)
    return data
  },

  /**
   * Fork a book into the user's library.
   *
   * Idempotent on `(book, user)` (ADR-005). Re-forking replays the copy the
   * user already owns as `200 { created: false }` rather than the historical
   * `409 already_forked`, which ONB-014 removed so books and decks answer the
   * same client action the same way. Read `created` — never a `409` — to tell a
   * fresh fork from a replay.
   *
   * @param {string} id - Book ID
   * @returns {Promise<{created: boolean, content: Object|null}>}
   */
  async forkBook(id) {
    const { data } = await apiClient.post(`/public/books/${id}/fork`)
    return { created: Boolean(data?.created), content: data?.forked_book ?? null }
  },

  /**
   * Fork a deck into the user's library. Same idempotent contract as
   * {@link forkBook}; see its note on `created`.
   *
   * @param {string} id - Deck ID
   * @returns {Promise<{created: boolean, content: Object|null}>}
   */
  async forkDeck(id) {
    const { data } = await apiClient.post(`/public/decks/${id}/fork`)
    return { created: Boolean(data?.created), content: data?.forked_deck ?? null }
  },

  /**
   * Get user's liked content
   * @param {string} contentType - 'book' or 'deck' or 'all'
   * @returns {Promise<Array>} Liked content
   */
  async getMyLikes(contentType = 'all') {
    const params = contentType !== 'all' ? `?content_type=${contentType}` : ''
    const { data } = await apiClient.get(`/public/me/liked${params}`)
    return data
  },

  /**
   * Report content
   * @param {string} contentType - 'book' or 'deck'
   * @param {string} contentId - Content ID
   * @param {Object} report - Report data
   * @returns {Promise<Object>} Report result
   */
  async reportContent(contentType, contentId, report) {
    const { data } = await apiClient.post(`/moderation/report/${contentType}/${contentId}`, report)
    return data
  },

  /**
   * Get my reports
   * @returns {Promise<Array>} My reports
   */
  async getMyReports() {
    const { data } = await apiClient.get('/moderation/reports')
    return data
  }
}

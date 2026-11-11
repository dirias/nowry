import { apiClient } from '../client'
import { ENDPOINTS } from '../utils/endpoints'
import { libraryPageFromList } from '../../domain/books/libraryQuery'

// True once this session has learned its server has no `/book/library` (ADR-068).
let libraryRouteMissing = false
/** For tests: forget what was learned about the server. */
export const resetLibraryRoute = () => {
  libraryRouteMissing = false
}

/** How many documents the library asks for at a time. */
export const LIBRARY_PAGE_SIZE = 24

/** How long an import may take before the client gives up: five minutes. */
export const IMPORT_TIMEOUT_MS = 300000

/**
 * Books Service
 * Handles all book-related API operations
 */
export const booksService = {
  /**
   * Get all books for the current user
   * @returns {Promise<Array>} Array of books
   */
  async getAll() {
    const { data } = await apiClient.get(ENDPOINTS.books.all)
    return data
  },

  /**
   * One page of the library, with the counts the screen draws beside it (ADR-063).
   * The server filters, searches and orders; a client never holds the whole list.
   * @param {Object} question
   * @param {'all'|'written'|'imported'} [question.kind]
   * @param {string} [question.search]
   * @param {string[]} [question.tags]
   * @param {'edited'|'title'|'cards'} [question.sort]
   * @param {number} [question.offset]
   * @param {number} [question.limit]
   * @returns {Promise<{items: Array, total: number, offset: number, limit: number, counts: {all: number, written: number, imported: number}, tags: Array<{tag: string, count: number}>, continue_book: Object|null}>}
   */
  async getLibrary({ kind = 'all', search = '', tags = [], sort = 'edited', offset = 0, limit = LIBRARY_PAGE_SIZE } = {}) {
    const question = { kind, search, tags, sort, offset, limit }
    if (libraryRouteMissing) return libraryPageFromList(await this.getAll(), question)
    const params = new URLSearchParams({ kind, sort, offset: String(offset), limit: String(limit) })
    if (search.trim()) params.set('q', search.trim())
    tags.forEach((tag) => params.append('tags', tag))
    try {
      const { data } = await apiClient.get(`${ENDPOINTS.books.library}?${params.toString()}`)
      return data
    } catch (error) {
      // ADR-068: a server from before the paged library answers 404 here (the
      // path falls into its "book by id" route). The page must still open, so
      // the list route every server has is read instead, and remembered for
      // this session so each page does not pay for a failed request first.
      if (![404, 405].includes(error?.response?.status)) throw error
      libraryRouteMissing = true
      return libraryPageFromList(await this.getAll(), question)
    }
  },

  /**
   * Get a single book by ID
   * @param {string} id - Book ID
   * @returns {Promise<Object>} Book object with pages
   */
  async getById(id) {
    const { data } = await apiClient.get(ENDPOINTS.books.byId(id))
    return data
  },

  /**
   * The document's sections with their card counts (BOOK-001, docs/prd-book-cards.md FR-002).
   * @param {string} id - Book ID
   * @returns {Promise<{book_id: string, title: string, sections: Array<{index: number, heading: string, words: number, cards: number, changed: boolean, hash: string}>}>}
   */
  async getSections(id) {
    const { data } = await apiClient.get(`${ENDPOINTS.books.byId(id)}/sections`)
    return data
  },

  /**
   * Create a new book
   * @param {Object} bookData - Book data
   * @param {string} bookData.title - Book title
   * @param {string} bookData.author - Author name
   * @param {string} bookData.isbn - ISBN number
   * @returns {Promise<Object>} Created book
   */
  async create({ title, author, isbn }) {
    const { data } = await apiClient.post(ENDPOINTS.books.create, {
      title,
      author,
      isbn
    })
    return data
  },

  /**
   * Update an existing book
   * @param {string} id - Book ID
   * @param {Object} updates - Fields to update
   * @param {string} updates.title - Book title
   * @param {string} updates.coverColor - Cover color
   * @param {string} updates.coverImage - Cover image URL
   * @param {string} updates.summary - Book summary
   * @param {Array} updates.tags - Book tags
   * @param {boolean} updates.auto_save_enabled - Auto-save preference
   * @returns {Promise<Object>} Updated book
   */
  async update(
    id,
    { title, coverColor, coverImage, summary, tags, full_content, page_size, auto_save_enabled, last_section, reading_position }
  ) {
    const payload = {}

    // Only include fields that are defined
    if (title !== undefined) payload.title = title
    if (coverColor !== undefined) payload.cover_color = coverColor
    if (coverImage !== undefined) payload.cover_image = coverImage
    if (summary !== undefined) payload.summary = summary
    if (tags !== undefined) payload.tags = tags
    if (full_content !== undefined) payload.full_content = full_content
    if (page_size !== undefined) payload.page_size = page_size
    if (auto_save_enabled !== undefined) payload.auto_save_enabled = auto_save_enabled
    // The reading pointer (BOOK-005): a position-only update never bumps updated_at.
    if (last_section !== undefined) payload.last_section = last_section
    if (reading_position !== undefined) payload.reading_position = reading_position

    const { data } = await apiClient.put(ENDPOINTS.books.update(id), payload)
    return data
  },

  /**
   * Delete a book
   * @param {string} id - Book ID
   * @returns {Promise<void>}
   */
  async delete(id) {
    const { data } = await apiClient.delete(ENDPOINTS.books.delete(id))
    return data
  },

  /**
   * Search books by title
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} Array of matching books
   */
  async search(searchTerm) {
    const { data } = await apiClient.get(ENDPOINTS.books.search, {
      params: { title: searchTerm }
    })
    return data
  },

  /**
   * Import a book from file (PDF, DOCX, TXT)
   * @param {File} file - File to import
   * @param {string} username - Current user's username
   * @param {boolean} preview - If true, returns preview for validation
   * @param {string} title - Optional override title
   * @returns {Promise<Object>} Created book with pages or preview data
   */
  /**
   * Expand selected text using AI (all tiers; model quality varies by tier)
   * @param {string} bookId - Book ID (ownership verification)
   * @param {string} selectedText - Text to expand
   * @param {string} [instruction] - Optional custom instruction
   * @returns {Promise<{expanded_text: string}>}
   */
  async aiExpand(bookId, selectedText, instruction = '') {
    const { data } = await apiClient.post(
      ENDPOINTS.books.aiExpand(bookId),
      {
        selected_text: selectedText,
        ...(instruction ? { instruction } : {})
      },
      { timeout: 120000 }
    )
    return data
  },

  async importFile(file, username, preview = false, title = null, onDuplicate = 'ask') {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('username', username)
    formData.append('preview', preview.toString())
    if (title) formData.append('title', title)
    // ADR-066: a save says what to do with a file already in the library —
    // 'ask' is refused with 409 `import_duplicate` so the reader can be asked,
    // 'copy' imports it again. A preview only reports (`duplicate_of`).
    if (!preview) formData.append('on_duplicate', onDuplicate)
    // ADR-068: this client reads coded refusals; a client that does not say so gets a sentence.
    formData.append('error_format', 'coded')

    // An import uploads the file, parses it and stores its pictures inside one
    // request, which the 10-second default cannot cover: it gave up on a 1 MB
    // PDF with two dozen pictures while the server went on to create the book,
    // and the retry made a second copy (IMPORT-004).
    const { data } = await apiClient.post('/book/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: IMPORT_TIMEOUT_MS
    })
    return data
  }
}

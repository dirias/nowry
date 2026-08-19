import * as Sentry from '@sentry/react'
import { apiClient } from '../client'
import { ENDPOINTS } from '../utils/endpoints'
import { DEFAULT_CARD_GEN_PROMPT } from '../../constants/prompts'
import { auth } from '../../config/firebase.config'

// Same base-URL source as the Axios client (nowry/src/api/client/index.js)
const STREAM_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000'

// Stall detector: abort the stream if NO bytes (data or heartbeat) arrive for this long
const STREAM_STALL_MS = 30000

/**
 * Report a streaming failure to Sentry.
 * The fetch-based SSE path bypasses the Axios interceptors, so this is the
 * explicit capture point. No-op when Sentry is not initialized — same guard
 * as captureApiError in api/client/index.js.
 */
const captureStreamIssue = (errorOrMessage, tags = {}) => {
  if (!Sentry.getClient?.()) return
  const options = { tags: { api_error: true, sse_stream: true, ...tags } }
  if (errorOrMessage instanceof Error) {
    Sentry.captureException(errorOrMessage, options)
  } else {
    Sentry.captureMessage(errorOrMessage, options)
  }
}

/**
 * Replicates the Axios request interceptor's token logic
 * (api/client/index.js lines ~27-41) for the fetch-based SSE path:
 * getIdToken(false) → Authorization header + localStorage sync,
 * with a fallback to the cached localStorage token on failure.
 */
const buildStreamAuthHeaders = async () => {
  const headers = { 'Content-Type': 'application/json' }
  try {
    const firebaseUser = auth.currentUser
    if (firebaseUser) {
      // getIdToken(false) returns the cached token and silently refreshes
      // only when it is close to expiry (Firebase SDK internal threshold).
      const token = await firebaseUser.getIdToken(false)
      headers.Authorization = `Bearer ${token}`
      // Keep localStorage in sync for any code that still reads it directly
      localStorage.setItem('firebase_token', token)
    }
  } catch {
    // If we can't get a token, fall back to the cached localStorage value
    const cached = localStorage.getItem('firebase_token')
    if (cached) {
      headers.Authorization = `Bearer ${cached}`
    }
  }
  return headers
}

/**
 * Parse a single SSE frame into { event, data } or null.
 * Heartbeat/comment lines (starting with ':') are ignored.
 * Multi-line data fields are joined with '\n' per the SSE spec.
 */
const parseSseFrame = (frame) => {
  let event = 'message'
  const dataLines = []
  for (const rawLine of frame.split('\n')) {
    const line = rawLine.replace(/\r$/, '')
    if (!line || line.startsWith(':')) continue // heartbeat / comment
    if (line.startsWith('event:')) {
      event = line.slice(6).trim()
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart())
    }
  }
  if (dataLines.length === 0) return null
  return { event, data: dataLines.join('\n') }
}

/**
 * Study Cards Service
 * Handles AI-powered study card generation and manual CRUD
 */
export const cardsService = {
  /**
   * Generate study cards from text using AI
   * @param {string} sampleText - Text to generate cards from
   * @param {number} sampleNumber - Number of cards to generate
   * @param {string} prompt - Optional custom prompt for generation
   * @returns {Promise<Array>} Array of generated study cards
   */
  async generate(sampleText, sampleNumber, prompt = null, config = {}) {
    const generationPrompt = prompt || process.env.REACT_APP_CARD_GENERATION_PROMPT || DEFAULT_CARD_GEN_PROMPT

    const { data } = await apiClient.post(
      ENDPOINTS.studyCards.generate,
      {
        prompt: generationPrompt,
        sampleText,
        sampleNumber
      },
      config
    )

    return data
  },

  /**
   * Onboarding's explicit AI fallback (FR-032, FR-033).
   *
   * This is the *same* `/card/generate` endpoint with no onboarding semantics
   * added: it returns no activation block and writes no journey state. It
   * exists as a named adapter so the invariant is impossible to misread — the
   * only thing that activates onboarding is a verified curated deck fork
   * (ADR-006).
   *
   * Two rules bind every caller:
   * - Invoke it only from an explicit user action. It must never fire when the
   *   empty state opens or when a curated-deck load finishes with no results.
   * - Never treat a successful generation as onboarding completion. It stays
   *   incomplete, and once measurement ships it counts as fallback usage.
   *
   * @param {string} topicContext - Confirmed primary topic used as the
   *   user-visible source text for generation
   * @param {number} [cardCount=10] - Number of cards to request
   * @param {string|null} [prompt=null] - Optional custom generation prompt
   * @returns {Promise<Array>} Generated cards — never a journey state
   */
  async generateOnboardingFallback(topicContext, cardCount = 10, prompt = null) {
    // ONB-014: the empty state renders its own translated fallback error with a
    // retry, so the client's generic error toast is opted out of here — and only
    // here. Every other `generate` caller keeps it.
    return cardsService.generate(topicContext, cardCount, prompt, { suppressErrorToast: true })
  },

  /**
   * Generate study cards via the SSE streaming endpoint.
   * Cards are delivered incrementally through callbacks; terminal events
   * are `done` (success) and `error` (failure). Uses fetch (not Axios)
   * because Axios cannot consume ReadableStream bodies in the browser.
   *
   * @param {string} sampleText - Text to generate cards from (max 20000 chars)
   * @param {'auto'|number} countMode - 'auto' sends sampleNumber: null (adaptive
   *   count decided by the backend); an integer 1-50 requests a fixed count.
   * @param {string|null} prompt - Optional custom prompt for generation
   * @param {Object} handlers
   * @param {string[]} [handlers.excludeTitles] - Titles of already-generated cards
   *   to exclude ("Generate more" flow). Max 50, each ≤200 chars.
   * @param {(e: {index: number, total: number, card: {title: string, content: string}}) => void} handlers.onCard
   * @param {(e: {total_cards: number, elapsed_ms: number, mode: 'auto'|'fixed', cap: number, truncated: boolean}) => void} handlers.onDone
   * @param {(e: {code: string, status?: number, detail?: any}) => void} handlers.onError
   * @param {AbortSignal} [handlers.signal] - Abort signal for user cancellation
   */
  async generateStream(sampleText, countMode, prompt = null, { excludeTitles, onCard, onDone, onError, signal } = {}) {
    const generationPrompt = prompt || process.env.REACT_APP_CARD_GENERATION_PROMPT || DEFAULT_CARD_GEN_PROMPT
    const headers = await buildStreamAuthHeaders()

    const body = {
      prompt: generationPrompt,
      sampleText,
      sampleNumber: countMode === 'auto' ? null : countMode
    }
    if (Array.isArray(excludeTitles) && excludeTitles.length > 0) {
      body.excludeTitles = excludeTitles
    }

    let response
    try {
      response = await fetch(`${STREAM_BASE_URL}${ENDPOINTS.studyCards.generateStream}`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(body),
        signal
      })
    } catch (err) {
      // User cancellation is not an error
      if (err?.name === 'AbortError') return
      captureStreamIssue(err, { sse_error_code: 'NETWORK_ERROR' })
      onError?.({ code: 'NETWORK_ERROR' })
      return
    }

    // Pre-stream failures arrive as plain HTTP statuses with FastAPI JSON bodies
    if (!response.ok) {
      let detail
      try {
        const body = await response.json()
        detail = body?.detail
      } catch {
        detail = undefined
      }
      if (response.status === 401) {
        // Same session-expiry mechanism as the Axios response interceptor
        localStorage.removeItem('firebase_token')
        localStorage.removeItem('firebase_user')
        window.dispatchEvent(new CustomEvent('auth:unauthorized'))
      }
      if (response.status >= 500) {
        captureStreamIssue(`SSE pre-stream HTTP ${response.status}`, {
          sse_error_code: `HTTP_${response.status}`,
          status_code: response.status
        })
      }
      onError?.({ code: `HTTP_${response.status}`, status: response.status, detail })
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    let stallTimer = null
    let terminated = false

    const clearStallTimer = () => {
      if (stallTimer) {
        clearTimeout(stallTimer)
        stallTimer = null
      }
    }

    // Reset on EVERY reader chunk (heartbeats included) — fires only when the
    // connection goes silent for STREAM_STALL_MS with no terminal event.
    const resetStallTimer = () => {
      clearStallTimer()
      stallTimer = setTimeout(() => {
        terminated = true
        captureStreamIssue('SSE stream stalled (no bytes for 30s)', { sse_error_code: 'STREAM_STALLED' })
        onError?.({ code: 'STREAM_STALLED' })
        reader.cancel().catch(() => {})
      }, STREAM_STALL_MS)
    }

    const handleAbort = () => {
      clearStallTimer()
      reader.cancel().catch(() => {})
    }
    signal?.addEventListener('abort', handleAbort)

    // Dispatch one parsed frame. Returns true when the event was terminal.
    const dispatchFrame = (frame) => {
      const parsed = parseSseFrame(frame)
      if (!parsed) return false
      let data
      try {
        data = JSON.parse(parsed.data)
      } catch {
        // Unparseable frame: breadcrumb + skip — never crash the stream
        if (Sentry.getClient?.()) {
          Sentry.addBreadcrumb({
            category: 'sse',
            message: 'Skipped unparseable SSE frame',
            level: 'warning',
            data: { event: parsed.event }
          })
        }
        return false
      }
      if (parsed.event === 'card') {
        onCard?.(data)
        return false
      }
      if (parsed.event === 'done') {
        terminated = true
        onDone?.(data)
        return true
      }
      if (parsed.event === 'error') {
        terminated = true
        captureStreamIssue(`SSE error event: ${data?.code}`, { sse_error_code: data?.code || 'UNKNOWN' })
        onError?.(data)
        return true
      }
      return false
    }

    try {
      resetStallTimer()
      for (;;) {
        const { done, value } = await reader.read()
        if (terminated) return
        if (done) break
        resetStallTimer()
        buffer += decoder.decode(value, { stream: true })
        let separatorIndex
        while ((separatorIndex = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, separatorIndex)
          buffer = buffer.slice(separatorIndex + 2)
          if (dispatchFrame(frame)) {
            clearStallTimer()
            reader.cancel().catch(() => {})
            return
          }
        }
      }
      // Stream closed by the server without a terminal event — treat as a stall
      if (!terminated && !signal?.aborted) {
        captureStreamIssue('SSE stream closed without terminal event', { sse_error_code: 'STREAM_STALLED' })
        onError?.({ code: 'STREAM_STALLED' })
      }
    } catch (err) {
      if (terminated || signal?.aborted || err?.name === 'AbortError') return
      captureStreamIssue(err, { sse_error_code: 'NETWORK_ERROR' })
      onError?.({ code: 'NETWORK_ERROR' })
    } finally {
      clearStallTimer()
      signal?.removeEventListener('abort', handleAbort)
    }
  },

  /**
   * Generate flashcards from full book content (Plus+ only)
   * @param {string} bookId - Book ID
   * @returns {Promise<{cards: Array<{title: string, content: string}>}>}
   */
  async generateFromBook(bookId) {
    const { data } = await apiClient.post(
      ENDPOINTS.studyCards.generateFromBook,
      {
        book_id: bookId
      },
      { timeout: 120000 }
    )
    return data
  },

  /**
   * Run AI deck analysis: duplicates, gaps, rewrite suggestions (Pro only)
   * @param {string} deckId - Deck ID
   * @returns {Promise<{duplicates: Array, gaps: Array, rewrite_suggestions: Array}>}
   */
  async analyzeDeck(deckId) {
    const { data } = await apiClient.post(
      ENDPOINTS.studyCards.analyzeDeck,
      {
        deck_id: deckId
      },
      { timeout: 120000 }
    )
    return data
  },

  /**
   * Get paginated study cards
   * @param {number} skip - Offset for pagination
   * @param {number} limit - Number of cards to fetch
   * @param {string[]} tags - Optional tag filters (OR logic on backend)
   * @param {string} search - Optional search query (server-side, title/content/tags/deck)
   */
  async getAll(skip = 0, limit = 50, tags = [], search = '') {
    const params = new URLSearchParams({ skip, limit })
    tags.forEach((t) => params.append('tags', t))
    if (search) params.append('search', search)
    const { data } = await apiClient.get(`${ENDPOINTS.studyCards.all}?${params}`)
    return data
  },

  /**
   * Get all tags used across the user's cards with their counts
   * @returns {Promise<Array<{tag: string, count: number}>>}
   */
  async getTags() {
    const { data } = await apiClient.get('/study-cards/tags')
    return data
  },

  /**
   * Create a manual study card
   */
  async create(cardData) {
    const { data } = await apiClient.post(ENDPOINTS.studyCards.create, cardData)
    return data
  },

  /**
   * Update an existing card
   */
  async update(id, updates) {
    const { data } = await apiClient.patch(ENDPOINTS.studyCards.update(id), updates)
    return data
  },

  /**
   * Delete a card
   */
  async delete(id) {
    const { data } = await apiClient.delete(ENDPOINTS.studyCards.delete(id))
    return data
  },

  /**
   * Review a card with SM-2 grading
   * @param {string} id - Card ID
   * @param {string} grade - Grade: 'again', 'hard', 'good', or 'easy'
   * @param {string} [mode='study'] - Active session mode: 'study' or 'browse'.
   *   Only 'study' may grade/mutate the SM-2 schedule server-side; browse is
   *   rejected with 403 (defense-in-depth, D-06).
   */
  async review(id, grade, mode = 'study') {
    const { data } = await apiClient.post(`/study-cards/${id}/review?grade=${grade}&mode=${mode}`)
    return data
  },

  /**
   * Get due cards for a specific deck directly from the API
   * @param {string} deckId - Deck ID to fetch due cards for
   * @returns {Promise<Array>} Array of due study cards
   */
  async getDueCards(deckId) {
    const params = new URLSearchParams({ deck_id: deckId, due_only: 'true', limit: 500 })
    const { data } = await apiClient.get(`${ENDPOINTS.studyCards.all}?${params}`)
    return data.cards || []
  },

  /**
   * Get all cards for a deck regardless of due date (Browse mode)
   * @param {string} deckId - Deck ID to fetch all cards for
   * @returns {Promise<Array>} Array of every study card in the deck
   */
  async getAllCards(deckId) {
    const params = new URLSearchParams({ deck_id: deckId, due_only: 'false', limit: 500 })
    const { data } = await apiClient.get(`${ENDPOINTS.studyCards.all}?${params}`)
    return data.cards || []
  },

  /**
   * Get today's locked daily review session across all active decks.
   * The selection is sticky for the day on the backend (introduced_at stamp),
   * so the same cards reappear across sessions until graded.
   * @returns {Promise<Array>} Array of cards (new + due reviews) for today
   */
  async getDailyReviewCards() {
    const { data } = await apiClient.get('/study-cards/daily-review')
    return data.cards || []
  },

  /**
   * Get study statistics
   */
  async getStatistics() {
    const { data } = await apiClient.get('/study-cards/statistics')
    return data
  }
}

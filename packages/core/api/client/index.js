import axios from 'axios'
import { auth, env, notify, session, storage, telemetry } from '../../platform'

/**
 * Main API client instance with configured defaults.
 *
 * `baseURL` and `timeout` are NOT set here. This module is imported long before
 * a client finishes calling `configurePlatform()` — ES imports hoist above it —
 * so reading `env` at module scope would raise PlatformNotConfiguredError at
 * import time. They are applied in the request interceptor instead, which runs
 * per request and therefore always after configuration. Axios resolves both
 * when the request is dispatched, so the result is identical to setting them
 * here.
 */
export const apiClient = axios.create({
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // Enable sending cookies with requests
})

/**
 * Request interceptor
 * Uses Firebase SDK's getIdToken() so the token is auto-refreshed
 * whenever it is within 5 minutes of expiry — no polling needed.
 */
apiClient.interceptors.request.use(
  async (config) => {
    // Applied per request rather than at create time — see the note above.
    config.baseURL = env.apiUrl
    config.timeout = env.apiTimeout

    try {
      const firebaseUser = auth.currentUser()
      if (firebaseUser && !config.headers.Authorization) {
        // getIdToken(false) returns the cached token and silently refreshes
        // only when it is close to expiry (Firebase SDK internal threshold).
        const token = await auth.getIdToken(false)
        config.headers.Authorization = `Bearer ${token}`
        // Keep stored token in sync for any code that still reads it directly
        storage.set('firebase_token', token)
      }
    } catch {
      // If we can't get a token, fall back to the cached stored value
      const cached = storage.get('firebase_token')
      if (cached && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${cached}`
      }
    }
    return config
  },
  (error) => {
    console.error('Request error:', error)
    return Promise.reject(error)
  }
)

/**
 * Hand a user-visible notification to the client.
 *
 * The web client still dispatches the same `api:notify` CustomEvent that
 * NotificationContext listens for; that is now the web adapter's business
 * rather than this file's, which is what lets this interceptor run under a
 * client that has no DOM.
 */
const notifyUser = (message, severity = 'error') => {
  notify(message, severity)
}

/**
 * Report an API failure to Sentry with request metadata only.
 * Components catch these errors locally, so Sentry never sees them as
 * uncaught exceptions — this is the single, DRY capture point.
 * Never attaches request/response bodies (may contain user content).
 */
const captureApiError = (error) => {
  // Intentional cancellations (user navigated away, aborted request) are not errors
  if (axios.isCancel(error) || error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
    return
  }
  // The adapter no-ops when its SDK is not initialised.
  telemetry.captureException(error, {
    contexts: {
      api: {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        timeout: error.config?.timeout
      }
    },
    tags: {
      api_error: true,
      status_code: error.response?.status ?? 'network_or_timeout'
    }
  })
}

/**
 * Response interceptor — Handles global error cases
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Report every API failure to Sentry (handled or not) — single capture point
    captureApiError(error)

    // Classify the failing URL once — used by multiple error handlers below
    const errorUrl = error.config?.url || ''
    // Endpoints that manage their own error/loading UI — global toasts would duplicate feedback
    const isAiGenerationEndpoint =
      errorUrl.includes('generate-avatar') ||
      errorUrl.includes('generate-animation') ||
      errorUrl.includes('generate-from-book') ||
      errorUrl.includes('goal-ai')

    /*
     * ONB-014 — per-request opt-out, set by callers that render a differentiated
     * error state of their own.
     *
     * The onboarding journey is the reason this exists. Its screens map server
     * codes to specific, translated copy: a failed preference write is "Not
     * saved" with a retry pinned to that field, and `activation_failed` is
     * titled "Your deck is in your library" precisely because the deck *was*
     * added. A generic red "A server error occurred" toast fired beside either
     * one duplicates the first and flatly contradicts the second, which is what
     * FR-049 and NFR-018 forbid. Observed in the browser on a 500 from the fork
     * route, where both appeared at once.
     *
     * Opt-in rather than URL-matched so shared endpoints keep their global toast
     * for every other caller: `PUT /users/preferences/general` is silent when
     * onboarding and Account Settings call it, and unchanged everywhere else.
     */
    const ownsItsErrorUi = error.config?.suppressErrorToast === true
    const suppressGlobalToast = isAiGenerationEndpoint || ownsItsErrorUi

    // Handle request timeout — suppress for endpoints that surface their own error UI
    if (!suppressGlobalToast && (error.code === 'ECONNABORTED' || error.message?.includes('timeout'))) {
      notifyUser('Request timed out. Please check your connection and try again.', 'warning')
    }

    // Handle unauthorized (401) — Token expired or invalid
    if (error.response?.status === 401) {
      const url = error.config?.url || ''

      // /users/me is used as an auth probe on startup — a 401 there is expected
      // when not logged in. Do NOT redirect; just let AuthContext handle it.
      if (url.includes('/users/me')) {
        return Promise.reject(error)
      }

      console.warn('Unauthorized: Token expired or invalid. Logging out...')

      // Clearing the stored credentials is shared policy — both clients do it.
      storage.remove('firebase_token')
      storage.remove('firebase_user')

      /*
       * What the user then SEES is the client's business. The web adapter
       * dispatches `auth:unauthorized` for AuthContext and redirects to
       * /login?returnUrl=… unless the current path is already an auth page,
       * which is exactly what this block did inline before the move. Mobile
       * will reset navigation to its sign-in screen instead.
       */
      session.onUnauthorized({ redirect: true })
    }

    // Handle forbidden (403) — suppress for endpoints that open their own upgrade modal or error state
    if (error.response?.status === 403 && !suppressGlobalToast) {
      console.error('Forbidden: Insufficient permissions')
      notifyUser('You do not have permission to perform this action.', 'warning')
    }

    // Handle not found (404) — silent in production, debug-only log
    // 404 is expected for empty-state resources (no annual plan, no deck yet, etc.)
    // The calling hook is responsible for treating 404 as empty state, not an error.
    if (error.response?.status === 404) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[404] No resource at:', error.config?.url)
      }
    }

    // Handle server errors (5xx) — suppress for endpoints that surface their own error UI
    if (error.response?.status >= 500 && !suppressGlobalToast) {
      console.error('Server error:', error.response?.status)
      notifyUser('A server error occurred. Please try again later.', 'error')
    }

    return Promise.reject(error)
  }
)

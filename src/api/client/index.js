import axios from 'axios'
import * as Sentry from '@sentry/react'
import { auth } from '../../config/firebase.config'

// Get base URL from environment or use default
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000'

/**
 * Main API client instance with configured defaults
 */
export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: Number(process.env.REACT_APP_API_TIMEOUT) || 10000,
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
    try {
      const firebaseUser = auth.currentUser
      if (firebaseUser && !config.headers.Authorization) {
        // getIdToken(false) returns the cached token and silently refreshes
        // only when it is close to expiry (Firebase SDK internal threshold).
        const token = await firebaseUser.getIdToken(false)
        config.headers.Authorization = `Bearer ${token}`
        // Keep localStorage in sync for any code that still reads it directly
        localStorage.setItem('firebase_token', token)
      }
    } catch {
      // If we can't get a token, fall back to the cached localStorage value
      const cached = localStorage.getItem('firebase_token')
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
 * Dispatch a user-visible notification via a custom DOM event.
 * NotificationContext listens to this so the interceptor stays
 * framework-agnostic (no React imports needed here).
 */
const notifyUser = (message, severity = 'error') => {
  window.dispatchEvent(new CustomEvent('api:notify', { detail: { message, severity } }))
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
  // No-op when Sentry is not initialized (REACT_APP_SENTRY_DSN unset)
  if (!Sentry.getClient?.()) {
    return
  }
  Sentry.captureException(error, {
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

    // Handle request timeout — suppress for AI generation endpoints
    if (!isAiGenerationEndpoint && (error.code === 'ECONNABORTED' || error.message?.includes('timeout'))) {
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

      // Clear all authentication data
      localStorage.removeItem('firebase_token')
      localStorage.removeItem('firebase_user')

      // Dispatch a custom event that AuthContext can listen to
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))

      // Only redirect if not already on auth pages
      const currentPath = window.location.pathname
      const authPaths = ['/login', '/register', '/forgot-password', '/resetPassword']
      if (!authPaths.includes(currentPath)) {
        const returnUrl = encodeURIComponent(currentPath + window.location.search)
        window.location.href = `/login?returnUrl=${returnUrl}`
      }
    }

    // Handle forbidden (403) — suppress for AI generation endpoints that open their own upgrade modal
    if (error.response?.status === 403 && !isAiGenerationEndpoint) {
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

    // Handle server errors (5xx) — suppress for AI generation endpoints that surface their own error UI
    if (error.response?.status >= 500 && !isAiGenerationEndpoint) {
      console.error('Server error:', error.response?.status)
      notifyUser('A server error occurred. Please try again later.', 'error')
    }

    return Promise.reject(error)
  }
)

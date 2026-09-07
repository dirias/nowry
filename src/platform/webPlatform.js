/**
 * The web client's implementation of the `@nowry/core` platform port.
 *
 * This is the one file in the web app that knows the shared layer talks to a
 * browser. Every adapter here is a faithful wrapper over what the app already
 * does today, so wiring the port changes no behaviour:
 *
 *   - storage  → `localStorage`, unguarded, exactly as the current call sites use it
 *   - notify   → the same `api:notify` CustomEvent that NotificationContext listens for
 *   - auth     → the existing Firebase instance from `config/firebase.config`
 *   - env      → the same `REACT_APP_*` variables and the same fallbacks
 *
 * `localStorage` is deliberately NOT wrapped in try/catch here. It throws in
 * Safari private browsing, and the app has always had that behaviour; adding a
 * guard would be a fix, and a fix is not what a port is for. Callers that
 * already guard keep their guard.
 */
import * as Sentry from '@sentry/react'
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { auth as firebaseAuth } from '../config/firebase.config'
import { playPomodoroNotification, requestNotificationPermission, showBrowserNotification } from '../utils/pomodoroSound'

// Paths where a 401 redirect would bounce the user off the page that is trying
// to sign them in. Lifted verbatim from the response interceptor.
const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/resetPassword']

export const webPlatform = {
  storage: {
    get: (key) => localStorage.getItem(key),
    set: (key, value) => localStorage.setItem(key, value),
    remove: (key) => localStorage.removeItem(key)
  },

  /**
   * Dispatched rather than called directly so the shared layer stays free of
   * React. NotificationContext is the listener and renders the Snackbar.
   */
  notify: (message, severity = 'error') => {
    window.dispatchEvent(new CustomEvent('api:notify', { detail: { message, severity } }))
  },

  auth: {
    instance: () => firebaseAuth,
    currentUser: () => firebaseAuth.currentUser,
    /**
     * `getIdToken(false)` returns the cached token and silently refreshes only
     * when it is close to expiry, which is the behaviour the API client relies
     * on. Signed out resolves to null rather than throwing, so a caller can ask
     * without checking first.
     */
    getIdToken: async (forceRefresh = false) => {
      const user = firebaseAuth.currentUser
      return user ? user.getIdToken(forceRefresh) : null
    },

    /**
     * The one auth operation that cannot be shared (ADR-028). A popup has no
     * mobile equivalent; the mobile adapter will use expo-auth-session and
     * return the same credential shape.
     */
    signInWithGoogle: () => signInWithPopup(firebaseAuth, new GoogleAuthProvider())
  },

  /**
   * Sentry, guarded exactly as the shared capture points guarded it before the
   * move: a no-op when REACT_APP_SENTRY_DSN is unset and Sentry never
   * initialised.
   */
  telemetry: {
    captureException: (error, options) => {
      if (!Sentry.getClient?.()) return
      Sentry.captureException(error, options)
    },
    captureMessage: (message, options) => {
      if (!Sentry.getClient?.()) return
      Sentry.captureMessage(message, options)
    },
    addBreadcrumb: (breadcrumb) => {
      if (!Sentry.getClient?.()) return
      Sentry.addBreadcrumb(breadcrumb)
    }
  },

  /**
   * Session lifecycle. Behaviour here is byte-for-byte what the response
   * interceptor and authService.logout did before the move; the only change is
   * that the shared layer now says *what happened* and this file decides what
   * the browser does about it.
   */
  /**
   * The browser's sound and Notification APIs. `pomodoroSound` stays in the web
   * client precisely because it is these APIs; mobile will wire expo-av and
   * expo-notifications to the same three calls (MOB-024).
   */
  alerts: {
    play: () => playPomodoroNotification(),
    announce: (title, body) => showBrowserNotification(title, body),
    requestPermission: () => requestNotificationPermission()
  },

  session: {
    onUnauthorized: ({ redirect = false } = {}) => {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))
      if (!redirect) return
      const currentPath = window.location.pathname
      if (AUTH_PATHS.includes(currentPath)) return
      const returnUrl = encodeURIComponent(currentPath + window.location.search)
      window.location.href = `/login?returnUrl=${returnUrl}`
    },
    /** The other half of the same CustomEvent AuthContext has always listened for. */
    onUnauthorizedSubscribe: (handler) => {
      window.addEventListener('auth:unauthorized', handler)
      return () => window.removeEventListener('auth:unauthorized', handler)
    },
    onSignedOut: () => {
      window.location.href = '/login'
    }
  },

  env: {
    apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:8000',
    apiTimeout: Number(process.env.REACT_APP_API_TIMEOUT) || 10000,
    sentryDsn: process.env.REACT_APP_SENTRY_DSN
  }
}

export default webPlatform

import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { apiClient } from '../api/client'
import { authService } from '../api/services'
import { queryClient } from '../api/queryClient'
import { auth as authPort, session, storage } from '../platform'

/*
 * The i18next singleton, not the client's `i18n.js`. Both clients initialise
 * the same instance — the web with a browser language detector, mobile with
 * expo-localization — so shared code can change the language without knowing
 * which one set it up.
 */
import i18n from 'i18next'

const AuthContext = createContext(null)

/**
 * The last profile this device saw, so a cold start with no network has
 * something to restore. Erased on logout and on a 401/403 (MOB-069).
 */
const PROFILE_KEY = 'NOWRY_LAST_PROFILE'

const rememberProfile = (profile) => {
  try {
    if (profile) storage.set(PROFILE_KEY, JSON.stringify(profile))
  } catch {
    // A device that cannot write it simply has no offline profile.
  }
}

const forgetProfile = () => {
  try {
    storage.remove(PROFILE_KEY)
  } catch {
    // Nothing the caller can do; the in-memory user is already cleared.
  }
}

const lastProfile = () => {
  try {
    const raw = storage.get(PROFILE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const refreshingRef = useRef(false)

  /**
   * Fetch the backend user profile.
   * This MUST only be called after Firebase confirms a session exists
   * (i.e. inside onAuthStateChanged with a non-null firebaseUser).
   */
  const checkUser = async () => {
    try {
      const response = await apiClient.get('/users/me')
      setUser(response.data)
      rememberProfile(response.data)
      // Preferences are nested under preferences.general in the backend
      const lang = response.data?.preferences?.general?.language
      if (lang) {
        i18n.changeLanguage(lang)
      }
    } catch (error) {
      /*
       * Only the server saying no ends a session.
       *
       * This used to clear the user for ANY failure, and on a phone that is a
       * different rule than it is in a browser: a request that never reached
       * the server is a lift, a tunnel, or a laptop that changed Wi-Fi — not an
       * invalid session. Signing someone out for it also defeats the offline
       * work, because the persisted cache never gets a chance to serve what it
       * has; the login screen arrives first.
       *
       * 401 and 403 are the backend's answer that this session is not valid.
       * Everything else — no response at all, a 500, a timeout — leaves the
       * Firebase session alone and keeps whatever profile was last known.
       */
      const status = error?.response?.status
      if (status === 401 || status === 403) {
        setUser(null)
        forgetProfile()
      } else {
        /*
         * A COLD start with no network is the case the rule above does not
         * cover: keeping "whatever profile was last known" keeps nothing when
         * the app has only just launched and nothing is known yet. The result
         * was the login screen on a plane, for someone whose Firebase session
         * had restored perfectly well from disk (MOB-069).
         *
         * So the last profile is written down when it arrives and read back
         * when the request that would have fetched it cannot reach anyone. It
         * is the user's own profile on the user's own device, alongside the
         * decks and cards already persisted there, and it is erased on logout
         * and on the server saying the session is invalid.
         */
        setUser((current) => current ?? lastProfile())
      }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Gate ALL API calls on Firebase auth state resolution.
   *
   * onAuthStateChanged fires once immediately when the SDK has finished
   * restoring the previous session from IndexedDB.  Until that fires:
   *   - auth.currentUser is null
   *   - we must NOT call /users/me (would 401 with no token)
   *
   * If firebaseUser is non-null → we have a valid Firebase session, safe to call /users/me.
   * If firebaseUser is null    → no session; stop loading, leave user as null.
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(authPort.instance(), async (firebaseUser) => {
      if (firebaseUser) {
        // Firebase session is confirmed — now safe to fetch backend profile
        await checkUser()
      } else {
        // No Firebase session at all (new visit or after logout). Firebase
        // restores its own session from disk without a network, so this is a
        // genuine "not signed in" rather than an offline one — the offline
        // profile goes with it.
        setUser(null)
        forgetProfile()
        setLoading(false)
      }
    })

    // Cleanup listener on unmount
    return () => unsubscribe()
  }, [])

  // Listen for unauthorized events fired by the API interceptor
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null)
    }
    /*
     * The client announces a dead session; this listens. On the web that is the
     * same `auth:unauthorized` CustomEvent the API client has always dispatched,
     * now emitted by the web adapter rather than by shared code (MOB-003).
     */
    return session.onUnauthorizedSubscribe(handleUnauthorized)
  }, [])

  // Token refresh interval — redundant now that interceptor uses getIdToken(false),
  // kept as a safety net for long-running sessions (every 30 min)
  useEffect(() => {
    const interval = setInterval(
      async () => {
        if (!authPort.currentUser()) return
        if (refreshingRef.current) return
        try {
          refreshingRef.current = true
          const isExpired = await authService.isTokenExpired()
          if (isExpired) await authService.refreshToken()
        } catch (error) {
          console.error('[AuthContext] Token refresh failed:', error)
          setUser(null)
          storage.remove('firebase_token')
          session.onSignedOut()
        } finally {
          refreshingRef.current = false
        }
      },
      30 * 60 * 1000
    )

    return () => clearInterval(interval)
  }, [])

  const login = async (credentials) => {
    const result = await authService.login(credentials.email, credentials.password)
    // onAuthStateChanged will fire automatically after login and call checkUser()
    // We still call it explicitly here so the UI updates immediately without waiting
    await checkUser()
    return result
  }

  /**
   * Merge a partial profile into the cached user without a round trip.
   * Screens that save a field through PATCH /users/profile call this so
   * readers of `user` (the Home greeting, the header avatar) follow the
   * change immediately; a full `checkUser()` would clear the session on a
   * transient failure, which is the wrong price for a username edit.
   */
  const updateUser = (patch) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev))
  }

  const logout = async () => {
    try {
      await authService.logout()
    } catch (error) {
      console.error('Logout failed', error)
    } finally {
      // Clear ALL cached API data so the next user never sees stale data
      // from the previous session (tasks, plans, books, etc.) — every hook
      // reads through React Query now (ADR-008), so this is the single wipe.
      queryClient.clear()
      setUser(null)
      // The offline profile goes with the cache: the next person to open this
      // device must not be greeted by the last person's name.
      forgetProfile()
    }
  }

  // No JSX in @nowry/core (ADR-031) — react-scripts cannot transpile it here.
  return React.createElement(
    AuthContext.Provider,
    {
      value: {
        user,
        login,
        logout,
        checkUser,
        updateUser,
        loading,
        isAuthenticated: !!user,
        subscriptionTier: user?.subscription?.tier ?? 'free',
        subscriptionStatus: user?.subscription?.status ?? 'active'
      }
    },
    children
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

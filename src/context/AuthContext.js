import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../config/firebase.config'
import { apiClient } from '../api/client'
import { authService } from '../api/services'
import i18n from '../i18n'

const AuthContext = createContext(null)

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
      if (response.data?.preferences?.language) {
        i18n.changeLanguage(response.data.preferences.language)
      }
    } catch {
      // 401 here means the backend session is invalid despite a Firebase user existing.
      // Clear state; the onAuthStateChanged null branch will handle redirect.
      setUser(null)
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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Firebase session is confirmed — now safe to fetch backend profile
        await checkUser()
      } else {
        // No Firebase session at all (new visit or after logout)
        setUser(null)
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
    window.addEventListener('auth:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized)
  }, [])

  // Token refresh interval — redundant now that interceptor uses getIdToken(false),
  // kept as a safety net for long-running sessions (every 30 min)
  useEffect(() => {
    const interval = setInterval(
      async () => {
        if (!auth.currentUser) return
        if (refreshingRef.current) return
        try {
          refreshingRef.current = true
          const isExpired = await authService.isTokenExpired()
          if (isExpired) await authService.refreshToken()
        } catch (error) {
          console.error('[AuthContext] Token refresh failed:', error)
          setUser(null)
          localStorage.removeItem('firebase_token')
          window.location.href = '/login'
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

  const logout = async () => {
    try {
      await authService.logout()
    } catch (error) {
      console.error('Logout failed', error)
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, checkUser, loading, isAuthenticated: !!user }}>{children}</AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

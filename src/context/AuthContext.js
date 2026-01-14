import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { apiClient } from '../api/client'
import { authService } from '../api/services'
import i18n from '../i18n'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const refreshingRef = useRef(false) // Prevent concurrent refresh attempts

  // Initial user check - runs once on mount
  useEffect(() => {
    checkUser()
  }, [])

  // Listen for unauthorized events - runs once on mount
  useEffect(() => {
    const handleUnauthorized = () => {
      console.log('[AuthContext] Received unauthorized event, logging out user')
      setUser(null)
    }

    window.addEventListener('auth:unauthorized', handleUnauthorized)

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized)
    }
  }, [])

  // Token refresh interval - runs once on mount, checks every 30 minutes
  useEffect(() => {
    const tokenRefreshInterval = setInterval(
      async () => {
        // Only refresh if we have a token
        const token = localStorage.getItem('firebase_token')
        if (!token) return

        // Prevent concurrent refresh attempts
        if (refreshingRef.current) {
          console.log('[AuthContext] Token refresh already in progress, skipping')
          return
        }

        try {
          refreshingRef.current = true
          const isExpired = await authService.isTokenExpired()

          if (isExpired) {
            console.log('[AuthContext] Token expired or expiring soon, refreshing...')
            await authService.refreshToken()
          }
        } catch (error) {
          console.error('[AuthContext] Token refresh check failed:', error)
          // If refresh fails, log out the user
          setUser(null)
          localStorage.removeItem('firebase_token')
          window.location.href = '/login'
        } finally {
          refreshingRef.current = false
        }
      },
      30 * 60 * 1000
    ) // Check every 30 minutes

    return () => {
      clearInterval(tokenRefreshInterval)
    }
  }, []) // Empty array - only run once on mount

  const checkUser = async () => {
    try {
      const response = await apiClient.get('/users/me')
      setUser(response.data)
      if (response.data?.preferences?.language) {
        i18n.changeLanguage(response.data.preferences.language)
      }
    } catch (error) {
      // If 401, it just means not logged in
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (credentials) => {
    // Perform login with Firebase via authService
    // credentials should contain email and password
    const result = await authService.login(credentials.email, credentials.password)
    // After login, fetch user profile to populate state
    await checkUser()
    return result
  }

  const logout = async () => {
    try {
      // Logout from Firebase client-side
      await authService.logout()
    } catch (error) {
      console.error('Logout failed', error)
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, checkUser, loading, isAuthenticated: !!user }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

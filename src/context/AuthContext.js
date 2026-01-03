import React, { createContext, useContext, useState, useEffect } from 'react'
import { apiClient } from '../api/client'
import i18n from '../i18n'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUser()
  }, [])

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
    // Perform login request - cookie is set by server
    const response = await apiClient.post('/session/login', credentials)
    // After login, fetch user profile to populate state
    await checkUser()
    return response.data
  }

  const logout = async () => {
    try {
      await apiClient.post('/session/logout')
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

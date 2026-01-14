import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth'
import { auth } from '../../config/firebase.config'
import { apiClient } from '../client'

/**
 * Auth Service with Firebase Authentication
 * Handles authentication and session operations
 */
export const authService = {
  /**
   * Register a new user with Firebase and sync to backend
   * @param {string} email
   * @param {string} password
   * @param {string} username
   * @returns {Promise<Object>} User data
   */
  async register(email, password, username) {
    try {
      // Create user in Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Update display name
      await updateProfile(user, { displayName: username })

      // Get Firebase ID token
      const idToken = await user.getIdToken()

      // Sync user to backend MongoDB
      const { data } = await apiClient.post(
        '/auth/register',
        {
          firebase_uid: user.uid,
          email: user.email,
          username: username
        },
        {
          headers: {
            Authorization: `Bearer ${idToken}`
          }
        }
      )

      return {
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName
        },
        token: idToken,
        backendUser: data
      }
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    }
  },

  /**
   * Log in a user with Firebase
   * @param {string} email
   * @param {string} password
   * @returns {Promise<Object>} User session data
   */
  async login(email, password) {
    try {
      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Get Firebase ID token
      const idToken = await user.getIdToken()

      // Sync/verify user with backend
      const { data } = await apiClient.post(
        '/auth/login', // Use new Firebase auth endpoint
        {
          firebase_uid: user.uid,
          email: user.email
        },
        {
          headers: {
            Authorization: `Bearer ${idToken}`
          }
        }
      )

      // Store token in localStorage for API calls
      localStorage.setItem('firebase_token', idToken)

      return {
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          emailVerified: user.emailVerified
        },
        token: idToken,
        backendUser: data
      }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  },

  /**
   * Sign in with Google OAuth
   * @returns {Promise<Object>} User session data
   */
  async loginWithGoogle() {
    try {
      const provider = new GoogleAuthProvider()
      const userCredential = await signInWithPopup(auth, provider)
      const user = userCredential.user

      // Get Firebase ID token
      const idToken = await user.getIdToken()

      // Sync/create user in backend
      const { data } = await apiClient.post(
        '/auth/register',
        {
          firebase_uid: user.uid,
          email: user.email,
          username: user.displayName || user.email.split('@')[0]
        },
        {
          headers: {
            Authorization: `Bearer ${idToken}`
          }
        }
      )

      localStorage.setItem('firebase_token', idToken)

      return {
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        },
        token: idToken,
        backendUser: data
      }
    } catch (error) {
      console.error('Google login error:', error)
      throw error
    }
  },

  /**
   * Log out the current user
   */
  async logout() {
    try {
      await signOut(auth)
      localStorage.removeItem('firebase_token')
      sessionStorage.removeItem('onboarding_skipped')
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    }
  },

  /**
   * Send password reset email
   * @param {string} email
   * @param {string} langCode - Optional language code (e.g., 'es', 'fr')
   */
  async resetPassword(email, langCode = 'en') {
    try {
      auth.languageCode = langCode
      await sendPasswordResetEmail(auth, email)
      return { message: 'Password reset email sent' }
    } catch (error) {
      console.error('Password reset error:', error)
      throw error
    }
  },

  /**
   * Get current Firebase user
   * @returns {Object|null} Current user or null
   */
  getCurrentUser() {
    return auth.currentUser
  },

  /**
   * Get current Firebase ID token
   * @param {boolean} forceRefresh - Force token refresh
   * @returns {Promise<string>} ID token
   */
  async getIdToken(forceRefresh = false) {
    const user = auth.currentUser
    if (!user) {
      throw new Error('No user logged in')
    }
    return await user.getIdToken(forceRefresh)
  },

  /**
   * Refresh the Firebase ID token and update localStorage
   * @returns {Promise<string>} New ID token
   */
  async refreshToken() {
    try {
      const user = auth.currentUser
      if (!user) {
        throw new Error('No user logged in')
      }

      // Force refresh the token
      const newToken = await user.getIdToken(true)

      // Update localStorage
      localStorage.setItem('firebase_token', newToken)

      console.log('[AuthService] Token refreshed successfully')
      return newToken
    } catch (error) {
      console.error('[AuthService] Token refresh failed:', error)
      throw error
    }
  },

  /**
   * Check if current token is expired or about to expire
   * @returns {Promise<boolean>} True if token needs refresh
   */
  async isTokenExpired() {
    try {
      const user = auth.currentUser
      if (!user) return true

      // Get token result with expiration time
      const tokenResult = await user.getIdTokenResult()
      const expirationTime = new Date(tokenResult.expirationTime).getTime()
      const currentTime = Date.now()

      // Check if token expires in less than 5 minutes
      const fiveMinutes = 5 * 60 * 1000
      const isExpiringSoon = expirationTime - currentTime < fiveMinutes

      return isExpiringSoon
    } catch (error) {
      console.error('[AuthService] Error checking token expiration:', error)
      return true
    }
  }
}

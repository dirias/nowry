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
   */
  async resetPassword(email) {
    try {
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
   * @returns {Promise<string>} ID token
   */
  async getIdToken() {
    const user = auth.currentUser
    if (!user) {
      throw new Error('No user logged in')
    }
    return await user.getIdToken()
  }
}

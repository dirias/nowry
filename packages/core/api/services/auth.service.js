import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, updateProfile } from 'firebase/auth'
import { auth as authPort, session, storage } from '../../platform'
import { apiClient } from '../client'

/*
 * Both clients run the same Firebase JS SDK (ADR-028) and differ only in how
 * they construct the Auth object, so the operations above are shared and the
 * instance arrives through the port. `signInWithPopup` is the exception: it has
 * no mobile equivalent, so Google sign-in is a port capability that the web
 * adapter implements with a popup and the mobile adapter will implement with
 * expo-auth-session. Callers keep one function name either way.
 */
const firebaseAuth = () => authPort.instance()

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
      const userCredential = await createUserWithEmailAndPassword(firebaseAuth(), email, password)
      const user = userCredential.user

      // Update display name
      await updateProfile(user, { displayName: username })

      // Get Firebase ID token — force a refresh so the token carries the
      // displayName claim we just set via updateProfile(); an unforced
      // getIdToken() can return the stale pre-update token, which has no
      // `name` claim and causes the backend to fall back to an
      // email-derived username instead of the one the user typed.
      const idToken = await user.getIdToken(true)

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
      const userCredential = await signInWithEmailAndPassword(firebaseAuth(), email, password)
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

      // Store the token for API calls
      storage.set('firebase_token', idToken)

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
      const userCredential = await authPort.signInWithGoogle()
      const user = userCredential.user

      // Get Firebase ID token
      const idToken = await user.getIdToken()

      // Sync/create user in backend
      const { data } = await apiClient.post(
        '/auth/register',
        {
          firebase_uid: user.uid,
          email: user.email,
          username: user.displayName || user.email.split('@')[0],
          photo_url: user.photoURL
        },
        {
          headers: {
            Authorization: `Bearer ${idToken}`
          }
        }
      )

      storage.set('firebase_token', idToken)

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
      await signOut(firebaseAuth())
      storage.remove('firebase_token')
      // No `onboarding_skipped` cleanup: nothing reads that flag any more. Whether
      // onboarding is offered again is the server's answer now (ONB-012, ADR-007),
      // so there is no local suppression state left for logout to reset.
      session.onSignedOut()
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
      firebaseAuth().languageCode = langCode
      await sendPasswordResetEmail(firebaseAuth(), email)
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
    return authPort.currentUser()
  },

  /**
   * Get current Firebase ID token
   * @param {boolean} forceRefresh - Force token refresh
   * @returns {Promise<string>} ID token
   */
  async getIdToken(forceRefresh = false) {
    const user = authPort.currentUser()
    if (!user) {
      throw new Error('No user logged in')
    }
    return await user.getIdToken(forceRefresh)
  },

  /**
   * Refresh the Firebase ID token and update stored state
   * @returns {Promise<string>} New ID token
   */
  async refreshToken() {
    try {
      const user = authPort.currentUser()
      if (!user) {
        throw new Error('No user logged in')
      }

      // Force refresh the token
      const newToken = await user.getIdToken(true)

      // Update stored state
      storage.set('firebase_token', newToken)

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
      const user = authPort.currentUser()
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

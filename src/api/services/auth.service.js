import { apiClient } from '../client'

/**
 * Auth Service
 * Handles authentication and session operations
 */
export const authService = {
  /**
   * Log in a user
   * @param {string} email
   * @param {string} password
   * @returns {Promise<Object>} User session data
   */
  async login(email, password) {
    // Try sending as a standard JSON object first
    const payload = { email, password }
    console.log('Attempting login with JSON payload:', payload)

    try {
      const { data } = await apiClient.post('/session/login', payload)
      return data
    } catch (error) {
      if (error.response?.status === 422) {
        console.warn('JSON login failed with 422, trying Form Data (urlencoded)...')

        // Fallback: Try Form Urlencoded (very common for FastAPI /session/login)
        const params = new URLSearchParams()
        params.append('email', email)
        params.append('password', password)

        const { data } = await apiClient.post('/session/login', params, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        })
        return data
      }
      throw error
    }
  },

  /**
   * Log out the current user
   */
  logout() {
    // Session is handled by HttpOnly cookie
    window.location.href = '/login'
  }
}

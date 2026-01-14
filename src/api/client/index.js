import axios from 'axios'

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
 * Adds Firebase token from localStorage to Authorization header
 */
apiClient.interceptors.request.use(
  (config) => {
    // Get Firebase token from localStorage
    const firebaseToken = localStorage.getItem('firebase_token')

    // Add Authorization header if token exists and not already set
    if (firebaseToken && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${firebaseToken}`
    }

    return config
  },
  (error) => {
    console.error('Request error:', error)
    return Promise.reject(error)
  }
)

/**
 * Response interceptor - Handles global error cases
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle unauthorized (401) - Token expired or invalid
    if (error.response?.status === 401) {
      console.warn('Unauthorized: Token expired or invalid. Logging out...')

      // Clear all authentication data
      localStorage.removeItem('firebase_token')
      localStorage.removeItem('firebase_user')

      // Dispatch a custom event that AuthContext can listen to
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))

      // Only redirect if not already on auth pages
      const currentPath = window.location.pathname
      const authPaths = ['/login', '/register', '/forgot-password']
      if (!authPaths.includes(currentPath)) {
        // Redirect to login with return URL
        const returnUrl = encodeURIComponent(currentPath + window.location.search)
        window.location.href = `/login?returnUrl=${returnUrl}`
      }
    }

    // Handle forbidden (403) - User doesn't have permission
    if (error.response?.status === 403) {
      console.error('Forbidden: Insufficient permissions')
    }

    // Handle not found (404)
    if (error.response?.status === 404) {
      console.error('Resource not found:', error.config?.url)
    }

    // Handle server errors (5xx)
    if (error.response?.status >= 500) {
      console.error('Server error:', error.response?.status)
    }

    return Promise.reject(error)
  }
)

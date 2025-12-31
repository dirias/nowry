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
 * Note: Authorization header is no longer needed as we use HttpOnly cookies
 */
apiClient.interceptors.request.use(
  (config) => {
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
    // Handle unauthorized - redirect to login logic is handled by AuthContext or components
    if (error.response?.status === 401) {
      console.warn('Unauthorized - auth cookie might be missing or expired')
    }

    // Handle other common errors
    if (error.response?.status === 404) {
      console.error('Resource not found:', error.config?.url)
    }

    if (error.response?.status >= 500) {
      console.error('Server error:', error.response?.status)
    }

    return Promise.reject(error)
  }
)

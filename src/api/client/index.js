/* eslint-env es6 */
import axios from 'axios'

// Get base URL from environment or use default
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

/**
 * Main API client instance with configured defaults
 */
export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

/**
 * Request interceptor - Adds authentication token to all requests
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
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
    // Handle unauthorized - clear token and redirect to login
    if (error.response?.status === 401) {
      console.warn('Unauthorized - clearing auth token')
      localStorage.removeItem('authToken')
      // Optionally redirect to login
      // window.location.href = '/login'
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

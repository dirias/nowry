import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Box, CircularProgress } from '@mui/joy'

/**
 * ProtectedRoute Component
 * Prevents unauthorized access to protected routes
 * Shows nothing while checking auth, then either renders content or redirects
 */
export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  // While checking authentication, show loading spinner
  // This prevents any content from flashing before redirect
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          width: '100vw',
          bgcolor: 'background.body'
        }}
      >
        <CircularProgress size='lg' />
      </Box>
    )
  }

  // If not authenticated, redirect to login with return URL
  if (!isAuthenticated) {
    const returnUrl = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?returnUrl=${returnUrl}`} replace />
  }

  // User is authenticated, render the protected content
  return children
}

/**
 * PublicOnlyRoute Component
 * Redirects authenticated users away from auth pages (login, register)
 */
export const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  // While checking authentication, show loading spinner
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          width: '100vw',
          bgcolor: 'background.body'
        }}
      >
        <CircularProgress size='lg' />
      </Box>
    )
  }

  // If authenticated, redirect to return URL or home
  if (isAuthenticated) {
    const params = new URLSearchParams(location.search)
    const returnUrl = params.get('returnUrl') || '/'
    return <Navigate to={returnUrl} replace />
  }

  // User is not authenticated, render the public content
  return children
}

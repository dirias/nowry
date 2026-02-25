import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { Snackbar, Alert } from '@mui/joy'

const NotificationContext = createContext(null)

/**
 * NotificationProvider
 * Listens to the global 'api:notify' CustomEvent dispatched by the API client
 * interceptor (which can't import React context directly) and shows a Joy UI Snackbar.
 */
export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState(null) // { message, severity }

  const showNotification = useCallback((message, severity = 'error') => {
    setNotification({ message, severity })
  }, [])

  // Listen for events dispatched by the API interceptor
  useEffect(() => {
    const handleApiNotify = (e) => {
      const { message, severity } = e.detail || {}
      if (message) showNotification(message, severity)
    }
    window.addEventListener('api:notify', handleApiNotify)
    return () => window.removeEventListener('api:notify', handleApiNotify)
  }, [showNotification])

  const handleClose = () => setNotification(null)

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <Snackbar
        open={!!notification}
        autoHideDuration={5000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ zIndex: 9999 }}
      >
        {notification && (
          <Alert
            variant='solid'
            color={notification.severity === 'warning' ? 'warning' : notification.severity === 'error' ? 'danger' : 'neutral'}
            onClose={handleClose}
          >
            {notification.message}
          </Alert>
        )}
      </Snackbar>
    </NotificationContext.Provider>
  )
}

export const useNotification = () => {
  const context = useContext(NotificationContext)
  if (!context) throw new Error('useNotification must be used within a NotificationProvider')
  return context
}

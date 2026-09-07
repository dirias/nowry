/**
 * NotificationProvider — the web client's notification surface.
 *
 * The state lives in `@nowry/core/context/useNotificationState`; this file is
 * the two things that cannot be shared: the Joy Snackbar it renders, and the
 * `api:notify` CustomEvent it listens for, which is how the web platform
 * adapter delivers a message from code that has no React in scope.
 */
import React, { createContext, useContext, useEffect } from 'react'
import { Snackbar, Alert } from '@mui/joy'
import { useNotificationState } from '@nowry/core/context/useNotificationState'

const NotificationContext = createContext(null)

export const NotificationProvider = ({ children }) => {
  const { notification, showNotification, dismiss } = useNotificationState()

  // The web adapter's transport. Unchanged from before the split.
  useEffect(() => {
    const handleApiNotify = (e) => {
      const { message, severity } = e.detail || {}
      if (message) showNotification(message, severity)
    }
    window.addEventListener('api:notify', handleApiNotify)
    return () => window.removeEventListener('api:notify', handleApiNotify)
  }, [showNotification])

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <Snackbar
        open={!!notification}
        autoHideDuration={5000}
        onClose={dismiss}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ zIndex: 9999 }}
      >
        {notification && (
          <Alert
            variant='solid'
            color={notification.severity === 'warning' ? 'warning' : notification.severity === 'error' ? 'danger' : 'neutral'}
            onClose={dismiss}
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

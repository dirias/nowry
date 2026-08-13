import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App'
import { CssVarsProvider, CssBaseline } from '@mui/joy'
import './index.css'
import './i18n' // Initialize i18n

// Initialize Sentry BEFORE rendering the app — gated on env var presence
if (process.env.REACT_APP_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.REACT_APP_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false
      })
    ],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0
  })
}

// Suppress benign ResizeObserver error to prevent runtime crash overlay
const resizeObserverLoopErr = /ResizeObserver loop completed with undelivered notifications/
window.addEventListener('error', (e) => {
  if (resizeObserverLoopErr.test(e.message)) {
    e.stopImmediatePropagation()
  }
})

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <Sentry.ErrorBoundary showDialog>
      <CssVarsProvider defaultMode='system' disableTransitionOnChange>
        <CssBaseline />
        <App />
      </CssVarsProvider>
    </Sentry.ErrorBoundary>
  </React.StrictMode>
)

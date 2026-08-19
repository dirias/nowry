import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App'
import { CssVarsProvider, CssBaseline } from '@mui/joy'
import './index.css'
import './i18n' // Initialize i18n

// Sentry environment.
//
// NODE_ENV is NOT usable here: Create React App sets it to 'production' for
// every optimised build, so the dev deployment and the production deployment
// both reported as "production" and their issues were indistinguishable.
// REACT_APP_ENVIRONMENT must be set per deployment target (Vercel → Settings →
// Environment Variables, scoped to each environment). Falling back to
// 'unknown' rather than NODE_ENV keeps a misconfiguration visible in Sentry
// instead of silently mislabelling dev errors as production ones.
const SENTRY_ENVIRONMENT = process.env.REACT_APP_ENVIRONMENT || 'unknown'
const IS_PRODUCTION_ENV = SENTRY_ENVIRONMENT === 'production'

// Initialize Sentry BEFORE rendering the app — gated on env var presence
if (process.env.REACT_APP_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.REACT_APP_SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    tracesSampleRate: IS_PRODUCTION_ENV ? 0.1 : 1.0,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false
      })
    ],
    // Replay envelopes are large and quota is limited. Capturing 100% of
    // errored sessions exhausted the monthly replay allowance during a single
    // debugging session (Sentry then returns 429 and drops events), so error
    // replays are sampled rather than absolute. Non-production environments
    // error constantly by nature and get the smaller share.
    replaysSessionSampleRate: IS_PRODUCTION_ENV ? 0.1 : 0,
    replaysOnErrorSampleRate: IS_PRODUCTION_ENV ? 0.2 : 0.05
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

/**
 * Error reporting for the mobile client (MOB-008).
 *
 * The shared API client has one capture point and calls through the port; this
 * is the mobile end of it, as `src/platform/webPlatform.js` is the web end.
 * Neither SDK can be imported by @nowry/core: the web runs @sentry/react and
 * this runs @sentry/react-native, and each would break the other's bundle.
 *
 * Every method no-ops until `initTelemetry` has run with a DSN, so a build with
 * no Sentry configured is silent rather than broken.
 */
import Constants from 'expo-constants'
import * as Sentry from '@sentry/react-native'

let started = false

export const initTelemetry = () => {
  const dsn = Constants.expoConfig?.extra?.sentryDsn
  if (!dsn || started) return
  Sentry.init({
    dsn,
    // Matches the web client's reasoning: full sampling outside production
    // would exhaust the quota, and non-production environments error by nature.
    environment: __DEV__ ? 'development' : 'production',
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
    enableAutoSessionTracking: true
  })
  started = true
}

export const mobileTelemetry = {
  captureException: (error, options) => {
    if (!started) return
    Sentry.captureException(error, options)
  },
  captureMessage: (message, options) => {
    if (!started) return
    Sentry.captureMessage(message, options)
  },
  addBreadcrumb: (breadcrumb) => {
    if (!started) return
    Sentry.addBreadcrumb(breadcrumb)
  }
}

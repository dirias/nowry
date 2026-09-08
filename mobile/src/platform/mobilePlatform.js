/**
 * The mobile client's implementation of the @nowry/core platform port.
 *
 * The counterpart of `nowry/src/platform/webPlatform.js`. Between them they are
 * the only two files that know the shared layer runs somewhere in particular.
 */
import Constants from 'expo-constants'
import { auth as firebaseAuth, signInWithGoogle } from './firebase'
import { publishNotification, publishUnauthorized, subscribeToUnauthorized } from './notifications'
import { mobileStorage } from './storage'
import { mobileTelemetry } from './telemetry'

const extra = Constants.expoConfig?.extra ?? {}

export const mobilePlatform = {
  storage: mobileStorage,

  notify: (message, severity = 'error') => publishNotification(message, severity),

  auth: {
    instance: () => firebaseAuth,
    currentUser: () => firebaseAuth.currentUser,
    getIdToken: async (forceRefresh = false) => {
      const user = firebaseAuth.currentUser
      return user ? user.getIdToken(forceRefresh) : null
    },
    signInWithGoogle
  },

  env: {
    apiUrl: extra.apiUrl || 'http://localhost:8000',
    apiTimeout: Number(extra.apiTimeout) || 10000,
    sentryDsn: extra.sentryDsn
  },

  telemetry: mobileTelemetry,

  /**
   * What a dead session means here. The web adapter redirects the browser; this
   * announces, and the navigation reset arrives with the router in MOB-015.
   * `redirect` is accepted and currently ignored, which keeps the shared call
   * sites identical across clients.
   */
  session: {
    onUnauthorized: () => publishUnauthorized(),
    onUnauthorizedSubscribe: subscribeToUnauthorized,
    onSignedOut: () => publishUnauthorized()
  },

  /**
   * Sound and OS-level notifications. Real behaviour arrives with the focus
   * timer in MOB-024, which brings expo-av and expo-notifications; until then
   * these exist so the port is satisfiable and nothing pretends otherwise.
   */
  alerts: {
    play: () => {},
    announce: () => {},
    requestPermission: async () => 'undetermined'
  }
}

export default mobilePlatform

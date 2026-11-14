/**
 * What the phone says about itself for a bug report (BUG-001, FR-007, board H):
 * the system and its version, the model, and the app's version with its build.
 *
 * Read from what the app already carries — React Native's `Platform.constants`
 * and `expo-constants` — so nothing native is added for it. Anything the phone
 * does not say is left out rather than guessed.
 */
import { Platform } from 'react-native'
import Constants from 'expo-constants'

export function deviceInfo() {
  const constants = Platform.constants ?? {}
  const android = Platform.OS === 'android'
  return {
    os: android ? 'android' : 'ios',
    osVersion: android ? constants.Release : Platform.Version,
    model: android ? [constants.Manufacturer, constants.Model].filter(Boolean).join(' ') || undefined : undefined,
    appVersion: Constants.expoConfig?.version,
    // The store build number lives in the native manifest, not the JS config (EAS sets it remotely).
    build: android ? Constants.platform?.android?.versionCode : Constants.platform?.ios?.buildNumber
  }
}

export default deviceInfo

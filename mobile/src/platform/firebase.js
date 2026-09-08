/**
 * Firebase for the mobile client.
 *
 * The same JS SDK the web client runs (ADR-028); only the construction differs.
 * Two things matter here and both fail silently when wrong:
 *
 *   1. `initializeAuth` with explicit persistence, NOT `getAuth`. `getAuth`
 *      gives in-memory persistence on React Native, so a signed-in user is
 *      signed out by every cold start and nothing warns you.
 *
 *   2. `getReactNativePersistence` only exists in Firebase's React Native
 *      build, which Metro selects through the package's `react-native` field.
 *      It is unavailable under Node and webpack, which is exactly why this file
 *      lives in the mobile client and not in @nowry/core.
 */
import Constants from 'expo-constants'
import { initializeApp } from 'firebase/app'
import { GoogleAuthProvider, getReactNativePersistence, initializeAuth } from 'firebase/auth'
import { firebasePersistenceStore } from './storage'
import { signInWithGoogle as googleSignIn } from './googleSignIn'

const config = Constants.expoConfig?.extra?.firebase ?? {}

if (!config.apiKey) {
  // Loud, because the alternative is a sign-in screen that fails with an
  // opaque Firebase error on a build whose environment was never set.
  console.warn('[nowry] Firebase config is missing. Check the EXPO_PUBLIC_FB_* variables for this build profile.')
}

const app = initializeApp(config)

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(firebasePersistenceStore)
})

/**
 * Google sign-in is the one auth operation that cannot be shared (ADR-028).
 * The flow lives in `googleSignIn.js`; this binds it to this client's Auth
 * instance so the port exposes the same nullary function the web adapter does.
 *
 * Resolves to null when the user cancelled, which callers treat as "nothing
 * happened" rather than as a failure.
 */
export const signInWithGoogle = () => googleSignIn(auth)

export { GoogleAuthProvider }
export default app

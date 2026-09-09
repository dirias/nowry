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
  /*
   * Fail here, naming the fix, rather than letting Firebase fail three frames
   * later with `auth/invalid-api-key` — an error that points at Firebase and
   * says nothing about the actual cause.
   *
   * The cause is almost always the same one, and it is not obvious: a
   * development build loads its JS from METRO, and Metro evaluates
   * `app.config.js` on the developer's machine. The values EAS holds are
   * irrelevant while you are developing. Without `mobile/.env` the config is
   * empty even though the build itself was configured correctly.
   */
  throw new Error(
    '[nowry] Firebase is not configured for this dev server.\n\n' +
      'A development build reads its config from Metro, not from the build, so EAS\u2019s variables do not apply here.\n' +
      'Create mobile/.env with the EXPO_PUBLIC_FB_* values (see mobile/EAS-SECRETS.md) and restart the dev server \u2014\n' +
      'app.config.js is evaluated once at startup, so a running server will not pick it up.'
  )
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

/**
 * Google sign-in for the mobile client (MOB-017, ADR-028).
 *
 * The one auth operation that cannot be shared. The web uses
 * `signInWithPopup`, and there is no popup on a phone — so the flow here is an
 * OAuth authorization request in the system browser, whose `id_token` is
 * exchanged for the same Firebase credential the web ends up with.
 *
 * **Why the account is not a duplicate.** Both clients hand Firebase a
 * `GoogleAuthProvider` credential for the same Google identity in the same
 * Firebase project, so Firebase resolves them to one user. Nothing here creates
 * an account; it authenticates an existing Google identity against the project
 * the web already uses.
 *
 * **Cancelling is not an error.** Dismissing the browser returns
 * `type: 'cancel'` or `'dismiss'`, and this resolves to null for both. A toast
 * saying "sign-in failed" because someone changed their mind is the app
 * arguing with a decision the user is entitled to make.
 *
 * Client IDs come from the environment, per platform, and are documented in
 * `EAS-SECRETS.md`. Google issues a different one for iOS, Android and Web, and
 * the wrong one fails with `redirect_uri_mismatch` rather than anything useful.
 */
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import * as AuthSession from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth'

// Required once, so the browser result is delivered back to the app.
WebBrowser.maybeCompleteAuthSession()

const DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token'
}

const extra = Constants.expoConfig?.extra ?? {}

/** Google issues one client ID per platform; the wrong one is a redirect_uri_mismatch. */
export const googleClientId = () =>
  Platform.select({
    ios: extra.googleClientIdIos,
    android: extra.googleClientIdAndroid,
    default: extra.googleClientIdWeb
  })

/**
 * @param {object} auth - the client's Firebase Auth instance
 * @returns {Promise<import('firebase/auth').UserCredential | null>} null when the user cancelled
 */
export const signInWithGoogle = async (auth) => {
  const clientId = googleClientId()

  if (!clientId) {
    throw new Error(
      'Google sign-in is not configured for this build. Set EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS / _ANDROID ' +
        'for this profile — see mobile/EAS-SECRETS.md.'
    )
  }

  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'nowry' })

  const request = new AuthSession.AuthRequest({
    clientId,
    redirectUri,
    // `id_token` is what Firebase wants; `openid` is what makes Google issue one.
    scopes: ['openid', 'profile', 'email'],
    responseType: AuthSession.ResponseType.IdToken,
    extraParams: { nonce: (await AuthSession.generateNonce?.()) ?? undefined }
  })

  const result = await request.promptAsync(DISCOVERY)

  // A decision, not a failure.
  if (result.type === 'cancel' || result.type === 'dismiss') return null

  if (result.type !== 'success') {
    const error = new Error(result.params?.error_description || 'Google sign-in did not complete')
    error.code = result.params?.error ? `auth/${result.params.error}` : 'auth/popup-closed-by-user'
    throw error
  }

  const idToken = result.params?.id_token
  if (!idToken) {
    const error = new Error('Google returned no id_token')
    error.code = 'auth/invalid-credential'
    throw error
  }

  const credential = GoogleAuthProvider.credential(idToken)
  return signInWithCredential(auth, credential)
}

export default signInWithGoogle

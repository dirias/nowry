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
 *
 * **Two things here are Google's rules, not ours, and the first draft got both
 * wrong.** They are worth stating because neither fails until a real client ID
 * is in place, and then both fail as `redirect_uri_mismatch`, which reads like
 * a typo in the ID.
 *
 *   1. **The redirect is the app's own id, not our `nowry://` scheme.** Google's
 *      installed-app clients accept `<applicationId>:/oauthredirect` and the
 *      reverse-DNS scheme they issue; they do not accept an arbitrary one. This
 *      is what `expo-auth-session`'s own Google provider builds, and it is
 *      built the same way here.
 *   2. **The flow is code + PKCE, not implicit.** Google does not issue an
 *      `id_token` straight to an installed app. It issues a code, which is
 *      exchanged — no client secret, because a public client has none, which is
 *      exactly what PKCE is for.
 *
 * And one thing that is not code at all: **a new Android OAuth client has
 * custom URI schemes DISABLED by default**, and this redirect is one. The
 * request then fails at the consent screen with the same `invalid_request`,
 * only the details dialog naming the cause. It is a toggle in the Google Cloud
 * console under the client's advanced settings, and it is written up in
 * EAS-SECRETS.md.
 *
 * The provider `expo-auth-session` ships is a hook, and this is a plain
 * function behind the platform port, called from shared code that is not a
 * component. So its rules are followed rather than its hook used.
 */
import Constants from 'expo-constants'
import * as Application from 'expo-application'
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

/**
 * The first scheme in the config is the one Expo's Linking treats as primary
 * and the one a callback comes back on. Read rather than hardcoded, so renaming
 * the app's scheme cannot silently break sign-in.
 */
const PRIMARY_SCHEME = [].concat(Constants.expoConfig?.scheme ?? 'nowry')[0]

/** Google issues one client ID per platform; the wrong one is a redirect_uri_mismatch. */
export const googleClientId = () =>
  Platform.select({
    ios: extra.googleClientIdIos,
    android: extra.googleClientIdAndroid,
    default: extra.googleClientIdWeb
  })

/**
 * `nowry://oauthredirect` — the app's OWN scheme, not its package name.
 *
 * Both halves of this have been wrong once, so both are written down.
 *
 * It is not built with `makeRedirectUri`: that helper returns its `native`
 * value only under Standalone or Bare and otherwise hands back a development
 * `exp://…` URL, which Google refuses outright.
 *
 * And it is not the package name, which is what Google's own documentation
 * suggests. `com.nowry.app:/oauthredirect` was accepted by Google and came back
 * with a valid code — but the app never saw it. `openAuthSessionAsync` waits
 * for a URL matching the redirect it was given, the callback arrived on the
 * app's primary scheme instead, and the two did not match. A redirect that does
 * not match does not error: it leaks past the listener to the router, which
 * shows "Unmatched Route" with the authorization code sitting in the URL.
 *
 * So the redirect is the scheme this app actually answers on. Google permits it
 * because the client has custom URI schemes enabled — the setting that has to
 * be turned on by hand, per EAS-SECRETS.md.
 */
export const redirectUriFor = () => `${PRIMARY_SCHEME}://oauthredirect`

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

  const redirectUri = redirectUriFor()

  /*
   * Said out loud in development, because the redirect is the value this flow
   * gets wrong most often and the failure never names it: a mismatch does not
   * error, it simply leaks the callback to the router as an unmatched route.
   */
  if (__DEV__) console.log('[google] redirect_uri =', redirectUri, '| client_id =', clientId)

  const request = new AuthSession.AuthRequest({
    clientId,
    redirectUri,
    // `openid` is what makes Google issue an id_token at all; Firebase wants
    // that token and nothing else here does.
    scopes: ['openid', 'profile', 'email'],
    responseType: AuthSession.ResponseType.Code,
    // A public client has no secret to prove itself with, so it proves the
    // exchange instead. On by default; named because it is load-bearing.
    usePKCE: true
  })

  const result = await request.promptAsync(DISCOVERY)

  // A decision, not a failure.
  if (result.type === 'cancel' || result.type === 'dismiss') return null

  if (result.type !== 'success') {
    /*
     * Name what was sent, not just what came back.
     *
     * Google answers a wrong client id, a wrong redirect and an unregistered
     * signing fingerprint with the same two words. Three different fixes, one
     * message — so the message carries the two values a reader would otherwise
     * spend an evening guessing at. Neither is a secret: the client id is
     * public by design and the redirect is in the manifest.
     */
    const detail = result.params?.error_description || result.params?.error || 'Google sign-in did not complete'
    const error = new Error(`${detail} — sent redirect_uri=${redirectUri} client_id=${clientId}`)
    error.code = result.params?.error ? `auth/${result.params.error}` : 'auth/popup-closed-by-user'
    throw error
  }

  const tokens = await AuthSession.exchangeCodeAsync(
    {
      clientId,
      code: result.params.code,
      redirectUri,
      extraParams: { code_verifier: request.codeVerifier }
    },
    DISCOVERY
  )

  if (!tokens.idToken) {
    const error = new Error('Google returned no id_token')
    error.code = 'auth/invalid-credential'
    throw error
  }

  const credential = GoogleAuthProvider.credential(tokens.idToken)
  return signInWithCredential(auth, credential)
}

export default signInWithGoogle

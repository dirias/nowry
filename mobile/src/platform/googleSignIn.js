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
 * `com.nowry.app:/oauthredirect` — the package name, ONE slash, and it must
 * also be the first scheme in `app.config.js`. Every part of that sentence was
 * established by being wrong first, so every part is written down:
 *
 *   - **The scheme must be the package name.** `nowry://oauthredirect` is
 *     refused by Google with `invalid_request`, naming the redirect.
 *   - **One slash, not two.** `com.nowry.app://oauthredirect` is refused the
 *     same way; `com.nowry.app:/oauthredirect` is accepted and returns a code.
 *     A custom scheme URI has no authority component, and Google checks.
 *   - **It must be the FIRST scheme declared.** Expo's Linking delivers every
 *     callback on the first one, and `openAuthSessionAsync` resolves only for a
 *     URL matching the redirect it was given. With `nowry` first, Google
 *     accepted the request and the callback came back where nothing was
 *     listening — which does not error. It leaks past to the router as
 *     "Unmatched Route", authorization code and all.
 *
 * Google permits a custom scheme at all only because the client has the setting
 * enabled by hand, per EAS-SECRETS.md.
 */
export const redirectUriFor = () => `${PRIMARY_SCHEME}:/oauthredirect`

/**
 * The sign-in that is in flight, if any.
 *
 * The callback does not come back through the browser helper on Android — it is
 * delivered to the app as a deep link, which the router receives. Four attempts
 * at making `openAuthSessionAsync` catch it failed, each in a different way, and
 * each ended with the authorization code sitting in a URL on an "Unmatched
 * Route" screen.
 *
 * So the router is where it is caught, and this is how the two halves meet: the
 * caller still awaits one promise, the `/oauthredirect` route settles it. The
 * verifier and the state live here for the same reason — they are needed at the
 * exchange, which now happens on the other side of a browser trip.
 */
let pending = null

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

  // A second attempt while one is open would leave the first promise forever
  // unsettled, and the caller waiting on it.
  pending?.reject(new Error('Google sign-in was restarted'))

  const redirectUri = redirectUriFor()

  const request = new AuthSession.AuthRequest({
    clientId,
    redirectUri,
    // `openid` is what makes Google issue an id_token at the exchange.
    scopes: ['openid', 'profile', 'email'],
    responseType: AuthSession.ResponseType.Code,
    // A public client has no secret to prove itself with, so it proves the
    // exchange instead. On by default; named because it is load-bearing.
    usePKCE: true
  })

  /*
   * Registered BEFORE anything is awaited. Building the URL is asynchronous,
   * and a cancel arriving during it would have nothing to settle — the caller
   * would then wait on a promise nobody holds.
   */
  const promise = new Promise((resolve, reject) => {
    pending = { auth, clientId, redirectUri, request, resolve, reject }
  })

  const authUrl = await request.makeAuthUrlAsync(DISCOVERY)

  /*
   * `openAuthSessionAsync`, not `openBrowserAsync`: it still closes the tab
   * when the app comes forward, which is the part that does work here. Its
   * result is ignored — a dismissal is not a decision, because the redirect
   * itself brings the app forward and dismisses the tab.
   */
  if (pending) WebBrowser.openAuthSessionAsync(authUrl, redirectUri).catch(() => {})

  return promise
}

/**
 * Finish a sign-in from the callback the router received.
 *
 * Called by `app/oauthredirect.js` and nowhere else. Returns nothing: the
 * caller of `signInWithGoogle` is the one waiting on the answer.
 */
export const completeGoogleSignIn = async (params = {}) => {
  const inFlight = pending
  if (!inFlight) return
  pending = null

  WebBrowser.dismissBrowser?.()

  try {
    // The state check is the CSRF guard: a callback that did not come from the
    // request this app started must not sign anybody in.
    if (params.state !== inFlight.request.state) {
      const error = new Error('The sign-in that came back is not the one that was started')
      error.code = 'auth/state-mismatch'
      throw error
    }

    if (params.error || !params.code) {
      const error = new Error(params.error_description || params.error || 'Google sign-in did not complete')
      error.code = params.error ? `auth/${params.error}` : 'auth/popup-closed-by-user'
      throw error
    }

    const tokens = await AuthSession.exchangeCodeAsync(
      {
        clientId: inFlight.clientId,
        code: params.code,
        redirectUri: inFlight.redirectUri,
        extraParams: { code_verifier: inFlight.request.codeVerifier }
      },
      DISCOVERY
    )

    if (!tokens.idToken) {
      const error = new Error('Google returned no id_token')
      error.code = 'auth/invalid-credential'
      throw error
    }

    const credential = GoogleAuthProvider.credential(tokens.idToken)
    inFlight.resolve(await signInWithCredential(inFlight.auth, credential))
  } catch (error) {
    inFlight.reject(error)
  }
}

/** Dismissing the browser without a callback is a decision, not a failure. */
export const cancelGoogleSignIn = () => {
  pending?.resolve(null)
  pending = null
}

export default signInWithGoogle

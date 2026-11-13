import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  applyActionCode,
  verifyPasswordResetCode,
  confirmPasswordReset,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth'
import { auth as authPort, session, storage } from '../../platform'
import { apiClient } from '../client'
import { usernameFor } from '../../domain/username'
import { inviteHeaders, isVerifyEmailRefusal } from '../../domain/beta'
import { isEmailUnverifiedRefusal } from '../../domain/signInProblem'

/**
 * The sign-up in flight, if any (QA-024).
 *
 * Creating the Firebase account fires `onAuthStateChanged` at once, and the
 * auth context answers it by reading `/users/me` — before `/auth/register`
 * has carried the invite code to the server. While the beta gate is on, that
 * first read is a brand-new uid with no invite header, which the server
 * refuses with 403; the context then treats the session as invalid and the
 * phone stays on the form it just submitted, signed in to Firebase and out of
 * the app. The context awaits this promise before its first read, so the
 * account exists by the time it asks.
 */
export const registration = { pending: null }

const whileRegistering = async (work) => {
  const run = work()
  registration.pending = run.catch(() => {})
  try {
    return await run
  } finally {
    registration.pending = null
  }
}

/**
 * A sign-up waiting for its email to be confirmed (ADR-077).
 *
 * A personal invitation makes an account only for a verified address, so a
 * password sign-up stops after Firebase has the identity and before Nowry has
 * the account. The invite and the chosen username are kept here until the
 * person confirms, so a reload or a second visit can finish what they started.
 * Removed when the account exists or the person walks away.
 */
const HELD_SIGN_UP_KEY = 'NOWRY_HELD_SIGN_UP'

const holdSignUp = (inviteCode, username) => {
  try {
    storage.set(HELD_SIGN_UP_KEY, JSON.stringify({ inviteCode, username: username || '' }))
  } catch {
    // A device that cannot keep it asks for the link again.
  }
}

const readHeldSignUp = () => {
  try {
    const held = JSON.parse(storage.get(HELD_SIGN_UP_KEY) || 'null')
    return held?.inviteCode ? held : null
  } catch {
    return null
  }
}

const dropHeldSignUp = () => {
  try {
    storage.remove(HELD_SIGN_UP_KEY)
  } catch {
    // Nothing to do: the server refuses a spent invitation anyway.
  }
}

/*
 * Both clients run the same Firebase JS SDK (ADR-028) and differ only in how
 * they construct the Auth object, so the operations above are shared and the
 * instance arrives through the port. `signInWithPopup` is the exception: it has
 * no mobile equivalent, so Google sign-in is a port capability that the web
 * adapter implements with a popup and the mobile adapter will implement with
 * expo-auth-session. Callers keep one function name either way.
 */
const firebaseAuth = () => authPort.instance()

/** 'es-MX' reads as 'es': the API and Firebase both take the two letters. */
const twoLetters = (langCode) => String(langCode || 'en').split('-')[0]

/**
 * Whether the API itself could not be asked (ADR-078): no answer at all, a
 * server fault, or an API from before the route existed. Then Firebase sends
 * its own email, as it did before.
 */
const apiCouldNotAnswer = (error) => !error?.response || error.response.status >= 500 || error.response.status === 404

/**
 * Auth Service with Firebase Authentication
 * Handles authentication and session operations
 */
export const authService = {
  /**
   * Register a new user with Firebase and sync to backend
   * @param {string} email
   * @param {string} password
   * @param {string} username
   * @param {string} [inviteCode] the beta invite, sent as a header while invites are required (ADR-038)
   * @param {string} [langCode] the app's language, for the verification email (ADR-076)
   * @returns {Promise<Object>} User data
   */
  async register(email, password, username, inviteCode, langCode) {
    return whileRegistering(() => this.registerNow(email, password, username, inviteCode, langCode))
  },

  async registerNow(email, password, username, inviteCode, langCode) {
    try {
      // Create user in Firebase
      const user = await createUserWithEmailAndPassword(firebaseAuth(), email, password).then(
        (credential) => credential.user,
        (error) => this.identityLeftBehind(email, password, inviteCode, error)
      )

      // Update display name
      await updateProfile(user, { displayName: username })

      // Get Firebase ID token — force a refresh so the token carries the
      // displayName claim we just set via updateProfile(); an unforced
      // getIdToken() can return the stale pre-update token, which has no
      // `name` claim and causes the backend to fall back to an
      // email-derived username instead of the one the user typed.
      const idToken = await user.getIdToken(true)

      // Sync user to backend MongoDB
      const { data } = await apiClient
        .post(
          '/auth/register',
          {
            firebase_uid: user.uid,
            email: user.email,
            username: username
          },
          {
            headers: {
              Authorization: `Bearer ${idToken}`,
              ...inviteHeaders(inviteCode)
            }
          }
        )
        .catch(async (error) => {
          // ADR-077: a personal invitation waits for the address to be
          // confirmed. Keep what was typed, send the link, and let the caller
          // show the confirm step; the Firebase identity stays signed in.
          if (isVerifyEmailRefusal(error)) {
            holdSignUp(inviteCode, username)
            await this.sendVerification(langCode).catch(() => {})
          } else if (isEmailUnverifiedRefusal(error)) {
            /*
             * ADR-083: the address already belongs to an account, and this new
             * identity has not proved it owns it. Send the link to the address,
             * then close the identity: once the link is opened, signing in with
             * this password re-links the account on the server. Nothing is
             * held; there is no sign-up left to finish.
             */
            await this.sendVerification(langCode).catch(() => {})
            storage.remove('firebase_token')
            await signOut(firebaseAuth()).catch(() => {})
          }
          throw error
        })

      // ADR-076: ask the address to prove itself. After the account exists on
      // the server, and never in its way: a failed send leaves a working
      // account and a "send again" line in settings.
      this.sendVerification(langCode).catch((error) => console.warn('Verification email not sent:', error?.code || error))

      return {
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName
        },
        token: idToken,
        backendUser: data
      }
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    }
  },

  /**
   * A sign-up that the gate refused leaves a Firebase identity with no Nowry
   * account (ADR-077). When that person comes back with an invite, Firebase
   * says the email is in use. If the password they typed is that identity's,
   * it is the same person: carry on with it. Otherwise the refusal stands.
   * @returns {Promise<Object>} the Firebase user to continue the sign-up with
   */
  async identityLeftBehind(email, password, inviteCode, error) {
    if (error?.code !== 'auth/email-already-in-use' || !inviteCode) throw error
    const credential = await signInWithEmailAndPassword(firebaseAuth(), email, password).catch(() => {
      throw error
    })
    return credential.user
  },

  /**
   * Log in a user with Firebase
   * @param {string} email
   * @param {string} password
   * @returns {Promise<Object>} User session data
   */
  async login(email, password) {
    try {
      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(firebaseAuth(), email, password)
      const user = userCredential.user

      // Get Firebase ID token
      const idToken = await user.getIdToken()

      // Sync/verify user with backend
      const { data } = await apiClient.post(
        '/auth/login', // Use new Firebase auth endpoint
        {
          firebase_uid: user.uid,
          email: user.email
        },
        {
          headers: {
            Authorization: `Bearer ${idToken}`
          }
        }
      )

      // Store the token for API calls
      storage.set('firebase_token', idToken)

      return {
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          emailVerified: user.emailVerified
        },
        token: idToken,
        backendUser: data
      }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  },

  /**
   * Sign in with Google OAuth
   * @returns {Promise<Object>} User session data
   */
  async loginWithGoogle(inviteCode) {
    return whileRegistering(() => this.loginWithGoogleNow(inviteCode))
  },

  async loginWithGoogleNow(inviteCode) {
    try {
      const userCredential = await authPort.signInWithGoogle()

      /*
       * A cancellation, not a failure (MOB-017). The web's popup throws when it
       * is dismissed, so this is null only on mobile — but the shared service is
       * where the two shapes meet, so it is handled once here rather than at
       * each caller. Callers treat null as "nothing happened".
       */
      if (!userCredential) return null

      const user = userCredential.user

      // Get Firebase ID token
      const idToken = await user.getIdToken()

      // Sync/create user in backend
      const { data } = await apiClient.post(
        '/auth/register',
        {
          firebase_uid: user.uid,
          email: user.email,
          username: usernameFor({ displayName: user.displayName, email: user.email, uid: user.uid }),
          photo_url: user.photoURL
        },
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
            ...inviteHeaders(inviteCode)
          }
        }
      )

      storage.set('firebase_token', idToken)

      return {
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        },
        token: idToken,
        backendUser: data
      }
    } catch (error) {
      console.error('Google login error:', error)
      throw error
    }
  },

  /**
   * Log out the current user
   */
  async logout() {
    try {
      await signOut(firebaseAuth())
      storage.remove('firebase_token')
      // No `onboarding_skipped` cleanup: nothing reads that flag any more. Whether
      // onboarding is offered again is the server's answer now (ONB-012, ADR-007),
      // so there is no local suppression state left for logout to reset.
      session.onSignedOut()
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    }
  },

  /**
   * Ask for the verification email (ADR-078, FR-023). The API writes it on
   * Nowry's layout; when the API says it cannot, or cannot be reached, Firebase
   * sends its own, as before (ADR-076).
   * @param {string} [langCode] the app's language, e.g. 'es' or 'es-MX'
   * @returns {Promise<{ status: 'sent' | 'verified' | 'none' | 'wait', retryAfter?: number }>}
   *   'none' when nobody is signed in; 'wait' with the seconds before another may be sent
   */
  async requestVerification(langCode) {
    const auth = firebaseAuth()
    const user = auth.currentUser
    if (!user) return { status: 'none' }
    if (user.emailVerified) return { status: 'verified' }
    const language = twoLetters(langCode)
    try {
      const idToken = await user.getIdToken()
      const { data } = await apiClient.post(
        '/auth/email/verification',
        { language },
        { headers: { Authorization: `Bearer ${idToken}` }, suppressErrorToast: true }
      )
      if (data?.status === 'sent' || data?.status === 'verified') return { status: data.status }
      if (data?.status === 'wait') return { status: 'wait', retryAfter: data.retry_after || 60 }
    } catch (error) {
      if (!apiCouldNotAnswer(error)) throw error
    }
    auth.languageCode = language
    await sendEmailVerification(user)
    return { status: 'sent' }
  },

  /**
   * The same request, for callers that only need to know whether one went out.
   * @returns {Promise<boolean>} true when one was sent; false when there is no one to ask or nothing to prove
   */
  async sendVerification(langCode) {
    return (await this.requestVerification(langCode)).status === 'sent'
  },

  /**
   * Hand a verification code from an email link to Firebase (ADR-078, FR-022).
   * If the person is signed in here, their token is refreshed so the server sees it too.
   * @throws Firebase's error when the code is used, expired or unknown
   */
  async applyEmailCode(code) {
    await applyActionCode(firebaseAuth(), code)
    await this.confirmVerification().catch(() => false)
  },

  /**
   * Whose password a reset code would change.
   * @returns {Promise<string>} the account's email
   * @throws Firebase's error when the code is used, expired or unknown
   */
  async checkResetCode(code) {
    return verifyPasswordResetCode(firebaseAuth(), code)
  },

  /** Set the new password a reset code allows. Nothing changes until this is called. */
  async confirmReset(code, newPassword) {
    await confirmPasswordReset(firebaseAuth(), code, newPassword)
  },

  /**
   * Re-read the signed-in user from Firebase; once verified, refresh the token
   * so the server sees it too (ADR-076).
   * @returns {Promise<boolean>} true when the email is verified
   */
  async confirmVerification() {
    const user = firebaseAuth().currentUser
    if (!user) return false
    await user.reload()
    if (!user.emailVerified) return false
    const idToken = await user.getIdToken(true)
    storage.set('firebase_token', idToken)
    return true
  },

  /**
   * The sign-up waiting for its email to be confirmed, if any (ADR-077).
   * @returns {{ inviteCode: string, username: string, email: string } | null} null without a held invite or a signed-in identity
   */
  heldSignUp() {
    const held = readHeldSignUp()
    const user = firebaseAuth().currentUser
    return held && user ? { ...held, email: user.email || '' } : null
  },

  /**
   * Keep an invite for the identity already signed in to Firebase, so opening
   * an invite link without a Nowry account can finish the sign-up (ADR-077).
   * @returns {boolean} whether there was an identity to keep it for
   */
  holdInviteForCurrentUser(inviteCode) {
    const user = firebaseAuth().currentUser
    if (!user || !inviteCode) return false
    holdSignUp(inviteCode, readHeldSignUp()?.username || user.displayName || '')
    return true
  },

  /**
   * Finish a held sign-up once the email is confirmed (ADR-077).
   * @returns {Promise<{ status: 'none' | 'unverified' | 'done', backendUser?: Object }>}
   * @throws the server's refusal when the invite cannot be used with this address
   */
  async finishHeldSignUp() {
    const held = readHeldSignUp()
    const user = firebaseAuth().currentUser
    if (!held || !user) return { status: 'none' }
    await user.reload()
    if (!user.emailVerified) return { status: 'unverified' }
    const idToken = await user.getIdToken(true)
    const username = held.username || usernameFor({ displayName: user.displayName, email: user.email, uid: user.uid })
    const { data } = await apiClient.post(
      '/auth/register',
      { firebase_uid: user.uid, email: user.email, username },
      { headers: { Authorization: `Bearer ${idToken}`, ...inviteHeaders(held.inviteCode) } }
    )
    dropHeldSignUp()
    storage.set('firebase_token', idToken)
    return { status: 'done', backendUser: data }
  },

  /**
   * Walk away from a held sign-up: forget the invite and sign the identity out (ADR-077).
   * Not `logout()`: that announces a signed-out session, which sends the web to
   * the sign-in page, and this person is going back to the form they were on.
   */
  async abandonHeldSignUp() {
    dropHeldSignUp()
    await signOut(firebaseAuth()).catch(() => {})
    storage.remove('firebase_token')
  },

  /**
   * Ask for a password reset email (ADR-078, FR-024). The API answers the same
   * whatever the address is, so this resolves the same way too. When the API
   * cannot be asked, Firebase sends its own.
   * @param {string} email
   * @param {string} [langCode] the app's language, e.g. 'es' or 'es-MX'
   */
  async resetPassword(email, langCode = 'en') {
    const language = twoLetters(langCode)
    try {
      await apiClient.post('/auth/email/password-reset', { email, language }, { suppressErrorToast: true })
    } catch (error) {
      if (!apiCouldNotAnswer(error)) throw error
      firebaseAuth().languageCode = language
      await sendPasswordResetEmail(firebaseAuth(), email)
    }
    return { message: 'Password reset email sent' }
  },

  /**
   * The signed-in identity once Firebase has restored it, or null. A page opened
   * from an email link asks before Firebase has finished reading its session.
   * @returns {Promise<Object|null>}
   */
  /**
   * When the current sign-in happened, in seconds since the epoch (the token's
   * `auth_time`), or null when nobody is signed in (ADR-089).
   */
  async signInTime() {
    const user = authPort.currentUser()
    if (!user) return null
    const result = await user.getIdTokenResult()
    const value = Number(result?.claims?.auth_time)
    return Number.isFinite(value) ? value : null
  },

  /** The ways the current user can sign in, as Firebase provider ids ('password', 'google.com'). */
  signInProviders() {
    const user = authPort.currentUser()
    return (user?.providerData ?? []).map((entry) => entry.providerId)
  },

  /**
   * Prove the sign-in again before a deletion (ADR-089, FR-038): the password
   * for a password account, Google otherwise. The token is refreshed after, so
   * the next API call carries the new `auth_time`.
   * @param {{ method: 'password' | 'google', password?: string }} proof
   */
  async reauthenticate({ method, password }) {
    const user = authPort.currentUser()
    if (!user) throw Object.assign(new Error('Nobody is signed in'), { code: 'auth/no-current-user' })
    if (method === 'password') {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password ?? ''))
    } else {
      await authPort.reauthenticateWithGoogle()
    }
    await authPort.getIdToken(true)
  },

  async whenReady() {
    const auth = firebaseAuth()
    if (typeof auth.authStateReady === 'function') await auth.authStateReady()
    return auth.currentUser || null
  },

  /**
   * Get current Firebase user
   * @returns {Object|null} Current user or null
   */
  getCurrentUser() {
    return authPort.currentUser()
  },

  /**
   * Get current Firebase ID token
   * @param {boolean} forceRefresh - Force token refresh
   * @returns {Promise<string>} ID token
   */
  async getIdToken(forceRefresh = false) {
    const user = authPort.currentUser()
    if (!user) {
      throw new Error('No user logged in')
    }
    return await user.getIdToken(forceRefresh)
  },

  /**
   * Refresh the Firebase ID token and update stored state
   * @returns {Promise<string>} New ID token
   */
  async refreshToken() {
    try {
      const user = authPort.currentUser()
      if (!user) {
        throw new Error('No user logged in')
      }

      // Force refresh the token
      const newToken = await user.getIdToken(true)

      // Update stored state
      storage.set('firebase_token', newToken)

      console.log('[AuthService] Token refreshed successfully')
      return newToken
    } catch (error) {
      console.error('[AuthService] Token refresh failed:', error)
      throw error
    }
  },

  /**
   * Check if current token is expired or about to expire
   * @returns {Promise<boolean>} True if token needs refresh
   */
  async isTokenExpired() {
    try {
      const user = authPort.currentUser()
      if (!user) return true

      // Get token result with expiration time
      const tokenResult = await user.getIdTokenResult()
      const expirationTime = new Date(tokenResult.expirationTime).getTime()
      const currentTime = Date.now()

      // Check if token expires in less than 5 minutes
      const fiveMinutes = 5 * 60 * 1000
      const isExpiringSoon = expirationTime - currentTime < fiveMinutes

      return isExpiringSoon
    } catch (error) {
      console.error('[AuthService] Error checking token expiration:', error)
      return true
    }
  }
}

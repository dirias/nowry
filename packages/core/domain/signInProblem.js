/**
 * Why a signed-in identity has no Nowry account to open (ADR-083, FR-031).
 *
 * A Firebase sign-in that the API does not answer with an account must never
 * land back on the sign-in page in silence. This names the three answers the
 * sign-in screens explain, from the error a request was refused with:
 *
 *   'invite'      the private beta needs an invitation
 *   'verifyEmail' the email must be confirmed first
 *   'account'     no account was found, or two identities claim one
 *
 * Anything else (no response, a 5xx, a 401, another 403) is null: not one of
 * these, and the caller keeps its own rule for it. No platform, no React.
 */
import { BETA_INVITE_REQUIRED_CODE, INVITE_VERIFY_EMAIL_CODE } from './beta'

export const SIGN_IN_PROBLEMS = Object.freeze(['invite', 'verifyEmail', 'account'])

/** A refusal for an address whose email is not confirmed (QA-008). */
export const EMAIL_UNVERIFIED_CODE = 'email_unverified'
/** Two live Firebase identities claim one account (ADR-083 point 1). */
export const ACCOUNT_CONFLICT_CODE = 'account_conflict'

const detailCode = (error) => {
  const detail = error?.response?.data?.detail
  if (!detail || typeof detail !== 'object' || Array.isArray(detail)) return null
  return detail.code ?? null
}

/** A sign-up or read refused until this identity proves the address (ADR-083). */
export const isEmailUnverifiedRefusal = (error) => error?.response?.status === 409 && detailCode(error) === EMAIL_UNVERIFIED_CODE

/**
 * @param {unknown} error - a rejected request
 * @returns {'invite' | 'verifyEmail' | 'account' | null}
 */
export const signInProblem = (error) => {
  const status = error?.response?.status
  const code = detailCode(error)
  if (status === 403 && code === BETA_INVITE_REQUIRED_CODE) return 'invite'
  if (status === 403 && code === INVITE_VERIFY_EMAIL_CODE) return 'verifyEmail'
  if (isEmailUnverifiedRefusal(error)) return 'verifyEmail'
  if (status === 409 && code === ACCOUNT_CONFLICT_CODE) return 'account'
  if (status === 404) return 'account'
  return null
}

/** Is this one of the three reasons, as read back from storage? */
export const isSignInProblem = (value) => SIGN_IN_PROBLEMS.includes(value)

/** The translation key a sign-in screen shows for a reason. */
export const signInProblemKey = (problem) => (isSignInProblem(problem) ? `auth.signInProblem.${problem}` : null)

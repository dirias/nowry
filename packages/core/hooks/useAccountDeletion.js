/**
 * Deleting the account, for both clients (ADR-081, ADR-089, FR-038).
 *
 * The person types their email to confirm; if their sign-in is more than five
 * minutes old the hook asks for it again (`step === 'reauth'`) before the
 * delete call, and an API refusal for an old sign-in leads to the same step.
 * The client draws the steps; this hook decides them.
 */
import { useCallback, useState } from 'react'
import { authService } from '../api/services/auth.service'
import { userService } from '../api/services/user.service'
import { isReauthRequired, reauthMethod, signedInRecently } from '../domain/recentSignIn'

const WRONG_PASSWORD_CODES = new Set(['auth/wrong-password', 'auth/invalid-credential', 'auth/invalid-login-credentials'])

/**
 * @param {{ email?: string, language?: string, onDeleted?: () => void }} options
 */
export function useAccountDeletion({ email, language, onDeleted } = {}) {
  const [step, setStep] = useState('confirm') // 'confirm' | 'reauth' | 'done'
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null) // a translation key, or { detail } from the API
  const method = reauthMethod(authService.signInProviders())

  const reset = useCallback(() => {
    setStep('confirm')
    setBusy(false)
    setError(null)
  }, [])

  const deleteNow = useCallback(async () => {
    try {
      await userService.deleteAccount(language)
      setStep('done')
      onDeleted?.()
      return true
    } catch (err) {
      if (isReauthRequired(err)) {
        setStep('reauth')
        return false
      }
      setError(
        err?.response?.data?.detail && typeof err.response.data.detail === 'string'
          ? { detail: err.response.data.detail }
          : 'settings.errors.networkError'
      )
      return false
    }
  }, [language, onDeleted])

  /** The email was typed: delete now, or ask for the sign-in first. */
  const confirm = useCallback(
    async (typedEmail) => {
      if (
        !email ||
        String(typedEmail ?? '')
          .trim()
          .toLowerCase() !== email.toLowerCase()
      )
        return false
      setError(null)
      setBusy(true)
      try {
        if (!signedInRecently(await authService.signInTime())) {
          setStep('reauth')
          return false
        }
        return await deleteNow()
      } finally {
        setBusy(false)
      }
    },
    [email, deleteNow]
  )

  /** The sign-in was given again: prove it, then delete. */
  const reauthenticateAndDelete = useCallback(
    async (password) => {
      setError(null)
      setBusy(true)
      try {
        await authService.reauthenticate({ method, password })
      } catch (err) {
        setError(
          WRONG_PASSWORD_CODES.has(err?.code) ? 'settings.deleteAccount.reauth.wrongPassword' : 'settings.deleteAccount.reauth.failed'
        )
        setBusy(false)
        return false
      }
      try {
        return await deleteNow()
      } finally {
        setBusy(false)
      }
    },
    [method, deleteNow]
  )

  return { step, busy, error, method, confirm, reauthenticateAndDelete, reset }
}

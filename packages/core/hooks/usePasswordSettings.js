/**
 * Settings → Security: change a password, or set one on a Google-only account
 * (ADR-092). Both clients draw it; this hook decides it.
 */
import { useCallback, useState } from 'react'
import { authService } from '../api/services/auth.service'
import { userService } from '../api/services/user.service'
import { googleAlsoConnected, newPasswordProblem, passwordMode, passwordRefusal } from '../domain/passwordSettings'

export function usePasswordSettings(language) {
  const [providers, setProviders] = useState(() => authService.signInProviders())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null) // { key, values }
  const [done, setDone] = useState(null) // 'changed' | 'set'
  const mode = passwordMode(providers)

  const reset = useCallback(() => {
    setError(null)
    setDone(null)
  }, [])

  /** Current, new and confirmation: the API checks the current one and signs other devices out. */
  const change = useCallback(
    async (current, next, confirmation) => {
      reset()
      const problem = newPasswordProblem(next, confirmation)
      if (problem) return setError({ key: problem }) || false
      if (!current) return setError({ key: 'settings.security.currentRequired' }) || false
      setBusy(true)
      try {
        await userService.changePassword(current, next, language)
        await authService.signInAgainWithPassword(next)
        setDone('changed')
        return true
      } catch (err) {
        setError(passwordRefusal(err))
        return false
      } finally {
        setBusy(false)
      }
    },
    [language, reset]
  )

  /** A Google-only account: confirm with Google, then the API adds the password. */
  const setWithGoogle = useCallback(
    async (next, confirmation) => {
      reset()
      const problem = newPasswordProblem(next, confirmation)
      if (problem) return setError({ key: problem }) || false
      setBusy(true)
      try {
        try {
          await authService.reauthenticate({ method: 'google' })
        } catch {
          setError({ key: 'settings.security.reauthGoogle' })
          return false
        }
        await userService.setPassword(next, language)
        await authService.reloadProviders()
        setProviders(authService.signInProviders())
        setDone('set')
        return true
      } catch (err) {
        setError(passwordRefusal(err))
        return false
      } finally {
        setBusy(false)
      }
    },
    [language, reset]
  )

  return { mode, googleConnected: googleAlsoConnected(providers), busy, error, done, change, setWithGoogle, reset }
}

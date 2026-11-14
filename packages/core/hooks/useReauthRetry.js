/**
 * An admin write that asks for the sign-in again when it is too old
 * (ADMIN-008b, FR-010, board J), for both clients.
 *
 * `run(action, call)` runs the call. When the API refuses it with 401
 * `reauth_required`, the returned promise waits: `pending` names the action so
 * the client draws the shared re-sign-in dialog, `signIn` proves the sign-in
 * and runs the same call once more (its answer or refusal settles the promise),
 * and `cancel` rejects it as cancelled, with nothing run. The client draws the
 * dialog; this hook decides it.
 */
import { useCallback, useRef, useState } from 'react'
import { authService } from '../api/services/auth.service'
import { isReauthRequired, reauthCancelled, reauthErrorKey, reauthMethods } from '../domain/recentSignIn'

export function useReauthRetry() {
  const [pending, setPending] = useState(null) // { action, lastSignIn } while the dialog is open
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null) // a translation key
  const request = useRef(null) // { call, resolve, reject }
  const methods = reauthMethods(authService.signInProviders())

  const close = useCallback(() => {
    request.current = null
    setPending(null)
    setBusy(false)
    setError(null)
  }, [])

  const run = useCallback(async (action, call) => {
    try {
      return await call()
    } catch (err) {
      if (!isReauthRequired(err)) throw err
      const lastSignIn = await authService.signInTime().catch(() => null)
      return new Promise((resolve, reject) => {
        request.current = { call, resolve, reject }
        setError(null)
        setPending({ action, lastSignIn })
      })
    }
  }, [])

  const signIn = useCallback(
    async ({ method, password } = {}) => {
      const waiting = request.current
      if (!waiting) return
      setBusy(true)
      setError(null)
      try {
        await authService.reauthenticate({ method, password })
      } catch (err) {
        setError(reauthErrorKey(err))
        setBusy(false)
        return
      }
      try {
        waiting.resolve(await waiting.call())
      } catch (err) {
        waiting.reject(err)
      } finally {
        close()
      }
    },
    [close]
  )

  const cancel = useCallback(() => {
    const waiting = request.current
    close()
    waiting?.reject(reauthCancelled())
  }, [close])

  return { run, pending, busy, error, methods, signIn, cancel }
}

export default useReauthRetry

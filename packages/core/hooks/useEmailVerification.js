/**
 * Whether the signed-in address still has to prove itself, and the two things
 * a person can do about it (ADR-076, FR-018).
 *
 * Only an email-and-password account can be unverified: a Google address
 * arrives proved. `send` asks Firebase for the link again; `check` re-reads the
 * account after the person says they opened it. `status` is what the line
 * should say: 'idle' | 'sending' | 'sent' | 'wait' | 'failed' | 'checking' | 'notYet' | 'done'.
 * `wait` is the seconds before the link may be sent again (ADR-078): the API
 * allows one a minute, and the key counts it down.
 *
 * No JSX, no browser globals (ADR-031, ADR-026): each client draws its own line.
 */
import { useCallback, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth as authPort } from '../platform'
import { authService } from '../api/services'
import { useCountdown } from './useCountdown'

/** The pause after a send, matching the API's one a minute (ADR-078 point 8). */
export const RESEND_PAUSE_SECONDS = 60

/** What a line says after asking for the email, and how long the key rests. */
export const afterVerificationRequest = (result) =>
  result?.status === 'wait'
    ? { status: 'wait', pause: result.retryAfter || RESEND_PAUSE_SECONDS }
    : result?.status === 'sent'
      ? { status: 'sent', pause: RESEND_PAUSE_SECONDS }
      : { status: 'idle', pause: 0 }

/** True for a password account whose email Firebase has not verified. */
export const needsVerification = (firebaseUser) =>
  Boolean(
    firebaseUser && !firebaseUser.emailVerified && (firebaseUser.providerData || []).some((provider) => provider?.providerId === 'password')
  )

export const useEmailVerification = (langCode) => {
  const [account, setAccount] = useState({ needed: false, email: '' })
  const [status, setStatus] = useState('idle')
  const { left: wait, start: startWait } = useCountdown()

  useEffect(
    () =>
      onAuthStateChanged(authPort.instance(), (firebaseUser) => {
        setAccount({ needed: needsVerification(firebaseUser), email: firebaseUser?.email || '' })
      }),
    []
  )

  const send = useCallback(async () => {
    setStatus('sending')
    try {
      const next = afterVerificationRequest(await authService.requestVerification(langCode))
      startWait(next.pause)
      setStatus(next.status)
    } catch (error) {
      setStatus('failed')
    }
  }, [langCode, startWait])

  const check = useCallback(async () => {
    setStatus('checking')
    try {
      const verified = await authService.confirmVerification()
      setStatus(verified ? 'done' : 'notYet')
    } catch (error) {
      setStatus('failed')
    }
  }, [])

  // Once confirmed the line stays for its last word, "done", then goes with the next visit.
  return { needed: account.needed || status === 'done', email: account.email, status, wait, send, check }
}

export default useEmailVerification

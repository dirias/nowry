/**
 * Whether the signed-in address still has to prove itself, and the two things
 * a person can do about it (ADR-076, FR-018).
 *
 * Only an email-and-password account can be unverified: a Google address
 * arrives proved. `send` asks Firebase for the link again; `check` re-reads the
 * account after the person says they opened it. `status` is what the line
 * should say: 'idle' | 'sending' | 'sent' | 'failed' | 'checking' | 'notYet' | 'done'.
 *
 * No JSX, no browser globals (ADR-031, ADR-026): each client draws its own line.
 */
import { useCallback, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth as authPort } from '../platform'
import { authService } from '../api/services'

/** True for a password account whose email Firebase has not verified. */
export const needsVerification = (firebaseUser) =>
  Boolean(
    firebaseUser && !firebaseUser.emailVerified && (firebaseUser.providerData || []).some((provider) => provider?.providerId === 'password')
  )

export const useEmailVerification = (langCode) => {
  const [account, setAccount] = useState({ needed: false, email: '' })
  const [status, setStatus] = useState('idle')

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
      await authService.sendVerification(langCode)
      setStatus('sent')
    } catch (error) {
      setStatus('failed')
    }
  }, [langCode])

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
  return { needed: account.needed || status === 'done', email: account.email, status, send, check }
}

export default useEmailVerification

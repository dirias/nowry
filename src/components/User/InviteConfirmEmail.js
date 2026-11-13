import React, { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import { Alert, Button, Link, Stack, Typography } from '@mui/joy'
import { authService } from '@nowry/core/api/services/auth.service'
import { isInviteRefusal } from '@nowry/core/domain/beta'
import { afterVerificationRequest } from '@nowry/core/hooks/useEmailVerification'
import { useCountdown } from '@nowry/core/hooks/useCountdown'

/**
 * "Confirm your email", between a personal invitation and the account it makes
 * (ADR-077, FR-019).
 *
 * A personal invitation belongs to one address, so the account is created only
 * once that address is confirmed. Firebase already holds the identity; this
 * step waits for the link to be opened, then finishes the sign-up. Three ways
 * on: "I've confirmed", "send again", and "use a different email", which signs
 * the identity out and returns to the form.
 */

const STATUS_KEYS = {
  sent: 'auth.verify.sent',
  wait: 'auth.verify.wait',
  failed: 'auth.verify.failed',
  notYet: 'auth.verify.notYet',
  notUsable: 'beta.personal.notUsable'
}

const InviteConfirmEmail = ({ email, onDone, onLeave, finishOnOpen = false }) => {
  const { t, i18n } = useTranslation()
  const [status, setStatus] = useState('idle')
  const { left: wait, start: startWait } = useCountdown()
  const tried = useRef(false)

  /** `quiet`: the try on arrival says nothing when the address is not confirmed yet. */
  const check = async ({ quiet = false } = {}) => {
    setStatus('checking')
    try {
      const result = await authService.finishHeldSignUp()
      if (result.status === 'done') return onDone(result.backendUser)
      setStatus(quiet && result.status === 'unverified' ? 'idle' : result.status === 'unverified' ? 'notYet' : 'failed')
    } catch (error) {
      setStatus(isInviteRefusal(error) ? 'notUsable' : 'failed')
    }
  }

  // Arrived from the confirmed email link (E2E-006): finish without asking for the press.
  useEffect(() => {
    if (!finishOnOpen || tried.current) return
    tried.current = true
    check({ quiet: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finishOnOpen])

  const send = async () => {
    setStatus('sending')
    try {
      const next = afterVerificationRequest(await authService.requestVerification(i18n.language))
      startWait(next.pause)
      setStatus(next.status)
    } catch (error) {
      setStatus('failed')
    }
  }

  const leave = async () => {
    await authService.abandonHeldSignUp()
    onLeave()
  }

  const busy = status === 'checking' || status === 'sending'
  const refused = status === 'notUsable' || status === 'failed'
  return (
    <Stack spacing={2.5}>
      <Typography level='body-md' sx={{ color: 'text.secondary', overflowWrap: 'anywhere' }}>
        {t('beta.personal.confirmBody', { email })}
      </Typography>
      <div aria-live='polite'>
        {STATUS_KEYS[status] && (
          <Alert color={refused ? 'danger' : status === 'sent' ? 'success' : 'warning'} variant='soft'>
            {t(STATUS_KEYS[status])}
          </Alert>
        )}
      </div>
      <Button size='lg' fullWidth loading={status === 'checking'} disabled={busy} onClick={check}>
        {t('auth.verify.check')}
      </Button>
      <Button size='lg' fullWidth variant='soft' color='neutral' loading={status === 'sending'} disabled={busy || wait > 0} onClick={send}>
        {wait > 0 ? t('auth.verify.resendIn', { seconds: wait }) : t('auth.verify.resend')}
      </Button>
      <Link component='button' type='button' level='body-sm' onClick={leave} disabled={busy} sx={{ alignSelf: 'center' }}>
        {t('beta.personal.useAnother')}
      </Link>
    </Stack>
  )
}

InviteConfirmEmail.propTypes = {
  finishOnOpen: PropTypes.bool,
  email: PropTypes.string.isRequired,
  onDone: PropTypes.func.isRequired,
  onLeave: PropTypes.func.isRequired
}

export default InviteConfirmEmail

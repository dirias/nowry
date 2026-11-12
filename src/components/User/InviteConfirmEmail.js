import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import { Alert, Button, Link, Stack, Typography } from '@mui/joy'
import { authService } from '@nowry/core/api/services/auth.service'
import { isInviteRefusal } from '@nowry/core/domain/beta'

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
  failed: 'auth.verify.failed',
  notYet: 'auth.verify.notYet',
  notUsable: 'beta.personal.notUsable'
}

const InviteConfirmEmail = ({ email, onDone, onLeave }) => {
  const { t, i18n } = useTranslation()
  const [status, setStatus] = useState('idle')

  const check = async () => {
    setStatus('checking')
    try {
      const result = await authService.finishHeldSignUp()
      if (result.status === 'done') return onDone(result.backendUser)
      setStatus(result.status === 'unverified' ? 'notYet' : 'failed')
    } catch (error) {
      setStatus(isInviteRefusal(error) ? 'notUsable' : 'failed')
    }
  }

  const send = async () => {
    setStatus('sending')
    try {
      await authService.sendVerification(i18n.language)
      setStatus('sent')
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
      <Button size='lg' fullWidth variant='soft' color='neutral' loading={status === 'sending'} disabled={busy} onClick={send}>
        {t('auth.verify.resend')}
      </Button>
      <Link component='button' type='button' level='body-sm' onClick={leave} disabled={busy} sx={{ alignSelf: 'center' }}>
        {t('beta.personal.useAnother')}
      </Link>
    </Stack>
  )
}

InviteConfirmEmail.propTypes = {
  email: PropTypes.string.isRequired,
  onDone: PropTypes.func.isRequired,
  onLeave: PropTypes.func.isRequired
}

export default InviteConfirmEmail

import React from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Button, Stack, Typography } from '@mui/joy'
import { useEmailVerification } from '@nowry/core/hooks/useEmailVerification'

/**
 * "Confirm your email", for an address that has not proved itself (ADR-076, FR-018).
 *
 * Shown only to an email-and-password account whose address Firebase has not
 * verified. Two plain keys: send the link again, and check after opening it.
 * Nothing here blocks the product; an unverified account studies as before.
 */

const STATUS_KEYS = {
  sent: 'auth.verify.sent',
  wait: 'auth.verify.wait',
  failed: 'auth.verify.failed',
  notYet: 'auth.verify.notYet',
  done: 'auth.verify.done'
}

const EmailVerificationNotice = () => {
  const { t, i18n } = useTranslation()
  const { needed, email, status, wait, send, check } = useEmailVerification(i18n.language)
  if (!needed) return null

  const done = status === 'done'
  return (
    <Alert color={done ? 'success' : 'warning'} variant='soft' role='status' sx={{ alignItems: 'flex-start' }}>
      <Stack spacing={1} sx={{ minWidth: 0 }}>
        <Typography level='title-sm' sx={{ color: 'inherit' }}>
          {done ? t('auth.verify.done') : t('auth.verify.title')}
        </Typography>
        {!done && (
          <Typography level='body-sm' sx={{ color: 'inherit', overflowWrap: 'anywhere' }}>
            {t('auth.verify.body', { email })}
          </Typography>
        )}
        {!done && STATUS_KEYS[status] && (
          <Typography level='body-sm' sx={{ color: 'inherit', fontWeight: 'lg' }} aria-live='polite'>
            {t(STATUS_KEYS[status])}
          </Typography>
        )}
        {!done && (
          <Stack direction='row' spacing={1} useFlexGap flexWrap='wrap'>
            <Button size='sm' variant='outlined' color='neutral' loading={status === 'sending'} disabled={wait > 0} onClick={send}>
              {wait > 0 ? t('auth.verify.resendIn', { seconds: wait }) : t('auth.verify.resend')}
            </Button>
            <Button size='sm' variant='plain' color='neutral' loading={status === 'checking'} onClick={check}>
              {t('auth.verify.check')}
            </Button>
          </Stack>
        )}
      </Stack>
    </Alert>
  )
}

export default EmailVerificationNotice

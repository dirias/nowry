import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Button, FormControl, FormLabel, Input, Stack, Typography } from '@mui/joy'

import { betaService } from '@nowry/core/api/services/beta.service'
import { focusRing } from '../Common/Form/formStyles'

/**
 * The beta waitlist (ADR-038, docs/prd-road-to-market.md FR-004).
 *
 * One field and one key: a visitor who has no invite leaves an email and the
 * language they read in. Shown on the landing hero and on the register page
 * while invites are required; the same form in both places, the way the
 * contact form is one form.
 *
 * Four states, like `Contact`: idle, sending, sent, failed. On success the
 * field is cleared and the acknowledgement stays; on failure the email stays
 * so it can be sent again.
 */
const WaitlistForm = ({ source, compact = false }) => {
  const { t, i18n } = useTranslation()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | failed

  const submit = async (event) => {
    event.preventDefault()
    if (!email.trim()) return
    setStatus('sending')
    try {
      await betaService.joinWaitlist({ email: email.trim(), locale: String(i18n.language ?? '').split('-')[0] || undefined, source })
      setStatus('sent')
      setEmail('')
    } catch (error) {
      setStatus('failed')
    }
  }

  return (
    <Stack component='form' onSubmit={submit} spacing={1.5} sx={{ width: '100%', maxWidth: 440 }} aria-label={t('beta.waitlist.title')}>
      {!compact && (
        <Stack spacing={0.5}>
          <Typography level='title-md' sx={{ color: 'text.primary' }}>
            {t('beta.waitlist.title')}
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            {t('beta.waitlist.lead')}
          </Typography>
        </Stack>
      )}

      {status === 'sent' && (
        <Alert color='success' variant='soft' size='sm'>
          {t('beta.waitlist.sent')}
        </Alert>
      )}
      {status === 'failed' && (
        <Alert color='danger' variant='soft' size='sm'>
          {t('beta.waitlist.failed')}
        </Alert>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'flex-end' }}>
        <FormControl sx={{ flex: 1 }}>
          <FormLabel>{t('auth.email')}</FormLabel>
          <Input
            type='email'
            name='waitlist-email'
            id={`waitlist-email-${source || 'page'}`}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t('auth.emailPlaceholder')}
            required
            size='md'
            disabled={status === 'sending'}
          />
        </FormControl>
        <Button type='submit' size='md' variant='solid' color='primary' loading={status === 'sending'} sx={{ minHeight: 44, ...focusRing }}>
          {t('beta.waitlist.cta')}
        </Button>
      </Stack>
    </Stack>
  )
}

export default WaitlistForm

import React from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Button, Stack, Typography } from '@mui/joy'
import { usePreviousAccountNotice } from '@nowry/core/hooks/usePreviousAccountNotice'

/**
 * "This address had a Nowry account" (ADR-089, FR-041): after the new account's
 * address is verified, within 30 days of the old one's deletion, once.
 */
export default function PreviousAccountNotice() {
  const { t, i18n } = useTranslation()
  const { visible, dates, dismiss } = usePreviousAccountNotice(i18n.language)
  if (!visible) return null

  return (
    <Alert
      color='neutral'
      variant='soft'
      role='status'
      data-testid='previous-account-notice'
      sx={{ alignItems: 'flex-start', mb: { xs: 2, md: 3 } }}
    >
      <Stack spacing={1} sx={{ minWidth: 0 }}>
        <Typography level='title-sm'>{t('previousAccount.title')}</Typography>
        <Typography level='body-sm'>{t('previousAccount.body', dates)}</Typography>
        <Typography level='body-sm'>{t('previousAccount.mistake')}</Typography>
        <Stack direction='row'>
          <Button size='sm' variant='soft' color='neutral' onClick={dismiss} aria-label={t('previousAccount.dismissAria')}>
            {t('previousAccount.dismiss')}
          </Button>
        </Stack>
      </Stack>
    </Alert>
  )
}

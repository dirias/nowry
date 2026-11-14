import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, Stack, Typography } from '@mui/joy'
import { Google } from '@mui/icons-material'
import { authService } from '@nowry/core/api/services/auth.service'
import { useAuth } from '@nowry/core/context/AuthContext'
import AuthShell from './AuthShell'

/** Where Settings opens on "Set a password" (FR-047). */
export const SET_PASSWORD_TARGET = '/settings?password=set'

/**
 * The Google-only reset email's link (ADR-092, FR-047): sign in with Google
 * first, then Settings → Security → Set a password. Already signed in, it goes
 * straight there.
 */
export default function SetPassword() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  if (isAuthenticated) return <Navigate to={SET_PASSWORD_TARGET} replace />

  const continueWithGoogle = async () => {
    setBusy(true)
    setFailed(false)
    try {
      await authService.loginWithGoogle()
      window.location.href = SET_PASSWORD_TARGET
    } catch {
      setFailed(true)
      setBusy(false)
    }
  }

  return (
    <AuthShell title={t('settings.security.setPassword')} subtitle={t('auth.setPassword.body')}>
      <Stack spacing={2}>
        {failed && (
          <Typography level='body-sm' role='alert' sx={{ color: 'danger.plainColor' }}>
            {t('auth.setPassword.failed')}
          </Typography>
        )}
        <Button variant='soft' color='neutral' size='lg' fullWidth startDecorator={<Google />} loading={busy} onClick={continueWithGoogle}>
          {t('auth.signInGoogle')}
        </Button>
      </Stack>
    </AuthShell>
  )
}

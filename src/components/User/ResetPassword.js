import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Typography, Input, Button, FormControl, FormLabel, FormHelperText, Alert, LinearProgress, Stack } from '@mui/joy'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { EmailRounded, CheckCircleRounded, ArrowBackRounded } from '@mui/icons-material'
import AuthShell from './AuthShell'
import { authService } from '@nowry/core/api/services/auth.service'

const ResetPassword = () => {
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    const newErrors = {}

    if (!email) newErrors.email = t('auth.errors.emailRequired')
    if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = t('auth.errors.emailInvalid')

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    try {
      await authService.resetPassword(email, i18n.language)
      setLoading(false)
      setIsSubmitted(true)
    } catch (err) {
      console.error('Password reset error:', err)
      setLoading(false)
      setError(t('auth.errors.serverError'))
    }
  }

  if (isSubmitted) {
    return (
      <Box component='main' sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', px: 3 }}>
        <Box sx={{ textAlign: 'center', maxWidth: 360 }}>
          <CheckCircleRounded sx={{ fontSize: 72, color: 'success.plainColor', mb: 2 }} />
          <Typography level='h3' mb={1}>
            {t('auth.resetPassword.successTitle')}
          </Typography>
          <Typography level='body-md' sx={{ color: 'text.secondary', mb: 4 }}>
            {t('auth.resetPassword.successMsg')}
          </Typography>
          <Button size='lg' fullWidth onClick={() => navigate('/login')}>
            {t('auth.resetPassword.goToLogin')}
          </Button>
        </Box>
      </Box>
    )
  }

  return (
    <>
      <AuthShell
        title={t('auth.resetPassword.title')}
        subtitle={t('auth.resetPassword.subtitle.step1')}
        lead={
          <Button
            variant='plain'
            color='neutral'
            size='sm'
            startDecorator={<ArrowBackRounded />}
            component={RouterLink}
            to='/login'
            sx={{ ml: -1.5 }}
          >
            {t('auth.resetPassword.backToLogin')}
          </Button>
        }
      >
        {error && (
          <Alert color='danger' variant='soft' sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleResetPassword}>
          <Stack spacing={2.5}>
            <FormControl error={!!errors.email}>
              <FormLabel>{t('auth.resetPassword.emailLabel')}</FormLabel>
              <Input
                type='email'
                placeholder={t('auth.emailPlaceholder')}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setErrors({ ...errors, email: null })
                }}
                startDecorator={<EmailRounded />}
                size='lg'
              />
              {errors.email && <FormHelperText>{errors.email}</FormHelperText>}
            </FormControl>

            <Button type='submit' size='lg' fullWidth loading={loading}>
              {t('auth.resetPassword.sendCode')}
            </Button>
          </Stack>
        </form>
      </AuthShell>

      {loading && <LinearProgress sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10000 }} />}
    </>
  )
}

export default ResetPassword

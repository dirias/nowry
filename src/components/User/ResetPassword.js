import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Typography, Input, Button, FormControl, FormLabel, FormHelperText, Alert, LinearProgress, Stack } from '@mui/joy'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import {
  EmailRounded,
  CheckCircleRounded,
  ArrowBackRounded,
  AutoStoriesRounded,
  PsychologyRounded,
  SpeedRounded
} from '@mui/icons-material'
import { authService } from '../../api/services/auth.service'

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
      <Box className='auth-view' sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', px: 3 }}>
        <Box sx={{ textAlign: 'center', maxWidth: 360 }}>
          <CheckCircleRounded sx={{ fontSize: 72, color: 'success.plainColor', mb: 2 }} />
          <Typography level='h3' fontWeight={700} mb={1}>
            {t('auth.resetPassword.successTitle')}
          </Typography>
          <Typography level='body-md' sx={{ color: 'text.secondary', mb: 4 }}>
            {t('auth.resetPassword.successMsg')}
          </Typography>
          <Button size='lg' fullWidth onClick={() => navigate('/login')} sx={{ '&:hover': { boxShadow: 'md' } }}>
            {t('auth.resetPassword.goToLogin')}
          </Button>
        </Box>
      </Box>
    )
  }

  return (
    <>
      <Box className='auth-view' sx={{ flex: 1, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, overflow: 'hidden' }}>
        {/* LEFT PANEL — teal brand (desktop only) */}
        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            flex: '0 0 42%',
            flexDirection: 'column',
            justifyContent: 'center',
            px: 7,
            py: 6,
            bgcolor: 'primary.solidBg',
            gap: 5
          }}
        >
          <Box>
            <Typography level='h2' sx={{ color: 'white', fontWeight: 800, lineHeight: 1.2, mb: 2 }}>
              {t('landing.hero.title')}
            </Typography>
            <Typography level='body-md' sx={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.7 }}>
              {t('landing.hero.subtitle')}
            </Typography>
          </Box>

          <Stack spacing={2}>
            {[
              { icon: <AutoStoriesRounded sx={{ fontSize: 18 }} />, label: t('landing.features.smartBooks.title') },
              { icon: <PsychologyRounded sx={{ fontSize: 18 }} />, label: t('landing.features.aiPowered.title') },
              { icon: <SpeedRounded sx={{ fontSize: 18 }} />, label: t('landing.features.spacedRepetition.title') }
            ].map((f) => (
              <Stack key={f.label} direction='row' spacing={1.5} alignItems='center'>
                <Box sx={{ color: 'rgba(255,255,255,0.6)', display: 'flex' }}>{f.icon}</Box>
                <Typography level='body-sm' sx={{ color: 'rgba(255,255,255,0.85)' }}>
                  {f.label}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>

        {/* RIGHT PANEL — form */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.surface',
            px: { xs: 3, sm: 6, md: 8 },
            py: { xs: 4, md: 6 },
            overflowY: 'auto'
          }}
        >
          <Box sx={{ width: '100%', maxWidth: 400 }}>
            <Button
              variant='plain'
              color='neutral'
              size='sm'
              startDecorator={<ArrowBackRounded />}
              component={RouterLink}
              to='/login'
              sx={{ mb: 3, ml: -1 }}
            >
              {t('auth.resetPassword.backToLogin')}
            </Button>

            <Box sx={{ mb: 4 }}>
              <Typography level='h2' fontWeight={700} sx={{ color: 'text.primary', mb: 1 }}>
                {t('auth.resetPassword.title')}
              </Typography>
              <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                {t('auth.resetPassword.subtitle.step1')}
              </Typography>
            </Box>

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

                <Button type='submit' size='lg' fullWidth loading={loading} sx={{ '&:hover': { boxShadow: 'md' } }}>
                  {t('auth.resetPassword.sendCode')}
                </Button>
              </Stack>
            </form>
          </Box>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10000 }} />}
    </>
  )
}

export default ResetPassword

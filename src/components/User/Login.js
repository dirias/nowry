import React, { useState } from 'react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, Typography, Input, Button, Divider, Link, FormControl, FormLabel, Alert, LinearProgress, Stack, IconButton } from '@mui/joy'
import {
  EmailRounded,
  LockRounded,
  VisibilityRounded,
  VisibilityOffRounded,
  Google,
  AutoStoriesRounded,
  PsychologyRounded,
  SpeedRounded
} from '@mui/icons-material'

import { useAuth } from '../../context/AuthContext'
import { authService } from '../../api/services/auth.service'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { login } = useAuth()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Use Firebase Authentication
      await authService.login(email, password)

      // Firebase auth service already handles token storage
      // Reload to update auth state and navigate to home
      window.location.href = '/'
    } catch (error) {
      console.error('Login error:', error)

      // Parse Firebase error codes for user-friendly messages
      let errorMessage = t('auth.errors.loginFailed')

      if (error.code) {
        switch (error.code) {
          case 'auth/invalid-credential':
          case 'auth/wrong-password':
          case 'auth/user-not-found':
            errorMessage = t('auth.errors.invalidCredentials')
            break
          case 'auth/invalid-email':
            errorMessage = t('auth.errors.emailInvalid')
            break
          case 'auth/user-disabled':
            errorMessage = t('auth.errors.accountDisabled')
            break
          case 'auth/too-many-requests':
            errorMessage = t('auth.errors.tooManyAttempts')
            break
          case 'auth/network-request-failed':
            errorMessage = t('auth.errors.networkError')
            break
          default:
            errorMessage = error.message || t('auth.errors.loginFailed')
        }
      } else if (error.message) {
        errorMessage = error.message
      }

      setError(errorMessage)
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    setLoading(true)

    try {
      // Use Firebase Google OAuth
      const response = await authService.loginWithGoogle()

      // A first Google sign-in is one of the two explicit initial navigations to
      // onboarding that ADR-007 preserves — it happens once, at account creation,
      // and is not the global redirect ONB-012 removed. An incomplete user signing
      // in later with email lands on Home like everybody else, and is invited back
      // only if the server's journey state says so.
      if (response && response.backendUser && response.backendUser.wizard_completed === false) {
        window.location.href = '/onboarding'
      } else {
        // Reload to update auth state
        window.location.href = '/'
      }
    } catch (error) {
      console.error('Google login error:', error)

      // Parse Google login errors
      let errorMessage = t('auth.errors.loginFailed')

      if (error.code) {
        switch (error.code) {
          case 'auth/popup-closed-by-user':
            errorMessage = t('auth.errors.googleCancelled')
            break
          case 'auth/popup-blocked':
            errorMessage = t('auth.errors.popupBlocked')
            break
          case 'auth/account-exists-with-different-credential':
            errorMessage = t('auth.errors.accountExistsDifferent')
            break
          case 'auth/network-request-failed':
            errorMessage = t('auth.errors.networkError')
            break
          default:
            errorMessage = error.message || t('auth.errors.loginFailed')
        }
      } else if (error.message) {
        errorMessage = error.message
      }

      setError(errorMessage)
      setLoading(false)
    }
  }

  return (
    <>
      {/* Full-height split layout */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, overflow: 'hidden' }}>
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
            {/* Header */}
            <Box sx={{ mb: 4 }}>
              <Typography level='h2' sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                {t('auth.welcomeBack')}
              </Typography>
              <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                {t('auth.signInSubtitle')}
              </Typography>
            </Box>

            {/* Error Alert */}
            {error && (
              <Alert color='danger' variant='soft' sx={{ mb: 3 }}>
                <Box>
                  <Typography level='body-sm' sx={{ fontWeight: 600, mb: 0.5 }}>
                    {t('auth.errors.unableToSignIn')}
                  </Typography>
                  <Typography level='body-sm' sx={{ opacity: 0.9 }}>
                    {error}
                  </Typography>
                </Box>
              </Alert>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin}>
              <Stack spacing={2.5}>
                <FormControl>
                  <FormLabel>{t('auth.email')}</FormLabel>
                  <Input
                    type='email'
                    placeholder={t('auth.emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    startDecorator={<EmailRounded />}
                    size='lg'
                    required
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>{t('auth.password')}</FormLabel>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder='••••••••'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    startDecorator={<LockRounded />}
                    endDecorator={
                      <IconButton variant='plain' color='neutral' onClick={() => setShowPassword(!showPassword)} sx={{ mr: -1 }}>
                        {showPassword ? <VisibilityOffRounded /> : <VisibilityRounded />}
                      </IconButton>
                    }
                    size='lg'
                    required
                  />
                </FormControl>

                <Box sx={{ textAlign: 'right' }}>
                  <Link
                    component={RouterLink}
                    to='/resetPassword'
                    level='body-sm'
                    sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
                  >
                    {t('auth.forgotPassword')}
                  </Link>
                </Box>

                <Button type='submit' size='lg' fullWidth loading={loading} sx={{ '&:hover': { boxShadow: 'md' } }}>
                  {t('auth.signIn')}
                </Button>
              </Stack>
            </form>

            <Divider sx={{ my: 3 }}>
              <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
                {t('auth.orContinueWith')}
              </Typography>
            </Divider>

            <Stack spacing={1.5}>
              <Button
                variant='outlined'
                color='neutral'
                size='lg'
                fullWidth
                startDecorator={<Google sx={{ color: '#4285F4' }} />}
                onClick={handleGoogleLogin}
                disabled={loading}
                sx={{
                  fontWeight: 600,
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: 'primary.outlinedBorder',
                    backgroundColor: 'primary.softBg',
                    boxShadow: 'sm',
                    transform: 'translateY(-1px)'
                  }
                }}
              >
                {t('auth.signInGoogle')}
              </Button>
            </Stack>

            <Typography level='body-xs' textAlign='center' sx={{ mt: 2, color: 'text.tertiary', lineHeight: 1.5 }}>
              {t('auth.byContinuing')}{' '}
              <Link component={RouterLink} to={t('routes.terms')} sx={{ fontWeight: 500 }}>
                {t('auth.termsOfService')}
              </Link>{' '}
              {t('auth.and')}{' '}
              <Link component={RouterLink} to={t('routes.privacy')} sx={{ fontWeight: 500 }}>
                {t('auth.privacyPolicy')}
              </Link>
            </Typography>

            <Typography level='body-sm' textAlign='center' sx={{ mt: 3, color: 'text.secondary' }}>
              {t('auth.noAccount')}{' '}
              <Link component={RouterLink} to='/register' fontWeight={600} sx={{ color: 'primary.plainColor' }}>
                {t('auth.createOne')}
              </Link>
            </Typography>
          </Box>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10000 }} />}
    </>
  )
}

export default Login

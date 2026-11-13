import React, { useEffect, useState } from 'react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import { LEGAL_PATHS } from '@nowry/core/constants/site'
import { useTranslation } from 'react-i18next'
import { Box, Typography, Input, Button, Divider, Link, FormControl, FormLabel, Alert, LinearProgress, Stack, IconButton } from '@mui/joy'
import { EmailRounded, LockRounded, VisibilityRounded, VisibilityOffRounded, Google } from '@mui/icons-material'
import AuthShell from './AuthShell'

import { useAuth } from '@nowry/core/context/AuthContext'
import { authService } from '@nowry/core/api/services/auth.service'
import { isInviteRefusal } from '@nowry/core/domain/beta'
import { signInProblem as classifySignInProblem, signInProblemKey } from '@nowry/core/domain/signInProblem'
import { authErrorKey, FALLBACK_KEY } from '@nowry/core/domain/authErrors'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  // Why the last sign-in had no account to open (ADR-083): met by this screen's
  // own request, or kept by the auth context from the read that sent us here.
  const [problem, setProblem] = useState(null)
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { signInProblem, clearSignInProblem } = useAuth()
  const shownProblem = problem ?? signInProblem ?? null

  // Each attempt starts with nothing said; the line stays until then.
  const startAttempt = () => {
    setError('')
    setProblem(null)
    clearSignInProblem?.()
    setLoading(true)
  }

  // The identity has no account to open: close it and say which of three it was.
  const showProblem = async (reason) => {
    await authService.logout().catch(() => {})
    setProblem(reason)
    setLoading(false)
  }

  // ADR-077: someone whose sign-up is waiting on its email finishes it on
  // Register, where the confirm step and its way out are.
  useEffect(() => {
    if (authService.heldSignUp()) navigate('/register', { replace: true })
    // On arrival only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    startAttempt()

    try {
      // Use Firebase Authentication
      await authService.login(email, password)

      // Firebase auth service already handles token storage
      // Reload to update auth state and navigate to home
      window.location.href = '/'
    } catch (error) {
      console.error('Login error:', error)

      // ADR-077: a sign-up that is waiting for its email to be confirmed
      // finishes on Register, where the confirm step is.
      if (isInviteRefusal(error) && authService.heldSignUp()) {
        window.location.href = '/register'
        return
      }

      const reason = classifySignInProblem(error)
      if (reason) {
        await showProblem(reason)
        return
      }

      /*
       * One table, shared with the mobile client (MOB-016). This switch used to
       * be written out here and again in Register.js, which is how
       * `auth/network-request-failed` ended up handled in one and not the other.
       * `authErrorKey` always returns a key; the transport message is only a
       * fallback for a code the table has never seen.
       */
      const key = authErrorKey(error)
      const errorMessage = key === FALLBACK_KEY && error.message ? error.message : t(key)

      setError(errorMessage)
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    startAttempt()

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

      /*
       * ADR-038, ADR-083: a Google identity the API will not answer with an
       * account — no invite, an unconfirmed address, no account or a conflict.
       * Sign out of Firebase and say which, never the transport's message.
       */
      const reason = classifySignInProblem(error)
      if (reason) {
        await showProblem(reason)
        return
      }

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
      <AuthShell title={t('auth.welcomeBack')} subtitle={t('auth.signInSubtitle')}>
        {/* Why the last sign-in had no account (ADR-083); the private beta is not a fault. */}
        {shownProblem && !error && (
          <Alert color={shownProblem === 'invite' ? 'neutral' : 'danger'} variant='soft' sx={{ mb: 3 }} role='alert'>
            <Box>
              {shownProblem !== 'invite' && (
                <Typography level='body-sm' sx={{ fontWeight: 'lg', mb: 0.5 }}>
                  {t('auth.errors.unableToSignIn')}
                </Typography>
              )}
              <Typography level='body-sm' sx={{ opacity: 0.9 }}>
                {/* The private beta names the waitlist, the same line Register shows (ADR-083 case 3). */}
                {shownProblem === 'invite' ? t('beta.inviteRequired') : t(signInProblemKey(shownProblem))}
              </Typography>
              {/* One email field on this page: the waitlist is the landing page's early-access section, as the header links it. */}
              {shownProblem === 'invite' && (
                <Link
                  component={RouterLink}
                  to={{ pathname: '/', hash: '#pricing' }}
                  level='body-sm'
                  sx={{ display: 'inline-block', mt: 1, fontWeight: 'lg' }}
                >
                  {t('beta.waitlist.cta')}
                </Link>
              )}
            </Box>
          </Alert>
        )}

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

            <Button type='submit' size='lg' fullWidth loading={loading}>
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
            variant='soft'
            color='neutral'
            size='lg'
            fullWidth
            startDecorator={<Google />}
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            {t('auth.signInGoogle')}
          </Button>
        </Stack>

        <Typography level='body-xs' textAlign='center' sx={{ mt: 2, color: 'text.tertiary', lineHeight: 1.5 }}>
          {t('auth.byContinuing')}{' '}
          <Link component={RouterLink} to={LEGAL_PATHS.terms} sx={{ fontWeight: 500 }}>
            {t('auth.termsOfService')}
          </Link>{' '}
          {t('auth.and')}{' '}
          <Link component={RouterLink} to={LEGAL_PATHS.privacy} sx={{ fontWeight: 500 }}>
            {t('auth.privacyPolicy')}
          </Link>
        </Typography>

        <Typography level='body-sm' textAlign='center' sx={{ mt: 3, color: 'text.secondary' }}>
          {t('auth.noAccount')}{' '}
          <Link component={RouterLink} to='/register' fontWeight={600} sx={{ color: 'primary.plainColor' }}>
            {t('auth.createOne')}
          </Link>
        </Typography>
      </AuthShell>

      {loading && <LinearProgress sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10000 }} />}
    </>
  )
}

export default Login

import React, { useState } from 'react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Typography,
  Input,
  Button,
  Divider,
  Sheet,
  useColorScheme,
  Link,
  FormControl,
  FormLabel,
  Alert,
  LinearProgress,
  Stack,
  IconButton
} from '@mui/joy'
import { EmailRounded, LockRounded, VisibilityRounded, VisibilityOffRounded, LoginRounded, Google, Facebook } from '@mui/icons-material'

import { useAuth } from '../../context/AuthContext'
import { authService } from '../../api/services/auth.service'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { mode } = useColorScheme()
  const isDark = mode === 'dark'
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
      await authService.loginWithGoogle()

      // Reload to update auth state
      window.location.href = '/'
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
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'background.body',
        px: 2
      }}
    >
      <Sheet
        variant='outlined'
        sx={{
          p: { xs: 3, sm: 5 },
          borderRadius: 'xl',
          width: '100%',
          maxWidth: 440,
          boxShadow: 'md',
          backgroundColor: 'background.surface',
          border: '1px solid',
          borderColor: 'divider',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: 'lg'
          }
        }}
      >
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography
            level='h2'
            sx={{
              fontWeight: 700,
              mb: 1,
              color: 'text.primary'
            }}
          >
            {t('auth.welcomeBack')}
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            {t('auth.signInSubtitle')}
          </Typography>
        </Box>

        {/* Error Alert - Improved UX */}
        {error && (
          <Alert
            color='danger'
            variant='soft'
            sx={{
              mb: 3,
              fontSize: '0.875rem',
              '--Alert-padding': '12px 16px'
            }}
          >
            <Box>
              <Typography level='body-sm' sx={{ fontWeight: 600, mb: 0.5 }}>
                {t('auth.errors.unableToSignIn')}
              </Typography>
              <Typography level='body-sm' sx={{ color: 'inherit', opacity: 0.9 }}>
                {error}
              </Typography>
            </Box>
          </Alert>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin}>
          <Stack spacing={2.5}>
            {/* Email Field */}
            <FormControl>
              <FormLabel>{t('auth.email')}</FormLabel>
              <Input
                type='email'
                placeholder='you@example.com'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                startDecorator={<EmailRounded />}
                size='lg'
                required
              />
            </FormControl>

            {/* Password Field */}
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

            {/* Forgot Password Link */}
            <Box sx={{ textAlign: 'right' }}>
              <Link
                component={RouterLink}
                to='/resetPassword'
                level='body-sm'
                sx={{
                  color: 'text.secondary',
                  '&:hover': {
                    color: 'text.primary'
                  }
                }}
              >
                {t('auth.forgotPassword')}
              </Link>
            </Box>

            {/* Login Button */}
            <Button
              type='submit'
              size='lg'
              fullWidth
              loading={loading}
              startDecorator={!loading && <LoginRounded />}
              sx={{
                mt: 2,
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 'md'
                },
                '&:active': {
                  transform: 'translateY(0)'
                }
              }}
            >
              {t('auth.signIn')}
            </Button>
          </Stack>
        </form>

        {/* Divider */}
        <Divider sx={{ my: 3 }}>
          <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
            {t('auth.orContinueWith')}
          </Typography>
        </Divider>

        {/* Social Login */}
        <Stack spacing={1.5}>
          <Button
            variant='outlined'
            color='neutral'
            size='lg'
            fullWidth
            startDecorator={<Google />}
            onClick={handleGoogleLogin}
            disabled={loading}
            sx={{
              '&:hover': {
                borderColor: 'neutral.outlinedHoverBorder',
                backgroundColor: 'neutral.outlinedHoverBg'
              }
            }}
          >
            {t('auth.signInGoogle')}
          </Button>
        </Stack>

        {/* Register Link */}
        <Typography level='body-sm' textAlign='center' sx={{ mt: 3, color: 'text.secondary' }}>
          {t('auth.noAccount')}{' '}
          <Link
            component={RouterLink}
            to='/register'
            fontWeight={600}
            sx={{
              textDecoration: 'underline',
              textUnderlineOffset: '2px'
            }}
          >
            {t('auth.createOne')}
          </Link>
        </Typography>
      </Sheet>

      {/* Loading Bar */}
      {loading && (
        <LinearProgress
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10000
          }}
        />
      )}
    </Box>
  )
}

export default Login

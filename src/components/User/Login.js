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
      // Use login from AuthContext (which handles cookie)
      await login({ email, password })

      // Navigate to home
      // Context will update 'user' state via checkUser()
      navigate('/')
    } catch (error) {
      console.error('Login error:', error.response?.data)
      const detail = error.response?.data?.detail

      if (Array.isArray(detail)) {
        const errorMsg = detail
          .map((err) => {
            const field = err.loc[err.loc.length - 1]
            return `${field}: ${err.msg}`
          })
          .join(', ')
        setError(errorMsg)
      } else {
        setError(detail || error.message || t('auth.errors.loginFailed'))
      }
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
        backgroundColor: isDark ? 'neutral.900' : 'neutral.50',
        px: 2,
        transition: 'background 0.3s ease'
      }}
    >
      <Sheet
        variant='outlined'
        sx={{
          p: 5,
          borderRadius: 'xl',
          width: '100%',
          maxWidth: 440,
          boxShadow: 'xl',
          backgroundColor: isDark ? 'rgba(26, 26, 46, 0.9)' : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          border: 'none',
          transform: 'translateY(0)',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
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
              color: isDark ? 'primary.300' : 'primary.700'
            }}
          >
            {t('auth.welcomeBack')}
          </Typography>
          <Typography level='body-sm' sx={{ color: 'neutral.600' }}>
            {t('auth.signInSubtitle')}
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert color='danger' variant='soft' sx={{ mb: 3, animation: 'fadeIn 0.3s ease' }} onClose={() => setError('')}>
            {error}
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
                sx={{
                  '--Input-focusedThickness': '0.25rem',
                  transition: 'all 0.2s ease'
                }}
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
                sx={{
                  '--Input-focusedThickness': '0.25rem',
                  transition: 'all 0.2s ease'
                }}
              />
            </FormControl>

            {/* Forgot Password Link */}
            <Box sx={{ textAlign: 'right' }}>
              <Link component={RouterLink} to='/resetPassword' level='body-sm' sx={{ transition: 'color 0.2s ease' }}>
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
                mt: 3,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 'lg'
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
          <Typography level='body-sm' sx={{ color: 'neutral.500' }}>
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
            sx={{
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: '#EA4335',
                backgroundColor: 'rgba(234, 67, 53, 0.08)'
              }
            }}
          >
            {t('auth.signInGoogle')}
          </Button>

          <Button
            variant='outlined'
            color='neutral'
            size='lg'
            fullWidth
            startDecorator={<Facebook />}
            sx={{
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: '#1877F2',
                backgroundColor: 'rgba(24, 119, 242, 0.08)'
              }
            }}
          >
            {t('auth.signInFacebook')}
          </Button>
        </Stack>

        {/* Register Link */}
        <Typography level='body-sm' textAlign='center' sx={{ mt: 3 }}>
          {t('auth.noAccount')}{' '}
          <Link component={RouterLink} to='/register' fontWeight={600} color='primary'>
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

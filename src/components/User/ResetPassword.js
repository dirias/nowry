import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Typography,
  Input,
  Button,
  FormControl,
  FormLabel,
  FormHelperText,
  Sheet,
  useColorScheme,
  Alert,
  LinearProgress,
  Stack
} from '@mui/joy'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { EmailRounded, CheckCircleRounded, ArrowBackRounded } from '@mui/icons-material'
import { authService } from '../../api/services/auth.service'

const ResetPassword = () => {
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { mode } = useColorScheme()
  const isDark = mode === 'dark'
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
      // Firebase specific error codes can be handled here if needed
      setError(t('auth.errors.serverError') || 'Failed to send reset email. Please try again.')
    }
  }

  // Success State
  if (isSubmitted) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          px: 2
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
            backgroundColor: 'background.surface',
            backdropFilter: 'blur(10px)',
            border: 'none',
            textAlign: 'center'
          }}
        >
          <CheckCircleRounded sx={{ fontSize: 80, color: 'success.500', mb: 2 }} />
          <Typography level='h3' fontWeight={700} mb={1}>
            {t('auth.resetPassword.successTitle')}
          </Typography>
          <Typography level='body-md' sx={{ color: 'text.secondary', mb: 4 }}>
            {t('auth.resetPassword.successMsg')}
          </Typography>
          <Button
            size='lg'
            fullWidth
            onClick={() => navigate('/login')}
            sx={{
              transition: 'all 0.2s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 'md'
              }
            }}
          >
            {t('auth.resetPassword.goToLogin')}
          </Button>
        </Sheet>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'background.body',
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
          backgroundColor: 'background.surface',
          backdropFilter: 'blur(10px)',
          border: 'none',
          transform: 'translateY(0)',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }
        }}
      >
        {/* Back Button */}
        <Button
          variant='plain'
          color='neutral'
          size='sm'
          startDecorator={<ArrowBackRounded />}
          component={RouterLink}
          to='/login'
          sx={{ mb: 2, alignSelf: 'flex-start' }}
        >
          {t('auth.resetPassword.backToLogin')}
        </Button>

        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography
            level='h2'
            fontWeight={700}
            sx={{
              mb: 0.5,
              color: isDark ? 'text.primary' : 'text.primary'
            }}
          >
            {t('auth.resetPassword.title')}
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            {t('auth.resetPassword.subtitle.step1')}
          </Typography>
        </Box>

        {/* General Error Alert */}
        {error && (
          <Alert color='danger' variant='soft' sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Reset Form */}
        <form onSubmit={handleResetPassword}>
          <Stack spacing={2.5}>
            <FormControl error={!!errors.email}>
              <FormLabel>{t('auth.resetPassword.emailLabel')}</FormLabel>
              <Input
                type='email'
                placeholder='you@example.com'
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setErrors({ ...errors, email: null })
                }}
                startDecorator={<EmailRounded />}
                size='lg'
                sx={{ '--Input-focusedThickness': '0.25rem' }}
              />
              {errors.email && <FormHelperText>{errors.email}</FormHelperText>}
            </FormControl>

            <Button
              type='submit'
              size='lg'
              fullWidth
              loading={loading}
              sx={{
                mt: 2,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 'md'
                }
              }}
            >
              {t('auth.resetPassword.sendCode')}
            </Button>
          </Stack>
        </form>
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

export default ResetPassword

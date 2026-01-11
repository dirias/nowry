import React, { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
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
  Link,
  Alert,
  LinearProgress,
  Stack,
  IconButton
} from '@mui/joy'
import {
  PersonRounded,
  EmailRounded,
  LockRounded,
  VisibilityRounded,
  VisibilityOffRounded,
  CheckCircleRounded,
  CheckBoxOutlineBlank,
  CheckBox
} from '@mui/icons-material'
import { useAuth } from '../../context/AuthContext'
import { authService } from '../../api/services/auth.service'

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    passwordConfirmation: '',
    acceptedTerms: false
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [registrationSuccess, setRegistrationSuccess] = useState(false)
  const navigate = useNavigate()
  const { mode } = useColorScheme()
  const isDark = mode === 'dark'
  const { t } = useTranslation()
  const { login } = useAuth()

  // Password strength calculation
  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: '', color: 'neutral' }
    let strength = 0
    if (password.length >= 8) strength += 25
    if (password.length >= 12) strength += 25
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25
    if (/\d/.test(password)) strength += 15
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 10

    let label = '',
      color = 'neutral'
    if (strength < 40) {
      label = t('auth.passwordStrength.weak')
      color = 'danger'
    } else if (strength < 70) {
      label = t('auth.passwordStrength.fair')
      color = 'warning'
    } else {
      label = t('auth.passwordStrength.strong')
      color = 'success'
    }

    return { strength, label, color }
  }

  const passwordStrength = getPasswordStrength(formData.password)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    })
    // Clear error for this field
    if (errors[name]) {
      setErrors({ ...errors, [name]: null })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErrors = {}

    // Validation
    if (!formData.username) newErrors.username = t('auth.errors.usernameRequired')
    if (!formData.email) newErrors.email = t('auth.errors.emailRequired')
    if (!formData.password) newErrors.password = t('auth.errors.passwordRequired')
    if (formData.password.length < 8) newErrors.password = t('auth.errors.passwordLength')
    if (formData.password !== formData.passwordConfirmation) {
      newErrors.passwordConfirmation = t('auth.errors.passwordMismatch')
    }
    if (!formData.acceptedTerms) {
      newErrors.acceptedTerms = t('auth.errors.termsRequired')
    }

    if (Object.keys(newErrors).length === 0) {
      setLoading(true)
      try {
        // 1. Create user in Firebase Auth & sync to MongoDB
        await authService.register(formData.email, formData.password, formData.username)

        // Firebase auth service already logs the user in and stores the token
        // No need to call the old login endpoint

        setRegistrationSuccess(true)

        // Redirect to onboarding wizard after 1.5 seconds
        setTimeout(() => {
          navigate('/onboarding')
        }, 1500)
      } catch (error) {
        console.error('Registration error:', error)
        newErrors.serverError = error.message || t('auth.errors.serverError')
        setErrors(newErrors)
        setLoading(false)
      }
    } else {
      setErrors(newErrors)
    }
  }

  if (registrationSuccess) {
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
            {t('auth.success.welcome')}
          </Typography>
          <Typography level='body-md' sx={{ color: 'text.secondary', mb: 3 }}>
            {t('auth.success.accountCreated')}
          </Typography>
          <LinearProgress sx={{ mb: 2 }} />
          <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
            {t('auth.success.redirecting')}
          </Typography>
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
        py: 4,
        transition: 'background 0.3s ease'
      }}
    >
      <Sheet
        variant='outlined'
        sx={{
          p: 5,
          borderRadius: 'xl',
          width: '100%',
          maxWidth: 480,
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
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography
            level='h2'
            fontWeight={700}
            sx={{
              color: 'text.primary',
              mb: 1
            }}
          >
            {t('auth.createAccount')}
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            {t('auth.createAccountSubtitle')}
          </Typography>
        </Box>

        {/* Error Alert */}
        {errors.serverError && (
          <Alert
            color='danger'
            variant='soft'
            sx={{ mb: 3, animation: 'fadeIn 0.3s ease' }}
            onClose={() => setErrors({ ...errors, serverError: null })}
          >
            {errors.serverError}
          </Alert>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit}>
          <Stack spacing={2.5}>
            {/* Username Field */}
            <FormControl error={!!errors.username}>
              <FormLabel>{t('auth.username')}</FormLabel>
              <Input
                type='text'
                name='username'
                placeholder='johndoe'
                value={formData.username}
                onChange={handleChange}
                startDecorator={<PersonRounded />}
                size='lg'
                sx={{ '--Input-focusedThickness': '0.25rem' }}
              />
              {errors.username && <FormHelperText>{errors.username}</FormHelperText>}
            </FormControl>

            {/* Email Field */}
            <FormControl error={!!errors.email}>
              <FormLabel>{t('auth.email')}</FormLabel>
              <Input
                type='email'
                name='email'
                placeholder='you@example.com'
                value={formData.email}
                onChange={handleChange}
                startDecorator={<EmailRounded />}
                size='lg'
                sx={{ '--Input-focusedThickness': '0.25rem' }}
              />
              {errors.email && <FormHelperText>{errors.email}</FormHelperText>}
            </FormControl>

            {/* Password Field */}
            <FormControl error={!!errors.password}>
              <FormLabel>{t('auth.password')}</FormLabel>
              <Input
                type={showPassword ? 'text' : 'password'}
                name='password'
                placeholder='••••••••'
                value={formData.password}
                onChange={handleChange}
                startDecorator={<LockRounded />}
                endDecorator={
                  <IconButton variant='plain' color='neutral' onClick={() => setShowPassword(!showPassword)} sx={{ mr: -1 }}>
                    {showPassword ? <VisibilityOffRounded /> : <VisibilityRounded />}
                  </IconButton>
                }
                size='lg'
                sx={{ '--Input-focusedThickness': '0.25rem' }}
              />
              {formData.password && (
                <Box sx={{ mt: 1 }}>
                  <Stack direction='row' justifyContent='space-between' mb={0.5}>
                    <Typography level='body-xs' sx={{ color: `${passwordStrength.color}.600` }}>
                      {passwordStrength.label}
                    </Typography>
                    <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                      {passwordStrength.strength}%
                    </Typography>
                  </Stack>
                  <LinearProgress determinate value={passwordStrength.strength} color={passwordStrength.color} sx={{ height: 4 }} />
                </Box>
              )}
              {errors.password && <FormHelperText>{errors.password}</FormHelperText>}
            </FormControl>

            {/* Confirm Password Field */}
            <FormControl error={!!errors.passwordConfirmation}>
              <FormLabel>{t('auth.confirmPassword')}</FormLabel>
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                name='passwordConfirmation'
                placeholder='••••••••'
                value={formData.passwordConfirmation}
                onChange={handleChange}
                startDecorator={<LockRounded />}
                endDecorator={
                  <IconButton variant='plain' color='neutral' onClick={() => setShowConfirmPassword(!showConfirmPassword)} sx={{ mr: -1 }}>
                    {showConfirmPassword ? <VisibilityOffRounded /> : <VisibilityRounded />}
                  </IconButton>
                }
                size='lg'
                sx={{ '--Input-focusedThickness': '0.25rem' }}
              />
              {errors.passwordConfirmation && <FormHelperText>{errors.passwordConfirmation}</FormHelperText>}
            </FormControl>

            {/* Terms Checkbox */}
            <FormControl error={!!errors.acceptedTerms}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  cursor: 'pointer',
                  '&:hover .checkbox-icon': {
                    color: formData.acceptedTerms ? 'primary.solidHoverBg' : 'primary.plainColor'
                  },
                  '&:hover .checkbox-text': {
                    color: 'neutral.plainHoverColor'
                  }
                }}
                onClick={(e) => {
                  // Don't toggle if clicking on links
                  if (e.target.tagName !== 'A') {
                    setFormData({ ...formData, acceptedTerms: !formData.acceptedTerms })
                    if (errors.acceptedTerms) {
                      setErrors({ ...errors, acceptedTerms: null })
                    }
                  }
                }}
              >
                {/* Custom Checkbox using Icons */}
                <Box
                  className='checkbox-icon'
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: formData.acceptedTerms ? 'primary.solidBg' : 'neutral.outlinedBorder',
                    transition: 'color 0.2s ease'
                  }}
                >
                  {formData.acceptedTerms ? <CheckBox sx={{ fontSize: 24 }} /> : <CheckBoxOutlineBlank sx={{ fontSize: 24 }} />}
                </Box>
                <Typography level='body-sm' className='checkbox-text' sx={{ color: 'neutral.plainColor', flex: 1 }}>
                  {t('auth.agreeTerms')}{' '}
                  <Link
                    component={RouterLink}
                    to={t('routes.terms')}
                    sx={{
                      textDecoration: 'underline',
                      textUnderlineOffset: '2px',
                      fontWeight: 500
                    }}
                  >
                    {t('auth.termsOfService')}
                  </Link>{' '}
                  {t('auth.and')}{' '}
                  <Link
                    component={RouterLink}
                    to={t('routes.privacy')}
                    sx={{
                      textDecoration: 'underline',
                      textUnderlineOffset: '2px',
                      fontWeight: 500
                    }}
                  >
                    {t('auth.privacyPolicy')}
                  </Link>
                </Typography>
              </Box>
              {errors.acceptedTerms && <FormHelperText>{errors.acceptedTerms}</FormHelperText>}
            </FormControl>

            {/* Register Button */}
            <Button
              type='submit'
              size='lg'
              fullWidth
              loading={loading}
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
              {t('auth.signUp')}
            </Button>
          </Stack>
        </form>

        {/* Login Link */}
        <Typography level='body-sm' textAlign='center' sx={{ mt: 3 }}>
          {t('auth.hasAccount')}{' '}
          <Link
            component={RouterLink}
            to='/login'
            sx={{
              fontWeight: 700,
              mb: 1,
              color: isDark ? 'text.primary' : 'text.primary'
            }}
          >
            {t('auth.signInLink')}
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

export default Register

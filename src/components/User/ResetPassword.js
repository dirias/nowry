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
  Link,
  Alert,
  LinearProgress,
  Stack,
  IconButton
} from '@mui/joy'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import {
  EmailRounded,
  LockRounded,
  VisibilityRounded,
  VisibilityOffRounded,
  CheckCircleRounded,
  ArrowBackRounded
} from '@mui/icons-material'

const ResetPassword = () => {
  const [step, setStep] = useState(1) // 1: Email, 2: Code, 3: New Password
  const [email, setEmail] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const { mode } = useColorScheme()
  const isDark = mode === 'dark'
  const navigate = useNavigate()
  const { t } = useTranslation()

  // Password strength strength
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

  const passwordStrength = getPasswordStrength(newPassword)

  const handleSendCode = async (e) => {
    e.preventDefault()
    const newErrors = {}

    if (!email) newErrors.email = t('auth.errors.emailRequired')
    if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = t('auth.errors.emailInvalid')

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    // Simulate API call
    setTimeout(() => {
      setLoading(false)
      setStep(2)
      setSuccessMessage(t('resetPassword.codeSent'))
      setTimeout(() => setSuccessMessage(''), 3000)
    }, 1000)
  }

  const handleVerifyCode = async (e) => {
    e.preventDefault()
    const newErrors = {}

    if (!verificationCode) newErrors.verificationCode = t('resetPassword.errors.codeRequired')
    if (verificationCode.length !== 6) newErrors.verificationCode = t('resetPassword.errors.codeLength')

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    // Simulate API call
    setTimeout(() => {
      setLoading(false)
      setStep(3)
    }, 1000)
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    const newErrors = {}

    if (!newPassword) newErrors.newPassword = t('auth.errors.passwordRequired')
    if (newPassword.length < 8) newErrors.newPassword = t('auth.errors.passwordLength')
    if (newPassword !== confirmNewPassword) {
      newErrors.confirmNewPassword = t('auth.errors.passwordMismatch')
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    // Simulate API call
    setTimeout(() => {
      setLoading(false)
      setStep(4)
    }, 1000)
  }

  // Success State - Step 4
  if (step === 4) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: isDark ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
            backgroundColor: isDark ? 'rgba(26, 26, 46, 0.9)' : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            border: 'none',
            textAlign: 'center'
          }}
        >
          <CheckCircleRounded sx={{ fontSize: 80, color: 'success.500', mb: 2 }} />
          <Typography level='h3' fontWeight={700} mb={1}>
            {t('resetPassword.successTitle')}
          </Typography>
          <Typography level='body-md' sx={{ color: 'neutral.600', mb: 4 }}>
            {t('resetPassword.successMsg')}
          </Typography>
          <Button
            size='lg'
            fullWidth
            onClick={() => navigate('/login')}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 10px 30px rgba(102, 126, 234, 0.4)'
              }
            }}
          >
            {t('resetPassword.goToLogin')}
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
          {t('resetPassword.backToLogin')}
        </Button>

        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography
            level='h2'
            fontWeight={700}
            sx={{
              mb: 0.5,
              color: isDark ? 'primary.300' : 'primary.700'
            }}
          >
            {t('resetPassword.title')}
          </Typography>
          <Typography level='body-sm' sx={{ color: 'neutral.600' }}>
            {step === 1 && t('resetPassword.subtitle.step1')}
            {step === 2 && t('resetPassword.subtitle.step2')}
            {step === 3 && t('resetPassword.subtitle.step3')}
          </Typography>
        </Box>

        {/* Progress Indicator */}
        <Box sx={{ mb: 4 }}>
          <Stack direction='row' spacing={1} justifyContent='center'>
            {[1, 2, 3].map((s) => (
              <Box
                key={s}
                sx={{
                  width: 40,
                  height: 4,
                  borderRadius: 'sm',
                  backgroundColor: s <= step ? 'primary.500' : 'neutral.200',
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </Stack>
        </Box>

        {/* Success Message */}
        {successMessage && (
          <Alert color='success' variant='soft' sx={{ mb: 3 }}>
            {successMessage}
          </Alert>
        )}

        {/* Step 1: Email */}
        {step === 1 && (
          <form onSubmit={handleSendCode}>
            <Stack spacing={2.5}>
              <FormControl error={!!errors.email}>
                <FormLabel>{t('resetPassword.emailLabel')}</FormLabel>
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
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 10px 30px rgba(102, 126, 234, 0.4)'
                  }
                }}
              >
                {t('resetPassword.sendCode')}
              </Button>
            </Stack>
          </form>
        )}

        {/* Step 2: Verification Code */}
        {step === 2 && (
          <form onSubmit={handleVerifyCode}>
            <Stack spacing={2.5}>
              <FormControl error={!!errors.verificationCode}>
                <FormLabel>{t('resetPassword.codeLabel')}</FormLabel>
                <Input
                  type='text'
                  placeholder='000000'
                  value={verificationCode}
                  onChange={(e) => {
                    setVerificationCode(e.target.value)
                    setErrors({ ...errors, verificationCode: null })
                  }}
                  size='lg'
                  slotProps={{
                    input: {
                      maxLength: 6,
                      style: {
                        textAlign: 'center',
                        fontSize: '24px',
                        letterSpacing: '8px'
                      }
                    }
                  }}
                  sx={{ '--Input-focusedThickness': '0.25rem' }}
                />
                {errors.verificationCode && <FormHelperText>{errors.verificationCode}</FormHelperText>}
              </FormControl>

              <Typography level='body-xs' textAlign='center' sx={{ color: 'neutral.600' }}>
                {t('resetPassword.resendPrompt')}{' '}
                <Link onClick={() => setStep(1)} sx={{ cursor: 'pointer' }}>
                  {t('resetPassword.resend')}
                </Link>
              </Typography>

              <Button
                type='submit'
                size='lg'
                fullWidth
                loading={loading}
                sx={{
                  mt: 2,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 10px 30px rgba(102, 126, 234, 0.4)'
                  }
                }}
              >
                {t('resetPassword.verifyCode')}
              </Button>
            </Stack>
          </form>
        )}

        {/* Step 3: New Password */}
        {step === 3 && (
          <form onSubmit={handleResetPassword}>
            <Stack spacing={2.5}>
              <FormControl error={!!errors.newPassword}>
                <FormLabel>{t('resetPassword.newPasswordLabel')}</FormLabel>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder='••••••••'
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value)
                    setErrors({ ...errors, newPassword: null })
                  }}
                  startDecorator={<LockRounded />}
                  endDecorator={
                    <IconButton variant='plain' color='neutral' onClick={() => setShowPassword(!showPassword)} sx={{ mr: -1 }}>
                      {showPassword ? <VisibilityOffRounded /> : <VisibilityRounded />}
                    </IconButton>
                  }
                  size='lg'
                  sx={{ '--Input-focusedThickness': '0.25rem' }}
                />
                {newPassword && (
                  <Box sx={{ mt: 1 }}>
                    <Stack direction='row' justifyContent='space-between' mb={0.5}>
                      <Typography level='body-xs' sx={{ color: `${passwordStrength.color}.600` }}>
                        {passwordStrength.label}
                      </Typography>
                      <Typography level='body-xs' sx={{ color: 'neutral.500' }}>
                        {passwordStrength.strength}%
                      </Typography>
                    </Stack>
                    <LinearProgress determinate value={passwordStrength.strength} color={passwordStrength.color} sx={{ height: 4 }} />
                  </Box>
                )}
                {errors.newPassword && <FormHelperText>{errors.newPassword}</FormHelperText>}
              </FormControl>

              <FormControl error={!!errors.confirmNewPassword}>
                <FormLabel>{t('resetPassword.confirmNewPasswordLabel')}</FormLabel>
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder='••••••••'
                  value={confirmNewPassword}
                  onChange={(e) => {
                    setConfirmNewPassword(e.target.value)
                    setErrors({ ...errors, confirmNewPassword: null })
                  }}
                  startDecorator={<LockRounded />}
                  endDecorator={
                    <IconButton
                      variant='plain'
                      color='neutral'
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      sx={{ mr: -1 }}
                    >
                      {showConfirmPassword ? <VisibilityOffRounded /> : <VisibilityRounded />}
                    </IconButton>
                  }
                  size='lg'
                  sx={{ '--Input-focusedThickness': '0.25rem' }}
                />
                {errors.confirmNewPassword && <FormHelperText>{errors.confirmNewPassword}</FormHelperText>}
              </FormControl>

              <Button
                type='submit'
                size='lg'
                fullWidth
                loading={loading}
                sx={{
                  mt: 2,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 10px 30px rgba(102, 126, 234, 0.4)'
                  }
                }}
              >
                {t('resetPassword.title')}
              </Button>
            </Stack>
          </form>
        )}
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

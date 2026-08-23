import React, { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Typography,
  Input,
  Button,
  Checkbox,
  FormControl,
  FormLabel,
  FormHelperText,
  Link,
  Alert,
  LinearProgress,
  Stack,
  IconButton,
  Divider
} from '@mui/joy'
import {
  PersonRounded,
  EmailRounded,
  LockRounded,
  VisibilityRounded,
  VisibilityOffRounded,
  CheckCircleRounded,
  AutoStoriesRounded,
  PsychologyRounded,
  SpeedRounded,
  Google
} from '@mui/icons-material'
import { useAuth } from '../../context/AuthContext'
import { authService } from '../../api/services/auth.service'
import { getUsernameValidationError } from '../../utils/usernameValidation'

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
    if (!formData.username) {
      newErrors.username = t('auth.errors.usernameRequired')
    } else {
      // Client-side mirror of the backend's format rule (min_length=3,
      // max_length=30, pattern=^[a-zA-Z0-9_-]+$ on POST /auth/register). The
      // 422 branch below is the authoritative fallback if this drifts.
      const usernameFormatError = getUsernameValidationError(formData.username, t)
      if (usernameFormatError) newErrors.username = usernameFormatError
    }
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
        // PublicOnlyRoute (wrapping this route) redirects to `/` the instant
        // `isAuthenticated` flips true, which happens inside Firebase's
        // onAuthStateChanged listener — often before this function's own
        // continuation below even runs. Racing it with a plain `navigate('/onboarding')`
        // after the fact always lost: the guard's redirect to `/` fired first,
        // flashing Home for the rest of the delay before the stale timer below
        // finally dragged the user into onboarding. Setting `returnUrl` here,
        // before the account is created, makes PublicOnlyRoute itself land the
        // user on `/onboarding` the moment it reacts — no second navigator to
        // race against.
        navigate('/register?returnUrl=%2Fonboarding', { replace: true })

        // 1. Create user in Firebase Auth & sync to MongoDB
        await authService.register(formData.email, formData.password, formData.username)

        // Firebase auth service already logs the user in and stores the token
        // No need to call the old login endpoint

        setRegistrationSuccess(true)

        // The explicit initial post-auth navigation ADR-007 keeps: a brand-new
        // account starts in onboarding once. Nothing sends them back afterwards —
        // ONB-012 removed the global redirect, so leaving is now genuinely leaving.
        // PublicOnlyRoute's returnUrl redirect (set above) handles the normal
        // case immediately; this is only a safety net in case that guard is
        // ever slow to react.
        setTimeout(() => {
          navigate('/onboarding')
        }, 1500)
      } catch (error) {
        console.error('Registration error:', error)

        // The server is the source of truth on username format — the check
        // above is UX sugar and could drift from the backend's rule. A 422
        // whose Pydantic error list names `username` means the backend
        // rejected the value; surface it on the field itself instead of the
        // generic banner, matching how the client-side format error reads.
        const detail = error.response?.data?.detail
        const usernameFormatRejected =
          error.response?.status === 422 && Array.isArray(detail) && detail.some((item) => (item?.loc || []).includes('username'))

        if (usernameFormatRejected) {
          newErrors.username = t('settings.account.usernameInvalid')
        } else {
          newErrors.serverError = error.message || t('auth.errors.serverError')
        }
        setErrors(newErrors)
        setLoading(false)
      }
    } else {
      setErrors(newErrors)
    }
  }

  const handleGoogleLogin = async () => {
    setErrors({})
    setLoading(true)

    try {
      // Use Firebase Google OAuth
      const response = await authService.loginWithGoogle()

      // Same explicit one-time navigation as Login's Google path (ADR-007):
      // first-time Google users start in onboarding, everybody else goes Home.
      if (response && response.backendUser && response.backendUser.wizard_completed === false) {
        window.location.href = '/onboarding'
      } else {
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

      setErrors({ serverError: errorMessage })
      setLoading(false)
    }
  }

  if (registrationSuccess) {
    return (
      <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', px: 3 }}>
        <Box sx={{ textAlign: 'center', maxWidth: 360 }}>
          <CheckCircleRounded sx={{ fontSize: 72, color: 'success.plainColor', mb: 2 }} />
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
        </Box>
      </Box>
    )
  }

  return (
    <>
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
              {t('landing.cta.title')}
            </Typography>
            <Typography level='body-md' sx={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.7 }}>
              {t('landing.cta.subtitle')}
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
            alignItems: 'flex-start',
            justifyContent: 'center',
            bgcolor: 'background.surface',
            px: { xs: 3, sm: 6, md: 8 },
            py: { xs: 4, md: 6 },
            overflowY: 'auto'
          }}
        >
          <Box sx={{ width: '100%', maxWidth: 420, py: { md: 2 } }}>
            <Box sx={{ mb: 4 }}>
              <Typography level='h2' fontWeight={700} sx={{ color: 'text.primary', mb: 1 }}>
                {t('auth.createAccount')}
              </Typography>
              <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                {t('auth.createAccountSubtitle')}
              </Typography>
            </Box>

            {errors.serverError && (
              <Alert color='danger' variant='soft' sx={{ mb: 3 }} onClose={() => setErrors({ ...errors, serverError: null })}>
                {errors.serverError}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <Stack spacing={2.5}>
                <FormControl error={!!errors.username}>
                  <FormLabel>{t('auth.username')}</FormLabel>
                  <Input
                    type='text'
                    name='username'
                    placeholder={t('auth.usernamePlaceholder')}
                    value={formData.username}
                    onChange={handleChange}
                    startDecorator={<PersonRounded />}
                    size='lg'
                  />
                  {errors.username && <FormHelperText>{errors.username}</FormHelperText>}
                </FormControl>

                <FormControl error={!!errors.email}>
                  <FormLabel>{t('auth.email')}</FormLabel>
                  <Input
                    type='email'
                    name='email'
                    placeholder={t('auth.emailPlaceholder')}
                    value={formData.email}
                    onChange={handleChange}
                    startDecorator={<EmailRounded />}
                    size='lg'
                  />
                  {errors.email && <FormHelperText>{errors.email}</FormHelperText>}
                </FormControl>

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
                  />
                  {formData.password && (
                    <Box sx={{ mt: 1 }}>
                      <Stack direction='row' justifyContent='space-between' mb={0.5}>
                        <Typography level='body-xs' sx={{ color: `${passwordStrength.color}.plainColor` }}>
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
                  />
                  {errors.passwordConfirmation && <FormHelperText>{errors.passwordConfirmation}</FormHelperText>}
                </FormControl>

                <FormControl error={!!errors.acceptedTerms}>
                  <Checkbox
                    checked={formData.acceptedTerms}
                    onChange={(e) => {
                      setFormData({ ...formData, acceptedTerms: e.target.checked })
                      if (errors.acceptedTerms) setErrors({ ...errors, acceptedTerms: null })
                    }}
                    label={
                      <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                        {t('auth.agreeTerms')}{' '}
                        <Link component={RouterLink} to={t('routes.terms')} sx={{ fontWeight: 500 }}>
                          {t('auth.termsOfService')}
                        </Link>{' '}
                        {t('auth.and')}{' '}
                        <Link component={RouterLink} to={t('routes.privacy')} sx={{ fontWeight: 500 }}>
                          {t('auth.privacyPolicy')}
                        </Link>
                      </Typography>
                    }
                  />
                  {errors.acceptedTerms && <FormHelperText>{errors.acceptedTerms}</FormHelperText>}
                </FormControl>

                <Button type='submit' size='lg' fullWidth loading={loading} sx={{ mt: 1, '&:hover': { boxShadow: 'md' } }}>
                  {t('auth.signUp')}
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
              {t('auth.hasAccount')}{' '}
              <Link component={RouterLink} to='/login' sx={{ fontWeight: 700, color: 'primary.plainColor' }}>
                {t('auth.signInLink')}
              </Link>
            </Typography>
          </Box>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10000 }} />}
    </>
  )
}

export default Register

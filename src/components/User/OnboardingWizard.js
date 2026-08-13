import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, Typography, Button, Stack, Sheet, useColorScheme } from '@mui/joy'
import { ArrowBackRounded, ArrowForwardRounded } from '@mui/icons-material'
import { userService } from '../../api/services'
import { useThemePreferences } from '../../theme/DynamicThemeProvider'
import { getColorPresets } from '../../theme/colorSchemeGenerator'
import { useAuth } from '../../context/AuthContext'
import OnboardingStepDots from './OnboardingStepDots'
import OnboardingStepTransition from './OnboardingStepTransition'
import StepIdentity from './StepIdentity'
import StepAppearance from './StepAppearance'
import StepFocus from './StepFocus'
import StepInterests from './StepInterests'
import StepReady from './StepReady'

const TOTAL_STEPS = 5

const availableLanguages = [
  { value: 'en', label: 'English', flag: '🇺🇸' },
  { value: 'es', label: 'Español', flag: '🇪🇸' },
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { value: 'ja', label: '日本語', flag: '🇯🇵' }
]

const OnboardingWizard = () => {
  const [currentStep, setCurrentStep] = useState(1)
  const [stepDirection, setStepDirection] = useState('forward')
  const [isExiting, setIsExiting] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()
  const { mode, setMode } = useColorScheme()
  const { themeColor, setThemeColor } = useThemePreferences()
  const { t } = useTranslation()
  const { user, logout, checkUser } = useAuth()
  const stepHeadingRef = useRef(null)

  const colorPresets = getColorPresets()

  const [preferences, setPreferences] = useState({
    language: navigator.language?.slice(0, 2) || 'en',
    theme_color: colorPresets[0].color,
    theme_mode: mode || 'light',
    primary_topic: '',
    interests: [],
    study_goal: 'general'
  })

  // Focus the step heading on every step change for screen reader accessibility
  useEffect(() => {
    stepHeadingRef.current?.focus()
  }, [currentStep])

  const handleNext = () => {
    setStepDirection('forward')
    setCurrentStep((s) => s + 1)
  }

  const handleBack = () => {
    setStepDirection('back')
    setCurrentStep((s) => s - 1)
  }

  const handleToggleInterest = (value) => {
    setPreferences((prev) => ({
      ...prev,
      interests: prev.interests.includes(value) ? prev.interests.filter((i) => i !== value) : [...prev.interests, value]
    }))
  }

  const handleColorChange = (color) => {
    setPreferences((prev) => ({ ...prev, theme_color: color }))
    setThemeColor(color)
  }

  const handleModeChange = (newMode) => {
    setPreferences((prev) => ({ ...prev, theme_mode: newMode }))
    setMode(newMode)
  }

  const handleFinish = async () => {
    if (loading) return
    setLoading(true)
    setSaveError(null)

    if (!user) {
      navigate('/login')
      return
    }

    try {
      await userService.updateGeneralPreferences({
        language: preferences.language,
        theme_color: preferences.theme_color,
        primary_topic: preferences.primary_topic,
        interests: preferences.interests,
        study_goal: preferences.study_goal
      })
      await userService.completeWizard()
      // Refresh AuthContext so user.wizard_completed is true before navigating.
      // Without this, App.js sees the stale user and bounces back to /onboarding.
      await checkUser()
      setIsExiting(true)
      setTimeout(() => navigate('/'), 420)
    } catch (error) {
      setLoading(false)
      setIsExiting(false)
      if (error?.response?.status === 401) {
        await logout()
        navigate('/login')
      } else {
        setSaveError(t('onboarding.error.saveFailed'))
      }
    }
  }

  const handleDefer = () => {
    // Mark as skipped for this session only — wizard remains incomplete in the DB
    // so the user can be nudged to return. App.js checks this key to prevent
    // the redirect loop within the same browser session.
    sessionStorage.setItem('onboarding_skipped', 'true')
    navigate('/')
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepIdentity
            language={preferences.language}
            onChangeLanguage={(val) => setPreferences((prev) => ({ ...prev, language: val }))}
            themeColor={preferences.theme_color}
            availableLanguages={availableLanguages}
            headingRef={stepHeadingRef}
          />
        )
      case 2:
        return (
          <StepAppearance
            themeMode={preferences.theme_mode}
            themeColor={preferences.theme_color}
            onChangeMode={handleModeChange}
            onChangeColor={handleColorChange}
            colorPresets={colorPresets}
            headingRef={stepHeadingRef}
          />
        )
      case 3:
        return (
          <StepFocus
            topic={preferences.primary_topic}
            goal={preferences.study_goal}
            onChangeTopic={(val) => setPreferences((prev) => ({ ...prev, primary_topic: val }))}
            onChangeGoal={(val) => setPreferences((prev) => ({ ...prev, study_goal: val }))}
            themeColor={preferences.theme_color}
            headingRef={stepHeadingRef}
          />
        )
      case 4:
        return (
          <StepInterests
            interests={preferences.interests}
            onToggleInterest={handleToggleInterest}
            themeColor={preferences.theme_color}
            headingRef={stepHeadingRef}
          />
        )
      case 5:
        return <StepReady themeColor={preferences.theme_color} headingRef={stepHeadingRef} />
      default:
        return null
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: { xs: 'flex-start', md: 'center' },
        bgcolor: 'background.body',
        px: { xs: 2, md: 4 },
        py: { xs: 3, md: 6 },
        pb: { xs: 4, md: 6 },
        position: 'relative',
        boxSizing: 'border-box',
        width: '100%',
        overflowX: 'hidden',
        overflowY: 'auto'
      }}
    >
      {/* Blob container — isolated overflow clipping */}
      <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        {/* Ambient blob 1 */}
        <Box
          sx={{
            position: 'absolute',
            top: '10%',
            left: '10%',
            width: '40vw',
            height: '40vw',
            borderRadius: '50%',
            background: preferences.theme_color,
            opacity: mode === 'dark' ? 0.05 : 0.08,
            filter: 'blur(100px)',
            transition: 'background 500ms ease'
          }}
        />
        {/* Ambient blob 2 */}
        <Box
          sx={{
            position: 'absolute',
            bottom: '10%',
            right: '10%',
            width: '30vw',
            height: '30vw',
            borderRadius: '50%',
            background: preferences.theme_color,
            opacity: mode === 'dark' ? 0.05 : 0.08,
            filter: 'blur(80px)',
            transition: 'background 500ms ease'
          }}
        />
      </Box>

      <Sheet
        variant='outlined'
        sx={{
          zIndex: 1,
          p: { xs: 3, md: 5 },
          borderRadius: { xs: 'lg', md: 'xl' },
          width: { xs: '100%', md: 560 },
          maxWidth: '100%',
          boxShadow: 'lg',
          bgcolor: 'background.surface',
          border: '1px solid',
          borderColor: 'divider',
          position: 'relative',
          transition: 'opacity 400ms ease, transform 400ms ease',
          opacity: isExiting ? 0 : 1,
          transform: isExiting ? 'scale(0.97)' : 'scale(1)'
        }}
      >
        {/* Progress dots */}
        <Box sx={{ mb: 4 }}>
          <OnboardingStepDots totalSteps={TOTAL_STEPS} currentStep={currentStep} themeColor={preferences.theme_color} />
        </Box>

        {/* Step content with slide animation — overflow hidden HERE only, not on the whole Sheet */}
        <Box sx={{ mb: 4, overflow: 'hidden' }}>
          <OnboardingStepTransition stepKey={currentStep} direction={stepDirection}>
            {renderStep()}
          </OnboardingStepTransition>
        </Box>

        {/* Error message */}
        {saveError && (
          <Typography level='body-sm' sx={{ color: 'danger.plainColor', textAlign: 'center', mb: 2 }}>
            {saveError}
          </Typography>
        )}

        {/* Navigation */}
        <Stack direction='row' spacing={2} justifyContent='space-between' alignItems='center' sx={{ mt: 4 }}>
          <Button
            variant='plain'
            color='neutral'
            size='lg'
            startDecorator={<ArrowBackRounded />}
            onClick={handleBack}
            disabled={currentStep === 1 || loading}
            aria-label={t('onboarding.back')}
            sx={{
              '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: 2 }
            }}
          >
            {t('onboarding.back')}
          </Button>

          {currentStep < TOTAL_STEPS ? (
            <Button
              variant='solid'
              size='lg'
              endDecorator={<ArrowForwardRounded />}
              onClick={handleNext}
              disabled={loading}
              aria-label={t('onboarding.next')}
              sx={{
                px: 4,
                bgcolor: preferences.theme_color,
                '&:hover': { filter: 'brightness(1.1)', bgcolor: preferences.theme_color },
                '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: 2 }
              }}
            >
              {t('onboarding.next')}
            </Button>
          ) : (
            <Button
              variant='solid'
              size='lg'
              loading={loading}
              onClick={handleFinish}
              aria-label={t('onboarding.ready.cta')}
              sx={{
                px: 4,
                bgcolor: preferences.theme_color,
                '&:hover': { filter: 'brightness(1.1)', bgcolor: preferences.theme_color },
                '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: 2 }
              }}
            >
              {t('onboarding.ready.cta')}
            </Button>
          )}
        </Stack>

        {/* Defer link — only on steps 1–3 */}
        {currentStep < TOTAL_STEPS && (
          <Typography
            level='body-xs'
            tabIndex={0}
            role='button'
            onClick={handleDefer}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleDefer()}
            aria-label={t('onboarding.defer')}
            sx={{
              mt: 3,
              textAlign: 'right',
              cursor: 'pointer',
              color: 'text.tertiary',
              '&:hover': { color: 'text.secondary' },
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'primary.outlinedBorder',
                borderRadius: 'xs'
              }
            }}
          >
            {t('onboarding.defer')}
          </Typography>
        )}
      </Sheet>
    </Box>
  )
}

export default OnboardingWizard

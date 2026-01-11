import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Typography,
  Button,
  Stack,
  Sheet,
  useColorScheme,
  Chip,
  Input,
  Select,
  Option,
  Radio,
  RadioGroup,
  FormControl,
  FormLabel,
  Card,
  CardContent,
  LinearProgress
} from '@mui/joy'
import {
  Palette,
  Translate,
  FavoriteBorder,
  School,
  CheckCircleRounded,
  ArrowBackRounded,
  ArrowForwardRounded,
  LightMode,
  DarkMode
} from '@mui/icons-material'
import { userService } from '../../api/services'
import { useThemePreferences } from '../../theme/DynamicThemeProvider'
import { getColorPresets } from '../../theme/colorSchemeGenerator'
import { useAuth } from '../../context/AuthContext'

const OnboardingWizard = () => {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { mode, setMode } = useColorScheme()
  const { themeColor, setThemeColor } = useThemePreferences()
  const isDark = mode === 'dark'
  const { t } = useTranslation()
  const { user, logout } = useAuth()

  // Form state
  const [preferences, setPreferences] = useState({
    language: 'en',
    theme_color: '#2a6971',
    theme_mode: mode || 'light',
    interests: [],
    learning_style: 'visual',
    study_goal: 'general'
  })

  const availableLanguages = [
    { value: 'en', label: 'English (US)', flag: '🇺🇸' },
    { value: 'es', label: 'Español', flag: '🇪🇸' },
    { value: 'fr', label: 'Français', flag: '🇫🇷' },
    { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { value: 'jp', label: '日本語', flag: '🇯🇵' }
  ]

  const availableInterests = [
    'Technology',
    'Science',
    'History',
    'Languages',
    'Art',
    'Mathematics',
    'Literature',
    'Music',
    'Business',
    'Health',
    'Philosophy',
    'Psychology'
  ]

  const learningStyles = [
    { value: 'visual', label: t('onboarding.learning.styles.visual'), description: t('onboarding.learning.styles.visualDesc'), icon: '👁️' },
    {
      value: 'auditory',
      label: t('onboarding.learning.styles.auditory'),
      description: t('onboarding.learning.styles.auditoryDesc'),
      icon: '👂'
    },
    {
      value: 'reading',
      label: t('onboarding.learning.styles.reading'),
      description: t('onboarding.learning.styles.readingDesc'),
      icon: '📝'
    },
    {
      value: 'kinesthetic',
      label: t('onboarding.learning.styles.kinesthetic'),
      description: t('onboarding.learning.styles.kinestheticDesc'),
      icon: '🤸'
    }
  ]

  const studyGoals = [
    { value: 'general', label: t('onboarding.learning.goals.general'), icon: '🌍' },
    { value: 'academic', label: t('onboarding.learning.goals.academic'), icon: '🎓' },
    { value: 'career', label: t('onboarding.learning.goals.career'), icon: '💼' },
    { value: 'language', label: t('onboarding.learning.goals.language'), icon: '🗣️' },
    { value: 'hobby', label: t('onboarding.learning.goals.hobby'), icon: '🎨' }
  ]

  const colorPresets = getColorPresets()

  const totalSteps = 6
  const progress = (currentStep / totalSteps) * 100

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleToggleInterest = (interest) => {
    const current = preferences.interests
    if (current.includes(interest)) {
      setPreferences({ ...preferences, interests: current.filter((i) => i !== interest) })
    } else {
      setPreferences({ ...preferences, interests: [...current, interest] })
    }
  }

  const handleColorChange = (color) => {
    setPreferences({ ...preferences, theme_color: color })
    setThemeColor(color)
  }

  const handleThemeModeChange = (newMode) => {
    setPreferences({ ...preferences, theme_mode: newMode })
    setMode(newMode)
  }

  const handleFinish = async () => {
    if (loading) return // Strict guard against double submissions
    setLoading(true)

    // Validate authentication state before sending
    console.log('[Onboarding] Finishing with user:', user ? 'Pass' : 'Fail')

    if (!user) {
      console.error('No authenticated user found.')
      // Attempt to recover if possible, or force login
      setLoading(false)
      navigate('/login')
      return
    }

    try {
      // Save preferences to backend
      console.log('[Onboarding] Saving preferences...', preferences)
      await userService.updateGeneralPreferences({
        language: preferences.language,
        theme_color: preferences.theme_color,
        interests: preferences.interests,
        learning_style: preferences.learning_style,
        study_goal: preferences.study_goal
      })

      console.log('[Onboarding] Preferences saved successfully.')

      // Mark wizard as complete
      await userService.completeWizard()
      console.log('[Onboarding] Wizard marked as complete.')
      sessionStorage.setItem('onboarding_completed', 'true') // Set sessionStorage flag

      // Navigate to home after a brief delay
      setTimeout(() => {
        navigate('/')
        window.location.reload()
      }, 1500)
    } catch (error) {
      console.error('Error saving preferences:', error)
      setLoading(false)

      if (error.response && error.response.status === 401) {
        // Token expired or invalid
        console.warn('Token expired or invalid during save. Redirecting to login.')
        await logout() // Clear session
        navigate('/login')
      } else {
        // Show generic error
        alert(t('common.error') || 'Error saving settings. Please try again.')
      }
    }
  }

  const handleSkip = () => {
    // efficient skip: just mark in session storage so we don't redirect back this session
    // but DON'T mark as completed in backend so it shows up next time
    console.log('[Onboarding] Skipping for this session only')
    sessionStorage.setItem('onboarding_skipped', 'true')
    navigate('/')
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        // Welcome Step
        return (
          <Box sx={{ textAlign: 'center' }}>
            <Typography level='h1' sx={{ mb: 2 }}>
              {t('onboarding.welcome.title')}
            </Typography>
            <Typography level='body-lg' sx={{ mb: 4, color: 'text.secondary' }}>
              {t('onboarding.welcome.subtitle')}
            </Typography>

            <Stack spacing={2} sx={{ maxWidth: 500, mx: 'auto', mt: 4 }}>
              <Card variant='outlined' sx={{ textAlign: 'left', bgcolor: 'background.surface' }}>
                <CardContent>
                  <Typography level='title-md' sx={{ mb: 1 }}>
                    {t('onboarding.welcome.quick')}
                  </Typography>
                  <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                    {t('onboarding.welcome.quickDesc')}
                  </Typography>
                </CardContent>
              </Card>

              <Card variant='outlined' sx={{ textAlign: 'left', bgcolor: 'background.surface' }}>
                <CardContent>
                  <Typography level='title-md' sx={{ mb: 1 }}>
                    {t('onboarding.welcome.tailored')}
                  </Typography>
                  <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                    {t('onboarding.welcome.tailoredDesc')}
                  </Typography>
                </CardContent>
              </Card>

              <Card variant='outlined' sx={{ textAlign: 'left', bgcolor: 'background.surface' }}>
                <CardContent>
                  <Typography level='title-md' sx={{ mb: 1 }}>
                    {t('onboarding.welcome.changeable')}
                  </Typography>
                  <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                    {t('onboarding.welcome.changeableDesc')}
                  </Typography>
                </CardContent>
              </Card>
            </Stack>
          </Box>
        )

      case 2:
        // Language Selection
        return (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, justifyContent: 'center' }}>
              <Translate sx={{ color: themeColor, fontSize: 40 }} />
              <Typography level='h2'>{t('onboarding.language.title')}</Typography>
            </Box>
            <Typography level='body-md' sx={{ mb: 4, color: 'text.secondary', textAlign: 'center' }}>
              {t('onboarding.language.subtitle')}
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' },
                gap: 2
              }}
            >
              {availableLanguages.map((lang) => {
                const isSelected = preferences.language === lang.value
                return (
                  <Card
                    key={lang.value}
                    variant='outlined'
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      borderColor: isSelected ? themeColor : 'neutral.outlinedBorder',
                      bgcolor: isSelected ? `${themeColor}10` : 'background.surface',
                      boxShadow: isSelected ? `0 0 0 2px ${themeColor}40` : 'none',
                      '&:hover': {
                        borderColor: themeColor,
                        bgcolor: isSelected ? `${themeColor}15` : 'background.level1'
                      }
                    }}
                    onClick={() => setPreferences({ ...preferences, language: lang.value })}
                  >
                    <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, p: 1.5 }}>
                      <Typography sx={{ fontSize: 32 }}>{lang.flag}</Typography>
                      <Typography level='title-md' textAlign='center'>
                        {lang.label}
                      </Typography>
                    </CardContent>
                  </Card>
                )
              })}
            </Box>
          </Box>
        )

      case 3:
        // Theme Customization
        return (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, justifyContent: 'center' }}>
              <Palette sx={{ color: themeColor, fontSize: 40 }} />
              <Typography level='h2'>{t('onboarding.theme.title')}</Typography>
            </Box>
            <Typography level='body-md' sx={{ mb: 4, color: 'text.secondary', textAlign: 'center' }}>
              {t('onboarding.theme.subtitle')}
            </Typography>

            {/* Mode Selection */}
            <FormControl sx={{ mb: 4 }}>
              <FormLabel sx={{ mb: 1, fontWeight: 600 }}>{t('onboarding.theme.mode')}</FormLabel>
              <Stack direction='row' spacing={2}>
                <Card
                  variant='outlined'
                  sx={{
                    flex: 1,
                    cursor: 'pointer',
                    borderColor: preferences.theme_mode === 'light' ? themeColor : 'neutral.outlinedBorder',
                    bgcolor: preferences.theme_mode === 'light' ? `${themeColor}10` : 'background.surface',
                    transition: 'all 0.2s',
                    '&:hover': { borderColor: themeColor }
                  }}
                  onClick={() => handleThemeModeChange('light')}
                >
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <LightMode sx={{ fontSize: 40, mb: 1, color: preferences.theme_mode === 'light' ? themeColor : 'text.secondary' }} />
                    <Typography level='title-md'>{t('onboarding.theme.light')}</Typography>
                  </CardContent>
                </Card>

                <Card
                  variant='outlined'
                  sx={{
                    flex: 1,
                    cursor: 'pointer',
                    borderColor: preferences.theme_mode === 'dark' ? themeColor : 'neutral.outlinedBorder',
                    bgcolor: preferences.theme_mode === 'dark' ? `${themeColor}10` : 'background.surface',
                    transition: 'all 0.2s',
                    '&:hover': { borderColor: themeColor }
                  }}
                  onClick={() => handleThemeModeChange('dark')}
                >
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <DarkMode sx={{ fontSize: 40, mb: 1, color: preferences.theme_mode === 'dark' ? themeColor : 'text.secondary' }} />
                    <Typography level='title-md'>{t('onboarding.theme.dark')}</Typography>
                  </CardContent>
                </Card>
              </Stack>
            </FormControl>

            {/* Color Selection */}
            <FormControl>
              <FormLabel sx={{ mb: 2, fontWeight: 600 }}>{t('onboarding.theme.accent')}</FormLabel>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(4, 1fr)', md: 'repeat(6, 1fr)' },
                  gap: 2,
                  mb: 2
                }}
              >
                {colorPresets.map((preset) => (
                  <Box
                    key={preset.color}
                    onClick={() => handleColorChange(preset.color)}
                    sx={{
                      width: { xs: 50, md: 60 },
                      height: { xs: 50, md: 60 },
                      borderRadius: 'md',
                      bgcolor: preset.color,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      border: '3px solid',
                      borderColor: preferences.theme_color === preset.color ? 'text.primary' : 'transparent',
                      boxShadow: preferences.theme_color === preset.color ? `0 0 0 2px ${preset.color}40` : 'none',
                      '&:hover': {
                        transform: 'scale(1.1)',
                        boxShadow: `0 4px 12px ${preset.color}60`
                      }
                    }}
                  />
                ))}
              </Box>
            </FormControl>
          </Box>
        )

      case 4:
        // Interests Selection
        return (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, justifyContent: 'center' }}>
              <FavoriteBorder sx={{ color: themeColor, fontSize: 40 }} />
              <Typography level='h2'>{t('onboarding.interests.title')}</Typography>
            </Box>
            <Typography level='body-md' sx={{ mb: 1, color: 'text.secondary', textAlign: 'center' }}>
              {t('onboarding.interests.subtitle')}
            </Typography>
            <Typography level='body-sm' sx={{ mb: 4, color: themeColor, textAlign: 'center', fontWeight: 600 }}>
              {t('onboarding.interests.selected', { count: preferences.interests.length })}
            </Typography>

            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1.5,
                justifyContent: 'center'
              }}
            >
              {availableInterests.map((interest) => (
                <Chip
                  key={interest}
                  variant={preferences.interests.includes(interest) ? 'solid' : 'outlined'}
                  color={preferences.interests.includes(interest) ? 'primary' : 'neutral'}
                  onClick={() => handleToggleInterest(interest)}
                  sx={{
                    cursor: 'pointer',
                    fontSize: 'sm',
                    bgcolor: preferences.interests.includes(interest) ? themeColor : 'transparent',
                    borderColor: preferences.interests.includes(interest) ? themeColor : 'neutral.outlinedBorder',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: themeColor,
                      bgcolor: preferences.interests.includes(interest) ? themeColor : `${themeColor}15`
                    }
                  }}
                >
                  {t(`onboarding.interests.items.${interest}`)}
                </Chip>
              ))}
            </Box>
          </Box>
        )

      case 5:
        // Learning Style
        return (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, justifyContent: 'center' }}>
              <School sx={{ color: themeColor, fontSize: 40 }} />
              <Typography level='h2'>{t('onboarding.learning.styleTitle')}</Typography>
            </Box>
            <Typography level='body-md' sx={{ mb: 4, color: 'text.secondary', textAlign: 'center' }}>
              {t('onboarding.learning.subtitle')}
            </Typography>

            {/* Learning Style */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(2, 1fr)' },
                gap: 2
              }}
            >
              {learningStyles.map((style) => {
                const isSelected = preferences.learning_style === style.value
                return (
                  <Card
                    key={style.value}
                    variant='outlined'
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      borderColor: isSelected ? themeColor : 'neutral.outlinedBorder',
                      bgcolor: isSelected ? `${themeColor}10` : 'background.surface',
                      boxShadow: isSelected ? `0 0 0 2px ${themeColor}40` : 'none',
                      '&:hover': {
                        borderColor: themeColor,
                        bgcolor: isSelected ? `${themeColor}15` : 'background.level1'
                      }
                    }}
                    onClick={() => setPreferences({ ...preferences, learning_style: style.value })}
                  >
                    <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, p: 2, textAlign: 'center' }}>
                      <Typography sx={{ fontSize: 32 }}>{style.icon}</Typography>
                      <Typography level='title-md'>{style.label}</Typography>
                      <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                        {style.description}
                      </Typography>
                    </CardContent>
                  </Card>
                )
              })}
            </Box>
          </Box>
        )

      case 6:
        // Study Goals
        return (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, justifyContent: 'center' }}>
              <School sx={{ color: themeColor, fontSize: 40 }} />
              <Typography level='h2'>{t('onboarding.learning.goalTitle')}</Typography>
            </Box>
            <Typography level='body-md' sx={{ mb: 4, color: 'text.secondary', textAlign: 'center' }}>
              {t('onboarding.learning.subtitle')}
            </Typography>

            {/* Study Goal */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' },
                gap: 2
              }}
            >
              {studyGoals.map((goal) => {
                const isSelected = preferences.study_goal === goal.value
                return (
                  <Card
                    key={goal.value}
                    variant='outlined'
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      borderColor: isSelected ? themeColor : 'neutral.outlinedBorder',
                      bgcolor: isSelected ? `${themeColor}10` : 'background.surface',
                      boxShadow: isSelected ? `0 0 0 2px ${themeColor}40` : 'none',
                      '&:hover': {
                        borderColor: themeColor,
                        bgcolor: isSelected ? `${themeColor}15` : 'background.level1'
                      }
                    }}
                    onClick={() => setPreferences({ ...preferences, study_goal: goal.value })}
                  >
                    <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, p: 2, textAlign: 'center' }}>
                      <Typography sx={{ fontSize: 32 }}>{goal.icon}</Typography>
                      <Typography level='title-md'>{goal.label}</Typography>
                    </CardContent>
                  </Card>
                )
              })}
            </Box>
          </Box>
        )

      default:
        return null
    }
  }

  // ...

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: isDark
          ? `radial-gradient(circle at 50% 50%, ${themeColor}15 0%, #09090D 100%)`
          : `radial-gradient(circle at 50% 50%, ${themeColor}15 0%, #F0F4F8 100%)`,
        px: { xs: 2, md: 4 }, // Responsive padding
        py: { xs: 2, md: 4 },
        transition: 'background 0.5s ease',
        position: 'relative',
        overflow: { xs: 'auto', md: 'hidden' } // Allow scrolling on mobile if content is tall
      }}
    >
      {/* Ambient background blobs for extra delight */}
      {/* ... keeping blobs ... */}
      <Box
        sx={{
          position: 'absolute',
          top: '10%',
          left: '10%',
          width: '40vw',
          height: '40vw',
          borderRadius: '50%',
          background: themeColor,
          opacity: isDark ? 0.05 : 0.08,
          filter: 'blur(100px)',
          zIndex: 0,
          transition: 'background 0.5s ease'
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '10%',
          right: '10%',
          width: '30vw',
          height: '30vw',
          borderRadius: '50%',
          background: themeColor,
          opacity: isDark ? 0.05 : 0.08,
          filter: 'blur(80px)',
          zIndex: 0,
          transition: 'background 0.5s ease'
        }}
      />

      <Sheet
        variant='outlined'
        sx={{
          zIndex: 1,
          p: { xs: 2, md: 5 }, // Reduced padding on mobile
          borderRadius: { xs: 'lg', md: 'xl' },
          width: { xs: '100%', md: 'auto' }, // Full width on mobile
          maxWidth: { xs: '100%', md: 600 },
          boxShadow: isDark ? `0 20px 40px -10px ${themeColor}20` : `0 20px 40px -10px ${themeColor}15`,
          backgroundColor: mode === 'dark' ? 'rgba(19, 19, 24, 0.8)' : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(20px)',
          border: '1px solid',
          borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          position: 'relative',
          my: { xs: 'auto', md: 0 } // Vertical centering help
        }}
      >
        {/* Progress Bar */}
        <Box sx={{ mb: { xs: 3, md: 4 } }}>
          <Stack direction='row' justifyContent='space-between' mb={1}>
            <Typography level='body-sm' fontWeight={600} sx={{ color: 'text.secondary' }}>
              {t('onboarding.steps', { current: currentStep, total: totalSteps })}
            </Typography>
            <Typography level='body-sm' sx={{ color: themeColor, fontWeight: 700 }}>
              {Math.round(progress)}%
            </Typography>
          </Stack>
          <LinearProgress
            determinate
            value={progress}
            sx={{
              height: 6,
              borderRadius: 'full',
              backgroundColor: isDark ? 'background.level2' : 'neutral.100',
              '--LinearProgress-progressThickness': '6px',
              '--LinearProgress-progressRadius': '6px',
              color: themeColor
            }}
          />
        </Box>

        {/* Step Content */}
        <Box sx={{ mb: { xs: 4, md: 6 }, minHeight: { xs: 'unset', md: 400 } }}>{renderStepContent()}</Box>

        {/* Navigation Buttons */}
        <Stack direction='row' spacing={2} justifyContent='space-between' alignItems='center'>
          <Button
            variant='plain'
            color='neutral'
            size='lg'
            startDecorator={<ArrowBackRounded />}
            onClick={handleBack}
            disabled={currentStep === 1 || loading}
            sx={{ px: 3 }}
          >
            {t('onboarding.back')}
          </Button>

          {currentStep < totalSteps ? (
            <Button
              variant='solid'
              size='lg'
              endDecorator={<ArrowForwardRounded />}
              onClick={handleNext}
              disabled={loading}
              sx={{
                px: 4,
                bgcolor: themeColor,
                transition: 'all 0.3s ease',
                '&:hover': {
                  bgcolor: themeColor,
                  filter: 'brightness(1.1)',
                  transform: 'translateY(-2px)',
                  boxShadow: `0 8px 20px -5px ${themeColor}60`
                }
              }}
            >
              {t('onboarding.next')}
            </Button>
          ) : (
            <Button
              variant='solid'
              size='lg'
              endDecorator={<CheckCircleRounded />}
              loading={loading}
              onClick={handleFinish}
              sx={{
                px: 4,
                background: `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}dd 100%)`,
                transition: 'all 0.3s ease',
                '&:hover': {
                  filter: 'brightness(1.1)',
                  transform: 'translateY(-2px)',
                  boxShadow: `0 10px 30px -5px ${themeColor}60`
                }
              }}
            >
              {t('onboarding.finish')}
            </Button>
          )}
        </Stack>

        {/* Skip Link */}
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Button
            variant='plain'
            size='sm'
            color='neutral'
            onClick={handleSkip}
            disabled={loading}
            sx={{ color: 'text.tertiary', '&:hover': { color: 'text.primary' } }}
          >
            {t('onboarding.skip')}
          </Button>
        </Box>
      </Sheet>

      {/* Loading overlay */}
      {loading && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10000,
            bgcolor: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Sheet
            sx={{
              p: 2,
              borderRadius: 'full',
              boxShadow: 'lg',
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}
          >
            <LinearProgress thickness={4} sx={{ width: 100, color: themeColor }} />
            <Typography level='body-sm' fontWeight='lg'>
              Setting up...
            </Typography>
          </Sheet>
        </Box>
      )}
    </Box>
  )
}

export default OnboardingWizard

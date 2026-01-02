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

  const totalSteps = 5
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
        // Show generic error to user (you might want to add a UI alert here)
        alert(t('common.error') || 'Error saving settings. Please try again.')
      }
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Box>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography level='h1' fontSize={48} mb={2}>
                👋
              </Typography>
              <Typography level='h3' fontWeight={700} mb={1}>
                {t('onboarding.welcome.title')}
              </Typography>
              <Typography level='body-md' sx={{ color: 'neutral.600' }}>
                {t('onboarding.welcome.subtitle')}
              </Typography>
            </Box>

            <Stack spacing={3}>
              <Card variant='soft' color='primary'>
                <CardContent>
                  <Stack direction='row' spacing={2} alignItems='center'>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 'md',
                        bgcolor: 'primary.solidBg',
                        color: 'primary.solidColor'
                      }}
                    >
                      ⚡
                    </Box>
                    <Box>
                      <Typography level='title-md' fontWeight={600}>
                        {t('onboarding.welcome.quick')}
                      </Typography>
                      <Typography level='body-sm'>{t('onboarding.welcome.quickDesc')}</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>

              <Card variant='soft' color='success'>
                <CardContent>
                  <Stack direction='row' spacing={2} alignItems='center'>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 'md',
                        bgcolor: 'success.solidBg',
                        color: 'success.solidColor'
                      }}
                    >
                      🎯
                    </Box>
                    <Box>
                      <Typography level='title-md' fontWeight={600}>
                        {t('onboarding.welcome.tailored')}
                      </Typography>
                      <Typography level='body-sm'>{t('onboarding.welcome.tailoredDesc')}</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>

              <Card variant='soft' color='warning'>
                <CardContent>
                  <Stack direction='row' spacing={2} alignItems='center'>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 'md',
                        bgcolor: 'warning.solidBg',
                        color: 'warning.solidColor'
                      }}
                    >
                      🔒
                    </Box>
                    <Box>
                      <Typography level='title-md' fontWeight={600}>
                        {t('onboarding.welcome.changeable')}
                      </Typography>
                      <Typography level='body-sm'>{t('onboarding.welcome.changeableDesc')}</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Box>
        )

      case 2:
        return (
          <Box>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Translate sx={{ fontSize: 48, color: 'primary.500', mb: 2 }} />
              <Typography level='h3' fontWeight={700} mb={1}>
                {t('onboarding.language.title')}
              </Typography>
              <Typography level='body-md' sx={{ color: 'neutral.600' }}>
                {t('onboarding.language.subtitle')}
              </Typography>
            </Box>

            <Stack spacing={1.5}>
              {availableLanguages.map((lang) => (
                <Card
                  key={lang.value}
                  variant={preferences.language === lang.value ? 'solid' : 'outlined'}
                  color={preferences.language === lang.value ? 'primary' : 'neutral'}
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    ...(preferences.language === lang.value && {
                      bgcolor: themeColor,
                      color: '#fff',
                      borderColor: themeColor
                    }),
                    '&:hover': {
                      transform: 'translateX(4px)',
                      boxShadow: 'md'
                    }
                  }}
                  onClick={() => setPreferences({ ...preferences, language: lang.value })}
                >
                  <CardContent>
                    <Stack direction='row' spacing={2} alignItems='center'>
                      <Typography fontSize={32}>{lang.flag}</Typography>
                      <Typography level='title-md' fontWeight={600}>
                        {lang.label}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Box>
        )

      case 3:
        return (
          <Box>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Palette sx={{ fontSize: 48, color: 'primary.500', mb: 2 }} />
              <Typography level='h3' fontWeight={700} mb={1}>
                {t('onboarding.theme.title')}
              </Typography>
              <Typography level='body-md' sx={{ color: 'neutral.600' }}>
                {t('onboarding.theme.subtitle')}
              </Typography>
            </Box>

            <Stack spacing={4}>
              {/* Theme Mode */}
              <Box>
                <Typography level='title-md' mb={2}>
                  {t('onboarding.theme.mode')}
                </Typography>
                <Stack direction='row' spacing={2}>
                  <Button
                    variant={preferences.theme_mode === 'light' ? 'solid' : 'outlined'}
                    color='neutral'
                    size='lg'
                    fullWidth
                    startDecorator={<LightMode />}
                    onClick={() => handleThemeModeChange('light')}
                  >
                    {t('onboarding.theme.light')}
                  </Button>
                  <Button
                    variant={preferences.theme_mode === 'dark' ? 'solid' : 'outlined'}
                    color='neutral'
                    size='lg'
                    fullWidth
                    startDecorator={<DarkMode />}
                    onClick={() => handleThemeModeChange('dark')}
                  >
                    {t('onboarding.theme.dark')}
                  </Button>
                </Stack>
              </Box>

              {/* Color Presets */}
              <Box>
                <Typography level='title-md' mb={2}>
                  {t('onboarding.theme.accent')}
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 1.5
                  }}
                >
                  {colorPresets.map((preset) => (
                    <Box
                      key={preset.color}
                      onClick={() => handleColorChange(preset.color)}
                      sx={{
                        position: 'relative',
                        aspectRatio: '1',
                        borderRadius: 'md',
                        bgcolor: preset.color,
                        cursor: 'pointer',
                        border: '3px solid',
                        borderColor: preferences.theme_color === preset.color ? 'neutral.outlinedBorder' : 'transparent',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          transform: 'scale(1.1)',
                          boxShadow: 'lg'
                        }
                      }}
                    >
                      {preferences.theme_color === preset.color && (
                        <CheckCircleRounded
                          sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            color: 'white',
                            fontSize: 32,
                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'
                          }}
                        />
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>

              {/* Custom Color Picker */}
              <Box>
                <Typography level='title-md' mb={2}>
                  {t('onboarding.theme.custom')}
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                    borderRadius: 'md',
                    border: '1px solid',
                    borderColor: 'neutral.outlinedBorder'
                  }}
                >
                  <Box
                    sx={{
                      width: 60,
                      height: 60,
                      borderRadius: 'md',
                      bgcolor: preferences.theme_color,
                      border: '2px solid',
                      borderColor: 'neutral.outlinedBorder',
                      position: 'relative',
                      overflow: 'hidden',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type='color'
                      value={preferences.theme_color}
                      onChange={(e) => handleColorChange(e.target.value)}
                      style={{
                        position: 'absolute',
                        top: '-50%',
                        left: '-50%',
                        width: '200%',
                        height: '200%',
                        opacity: 0,
                        cursor: 'pointer'
                      }}
                    />
                  </Box>
                  <Box>
                    <Typography level='title-sm'>{t('onboarding.theme.customLabel')}</Typography>
                    <Typography level='body-sm' sx={{ color: 'neutral.600' }}>
                      {preferences.theme_color.toUpperCase()}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Stack>
          </Box>
        )

      case 4:
        return (
          <Box>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <FavoriteBorder sx={{ fontSize: 48, color: 'primary.500', mb: 2 }} />
              <Typography level='h3' fontWeight={700} mb={1}>
                {t('onboarding.interests.title')}
              </Typography>
              <Typography level='body-md' sx={{ color: 'neutral.600' }}>
                {t('onboarding.interests.subtitle')}
              </Typography>
            </Box>

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
                  size='lg'
                  onClick={() => handleToggleInterest(interest)}
                  sx={{
                    cursor: 'pointer',
                    px: 2.5,
                    py: 1.5,
                    fontSize: '0.95rem',
                    transition: 'all 0.2s ease',
                    ...(preferences.interests.includes(interest) && {
                      bgcolor: themeColor,
                      color: '#fff',
                      borderColor: themeColor,
                      '&:hover': {
                        bgcolor: themeColor
                      }
                    }),
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 'sm'
                    }
                  }}
                >
                  {t(`onboarding.interests.items.${interest}`, interest)}
                </Chip>
              ))}
            </Box>

            <Typography level='body-sm' textAlign='center' sx={{ color: 'neutral.600', mt: 3 }}>
              {t('onboarding.interests.selected_plural', { count: preferences.interests.length })}
            </Typography>
          </Box>
        )

      case 5:
        return (
          <Box>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <School sx={{ fontSize: 48, color: 'primary.500', mb: 2 }} />
              <Typography level='h3' fontWeight={700} mb={1}>
                {t('onboarding.learning.title')}
              </Typography>
              <Typography level='body-md' sx={{ color: 'neutral.600' }}>
                {t('onboarding.learning.subtitle')}
              </Typography>
            </Box>

            <Stack spacing={4}>
              {/* Learning Style */}
              <FormControl>
                <FormLabel>
                  <Typography level='title-md' mb={2}>
                    {t('onboarding.learning.styleTitle')}
                  </Typography>
                </FormLabel>
                <RadioGroup
                  value={preferences.learning_style}
                  onChange={(e) => setPreferences({ ...preferences, learning_style: e.target.value })}
                >
                  <Stack spacing={1.5}>
                    {learningStyles.map((style) => (
                      <Card
                        key={style.value}
                        variant={preferences.learning_style === style.value ? 'solid' : 'outlined'}
                        color={preferences.learning_style === style.value ? 'primary' : 'neutral'}
                        sx={{
                          cursor: 'pointer',
                          ...(preferences.learning_style === style.value && {
                            bgcolor: themeColor,
                            color: '#fff',
                            borderColor: themeColor
                          })
                        }}
                        onClick={() => setPreferences({ ...preferences, learning_style: style.value })}
                      >
                        <CardContent>
                          <Stack direction='row' spacing={2} alignItems='center'>
                            <Radio value={style.value} />
                            <Typography fontSize={28}>{style.icon}</Typography>
                            <Box>
                              <Typography level='title-sm' fontWeight={600}>
                                {style.label}
                              </Typography>
                              <Typography level='body-xs'>{style.description}</Typography>
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </RadioGroup>
              </FormControl>

              {/* Study Goal */}
              <FormControl>
                <FormLabel>
                  <Typography level='title-md' mb={2}>
                    {t('onboarding.learning.goalTitle')}
                  </Typography>
                </FormLabel>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: 1.5
                  }}
                >
                  {studyGoals.map((goal) => (
                    <Card
                      key={goal.value}
                      variant={preferences.study_goal === goal.value ? 'solid' : 'outlined'}
                      color={preferences.study_goal === goal.value ? 'primary' : 'neutral'}
                      sx={{
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s ease',
                        ...(preferences.study_goal === goal.value && {
                          bgcolor: themeColor,
                          color: '#fff',
                          borderColor: themeColor
                        }),
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: 'md'
                        }
                      }}
                      onClick={() => setPreferences({ ...preferences, study_goal: goal.value })}
                    >
                      <CardContent>
                        <Typography fontSize={32} mb={1}>
                          {goal.icon}
                        </Typography>
                        <Typography level='body-sm' fontWeight={600}>
                          {goal.label}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </FormControl>
            </Stack>
          </Box>
        )

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
        alignItems: 'center',
        background: isDark
          ? `radial-gradient(circle at 50% 50%, ${themeColor}15 0%, #09090D 100%)`
          : `radial-gradient(circle at 50% 50%, ${themeColor}15 0%, #F0F4F8 100%)`,
        px: 2,
        py: 4,
        transition: 'background 0.5s ease',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Ambient background blobs for extra delight */}
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
          p: { xs: 3, md: 5 },
          borderRadius: 'xl',
          width: '100%',
          maxWidth: 600,
          boxShadow: isDark ? `0 20px 40px -10px ${themeColor}20` : `0 20px 40px -10px ${themeColor}15`,
          backgroundColor: mode === 'dark' ? 'rgba(19, 19, 24, 0.8)' : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(20px)',
          border: '1px solid',
          borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          position: 'relative'
        }}
      >
        {/* Progress Bar */}
        <Box sx={{ mb: 4 }}>
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
        <Box sx={{ mb: 6, minHeight: 400 }}>{renderStepContent()}</Box>

        {/* Navigation Buttons */}
        <Stack direction='row' spacing={2} justifyContent='space-between' alignItems='center'>
          <Button
            variant='plain'
            color='neutral'
            size='lg'
            startDecorator={<ArrowBackRounded />}
            onClick={handleBack}
            disabled={currentStep === 1}
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
            onClick={() => navigate('/')}
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

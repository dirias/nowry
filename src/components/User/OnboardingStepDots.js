import React from 'react'
import { Box, Stack } from '@mui/joy'
import { useTranslation } from 'react-i18next'

/**
 * OnboardingStepDots
 * Progress indicator for the onboarding wizard.
 *
 * Props:
 *   totalSteps  {number}  – total number of steps
 *   currentStep {number}  – 1-based active step index
 *   themeColor  {string}  – accent hex color
 */
const OnboardingStepDots = ({ totalSteps, currentStep, themeColor }) => {
  const { t } = useTranslation()

  return (
    <Stack
      direction='row'
      spacing={1}
      alignItems='center'
      justifyContent='center'
      role='progressbar'
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-label={t('onboarding.progressLabel')}
    >
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1
        const isActive = step === currentStep
        const isCompleted = step < currentStep

        return (
          <Box
            key={step}
            sx={{
              width: isActive ? 14 : 10,
              height: isActive ? 14 : 10,
              borderRadius: '50%',
              bgcolor: isCompleted || isActive ? themeColor : 'background.level2',
              boxShadow: isActive ? `0 0 0 4px ${themeColor}30` : 'none',
              transition: 'all 200ms ease',
              flexShrink: 0
            }}
          />
        )
      })}
    </Stack>
  )
}

export default OnboardingStepDots

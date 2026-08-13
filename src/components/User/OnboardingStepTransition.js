import React from 'react'
import { Box } from '@mui/joy'

/**
 * OnboardingStepTransition
 * Wraps step content in a slide-in animation. Remounts on stepKey change,
 * which triggers the keyframe animation on every navigation.
 *
 * Props:
 *   stepKey   {number}              – current step number (used as React key)
 *   direction {'forward' | 'back'}  – slide direction
 *   children  {ReactNode}
 */
// direction prop is kept for API compatibility but is no longer used internally.
// The fade-up animation has zero horizontal movement, eliminating overflow bleed.
const OnboardingStepTransition = ({ stepKey, direction, children }) => {
  const stepEnter = {
    '@keyframes stepEnter': {
      from: { transform: 'translateY(8px)', opacity: 0 },
      to: { transform: 'translateY(0)', opacity: 1 }
    }
  }

  return (
    <Box
      key={stepKey}
      sx={{
        ...stepEnter,
        animationName: 'stepEnter',
        animationDuration: '260ms',
        animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
        animationFillMode: 'both'
      }}
    >
      {children}
    </Box>
  )
}

export default OnboardingStepTransition

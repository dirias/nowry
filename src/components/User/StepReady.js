import React from 'react'
import { Box, Typography } from '@mui/joy'
import { CheckCircleRounded } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'

/**
 * StepReady — Step 5
 * Celebration / launch screen. Pure presentational — no form fields.
 * Reads the user's real name from AuthContext (set at registration).
 *
 * Props:
 *   themeColor {string}
 *   headingRef {React.Ref}
 */
const StepReady = ({ themeColor, headingRef }) => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const name = user?.full_name || user?.username

  return (
    <Box sx={{ textAlign: 'center', py: 2 }}>
      <Box
        sx={{
          '@keyframes iconPop': {
            from: { transform: 'scale(0.8)', opacity: 0 },
            to: { transform: 'scale(1)', opacity: 1 }
          },
          display: 'inline-flex',
          mb: 3,
          animation: 'iconPop 300ms cubic-bezier(0.34, 1.56, 0.64, 1) 100ms both'
        }}
      >
        <CheckCircleRounded sx={{ fontSize: 64, color: themeColor }} />
      </Box>

      <Typography
        level='h3'
        ref={headingRef}
        tabIndex={-1}
        sx={{
          mb: 1,
          outline: 'none',
          '@keyframes fadeInUp': {
            from: { transform: 'translateY(12px)', opacity: 0 },
            to: { transform: 'translateY(0)', opacity: 1 }
          },
          animation: 'fadeInUp 400ms ease forwards',
          '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', borderRadius: 'xs' }
        }}
      >
        {name ? t('onboarding.ready.title', { name }) : t('onboarding.ready.titleNoName')}
      </Typography>

      <Typography level='body-md' sx={{ color: 'text.secondary' }}>
        {t('onboarding.ready.subtitle')}
      </Typography>
    </Box>
  )
}

export default StepReady

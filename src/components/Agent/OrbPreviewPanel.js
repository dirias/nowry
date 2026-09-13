/**
 * OrbPreviewPanel — Live companion orb preview for the AgentSettings Companion tab.
 *
 * Renders a sticky panel with an animated PetOrb in preview mode (non-interactive)
 * so the user sees their customization choices reflected in real time.
 */
import React from 'react'
import { Box, Sheet, Stack, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { usePet } from '@nowry/core/context/AgentContext'
import { resolveColor } from '@nowry/core/utils/petColor'
import { useThemePreferences } from '../../theme/DynamicThemeProvider'
import { PetOrb } from './StudyPet'

const OrbPreviewPanel = ({ petSpecies, petName, avatarUrl }) => {
  const { t } = useTranslation()
  const { stage, level } = usePet()
  const { themeColor } = useThemePreferences()
  const resolvedColor = resolveColor(themeColor, stage)

  return (
    <Box sx={{ position: 'sticky', top: 24 }}>
      <Typography
        level='body-xs'
        fontWeight={700}
        sx={{
          color: 'text.secondary',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          mb: 1.5
        }}
      >
        {t('agent.companion.previewLabel')}
      </Typography>
      <Sheet
        variant='outlined'
        sx={{
          borderRadius: 'xl',
          // The preview sits on the page like any panel (ADR-034); it was violet
          // glass from the retired per-stage palette.
          bgcolor: 'background.level1',
          overflow: 'hidden'
        }}
      >
        <Stack alignItems='center' justifyContent='center' gap={2} py={4}>
          <PetOrb
            mood='idle'
            level={level}
            stage={stage}
            species={petSpecies}
            dominantColor={resolvedColor}
            isCelebrating={false}
            preview={true}
            avatarUrl={avatarUrl}
          />
          {petName && (
            <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
              {petName}
            </Typography>
          )}
        </Stack>
      </Sheet>
      <Typography level='body-xs' sx={{ color: 'text.tertiary', mt: 1.5, textAlign: 'center' }}>
        {t('agent.companion.previewCaption')}
      </Typography>
    </Box>
  )
}

export default OrbPreviewPanel

/**
 * OrbPreviewPanel — Live companion orb preview for the AgentSettings Companion tab.
 *
 * Renders a sticky panel with an animated PetOrb in preview mode (non-interactive)
 * so the user sees their customization choices reflected in real time.
 */
import React from 'react'
import { Box, Sheet, Stack, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { usePet } from '../../context/AgentContext'
import { resolveColor } from '../../utils/petColor'
import { PetOrb } from './StudyPet'

const OrbPreviewPanel = ({ petSpecies, petColor, petName, avatarUrl }) => {
  const { t } = useTranslation()
  const { stage, level } = usePet()
  // Resolve from the *pending* petColor prop, not context, so the preview
  // updates the moment a swatch is picked rather than after the save round-trip.
  const resolvedColor = resolveColor(petColor, stage)

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
          background: 'linear-gradient(160deg, rgba(16,16,32,0.6) 0%, rgba(22,14,42,0.6) 100%)',
          backdropFilter: 'blur(24px)',
          borderColor: 'rgba(164,69,255,0.2)',
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

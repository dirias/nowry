import React from 'react'
import { useTranslation } from 'react-i18next'
import { useReactFlow, useViewport } from '@xyflow/react'
import { Box, IconButton, Sheet, Tooltip, Typography } from '@mui/joy'
import AddRounded from '@mui/icons-material/AddRounded'
import RemoveRounded from '@mui/icons-material/RemoveRounded'
import FitScreenRounded from '@mui/icons-material/FitScreenRounded'
import { focusRing, readout } from '../../Common/Form/formStyles'
import { viewDuration } from './motion'

const iconSx = {
  '--IconButton-size': '32px',
  borderRadius: 'md',
  color: 'text.secondary',
  '&:hover': { color: 'text.primary' },
  ...focusRing
}

/**
 * Zoom (canvas board 2): a live readout between two steps, and Fit. No
 * minimap. The readout is the locale's own percentage, so it needs no copy.
 */
export default function ZoomControls() {
  const { t, i18n } = useTranslation()
  const { zoom } = useViewport()
  const flow = useReactFlow()
  const percent = new Intl.NumberFormat(i18n?.language || 'en', { style: 'percent', maximumFractionDigits: 0 }).format(zoom)

  const control = (label, Icon, onClick) => (
    <Tooltip title={label} size='sm'>
      <IconButton aria-label={label} variant='plain' color='neutral' onClick={onClick} sx={iconSx}>
        <Icon />
      </IconButton>
    </Tooltip>
  )

  return (
    <Sheet
      sx={{
        position: 'absolute',
        // Top right: the companion rests in the bottom-right corner (useTimerCorner.js).
        right: 16,
        top: 16,
        zIndex: 'floating',
        display: 'flex',
        alignItems: 'center',
        gap: 0.25,
        p: 0.5,
        borderRadius: 'md',
        bgcolor: 'background.surface',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 'md'
      }}
    >
      {control(t('boards.zoom.out'), RemoveRounded, () => flow.zoomOut({ duration: viewDuration() }))}
      <Typography
        level='body-sm'
        data-testid='board-zoom-readout'
        sx={{ ...readout, color: 'text.secondary', minWidth: 46, textAlign: 'center' }}
      >
        {percent}
      </Typography>
      {control(t('boards.zoom.in'), AddRounded, () => flow.zoomIn({ duration: viewDuration() }))}
      <Box aria-hidden='true' sx={{ width: '1px', height: 18, mx: 0.25, bgcolor: 'divider' }} />
      {control(t('boards.zoom.fit'), FitScreenRounded, () => flow.fitView({ padding: 0.2, duration: viewDuration() }))}
    </Sheet>
  )
}

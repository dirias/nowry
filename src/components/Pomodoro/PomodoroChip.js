import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Button, Typography } from '@mui/joy'
import { TimerOutlined } from '@mui/icons-material'
import { usePomodoro } from '../../context/PomodoroContext'
import { focusRing } from '../Common/Form/formStyles'
import { Z_NAV } from '../../constants/zIndex'
import { formatClock } from './formatClock'
import { useTimerCorner } from './useTimerCorner'

/**
 * The timer's collapsed state — a chip in the corner the widget opens from.
 *
 * It replaces the circular FAB (ADR-013): same rectangle family and the same
 * `level1` ground as the widget's own controls, and a running timer is shown
 * by a 3px progress edge rather than a pulsing halo. Rendered only when the
 * timer is enabled and the widget is closed, in the corner the Study Buddy is
 * not in (useTimerCorner).
 */
const PomodoroChip = () => {
  const { t } = useTranslation()
  const { showWidget, setShowWidget, settings, isActive, isPaused, timeLeft, progress } = usePomodoro()
  const corner = useTimerCorner()

  if (!settings.enabled || showWidget) return null

  const label = isActive || isPaused ? formatClock(timeLeft) : t('pomodoro.modes.work')

  return (
    <Button
      variant='plain'
      color='neutral'
      aria-label={t('pomodoro.open')}
      onClick={() => setShowWidget(true)}
      startDecorator={<TimerOutlined fontSize='small' />}
      sx={{
        ...corner,
        zIndex: Z_NAV,
        overflow: 'hidden',
        minHeight: 36,
        px: 1.5,
        gap: 1,
        borderRadius: 'md',
        bgcolor: 'background.level1',
        color: 'text.primary',
        boxShadow: 'md',
        '--Button-gap': '8px',
        '&:hover': { bgcolor: 'background.level1', color: 'text.primary' },
        ...focusRing
      }}
    >
      <Typography level='body-sm' sx={{ fontWeight: 'lg', fontVariantNumeric: 'tabular-nums', color: 'inherit' }}>
        {label}
      </Typography>
      {isActive && (
        <Box aria-hidden='true' sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, bgcolor: 'background.level2' }}>
          <Box sx={{ width: `${progress * 100}%`, height: '100%', bgcolor: 'primary.solidBg' }} />
        </Box>
      )}
    </Button>
  )
}

export default PomodoroChip

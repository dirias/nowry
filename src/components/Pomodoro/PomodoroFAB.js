import React from 'react'
import { IconButton, Tooltip, Box } from '@mui/joy'
import { Timer } from '@mui/icons-material'
import { usePomodoro } from '../../context/PomodoroContext'
import { Z_NAV } from '../../constants/zIndex'

/**
 * Floating Action Button for Pomodoro Timer
 * Appears in bottom-right corner when enabled
 * Following DESIGN_GUIDELINES.md for FAB pattern
 */
const PomodoroFAB = () => {
  const { showWidget, setShowWidget, settings, isActive, timeLeft } = usePomodoro()

  // Don't show FAB if pomodoro is disabled or widget is already open
  if (!settings.enabled || showWidget) return null

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <Tooltip title='Pomodoro Timer' placement='left' size='sm'>
      <IconButton
        variant='solid'
        color='primary'
        onClick={() => setShowWidget(true)}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: '50%',
          boxShadow: 'lg',
          zIndex: Z_NAV,
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'scale(1.05)',
            boxShadow: 'xl'
          },
          // Pulse animation when timer is active
          ...(isActive && {
            animation: 'pulse 2s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': {
                boxShadow: 'lg'
              },
              '50%': {
                boxShadow: '0 0 0 8px rgba(var(--joy-palette-primary-mainChannel) / 0.2)'
              }
            }
          })
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
          <Timer sx={{ fontSize: 24 }} />
          {isActive && (
            <Box
              sx={{
                fontSize: '0.625rem',
                fontFamily: 'monospace',
                fontWeight: 700,
                lineHeight: 1,
                mt: -0.5
              }}
            >
              {formatTime(timeLeft)}
            </Box>
          )}
        </Box>
      </IconButton>
    </Tooltip>
  )
}

export default PomodoroFAB

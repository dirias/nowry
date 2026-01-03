import React from 'react'
import { Box, Typography, IconButton, Stack, Sheet } from '@mui/joy'
import { PlayArrowRounded, PauseRounded, RefreshRounded, CloseRounded } from '@mui/icons-material'
import { usePomodoro } from '../../context/PomodoroContext'
import { ClickAwayListener } from '@mui/base/ClickAwayListener'

const PomodoroWidget = () => {
  const { timeLeft, isActive, mode, showWidget, setShowWidget, toggleTimer, resetTimer, changeMode, settings } = usePomodoro()

  if (!showWidget || !settings.enabled) return null

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const getProgress = () => {
    let total = settings.work * 60
    if (mode === 'shortBreak') total = settings.shortBreak * 60
    if (mode === 'longBreak') total = settings.longBreak * 60
    if (total === 0) return 0
    return ((total - timeLeft) / total) * 100
  }

  const getModeColor = () => {
    if (mode === 'work') return 'primary.500'
    return 'success.500'
  }

  return (
    <ClickAwayListener onClickAway={() => setShowWidget(false)}>
      <Sheet
        variant='outlined'
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 240,
          zIndex: 1200,
          borderRadius: 'md',
          boxShadow: 'md',
          bgcolor: 'background.surface',
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
          animation: 'slideIn 0.2s ease-out',
          '@keyframes slideIn': {
            from: { transform: 'translateY(8px)', opacity: 0 },
            to: { transform: 'translateY(0)', opacity: 1 }
          }
        }}
      >
        {/* Header with Close */}
        <Stack direction='row' justifyContent='flex-end' sx={{ p: 1 }}>
          <IconButton size='sm' variant='plain' color='neutral' onClick={() => setShowWidget(false)} sx={{ '--IconButton-size': '28px' }}>
            <CloseRounded fontSize='small' />
          </IconButton>
        </Stack>

        {/* Timer Display */}
        <Stack alignItems='center' spacing={1} sx={{ px: 3, pb: 2 }}>
          <Typography
            sx={{
              fontFamily: 'monospace',
              fontWeight: 600,
              fontSize: '3rem',
              lineHeight: 1,
              letterSpacing: '-1px',
              color: getModeColor()
            }}
          >
            {formatTime(timeLeft)}
          </Typography>

          {/* Progress Indicator */}
          <Box
            sx={{
              width: '100%',
              height: 3,
              bgcolor: 'background.level2',
              borderRadius: 'xs',
              overflow: 'hidden'
            }}
          >
            <Box
              sx={{
                width: `${getProgress()}%`,
                height: '100%',
                bgcolor: getModeColor(),
                transition: 'width 0.5s linear'
              }}
            />
          </Box>
        </Stack>

        {/* Controls */}
        <Stack
          direction='row'
          justifyContent='center'
          spacing={1.5}
          sx={{
            p: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.level1'
          }}
        >
          {/* Mode Indicators */}
          <Stack direction='row' spacing={0.5}>
            <IconButton
              size='sm'
              variant={mode === 'work' ? 'solid' : 'plain'}
              color='primary'
              onClick={() => changeMode('work')}
              sx={{ minWidth: 32, height: 32 }}
            >
              <Box sx={{ fontSize: '10px', fontWeight: 'bold' }}>F</Box>
            </IconButton>
            <IconButton
              size='sm'
              variant={mode === 'shortBreak' ? 'solid' : 'plain'}
              color='success'
              onClick={() => changeMode('shortBreak')}
              sx={{ minWidth: 32, height: 32 }}
            >
              <Box sx={{ fontSize: '10px', fontWeight: 'bold' }}>S</Box>
            </IconButton>
            <IconButton
              size='sm'
              variant={mode === 'longBreak' ? 'solid' : 'plain'}
              color='success'
              onClick={() => changeMode('longBreak')}
              sx={{ minWidth: 32, height: 32 }}
            >
              <Box sx={{ fontSize: '10px', fontWeight: 'bold' }}>L</Box>
            </IconButton>
          </Stack>

          {/* Separator */}
          <Box sx={{ width: 1, height: 32, bgcolor: 'divider' }} />

          {/* Actions */}
          <Stack direction='row' spacing={1}>
            <IconButton size='sm' variant='plain' color='neutral' onClick={resetTimer} sx={{ minWidth: 32, height: 32 }}>
              <RefreshRounded fontSize='small' />
            </IconButton>
            <IconButton
              size='md'
              variant='solid'
              color={mode === 'work' ? 'primary' : 'success'}
              onClick={toggleTimer}
              sx={{ borderRadius: '50%', minWidth: 40, height: 40 }}
            >
              {isActive ? <PauseRounded /> : <PlayArrowRounded />}
            </IconButton>
          </Stack>
        </Stack>
      </Sheet>
    </ClickAwayListener>
  )
}

export default PomodoroWidget

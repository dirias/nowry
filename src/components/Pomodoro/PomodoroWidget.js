import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Typography, IconButton, Stack, Sheet, Tooltip } from '@mui/joy'
import { PlayArrowRounded, PauseRounded, RefreshRounded, CloseRounded, VolumeUpRounded } from '@mui/icons-material'
import { usePomodoro } from '../../context/PomodoroContext'
import { ClickAwayListener } from '@mui/base/ClickAwayListener'
import { playPomodoroNotification } from '../../utils/pomodoroSound'

const PomodoroWidget = () => {
  const { t } = useTranslation()
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
    if (mode === 'work') return 'primary.solidBg'
    return 'success.solidBg'
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
        {/* Header with Test Sound & Close */}
        <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ p: 1 }}>
          <Tooltip title={t('pomodoro.testSound')} size='sm'>
            <IconButton
              size='sm'
              variant='plain'
              color='neutral'
              aria-label={t('pomodoro.testSound')}
              onClick={playPomodoroNotification}
              sx={{
                '--IconButton-size': '28px',
                opacity: 0.6,
                '&:hover': { opacity: 1 }
              }}
            >
              <VolumeUpRounded fontSize='small' />
            </IconButton>
          </Tooltip>

          <IconButton
            size='sm'
            variant='plain'
            color='neutral'
            aria-label={t('pomodoro.close')}
            onClick={() => setShowWidget(false)}
            sx={{ '--IconButton-size': '28px' }}
          >
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
              aria-label={t('pomodoro.modes.work')}
              aria-pressed={mode === 'work'}
              onClick={() => changeMode('work')}
              sx={{ minWidth: 32, height: 32 }}
            >
              <Box sx={{ fontSize: 'xs', fontWeight: 'bold' }}>F</Box>
            </IconButton>
            <IconButton
              size='sm'
              variant={mode === 'shortBreak' ? 'solid' : 'plain'}
              color='success'
              aria-label={t('pomodoro.modes.shortBreak')}
              aria-pressed={mode === 'shortBreak'}
              onClick={() => changeMode('shortBreak')}
              sx={{ minWidth: 32, height: 32 }}
            >
              <Box sx={{ fontSize: 'xs', fontWeight: 'bold' }}>S</Box>
            </IconButton>
            <IconButton
              size='sm'
              variant={mode === 'longBreak' ? 'solid' : 'plain'}
              color='success'
              aria-label={t('pomodoro.modes.longBreak')}
              aria-pressed={mode === 'longBreak'}
              onClick={() => changeMode('longBreak')}
              sx={{ minWidth: 32, height: 32 }}
            >
              <Box sx={{ fontSize: 'xs', fontWeight: 'bold' }}>L</Box>
            </IconButton>
          </Stack>

          {/* Separator */}
          <Box sx={{ width: 1, height: 32, bgcolor: 'divider' }} />

          {/* Actions */}
          <Stack direction='row' spacing={1}>
            <IconButton
              size='sm'
              variant='plain'
              color='neutral'
              aria-label={t('pomodoro.reset')}
              onClick={resetTimer}
              sx={{ minWidth: 32, height: 32 }}
            >
              <RefreshRounded fontSize='small' />
            </IconButton>
            <IconButton
              size='md'
              variant='solid'
              color={mode === 'work' ? 'primary' : 'success'}
              aria-label={isActive ? t('pomodoro.pause') : t('pomodoro.start')}
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

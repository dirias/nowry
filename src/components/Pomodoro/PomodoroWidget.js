import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Button, IconButton, Sheet, Stack, Typography } from '@mui/joy'
import { CloseRounded, RefreshRounded, SkipNextRounded } from '@mui/icons-material'
import { MODES, durationFor, nextModeAfter, usePomodoro } from '../../context/PomodoroContext'
import { focusRing } from '../Common/Form/formStyles'
import { Z_NAV } from '../../constants/zIndex'
import { formatClock } from './formatClock'
import { useTimerCorner } from './useTimerCorner'

// 320px: the widest primary label ("Start break") plus the mode switch and the
// secondary control fit on one row in English; longer locales wrap the primary
// onto its own full-width line rather than clipping.
const WIDGET_WIDTH = 320
const MODE_ORDER = [MODES.WORK, MODES.SHORT_BREAK, MODES.LONG_BREAK]

/** A control at rest gets a ground; hover lifts the label, never the ground (DESIGN_GUIDELINES §15.1). */
const groundedControl = {
  bgcolor: 'background.level1',
  color: 'text.secondary',
  borderRadius: 'md',
  '&:hover': { bgcolor: 'background.level1', color: 'text.primary' },
  ...focusRing
}

/** How far through the four-focus cycle the user is, as the dots show it. */
export const cycleProgress = (completedSessions, mode, total) => {
  const inCycle = completedSessions % total
  const earnedLongBreak = mode === MODES.LONG_BREAK && completedSessions > 0 && inCycle === 0
  return earnedLongBreak ? total : inCycle
}

const SessionDots = ({ filled, total, mode, label }) => (
  <Stack direction='row' spacing={0.5} alignItems='center' role='img' aria-label={label}>
    {Array.from({ length: total }, (_, index) => {
      const done = index < filled
      const current = !done && index === filled && mode === MODES.WORK
      return (
        <Box
          key={index}
          sx={{
            width: 6,
            height: 6,
            borderRadius: 'full',
            bgcolor: done ? 'primary.solidBg' : 'background.level2',
            ...(current && { bgcolor: 'transparent', boxShadow: 'inset 0 0 0 1.5px var(--joy-palette-primary-solidBg)' })
          }}
        />
      )
    })}
  </Stack>
)

const ModeSwitch = ({ mode, onChange, t }) => (
  <Box
    role='group'
    aria-label={t('pomodoro.modes.label')}
    sx={{
      display: 'flex',
      alignItems: 'stretch',
      flex: '1 1 128px',
      height: 32,
      p: '2px',
      borderRadius: 'md',
      bgcolor: 'background.level1'
    }}
  >
    {MODE_ORDER.map((value, index) => {
      const selected = value === mode
      return (
        <React.Fragment key={value}>
          {index > 0 && <Box aria-hidden='true' sx={{ width: '1px', my: '6px', bgcolor: 'divider' }} />}
          <Button
            variant='plain'
            color='neutral'
            size='sm'
            aria-pressed={selected}
            onClick={() => onChange(value)}
            sx={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              px: 0.5,
              fontSize: 'xs',
              fontWeight: selected ? 'lg' : 'md',
              borderRadius: 'sm',
              bgcolor: selected ? 'background.level2' : 'transparent',
              color: selected ? 'text.primary' : 'text.secondary',
              '&:hover': { bgcolor: selected ? 'background.level2' : 'transparent', color: 'text.primary' },
              ...focusRing
            }}
          >
            {t(`pomodoro.modes.short.${value}`)}
          </Button>
        </React.Fragment>
      )
    })}
  </Box>
)

/**
 * The floating Pomodoro widget (ADR-013).
 *
 * One object in every state: the mode label, the cycle dots, the status line
 * and the button label carry the state — the shape never changes. The 3px
 * progress bar is an edge, not an object: it spans the content width and does
 * the divider's job between the time and the controls.
 */
const PomodoroWidget = () => {
  const { t } = useTranslation()
  const {
    timeLeft,
    totalSeconds,
    progress,
    isActive,
    isPaused,
    mode,
    completedSessions,
    sessionsBeforeLongBreak,
    showWidget,
    setShowWidget,
    toggleTimer,
    resetTimer,
    skipSession,
    changeMode,
    settings
  } = usePomodoro()
  const corner = useTimerCorner({ width: WIDGET_WIDTH })

  if (!showWidget || !settings.enabled) return null

  const isFocus = mode === MODES.WORK
  const filled = cycleProgress(completedSessions, mode, sessionsBeforeLongBreak)
  const modeLabel = (value) => t(`pomodoro.modes.${value}`)

  const statusLine = () => {
    if (isPaused) return t('pomodoro.status.paused', { minutes: Math.round((totalSeconds - timeLeft) / 60) })
    if (isFocus) {
      const next = nextModeAfter(mode, completedSessions + 1)
      return t('pomodoro.status.next', { mode: modeLabel(next), minutes: durationFor(next, settings) / 60 })
    }
    if (isActive) return t('pomodoro.status.next', { mode: modeLabel(MODES.WORK), minutes: settings.work })
    if (mode === MODES.LONG_BREAK) return t('pomodoro.status.longBreakEarned', { total: sessionsBeforeLongBreak })
    return t('pomodoro.status.breakQueued', { count: filled, total: sessionsBeforeLongBreak })
  }

  const primaryLabel = () => {
    if (isActive) return t('pomodoro.pause')
    if (isPaused) return t('pomodoro.resume')
    return isFocus ? t('pomodoro.start') : t('pomodoro.startBreak')
  }

  return (
    <Sheet
      role='region'
      aria-label={t('common.pomodoro')}
      sx={{
        ...corner,
        zIndex: Z_NAV,
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        borderRadius: 'lg',
        boxShadow: 'lg',
        bgcolor: 'background.surface'
      }}
    >
      <Stack direction='row' justifyContent='space-between' alignItems='center'>
        <Stack direction='row' alignItems='center' spacing={1.25}>
          <Typography level='title-sm'>{modeLabel(mode)}</Typography>
          <SessionDots
            filled={filled}
            total={sessionsBeforeLongBreak}
            mode={mode}
            label={t('pomodoro.cycleProgress', { count: filled, total: sessionsBeforeLongBreak })}
          />
        </Stack>
        <IconButton
          size='sm'
          variant='plain'
          color='neutral'
          aria-label={t('pomodoro.close')}
          onClick={() => setShowWidget(false)}
          sx={{ '--IconButton-size': '28px', ...groundedControl, borderRadius: 'sm' }}
        >
          <CloseRounded fontSize='small' />
        </IconButton>
      </Stack>

      <Stack spacing={0.75}>
        <Typography level='display-md' component='div' sx={{ fontWeight: 'lg', lineHeight: 1 }}>
          {formatClock(timeLeft)}
        </Typography>
        <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
          {statusLine()}
        </Typography>
      </Stack>

      <Box
        role='progressbar'
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        sx={{ height: 3, borderRadius: 'full', bgcolor: 'background.level2', overflow: 'hidden' }}
      >
        <Box sx={{ width: `${progress * 100}%`, height: '100%', bgcolor: 'primary.solidBg', transition: 'width 0.5s linear' }} />
      </Box>

      <Stack direction='row' alignItems='center' spacing={1} useFlexGap flexWrap='wrap'>
        <ModeSwitch mode={mode} onChange={changeMode} t={t} />
        <IconButton
          size='sm'
          variant='plain'
          color='neutral'
          aria-label={isFocus ? t('pomodoro.reset') : t('pomodoro.skip')}
          onClick={isFocus ? resetTimer : skipSession}
          sx={{ '--IconButton-size': '32px', ...groundedControl }}
        >
          {isFocus ? <RefreshRounded fontSize='small' /> : <SkipNextRounded fontSize='small' />}
        </IconButton>
        <Button
          size='sm'
          variant='solid'
          color='primary'
          onClick={toggleTimer}
          sx={{ flex: '1 1 auto', minWidth: 96, minHeight: 32, px: 1.5, borderRadius: 'md', whiteSpace: 'nowrap', ...focusRing }}
        >
          {primaryLabel()}
        </Button>
      </Stack>
    </Sheet>
  )
}

export default PomodoroWidget

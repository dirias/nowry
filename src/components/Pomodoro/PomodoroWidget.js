import React, { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Button, IconButton, Modal, ModalDialog, Sheet, Stack, Typography } from '@mui/joy'
import { ClickAwayListener } from '@mui/base/ClickAwayListener'
import { CloseRounded, RefreshRounded, SkipNextRounded } from '@mui/icons-material'
import { MODES, usePomodoro } from '@nowry/core/context/PomodoroContext'
import { cycleProgress, nextModeAfter, statusLine } from '@nowry/core/domain/pomodoroCycle'
import { focusRing } from '../Common/Form/formStyles'
import { Z_NAV } from '@nowry/core/constants/zIndex'
import { formatClock } from '@nowry/core/utils/formatClock'
import { useTimerCorner } from './useTimerCorner'

// 320px: the widest primary label ("Start break") plus the mode switch and the
// secondary control fit on one row in English; longer locales wrap the primary
// onto its own full-width line rather than clipping.
const WIDGET_WIDTH = 320
const MODE_ORDER = [MODES.WORK, MODES.SHORT_BREAK, MODES.LONG_BREAK]
const BRAND_NAME = 'Nowry'

/** A control at rest gets a ground; hover lifts the label, never the ground (DESIGN_GUIDELINES §15.1). */
const groundedControl = {
  bgcolor: 'background.level1',
  color: 'text.secondary',
  borderRadius: 'md',
  '&:hover': { bgcolor: 'background.level1', color: 'text.primary' },
  ...focusRing
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

/**
 * The left-rail segmented object. While the timer runs it is the mode switch;
 * when the session has ended it is the two extensions (ADR-036) — the same
 * shape in the same slot, saying a different thing.
 */
const SegmentedSlot = ({ label, items }) => (
  <Box
    role='group'
    aria-label={label}
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
    {items.map(({ key, text, selected, onClick }, index) => (
      <React.Fragment key={key}>
        {index > 0 && <Box aria-hidden='true' sx={{ width: '1px', my: '6px', bgcolor: 'divider' }} />}
        <Button
          variant='plain'
          color='neutral'
          size='sm'
          aria-pressed={selected}
          onClick={onClick}
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
          {text}
        </Button>
      </React.Fragment>
    ))}
  </Box>
)

const startLabelFor = (nextMode, t) => {
  if (nextMode === MODES.WORK) return t('pomodoro.startFocus')
  if (nextMode === MODES.LONG_BREAK) return t('pomodoro.startLongBreak')
  return t('pomodoro.startBreak')
}

/**
 * The sheet's contents — one anatomy for the corner, the corner-while-ended
 * and the promoted dialog. Title row, readout and status, the progress edge,
 * the control row. What each slot says comes from the timer's state; what
 * shape it is never changes (ADR-013, ADR-036).
 */
const SheetContent = ({ timer, t, ids, onClose }) => {
  const {
    timeLeft,
    totalSeconds,
    sessionSeconds,
    progress,
    isActive,
    isPaused,
    isEnded,
    autoStartIn,
    extension,
    extendMinutes,
    mode,
    completedSessions,
    sessionsBeforeLongBreak,
    toggleTimer,
    resetTimer,
    skipSession,
    changeMode,
    extendSession,
    startNext,
    stopAfterEnd,
    settings
  } = timer

  const isFocus = mode === MODES.WORK
  const filled = cycleProgress(completedSessions, mode, sessionsBeforeLongBreak)
  const modeLabel = (value) => t(`pomodoro.modes.${value}`)

  /*
   * Derived in the shared package: the phone showed only the last of the cases,
   * always, so a paused timer and a running one said the same thing (MOB-062).
   * It hands back a key and its parameters — including a mode NAME rather than
   * a translated one, which is this caller's lookup (ADR-031).
   */
  const status = () => {
    const { key, params } = statusLine({
      mode,
      isActive,
      isPaused,
      isEnded,
      autoStartIn,
      extension,
      sessionSeconds,
      timeLeft,
      totalSeconds,
      completedSessions,
      sessionsBeforeLongBreak,
      settings
    })
    return t(key, { ...params, ...(params.mode ? { mode: modeLabel(params.mode) } : null) })
  }

  const primaryLabel = () => {
    if (isActive) return t('pomodoro.pause')
    if (isPaused) return t('pomodoro.resume')
    return isFocus ? t('pomodoro.start') : t('pomodoro.startBreak')
  }

  const nextMode = isFocus ? nextModeAfter(mode, completedSessions + 1) : MODES.WORK

  const controlRow = isEnded ? (
    <>
      <SegmentedSlot
        label={t('pomodoro.extend')}
        items={extendMinutes.map((minutes) => ({
          key: minutes,
          text: t('pomodoro.extendBy', { minutes }),
          selected: false,
          onClick: () => extendSession(minutes)
        }))}
      />
      <Button
        size='sm'
        variant='soft'
        color='neutral'
        onClick={stopAfterEnd}
        sx={{ minHeight: 32, px: 1.5, borderRadius: 'md', ...focusRing }}
      >
        {t('pomodoro.stop')}
      </Button>
      <Button
        size='sm'
        variant='solid'
        color='primary'
        onClick={startNext}
        sx={{ flex: '1 1 auto', minWidth: 96, minHeight: 32, px: 1.5, borderRadius: 'md', whiteSpace: 'nowrap', ...focusRing }}
      >
        {startLabelFor(nextMode, t)}
      </Button>
    </>
  ) : (
    <>
      <SegmentedSlot
        label={t('pomodoro.modes.label')}
        items={MODE_ORDER.map((value) => ({
          key: value,
          text: t(`pomodoro.modes.short.${value}`),
          selected: value === mode,
          onClick: () => changeMode(value)
        }))}
      />
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
    </>
  )

  return (
    <>
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
          onClick={onClose}
          sx={{ '--IconButton-size': '28px', ...groundedControl, borderRadius: 'sm' }}
        >
          <CloseRounded fontSize='small' />
        </IconButton>
      </Stack>

      <Stack spacing={0.75}>
        {/* The readout: the clock while the timer runs, the verdict when it has
            ended. The loudest text on the sheet says the one thing a stranger
            needs, and it names the dialog (ADR-036). */}
        <Typography id={ids.readout} level='display-md' component='div' sx={{ fontWeight: 'lg', lineHeight: 1 }}>
          {isEnded ? t('pomodoro.timesUp') : formatClock(timeLeft)}
        </Typography>
        <Typography id={ids.status} level='body-xs' sx={{ color: 'text.tertiary' }}>
          {status()}
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
        {controlRow}
      </Stack>
    </>
  )
}

/**
 * The moment a session ends is the one time the sheet is promoted: from the
 * corner to the centre, on the modal layer, with a backdrop. It is promoted
 * only when the end happens while this page is open — an ended state restored
 * after a reload comes back in the corner, because the live moment is over.
 */
const usePromotion = (isEnded) => {
  const [promoted, setPromoted] = useState(false)
  const wasEnded = useRef(isEnded)
  useEffect(() => {
    if (isEnded && !wasEnded.current) setPromoted(true)
    if (!isEnded) setPromoted(false)
    wasEnded.current = isEnded
  }, [isEnded])
  return [promoted, () => setPromoted(false)]
}

/** The tab title carries the verdict while the question stands — the cheapest background signal there is. */
const useVerdictTitle = (active, verdict) => {
  useEffect(() => {
    if (!active) return undefined
    const previous = document.title
    document.title = `${verdict} · ${BRAND_NAME}`
    return () => {
      document.title = previous
    }
  }, [active, verdict])
}

/**
 * The floating Pomodoro widget (ADR-013, ADR-036).
 *
 * One object in every state: the mode label, the cycle dots, the readout, the
 * status line and the button labels carry the state — the shape never changes.
 * The 3px progress bar is an edge, not an object: it spans the content width
 * and does the divider's job between the time and the controls.
 *
 * A click outside or Escape minimises it to the chip — the timer keeps running
 * and the chip carries the clock, so a stray click costs nothing. The
 * click-away listener lets that click through to whatever was under it; a
 * backdrop would swallow it. The ONE exception is the end of a session: then
 * the same sheet sits in the centre behind a backdrop as an alertdialog, and
 * Escape, the close key and the backdrop demote it to the chip — the question
 * stays, the chime does not.
 */
const PomodoroWidget = () => {
  const { t } = useTranslation()
  const timer = usePomodoro()
  const { isEnded, showWidget, setShowWidget, dismissEnd, settings } = timer
  const corner = useTimerCorner({ width: WIDGET_WIDTH })
  const readoutId = useId()
  const statusId = useId()
  const ids = { readout: readoutId, status: statusId }
  const [promoted, demote] = usePromotion(isEnded && settings.enabled)
  const open = showWidget && settings.enabled
  const isPromoted = promoted && isEnded && settings.enabled

  useVerdictTitle(isEnded && settings.enabled, t('pomodoro.timesUp'))

  useEffect(() => {
    if (!open || isPromoted) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setShowWidget(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, isPromoted, setShowWidget])

  if (isPromoted) {
    const onDismiss = () => {
      demote()
      dismissEnd()
    }
    return (
      <Modal open onClose={onDismiss}>
        <ModalDialog
          role='alertdialog'
          variant='plain'
          layout='center'
          aria-labelledby={readoutId}
          aria-describedby={statusId}
          sx={{
            width: WIDGET_WIDTH,
            maxWidth: 'calc(100vw - 32px)',
            p: 2,
            gap: 1.5,
            borderRadius: 'lg',
            boxShadow: 'lg',
            border: 'none',
            bgcolor: 'background.surface'
          }}
        >
          <SheetContent timer={timer} t={t} ids={ids} onClose={onDismiss} />
        </ModalDialog>
      </Modal>
    )
  }

  if (!open) return null

  return (
    <ClickAwayListener onClickAway={() => setShowWidget(false)}>
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
        <SheetContent timer={timer} t={t} ids={ids} onClose={() => setShowWidget(false)} />
      </Sheet>
    </ClickAwayListener>
  )
}

export default PomodoroWidget

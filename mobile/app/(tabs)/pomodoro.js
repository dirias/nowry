/**
 * The Focus tab (MOB-024).
 *
 * The timer itself is `PomodoroContext`, unchanged. It already keeps a
 * wall-clock `endTime` rather than counting down, and it already restores that
 * from storage synchronously, so backgrounding for ten minutes, force-quitting
 * and relaunching all show the right remaining time without a line of mobile
 * code. What a phone adds is one thing the web never needed: an alert that
 * fires while nothing of ours is running.
 *
 * **The alarm is handed to the OS at start, not at zero.** A backgrounded app's
 * timers are suspended, so there is no moment of zero to react to. The effect
 * below schedules one notification when the session starts and withdraws it
 * when the session stops — pause, reset, skip or a mode change all pass through
 * `isActive` or `mode`, so all four are covered by depending on those two.
 *
 * `timeLeft` is read through a ref on purpose. Depending on it would tear down
 * and rebuild the OS alarm once a second.
 */
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { MODES, usePomodoro } from '@nowry/core/context/PomodoroContext'
import { formatClock } from '@nowry/core/utils/formatClock'
import { cancelEndAlarm, scheduleEndAlarm } from '../../src/platform/alerts'
import { Button, Progress, Screen, Segmented, Stack, Typography } from '../../src/ui'

const MODE_ORDER = [MODES.WORK, MODES.SHORT_BREAK, MODES.LONG_BREAK]

export default function Focus() {
  const { t } = useTranslation()
  const timer = usePomodoro()
  const { mode, timeLeft, isActive, isPaused, progress, completedSessions, sessionsBeforeLongBreak } = timer

  const secondsRef = useRef(timeLeft)
  secondsRef.current = timeLeft

  useEffect(() => {
    if (!isActive) {
      cancelEndAlarm()
      return
    }
    scheduleEndAlarm({
      seconds: secondsRef.current,
      title: t('pomodoro.notification.title'),
      body: t(mode === MODES.WORK ? 'pomodoro.notification.workDone' : 'pomodoro.notification.breakDone')
    })
  }, [isActive, mode, t])

  const startLabel = isPaused ? 'pomodoro.resume' : mode === MODES.WORK ? 'pomodoro.start' : 'pomodoro.startBreak'

  return (
    <Screen>
      <Stack spacing={3}>
        <Segmented
          accessibilityLabel={t('pomodoro.modes.label')}
          value={mode}
          onChange={timer.changeMode}
          options={MODE_ORDER.map((value) => ({ value, label: t(`pomodoro.modes.short.${value}`) }))}
        />

        {/* The clock is the screen. Everything else explains or changes it. */}
        <Stack spacing={1}>
          <Typography level='h1' accessibilityLiveRegion='polite'>
            {formatClock(timeLeft)}
          </Typography>
          <Typography level='body-sm' color='text.tertiary'>
            {t(`pomodoro.modes.${mode}`)}
          </Typography>
        </Stack>

        <Progress value={progress * 100} accessibilityLabel={t(`pomodoro.modes.${mode}`)} />

        <Typography level='body-sm' color='text.tertiary'>
          {t('pomodoro.cycleProgress', {
            count: completedSessions % sessionsBeforeLongBreak,
            total: sessionsBeforeLongBreak
          })}
        </Typography>

        <Button size='lg' onPress={timer.toggleTimer}>
          {t(isActive ? 'pomodoro.pause' : startLabel)}
        </Button>

        <Stack direction='row' spacing={1}>
          <Button variant='secondary' style={{ flex: 1 }} onPress={timer.resetTimer}>
            {t('pomodoro.reset')}
          </Button>
          <Button variant='tertiary' style={{ flex: 1 }} onPress={timer.skipSession}>
            {t('pomodoro.skip')}
          </Button>
        </Stack>
      </Stack>
    </Screen>
  )
}

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
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { MODES, usePomodoro } from '@nowry/core/context/PomodoroContext'
import { cycleProgress, statusLine } from '@nowry/core/domain/pomodoroCycle'
import { formatClock } from '@nowry/core/utils/formatClock'
import { cancelEndAlarm, scheduleEndAlarm } from '../../src/platform/alerts'
import { useTheme } from '../../src/theme'
import { Button, Progress, Screen, Segmented, Stack, Typography, resolveColor } from '../../src/ui'

const MODE_ORDER = [MODES.WORK, MODES.SHORT_BREAK, MODES.LONG_BREAK]

/**
 * How far through the cycle you are, as the web's widget draws it: a filled dot
 * per focus session done, a ringed one for the session in hand.
 *
 * The phone had the sentence and not the dots. The sentence is the text
 * alternative — it is what a screen reader gets from the row's label — and a
 * screen that shows only the alternative is a screen missing its figure.
 */
function SessionDots({ filled, total, mode, label }) {
  const theme = useTheme()

  return (
    /* `accessible`, so the dots are one element with one sentence rather than
       four unlabelled views and no sentence at all (MOB-042). */
    <View accessible accessibilityRole='image' accessibilityLabel={label} style={{ flexDirection: 'row', gap: theme.spacing[0.5] }}>
      {Array.from({ length: total }, (_, index) => {
        const done = index < filled
        const current = !done && index === filled && mode === MODES.WORK
        return (
          <View
            key={index}
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: resolveColor(theme, done ? 'primary.solidBg' : 'background.level2'),
              ...(current
                ? { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: resolveColor(theme, 'primary.solidBg') }
                : null)
            }}
          />
        )
      })}
    </View>
  )
}

export default function Focus() {
  const { t } = useTranslation()
  const timer = usePomodoro()
  const { mode, timeLeft, totalSeconds, isActive, isPaused, progress, completedSessions, sessionsBeforeLongBreak, settings } = timer

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

  const isFocus = mode === MODES.WORK
  const filled = cycleProgress(completedSessions, mode, sessionsBeforeLongBreak)

  /*
   * The web's four cases, derived in the shared package. This screen used to
   * print the queued-break count unconditionally, so a paused timer, a running
   * one and an earned long break all read the same — and it counted the cycle
   * as `completedSessions % total`, which says "0 of 4" at exactly the moment
   * the answer is four (MOB-062).
   */
  const status = () => {
    const { key, params } = statusLine({
      mode,
      isActive,
      isPaused,
      timeLeft,
      totalSeconds,
      completedSessions,
      sessionsBeforeLongBreak,
      settings
    })
    return t(key, { ...params, ...(params.mode ? { mode: t(`pomodoro.modes.${params.mode}`) } : null) })
  }

  return (
    <Screen>
      <Stack spacing={3}>
        <Segmented
          accessibilityLabel={t('pomodoro.modes.label')}
          value={mode}
          onChange={timer.changeMode}
          options={MODE_ORDER.map((value) => ({ value, label: t(`pomodoro.modes.short.${value}`) }))}
        />

        {/* The mode and the cycle, on the row the web puts them on. */}
        <Stack direction='row' spacing={1.5} alignItems='center'>
          <Typography level='title-sm'>{t(`pomodoro.modes.${mode}`)}</Typography>
          <SessionDots
            filled={filled}
            total={sessionsBeforeLongBreak}
            mode={mode}
            label={t('pomodoro.cycleProgress', { count: filled, total: sessionsBeforeLongBreak })}
          />
        </Stack>

        {/* The clock is the screen. Everything else explains or changes it. */}
        <Stack spacing={1}>
          <Typography level='h1' accessibilityLiveRegion='polite'>
            {formatClock(timeLeft)}
          </Typography>
          <Typography level='body-sm' color='text.tertiary'>
            {status()}
          </Typography>
        </Stack>

        <Progress value={progress * 100} accessibilityLabel={t(`pomodoro.modes.${mode}`)} />

        {/*
         * Beside, not stacked. Two full-width slabs one above the other read as
         * two equally weighted choices, and this screen has one action and one
         * alternative — the same correction the deck screen and the group
         * screen already carry, and the phone's reading of §15.6's two rails:
         * the alternative starts on the left, the action ends on the right.
         */}
        <Stack direction='row' spacing={1}>
          {/*
           * ONE secondary, as the web has it: reset while focusing, skip while
           * on a break. Both were drawn at once, so "Skip to the next session"
           * sat under a focus timer that has no next session to skip to — and
           * the two were a boxed key beside a bare text link, which is two
           * weights for one job.
           */}
          <Button size='lg' variant='secondary' style={{ flex: 1 }} onPress={isFocus ? timer.resetTimer : timer.skipSession}>
            {t(isFocus ? 'pomodoro.reset' : 'pomodoro.skip')}
          </Button>

          <Button size='lg' style={{ flex: 2 }} onPress={timer.toggleTimer}>
            {t(isActive ? 'pomodoro.pause' : startLabel)}
          </Button>
        </Stack>
      </Stack>
    </Screen>
  )
}

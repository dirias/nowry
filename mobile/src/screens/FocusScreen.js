/**
 * Focus, full screen (MOB-104).
 *
 * Direction A of the Focus tab canvas, chosen: the clock is the screen. And, as
 * asked, not a tab page under the app bar but a screen that comes UP over
 * whatever you were doing and goes back down when closed — the web's own shape
 * for the timer, which is a widget that opens over the page and collapses to a
 * chip. So this is driven by the timer's own `showWidget`, the flag the web's
 * widget and chip already share: the Focus tab's button raises it, the app
 * bar's `TimerChip` raises it while a session runs, and closing lowers it.
 *
 * **Mounted once, beside the tabs, and always.** The end-of-session alarm used
 * to live on the Focus tab's screen, and a tab screen mounts the first time it
 * is opened — so a timer started from anywhere else before Focus had ever been
 * visited scheduled no alarm at all. It lives here now, where it always runs.
 *
 * **The alarm is handed to the OS at start, not at zero.** A backgrounded app's
 * timers are suspended, so there is no moment of zero to react to. The effect
 * schedules one notification when the session starts and withdraws it when the
 * session stops — pause, reset, skip or a mode change all pass through
 * `isActive` or `mode`. `timeLeft` is read through a ref on purpose: depending
 * on it would rebuild the OS alarm once a second.
 *
 * The keys stack at the foot, where a thumb is, with the solid one last — the
 * order every other object in this client uses.
 */
import { useEffect, useRef } from 'react'
import { Modal, View, useWindowDimensions } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MODES, usePomodoro } from '@nowry/core/context/PomodoroContext'
import { cycleProgress, nextModeAfter, ringArcs, statusLine } from '@nowry/core/domain/pomodoroCycle'
import { formatClock } from '@nowry/core/utils/formatClock'
import { cancelEndAlarm, scheduleEndAlarm } from '../platform/alerts'
import { useTheme } from '../theme'
import { useReduceMotion } from '../theme/motion'
import { Button, FocusDial, Icon, IconButton, Segmented, Stack, Typography, resolveColor } from '../ui'

const MODE_ORDER = [MODES.WORK, MODES.SHORT_BREAK, MODES.LONG_BREAK]

/** The dial never grows past this, so a tablet does not get a dinner plate. */
const DIAL_MAX = 300

function useEndAlarm({ isActive, mode, timeLeft, sound }) {
  const { t } = useTranslation()
  const secondsRef = useRef(timeLeft)
  secondsRef.current = timeLeft

  useEffect(() => {
    if (!isActive) {
      cancelEndAlarm()
      return
    }
    scheduleEndAlarm({
      seconds: secondsRef.current,
      sound,
      title: t('pomodoro.notification.title'),
      body: t(mode === MODES.WORK ? 'pomodoro.notification.workDone' : 'pomodoro.notification.breakDone')
    })
  }, [isActive, mode, sound, t])
}

export function FocusScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const reduceMotion = useReduceMotion()
  const timer = usePomodoro()
  const {
    mode,
    timeLeft,
    totalSeconds,
    sessionSeconds,
    isActive,
    isPaused,
    isEnded,
    autoStartIn,
    extension,
    extendMinutes,
    progress,
    completedSessions,
    sessionsBeforeLongBreak,
    settings,
    setShowWidget
  } = timer

  useEndAlarm({ isActive, mode, timeLeft, sound: settings.sound })

  // The phone's promotion (ADR-036): when a session ends while the app is in
  // front, this screen rises over whatever tab is open, the way the web moves
  // its sheet to the centre. A restored ended state does not — the live moment
  // is over — so this arms on the transition only. In the background the OS
  // notification is the interruption, and a tap lands here.
  const wasEnded = useRef(isEnded)
  useEffect(() => {
    if (isEnded && !wasEnded.current) setShowWidget(true)
    wasEnded.current = isEnded
  }, [isEnded, setShowWidget])

  const close = () => timer.setShowWidget(false)
  const isFocus = mode === MODES.WORK
  const done = cycleProgress(completedSessions, mode, sessionsBeforeLongBreak)
  const padding = theme.spacing[3]
  const dial = Math.min(DIAL_MAX, width - padding * 2 - theme.spacing[4])

  const status = statusLine({
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
  const statusText = t(status.key, {
    ...status.params,
    ...(status.params.mode ? { mode: t(`pomodoro.modes.${status.params.mode}`) } : null)
  })

  // Which session of the cycle this is, while focusing; a break is not one.
  const caption = isFocus
    ? t('pomodoro.dialCaption', {
        mode: t('pomodoro.modes.work'),
        current: Math.min(done + 1, sessionsBeforeLongBreak),
        total: sessionsBeforeLongBreak
      })
    : t(`pomodoro.modes.${mode}`)

  const startLabel = isPaused ? 'pomodoro.resume' : isFocus ? 'pomodoro.start' : 'pomodoro.startBreak'

  // Ended: the primary names what comes next, the same three labels the web uses.
  const nextMode = isFocus ? nextModeAfter(mode, completedSessions + 1) : MODES.WORK
  const nextLabel =
    nextMode === MODES.WORK ? 'pomodoro.startFocus' : nextMode === MODES.LONG_BREAK ? 'pomodoro.startLongBreak' : 'pomodoro.startBreak'

  return (
    <Modal
      visible={Boolean(timer.showWidget)}
      animationType={reduceMotion ? 'none' : 'slide'}
      onRequestClose={close}
      statusBarTranslucent
      navigationBarTranslucent
    >
      {/* The app draws its status bar on the accent, with light icons. This
          screen's ground is the page, so the icons follow the page instead or
          they vanish into it. */}
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <View
        accessibilityViewIsModal
        style={{
          flex: 1,
          backgroundColor: resolveColor(theme, 'background.body'),
          paddingTop: insets.top + theme.spacing[1],
          paddingBottom: insets.bottom + theme.spacing[3],
          paddingLeft: insets.left + padding,
          paddingRight: insets.right + padding
        }}
      >
        <Stack direction='row' alignItems='center' justifyContent='space-between' style={{ minHeight: 48 }}>
          <Typography level='title-lg' accessibilityRole='header'>
            {t('nav.focus')}
          </Typography>
          <IconButton
            variant='tertiary'
            onPress={close}
            accessibilityLabel={t('pomodoro.close')}
            style={{ marginRight: -theme.spacing[1] }}
          >
            <Icon name='X' size='md' color='text.secondary' />
          </IconButton>
        </Stack>

        <Segmented
          accessibilityLabel={t('pomodoro.modes.label')}
          value={mode}
          onChange={timer.changeMode}
          options={MODE_ORDER.map((value) => ({ value, label: t(`pomodoro.modes.short.${value}`) }))}
          style={{ marginTop: theme.spacing[2] }}
        />

        {/* The clock is the screen: the dial takes the room between the modes
            and the keys, centred in it. */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing[2] }}>
          <FocusDial
            size={dial}
            arcs={ringArcs({ mode, completedSessions, sessionsBeforeLongBreak, progress })}
            clock={isEnded ? t('pomodoro.timesUp') : formatClock(timeLeft)}
            verdict={isEnded}
            caption={caption}
            ringLabel={t('pomodoro.cycleProgress', { count: done, total: sessionsBeforeLongBreak })}
          />
          <Typography level='body-sm' color='text.secondary' style={{ textAlign: 'center' }}>
            {statusText}
          </Typography>
        </View>

        {isEnded ? (
          /* The end of a session (ADR-036): the key column is the web's ended
             row stood upright — the two extensions as one segmented object,
             a labelled Stop, and the next session as the primary. The mode
             switch above stays: changing mode is also a decision. */
          <Stack spacing={1}>
            <Segmented
              accessibilityLabel={t('pomodoro.extend')}
              value={null}
              onChange={timer.extendSession}
              options={extendMinutes.map((minutes) => ({ value: minutes, label: t('pomodoro.extendBy', { minutes }) }))}
            />
            <Button size='lg' variant='secondary' onPress={timer.stopAfterEnd}>
              {t('pomodoro.stop')}
            </Button>
            <Button size='lg' onPress={timer.startNext}>
              {t(nextLabel)}
            </Button>
          </Stack>
        ) : (
          /* ONE alternative, as the web has it: reset while focusing, skip while
             on a break. */
          <Stack spacing={1}>
            <Button size='lg' variant='secondary' onPress={isFocus ? timer.resetTimer : timer.skipSession}>
              {t(isFocus ? 'pomodoro.reset' : 'pomodoro.skip')}
            </Button>
            <Button size='lg' onPress={timer.toggleTimer}>
              {t(isActive ? 'pomodoro.pause' : startLabel)}
            </Button>
          </Stack>
        )}
      </View>
    </Modal>
  )
}

export default FocusScreen

/**
 * The running timer, where it can be seen from any screen (MOB-104).
 *
 * The web's `PomodoroChip`: the timer's collapsed state, a clock in a chip that
 * opens the timer, with a progress edge along its foot while it runs. The web
 * floats it in a corner; the phone's corners are the companion's and the tab
 * bar's, and the app bar is on every screen — so it sits there, beside the
 * account.
 *
 * **Only while a session is under way.** The web shows the chip whenever the
 * timer is switched on, reading "Focus" when idle, because the web has no
 * other way in. The phone has the Focus tab, so an idle chip would be a second
 * button for the same destination on every screen. Running or paused, it is
 * the only place the time is visible once the dial is closed.
 */
import { Pressable, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { usePomodoro } from '@nowry/core/context/PomodoroContext'
import { formatClock } from '@nowry/core/utils/formatClock'
import { useTheme } from '../../theme'
import { Typography, resolveColor } from '../Typography'
import { Icon } from '../icons'
import { MIN_TOUCH_TARGET } from '../buttonSpec'

/** The progress edge along the chip's foot — the web's own 3px. */
const EDGE = 3

export function TimerChip() {
  const { t } = useTranslation()
  const theme = useTheme()
  const { isActive, isPaused, timeLeft, progress, showWidget, setShowWidget } = usePomodoro()

  if (!(isActive || isPaused) || showWidget) return null

  const clock = formatClock(timeLeft)

  return (
    <Pressable
      onPress={() => setShowWidget(true)}
      accessibilityRole='button'
      accessibilityLabel={`${t('pomodoro.open')}, ${clock}`}
      hitSlop={(MIN_TOUCH_TARGET - 32) / 2}
      style={({ pressed }) => ({
        height: 32,
        paddingHorizontal: theme.spacing[1.5],
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[0.5],
        overflow: 'hidden',
        borderRadius: theme.radius.md,
        backgroundColor: resolveColor(theme, 'primary.solidActiveBg'),
        opacity: pressed ? 0.7 : 1
      })}
    >
      <Icon name='Timer' size='sm' color='primary.solidColor' />
      <Typography level='title-sm' color='primary.solidColor' style={{ fontVariant: ['tabular-nums'] }}>
        {clock}
      </Typography>
      {isActive ? (
        <View
          importantForAccessibility='no'
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: EDGE,
            backgroundColor: resolveColor(theme, 'primary.solidHoverBg')
          }}
        >
          <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: resolveColor(theme, 'primary.solidColor') }} />
        </View>
      ) : null}
    </Pressable>
  )
}

export default TimerChip

/**
 * Home on the phone, drawn (MOB-124, ADR-035 §1 on the phone).
 *
 * The web's landing shows the product as a drawing built from the app's own
 * tokens; the phone's Welcome showed four text rows and asked a stranger to
 * trust them. This is the web's `PhoneFrame` brought to the phone: the same
 * keys, the same fixed sample content, and — because the rule is that a frame
 * is built beside its component and checked against it element by element —
 * the anatomy of `app/(tabs)/index.js` as it is today, not as the web drew it
 * in September: the accent bar with the lockup and the account, the greeting
 * with its caption and the Study key, then the day panel with its Now · Tasks
 * segment, the edge, and the rows.
 *
 * It wears the visitor's accent and scheme, so it never shows the wrong colour
 * to anyone. `accessibilityElementsHidden`: the copy beside it carries the
 * meaning; a screen reader does not need to read a picture of a screen.
 */
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../theme'
import { Box } from '../Box'
import { Progress } from '../Progress'
import { Stack } from '../Stack'
import { Typography, resolveColor } from '../Typography'
import { BrandMark } from './BrandMark'

/** Fixed sample content, the web frame's own. */
const TASKS = [
  { key: 'review', done: true },
  { key: 'read', done: false },
  { key: 'run', done: false }
]
const DUE = 21
const AHEAD = 3

const MARK = 14
const AVATAR = 14
const TICK = 14

export function PhoneFrame({ style }) {
  const { t } = useTranslation()
  const theme = useTheme()
  const done = TASKS.filter((task) => task.done).length

  return (
    <Box
      border='neutral.outlinedBorder'
      radius='lg'
      bg='background.body'
      style={[{ overflow: 'hidden' }, style]}
      accessibilityElementsHidden
      importantForAccessibility='no-hide-descendants'
    >
      {/* The app bar, at frame scale: the mark, the name, the account. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: theme.spacing[1.5],
          paddingVertical: theme.spacing[1],
          backgroundColor: resolveColor(theme, 'primary.solidBg')
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[0.5] }}>
          <BrandMark size={MARK} color='primary.solidColor' />
          <Typography level='body-xs' weight='xl' color='primary.solidColor'>
            nowry
          </Typography>
        </View>
        <View
          style={{
            width: AVATAR,
            height: AVATAR,
            borderRadius: AVATAR / 2,
            backgroundColor: resolveColor(theme, 'primary.softBg')
          }}
        />
      </View>

      <Stack spacing={1.5} style={{ padding: theme.spacing[1.5] }}>
        {/* The greeting and the day's key, as Home's head row. */}
        <Stack direction='row' spacing={1} alignItems='flex-start' justifyContent='space-between'>
          <Stack spacing={0.25} style={{ flex: 1, minWidth: 0 }}>
            <Typography level='title-md'>{t('dashboard.welcome', { name: t('landing.frames.phone.name') })}</Typography>
            <Typography level='body-xs' color='text.secondary'>
              {t('landing.frames.phone.caption')}
            </Typography>
          </Stack>
          <View
            style={{
              paddingHorizontal: theme.spacing[1],
              paddingVertical: theme.spacing[0.5],
              borderRadius: theme.radius.sm,
              backgroundColor: resolveColor(theme, 'background.level1'),
              borderBottomWidth: 2,
              borderBottomColor: resolveColor(theme, 'neutral.outlinedBorder')
            }}
          >
            <Typography level='body-xs' weight='lg' color='text.secondary'>
              {t('study.today.study', { count: DUE })}
            </Typography>
          </View>
        </Stack>

        {/* The day panel: the segment, the edge, the rows. */}
        <Box bg='background.surface' border radius='md' style={{ padding: theme.spacing[1.5], gap: theme.spacing[1] }}>
          <View
            style={{
              flexDirection: 'row',
              alignSelf: 'flex-start',
              borderRadius: theme.radius.md,
              backgroundColor: resolveColor(theme, 'background.level1'),
              borderWidth: 1,
              borderColor: resolveColor(theme, 'divider'),
              padding: 2
            }}
          >
            <Cell label={t('blocks.home.now')} count={AHEAD} active theme={theme} />
            <Cell label={t('tasks.title')} count={TASKS.length - done} theme={theme} />
          </View>
          <Progress value={(done / TASKS.length) * 100} />
          <Stack>
            {TASKS.map(({ key, done: isDone }) => (
              <View
                key={key}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing[1],
                  paddingVertical: theme.spacing[1],
                  borderBottomWidth: 1,
                  borderBottomColor: resolveColor(theme, 'divider')
                }}
              >
                <View
                  style={{
                    width: TICK,
                    height: TICK,
                    borderRadius: TICK / 2,
                    borderWidth: 1.5,
                    borderColor: resolveColor(theme, isDone ? 'primary.solidBg' : 'neutral.outlinedBorder'),
                    backgroundColor: isDone ? resolveColor(theme, 'primary.solidBg') : 'transparent'
                  }}
                />
                <Typography
                  level='body-xs'
                  color={isDone ? 'text.tertiary' : 'text.primary'}
                  style={isDone ? { textDecorationLine: 'line-through' } : null}
                >
                  {t(`landing.frames.phone.tasks.${key}`)}
                </Typography>
              </View>
            ))}
          </Stack>
        </Box>
      </Stack>
    </Box>
  )
}

/** One cell of the frame's segment: the label and its count, as `Segmented` draws them. */
function Cell({ label, count, active = false, theme }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[0.5],
        paddingHorizontal: theme.spacing[1],
        paddingVertical: theme.spacing[0.5],
        borderRadius: theme.radius.sm,
        backgroundColor: active ? resolveColor(theme, 'background.surface') : 'transparent'
      }}
    >
      <Typography level='body-xs' weight='lg' color={active ? 'text.primary' : 'text.secondary'}>
        {label}
      </Typography>
      <Typography level='body-xs' color='text.tertiary'>
        {String(count)}
      </Typography>
    </View>
  )
}

export default PhoneFrame

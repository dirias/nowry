/**
 * DateField — a day, chosen from a month (MOB-044).
 *
 * The web writes `<input type="date">` and the browser supplies the calendar.
 * React Native supplies nothing: a date picker is a native module, a native
 * module is a new development build, and a build is twenty minutes of the
 * user's time every time this app is installed. So the month is drawn here,
 * from the kit — which also means it looks like the rest of the app rather
 * than like whichever OS is underneath, and behaves identically on both.
 *
 * The trigger is the `Select` trigger's anatomy on purpose: same height, same
 * hairline, same radius, same placeholder tone. A field that opens a sheet
 * should look like the other field that opens a sheet.
 *
 * **The value is a `YYYY-MM-DD` string, in local time**, which is what every
 * one of these endpoints takes and what `parseLocalDate` reads back. A `Date`
 * would invite `toISOString`, which is UTC, which moves a date to the previous
 * day for every user west of Greenwich — the bug `parseLocalDate` exists to
 * undo.
 *
 * The grid is a real grid: seven columns, weeks starting on Sunday to match
 * `startOfWeek` and FullCalendar's `firstDay`, so the phone and the web agree
 * about which week a day is in.
 */
import { useMemo, useState } from 'react'
import { Pressable, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { addMonths, formatMonthTitle } from '@nowry/core/domain/calendar/agendaGroups'
import { useTheme } from '../theme'
import { BottomSheet } from './BottomSheet'
import { Button } from './Button'
import { Icon } from './icons'
import { IconButton } from './IconButton'
import { Stack } from './Stack'
import { Typography, resolveColor } from './Typography'
import { MIN_TOUCH_TARGET } from './buttonSpec'

/** Sunday first, as `startOfWeek` has it. */
const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6]
const CELL = 40

/** `YYYY-MM-DD` from a Date, read in local time — never `toISOString`. */
export const toDateValue = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

/** The other direction, and the same rule: midnight LOCAL, not UTC. */
export const fromDateValue = (value) => {
  const match = String(value ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return null
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

export function DateField({ value, onChange, accessibilityLabel, placeholderKey = null, invalid = false, clearable = true }) {
  const { t, i18n } = useTranslation()
  const language = i18n?.language ?? 'en'
  const theme = useTheme()
  const [open, setOpen] = useState(false)
  const selected = fromDateValue(value)
  const [cursor, setCursor] = useState(() => selected ?? new Date())

  if (__DEV__ && !accessibilityLabel) {
    throw new Error('DateField: accessibilityLabel is required — the trigger shows a date, not what it is for.')
  }

  const label = useMemo(() => {
    if (!selected) return placeholderKey ? t(placeholderKey) : ''
    return new Intl.DateTimeFormat(language, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }).format(selected)
  }, [selected, language, placeholderKey, t])

  const open_ = () => {
    setCursor(selected ?? new Date())
    setOpen(true)
  }

  const choose = (date) => {
    onChange?.(toDateValue(date))
    setOpen(false)
  }

  return (
    <>
      <Pressable
        onPress={open_}
        accessibilityRole='button'
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ text: selected ? label : undefined }}
        accessibilityState={{ expanded: open }}
        style={{
          minHeight: MIN_TOUCH_TARGET,
          paddingHorizontal: theme.spacing[1.5],
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing[1],
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: resolveColor(theme, invalid ? 'danger.plainColor' : 'neutral.outlinedBorder'),
          backgroundColor: resolveColor(theme, 'background.surface')
        }}
      >
        <Icon name='Calendar' size='sm' color='text.tertiary' />
        <Typography level='body-md' color={selected ? 'text.primary' : 'text.tertiary'} numberOfLines={1} style={{ flex: 1 }}>
          {label}
        </Typography>
      </Pressable>

      <BottomSheet visible={open} onClose={() => setOpen(false)} title={accessibilityLabel}>
        <Stack spacing={2}>
          <Stack direction='row' spacing={1} style={{ alignItems: 'center' }}>
            <Typography level='title-md' style={{ flex: 1 }}>
              {formatMonthTitle(cursor, language)}
            </Typography>
            <IconButton
              size='sm'
              accessibilityLabel={t('calendarPage.nav.previous')}
              onPress={() => setCursor((date) => addMonths(date, -1))}
            >
              <Icon name='ChevronLeft' size='sm' />
            </IconButton>
            <IconButton size='sm' accessibilityLabel={t('calendarPage.nav.next')} onPress={() => setCursor((date) => addMonths(date, 1))}>
              <Icon name='ChevronRight' size='sm' />
            </IconButton>
          </Stack>

          <MonthGrid cursor={cursor} selected={selected} language={language} theme={theme} onChoose={choose} />

          <Stack direction='row' spacing={1}>
            <Button variant='secondary' size='sm' style={{ flex: 1 }} onPress={() => choose(new Date())}>
              {t('calendarPage.nav.today')}
            </Button>
            {clearable ? (
              <Button
                variant='tertiary'
                size='sm'
                style={{ flex: 1 }}
                onPress={() => {
                  onChange?.('')
                  setOpen(false)
                }}
              >
                {t('common.cancel')}
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </BottomSheet>
    </>
  )
}

/**
 * The month, as seven columns.
 *
 * Leading blanks rather than the previous month's days: a day you can tap
 * belongs to the month named above it, and greying out the neighbours only
 * makes them look disabled rather than elsewhere.
 */
function MonthGrid({ cursor, selected, language, theme, onChoose }) {
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const today = new Date()

  const weekdayLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(language, { weekday: 'narrow' })
    // Any Sunday will do; this one is a Sunday.
    return WEEKDAYS.map((day) => formatter.format(new Date(2024, 0, 7 + day)))
  }, [language])

  const cells = useMemo(() => {
    const days = new Date(year, month + 1, 0).getDate()
    const lead = new Date(year, month, 1).getDay()
    return [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  }, [year, month])

  const isSame = (day, other) => other && other.getFullYear() === year && other.getMonth() === month && other.getDate() === day

  return (
    <View>
      <View style={{ flexDirection: 'row' }}>
        {weekdayLabels.map((label, i) => (
          <Typography key={i} level='body-xs' color='text.tertiary' style={{ width: `${100 / 7}%`, textAlign: 'center' }}>
            {label}
          </Typography>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((day, i) => {
          if (day === null) return <View key={`blank-${i}`} style={{ width: `${100 / 7}%`, height: CELL }} />
          const chosen = isSame(day, selected)
          const isToday = isSame(day, today)
          return (
            <View key={day} style={{ width: `${100 / 7}%`, height: CELL, padding: 2 }}>
              <Pressable
                onPress={() => onChoose(new Date(year, month, day))}
                accessibilityRole='button'
                accessibilityState={{ selected: chosen }}
                accessibilityLabel={new Intl.DateTimeFormat(language, { day: 'numeric', month: 'long', year: 'numeric' }).format(
                  new Date(year, month, day)
                )}
                style={({ pressed }) => ({
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: theme.radius.sm,
                  backgroundColor: resolveColor(
                    theme,
                    chosen ? 'primary.solidBg' : pressed ? 'background.level2' : isToday ? 'primary.softBg' : 'background.body'
                  )
                })}
              >
                <Typography level='body-md' color={chosen ? 'primary.solidColor' : isToday ? 'primary.softColor' : 'text.primary'}>
                  {day}
                </Typography>
              </Pressable>
            </View>
          )
        })}
      </View>
    </View>
  )
}

export default DateField

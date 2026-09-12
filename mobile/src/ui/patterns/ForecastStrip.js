/**
 * Seven reviewed days · today · seven due days, one strip (PRD D1, §15.10).
 *
 * The mobile twin of the web's `ForecastStrip`, and its numbers are the web's
 * own: that component's comment already worked out that 15 cells fit a 375px
 * phone at 16px with a 4px gap, which is 296px. A phone is always that size, so
 * there is one set of numbers here rather than a responsive pair.
 *
 * Past cells are what was done, today is the accent, future cells are what is
 * coming, and a hairline separates what happened from what is going to. One
 * rhythm, one height. Nothing animates — the first frame is the strip
 * (MOTION.md §5).
 *
 * **A day with nothing in it is drawn as nothing.** The first build gave every
 * past cell the past colour and every future cell the accent with its hairline,
 * so a week with one study day and six blanks read as seven study days at
 * different heights (MOB-062). A 3px stub in `level2` is the empty day; the
 * colour is what says whether anything happened, and the height says how much.
 *
 * **The letters are what make it a week.** Without them fifteen bars are a
 * shape; with them the accent cell is visibly today and the fourth bar along is
 * visibly Wednesday.
 *
 * **Every letter is formatted from the date, and none from the API.** Each
 * weekly entry carries `day`, which the server writes as `"%A"[:3]` — an
 * English abbreviation. Reading it put "S M T W T F S" beside "D L M X J V S"
 * on one strip in a Spanish app: the same seven weekdays in two languages,
 * touching (MOB-062). The entries also carry `date`, which is what a locale can
 * actually format, so that is what both halves read.
 *
 * The cells are decorative; the strip carries a text alternative on itself, so a
 * screen reader gets the sentence rather than fifteen unlabelled bars.
 */
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../theme'
import { Typography, resolveColor } from '../Typography'

const CELL = 16
const GAP = 4
const BAR = 28
const MIN_BAR = 3

export function ForecastStrip({ past = [], today = 0, future = [] }) {
  const { t, i18n } = useTranslation()
  const theme = useTheme()

  // The last entry of weekly_progress is today, which the middle cell owns.
  const pastDays = past.slice(0, -1)
  const max = Math.max(1, ...pastDays.map((d) => d.cards || 0), today, ...future.map((d) => d.due || 0))
  const height = (value) => (value > 0 ? Math.max(MIN_BAR, Math.round((value / max) * BAR)) : MIN_BAR)

  const reviewedWeek = pastDays.reduce((sum, d) => sum + (d.cards || 0), 0)
  const dueWeek = future.reduce((sum, d) => sum + (d.due || 0), 0)

  const narrow = new Intl.DateTimeFormat(i18n?.language ?? 'en', { weekday: 'narrow' })
  const weekday = (iso, fallback) => {
    const date = new Date(`${iso}T12:00:00`)
    if (Number.isNaN(date.getTime())) return (fallback || '').trim().charAt(0).toUpperCase()
    return narrow.format(date)
  }

  const cell = (key, value, background, label, { emphasis = false, outlined = false } = {}) => (
    <View key={key} style={{ width: CELL, alignItems: 'center', gap: theme.spacing[0.5] }}>
      <View style={{ width: '100%', height: BAR, justifyContent: 'flex-end' }}>
        <View
          style={{
            width: '100%',
            height: height(value),
            borderRadius: theme.radius.xs,
            backgroundColor: resolveColor(theme, background),
            ...(outlined ? { borderWidth: 1, borderColor: resolveColor(theme, 'primary.outlinedBorder') } : null)
          }}
        />
      </View>
      <Typography level='body-xs' weight={emphasis ? 'lg' : 'md'} color={emphasis ? 'text.primary' : 'text.tertiary'}>
        {label}
      </Typography>
    </View>
  )

  return (
    <View
      accessibilityRole='image'
      accessibilityLabel={t('study.today.timelineAria', { reviewed: reviewedWeek, today, week: dueWeek })}
      style={{ flexDirection: 'row', gap: GAP, alignItems: 'flex-end' }}
    >
      {pastDays.map((day, i) =>
        cell(`past-${i}`, day.cards || 0, day.cards > 0 ? 'background.level3' : 'background.level2', weekday(day.date, day.day))
      )}
      {cell(
        'today',
        today,
        'primary.solidBg',
        weekday(past[past.length - 1]?.date, past[past.length - 1]?.day) || t('study.today.todayInitial'),
        { emphasis: true }
      )}

      {/* What happened, and what is going to. */}
      <View
        accessible={false}
        style={{ width: 1, alignSelf: 'stretch', marginHorizontal: 2, backgroundColor: resolveColor(theme, 'divider') }}
      />

      {future.map((day, i) =>
        cell(`future-${i}`, day.due || 0, day.due > 0 ? 'primary.softBg' : 'background.level2', weekday(day.date), {
          outlined: day.due > 0
        })
      )}
    </View>
  )
}

export default ForecastStrip

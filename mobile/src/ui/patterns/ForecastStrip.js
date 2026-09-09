/**
 * Seven reviewed days · today · seven due days, one strip (PRD D1, §15.10).
 *
 * The mobile twin of the web's `ForecastStrip`, and its numbers are the web's
 * own: that component's comment already worked out that 15 cells fit a 375px
 * phone at 16px with a 4px gap, which is 296px. A phone is always that size, so
 * there is one set of numbers here rather than a responsive pair.
 *
 * Past cells are what was done, today is the accent, future cells are what is
 * coming. One rhythm, one height. Nothing animates — the first frame is the
 * strip (MOTION.md §5).
 *
 * The cells are decorative; the strip carries a text alternative on itself, so a
 * screen reader gets the sentence rather than fifteen unlabelled bars.
 */
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../theme'
import { resolveColor } from '../Typography'

const CELL = 16
const GAP = 4
const BAR = 28
const MIN_BAR = 3

export function ForecastStrip({ past = [], today = 0, future = [] }) {
  const { t } = useTranslation()
  const theme = useTheme()

  // The last entry of weekly_progress is today, which the middle cell owns.
  const pastDays = past.slice(0, -1)
  const max = Math.max(1, ...pastDays.map((d) => d.cards || 0), today, ...future.map((d) => d.due || 0))
  const height = (value) => (value > 0 ? Math.max(MIN_BAR, Math.round((value / max) * BAR)) : MIN_BAR)

  const reviewedWeek = pastDays.reduce((sum, d) => sum + (d.cards || 0), 0)
  const dueWeek = future.reduce((sum, d) => sum + (d.due || 0), 0)

  const cell = (key, value, background, outlined) => (
    <View key={key} style={{ width: CELL, height: BAR, justifyContent: 'flex-end' }}>
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
  )

  return (
    <View
      accessibilityRole='image'
      accessibilityLabel={t('study.today.timelineAria', { reviewed: reviewedWeek, today, week: dueWeek })}
      style={{ flexDirection: 'row', gap: GAP, alignItems: 'flex-end' }}
    >
      {pastDays.map((d, i) => cell(`past-${i}`, d.cards || 0, 'background.level3', false))}
      {cell('today', today, 'primary.solidBg', false)}
      {future.map((d, i) => cell(`future-${i}`, d.due || 0, 'primary.softBg', true))}
    </View>
  )
}

export default ForecastStrip

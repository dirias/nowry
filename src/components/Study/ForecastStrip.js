import React from 'react'
import { Box, Tooltip, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { readout, tabularNums } from '../Common/Form/formStyles'

const CELL = { xs: 16, sm: 20 }
const GAP = { xs: 0.5, sm: 1 }
const BAR = 28
/** Today is a marker, not a bar: a fixed height, so the week around it keeps its scale. */
const MARKER = 12

/**
 * Seven reviewed days · today · seven due days, one strip (PRD D1, §15.10;
 * SITE-015, ADR-021 as amended).
 *
 * Past cells are what was done (`level3`), future cells what is coming
 * (`primary.softBg` with a hairline), and today is a marker in the accent
 * carrying its number — the same figure as the Study key beside it. The bars
 * are scaled to past and future only; today used to be the tallest bar and
 * flattened the week to a line. One label per half carries every total the
 * strip has to say; the only weekday initial is under the heaviest day ahead.
 * A tooltip gives any cell's day and count (DS-005). Nothing animates.
 *
 * `variant='future'` draws the marker and the seven days ahead only — Home's
 * strip, where the question is what is coming. A learner with no history gets
 * no past cells and one sentence where the right label would be.
 *
 * The `aria-label` is the text alternative PRD US-007 asks for; the cells are
 * decorative.
 *
 * @param {Array<{date: string, day: string, cards: number}>} past - statistics.weekly_progress (oldest first, today last)
 * @param {number} today - cards asked of the learner today (due + new)
 * @param {Array<{date: string, due: number}>} future - forecast.days (tomorrow first)
 * @param {'full'|'future'} [variant='full']
 */
export default function ForecastStrip({ past = [], today = 0, future = [], variant = 'full' }) {
  const { t, i18n } = useTranslation()
  const history = past.slice(0, -1) // the last entry of weekly_progress is today
  const reviewedWeek = history.reduce((sum, d) => sum + (d.cards || 0), 0)
  const dueWeek = future.reduce((sum, d) => sum + (d.due || 0), 0)
  const firstWeek = reviewedWeek === 0 && dueWeek === 0
  const pastDays = variant === 'future' || firstWeek ? [] : history
  const max = Math.max(1, ...pastDays.map((d) => d.cards || 0), ...future.map((d) => d.due || 0))
  const height = (value) => (value > 0 ? Math.max(3, Math.round((value / max) * BAR)) : 3)
  const heaviest = future.reduce((best, d, i) => ((d.due || 0) > (future[best]?.due || 0) ? i : best), 0)

  /*
   * Every letter is formatted from the date, and none from the API. A weekly
   * entry carries `day`, which the server writes as `"%A"[:3]` — an English
   * abbreviation — and `date`, which a locale can actually format (MOB-062).
   */
  const weekday = (iso, fallback, form = 'narrow') => {
    const d = new Date(`${iso}T12:00:00`)
    if (Number.isNaN(d.getTime())) return (fallback || '').trim().slice(0, form === 'narrow' ? 1 : 3)
    return d.toLocaleDateString(i18n.language, { weekday: form })
  }

  const cell = (key, value, bg, label, tip, { emphasis = false, outlined = false, marker = false } = {}) => (
    <Tooltip key={key} title={tip} size='sm' placement='top'>
      <Box sx={{ width: CELL, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75 }}>
        <Box sx={{ height: BAR, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
          <Box
            sx={{
              width: '100%',
              height: marker ? MARKER : height(value),
              borderRadius: 'xs',
              bgcolor: bg,
              ...(outlined ? { boxShadow: 'inset 0 0 0 1px var(--joy-palette-primary-outlinedBorder)' } : {})
            }}
          />
        </Box>
        <Typography
          level='body-xs'
          sx={{
            minHeight: '1.5em',
            color: marker ? 'primary.plainColor' : emphasis ? 'text.primary' : 'text.tertiary',
            fontWeight: emphasis || marker ? 'lg' : 'md',
            ...tabularNums
          }}
        >
          {label}
        </Typography>
      </Box>
    </Tooltip>
  )

  const todayLabel = weekday(past[past.length - 1]?.date, past[past.length - 1]?.day, 'short') || t('study.today.title')
  const rightLabel = firstWeek
    ? t('study.today.firstWeek')
    : t('study.today.stripFuture', { count: dueWeek, tomorrow: future[0]?.due ?? 0 })

  return (
    <Box
      role='img'
      aria-label={t('study.today.timelineAria', { reviewed: reviewedWeek, today, week: dueWeek })}
      sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, maxWidth: '100%' }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: GAP }}>
        {pastDays.map((d, i) =>
          cell(
            `p${i}`,
            d.cards || 0,
            d.cards > 0 ? 'background.level3' : 'background.level2',
            '',
            t('study.today.cellReviewed', { day: weekday(d.date, d.day, 'short'), count: d.cards || 0 })
          )
        )}
        {pastDays.length > 0 && <Box aria-hidden='true' sx={{ width: '1px', alignSelf: 'stretch', bgcolor: 'divider', mx: 0.25 }} />}
        {cell('today', today, 'primary.solidBg', today, t('study.today.cellToday', { day: todayLabel, count: today }), { marker: true })}
        <Box aria-hidden='true' sx={{ width: '1px', alignSelf: 'stretch', bgcolor: 'divider', mx: 0.25 }} />
        {future.map((d, i) =>
          cell(
            `f${i}`,
            d.due || 0,
            d.due > 0 ? 'primary.softBg' : 'background.level2',
            i === heaviest && d.due > 0 ? weekday(d.date) : '',
            t('study.today.cellDue', { day: weekday(d.date, '', 'short'), count: d.due || 0 }),
            { emphasis: i === heaviest && d.due > 0, outlined: d.due > 0 }
          )
        )}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, ...readout, fontSize: 'xs' }}>
        <span>{pastDays.length > 0 ? t('study.today.stripPast', { count: reviewedWeek }) : ''}</span>
        <span>{rightLabel}</span>
      </Box>
    </Box>
  )
}

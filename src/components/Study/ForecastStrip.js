import React from 'react'
import { Box, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'

const CELL = 20
const BAR = 28

/**
 * Seven reviewed days · today · seven due days, one strip (PRD D1, §15.10).
 *
 * Past cells are what was done (`level3`), today is the accent, future cells
 * are what is coming (`primary.softBg` with a hairline). One rhythm, one
 * height; a hairline separates past from future. Nothing animates (MOTION.md
 * §5 — the first frame is the strip). The `aria-label` is the text
 * alternative PRD US-007 asks for; the cells themselves are decorative.
 *
 * @param {Array<{day: string, cards: number}>} past - statistics.weekly_progress (oldest first, today last)
 * @param {number} today - cards asked of the learner today (due + new)
 * @param {Array<{date: string, due: number}>} future - forecast.days (tomorrow first)
 */
export default function ForecastStrip({ past = [], today = 0, future = [] }) {
  const { t } = useTranslation()
  const pastDays = past.slice(0, -1) // the last entry of weekly_progress is today
  const max = Math.max(1, ...pastDays.map((d) => d.cards || 0), today, ...future.map((d) => d.due || 0))
  const height = (value) => (value > 0 ? Math.max(3, Math.round((value / max) * BAR)) : 3)
  const reviewedWeek = pastDays.reduce((sum, d) => sum + (d.cards || 0), 0)
  const dueWeek = future.reduce((sum, d) => sum + (d.due || 0), 0)

  const cell = (key, value, bg, label, emphasis = false, outlined = false) => (
    <Box key={key} sx={{ width: CELL, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75 }}>
      <Box sx={{ height: BAR, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
        <Box
          sx={{
            width: '100%',
            height: height(value),
            borderRadius: 'xs',
            bgcolor: bg,
            ...(outlined ? { boxShadow: 'inset 0 0 0 1px var(--joy-palette-primary-outlinedBorder)' } : {})
          }}
        />
      </Box>
      <Typography level='body-xs' sx={{ color: emphasis ? 'text.primary' : 'text.tertiary', fontWeight: emphasis ? 'lg' : 'md' }}>
        {label}
      </Typography>
    </Box>
  )

  const initial = (label) => (label || '').trim().charAt(0).toUpperCase()
  const weekday = (iso) => {
    const d = new Date(`${iso}T12:00:00`)
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { weekday: 'narrow' })
  }

  return (
    <Box
      role='img'
      aria-label={t('study.today.timelineAria', { reviewed: reviewedWeek, today, week: dueWeek })}
      sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}
    >
      {pastDays.map((d, i) => cell(`p${i}`, d.cards || 0, d.cards > 0 ? 'background.level3' : 'background.level2', initial(d.day)))}
      {cell('today', today, 'primary.solidBg', initial(past[past.length - 1]?.day) || t('study.today.todayInitial'), true)}
      <Box aria-hidden='true' sx={{ width: '1px', alignSelf: 'stretch', bgcolor: 'divider', mx: 0.25 }} />
      {future.map((d, i) =>
        cell(`f${i}`, d.due || 0, d.due > 0 ? 'primary.softBg' : 'background.level2', weekday(d.date), false, d.due > 0)
      )}
    </Box>
  )
}

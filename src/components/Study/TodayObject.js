import React from 'react'
import { Box, Button, Skeleton, Stack, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import LocalFireDepartmentRounded from '@mui/icons-material/LocalFireDepartmentRounded'
import { readout, tabularNums } from '../Common/Form/formStyles'
import ForecastStrip from './ForecastStrip'

const QUICK_SIZE = 10

/**
 * The page's summary object (ADR-021, DESIGN_GUIDELINES §15.10; PRD D1, D9, D10).
 *
 * One surface, no border, no shadow. Left rail: "Today", the date, one line of
 * readouts. Right rail: the forecast strip and the actions — the one solid on
 * the dashboard ("Study · N") and at most one secondary ("Quick 10"). Progress
 * is the bottom edge. State is a line of copy in the readout slot, never a tint:
 *
 *   open day, streak alive  →  "12-day streak · study before midnight"
 *   no streak               →  "Start your streak today"
 *   nothing left            →  "All done · 22 reviewed · 13-day streak"
 *   no cards at all         →  one sentence and Create deck · Browse decks · Import
 *
 * The empty state is the same object with nothing in it (§13.2 inline clause):
 * no counters, no strip, no edge (§11).
 */
export default function TodayObject({
  loading = false,
  dueToday = 0,
  newToday = 0,
  reviewedToday = 0,
  streak = 0,
  totalCards = 0,
  weekly = [],
  forecast = null,
  onStudy,
  onQuick,
  onBrowse,
  onCreateDeck,
  onBrowseDecks,
  onImport
}) {
  const { t, i18n } = useTranslation()
  const asked = dueToday + newToday
  const isEmpty = !loading && totalCards === 0
  const isDone = !loading && !isEmpty && asked === 0
  const total = reviewedToday + asked
  const pct = total > 0 ? Math.round((reviewedToday / total) * 100) : 0
  const dateLabel = new Date().toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'short' })
  const future = forecast?.days ?? []
  const dueTomorrow = future[0]?.due ?? 0
  const dueWeek = future.reduce((sum, d) => sum + (d.due || 0), 0)
  const reviewedWeek = weekly.reduce((sum, d) => sum + (d.cards || 0), 0)

  const dot = (
    <Typography component='span' sx={{ color: 'text.tertiary' }} aria-hidden='true'>
      ·
    </Typography>
  )

  const streakLine = () => {
    if (streak <= 0) return t('study.empty.streakZeroLabel')
    const label = t('study.empty.streakLabel', { count: streak })
    return reviewedToday === 0 && !isDone ? `${label} ${t('study.today.beforeMidnight')}` : label
  }

  const readoutLine = isEmpty ? (
    <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
      {t('study.today.emptySentence')}
    </Typography>
  ) : (
    <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' useFlexGap sx={{ ...readout, color: 'text.secondary' }}>
      {isDone ? (
        <Typography level='body-sm' sx={{ color: 'text.primary', fontWeight: 'md' }}>
          {t('study.today.allDone')}
        </Typography>
      ) : (
        <Typography level='body-sm' sx={{ color: 'text.primary', fontWeight: 'md', ...tabularNums }}>
          <Skeleton loading={loading} variant='text' width='5ch'>
            {t('study.dueCount', { count: dueToday })}
          </Skeleton>
        </Typography>
      )}
      {!isDone && newToday > 0 && (
        <>
          {dot}
          <span>{t('study.deck.newCount', { count: newToday })}</span>
        </>
      )}
      {dot}
      <span>{t('study.today.reviewed', { count: reviewedToday })}</span>
      {dot}
      <Box component='span' sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
        <LocalFireDepartmentRounded
          sx={{ fontSize: 'sm', color: streak > 0 ? 'warning.plainColor' : 'text.tertiary' }}
          aria-hidden='true'
        />
        <span>{streakLine()}</span>
      </Box>
    </Stack>
  )

  const actions = isEmpty ? (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
      <Button variant='soft' color='neutral' onClick={onImport}>
        {t('study.today.import')}
      </Button>
      <Button variant='soft' color='neutral' onClick={onBrowseDecks}>
        {t('study.today.browseDecks')}
      </Button>
      <Button onClick={onCreateDeck}>{t('study.today.createDeck')}</Button>
    </Stack>
  ) : isDone ? (
    <Button variant='soft' color='neutral' onClick={onBrowse} sx={{ width: { xs: '100%', sm: 'auto' } }}>
      {t('study.today.browse')}
    </Button>
  ) : (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
      {asked > QUICK_SIZE && (
        <Button variant='soft' color='neutral' onClick={onQuick} aria-label={t('study.today.quickAria', { count: QUICK_SIZE })}>
          {t('study.today.quick', { count: QUICK_SIZE })}
        </Button>
      )}
      <Button onClick={onStudy} disabled={loading} sx={tabularNums}>
        {t('study.today.study', { count: asked })}
      </Button>
    </Stack>
  )

  return (
    <Box
      component='section'
      aria-labelledby='study-today-title'
      data-testid='today-object'
      sx={{ borderRadius: 'lg', bgcolor: 'background.surface', px: { xs: 2, md: 3 }, py: { xs: 2, md: 2.5 }, mb: 4 }}
    >
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, alignItems: { lg: 'flex-start' }, gap: { xs: 2, lg: 3 } }}>
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <Stack direction='row' spacing={1.25} alignItems='baseline'>
            <Typography id='study-today-title' level='title-lg'>
              {t('study.today.title')}
            </Typography>
            <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
              {dateLabel}
            </Typography>
          </Stack>
          {readoutLine}
        </Box>
        {!isEmpty && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { md: 'flex-end' },
              gap: { xs: 2, md: 3 },
              flexShrink: 0
            }}
          >
            {(weekly.length > 0 || future.length > 0) && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'flex-start', md: 'flex-end' }, gap: 0.75 }}>
                <ForecastStrip past={weekly} today={asked} future={future} />
                <Typography level='body-xs' sx={{ ...readout, fontSize: 'xs' }}>
                  {t('study.today.weekReadout', { reviewed: reviewedWeek, tomorrow: dueTomorrow, week: dueWeek })}
                </Typography>
              </Box>
            )}
            {actions}
          </Box>
        )}
      </Box>
      {isEmpty && <Box sx={{ mt: 2 }}>{actions}</Box>}
      {!isEmpty && (
        <>
          <Box
            role='progressbar'
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={reviewedToday}
            aria-label={t('study.today.progress', { done: reviewedToday, total })}
            sx={{ mt: 2, height: 3, borderRadius: 'full', bgcolor: 'background.level2', overflow: 'hidden' }}
          >
            <Box sx={{ width: `${pct}%`, height: '100%', borderRadius: 'full', bgcolor: 'primary.solidBg' }} />
          </Box>
          <Typography level='body-xs' sx={{ ...readout, fontSize: 'xs', mt: 1 }}>
            {t('study.today.progress', { done: reviewedToday, total })}
          </Typography>
        </>
      )}
    </Box>
  )
}

import React from 'react'
import { Box, Button, Skeleton, Stack, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import LocalFireDepartmentRounded from '@mui/icons-material/LocalFireDepartmentRounded'
import { readout, tabularNums } from '../Common/Form/formStyles'
import ForecastStrip from './ForecastStrip'

const QUICK_SIZE = 10

/** The object folds at these widths of ITS OWN container, never the window's (SITE-015). */
const FOLD = { row: 900, split: 560 }

/**
 * The page's summary object (ADR-021 and its 2026-09-26 amendment; §15.10;
 * PRD D1, D9, D10; SITE-015).
 *
 * One surface, no border, no shadow. Identity: "Today", the date, one line of
 * readouts. The forecast strip with its two labels. The keys — the one solid
 * ("Study · N") and at most one secondary ("Quick 10"). Progress is the bottom
 * edge, without a caption: the readout already says what is done.
 *
 * Two contents, one anatomy. `variant='study'` (the Study Center) says the day
 * for study — to do, done, streak — with the full strip and both keys.
 * `variant='home'` says the day across domains — cards, tasks, the routine,
 * streak — with only what is coming and the Study key alone. Home is where you
 * watch; the Study Center is where you work.
 *
 * Shape by container: the object measures itself (`containerType: inline-size`)
 * and lays out one row of three cells from 900px of its own width, the identity
 * above with the strip left and the keys right from 560px, and stacked below.
 * A phrase in the readout never breaks inside; the line wraps at the dots.
 *
 * State is a line of copy in the readout slot, never a tint. The empty state is
 * the same object with nothing in it (§13.2): no counters, no strip, no edge.
 */
export default function TodayObject({
  variant = 'study',
  loading = false,
  dueToday = 0,
  newToday = 0,
  reviewedToday = 0,
  streak = 0,
  totalCards = 0,
  weekly = [],
  forecast = null,
  tasksToday = null,
  routine = null,
  onStudy,
  onQuick,
  onBrowse,
  onCreateDeck,
  onBrowseDecks,
  onImport
}) {
  const { t, i18n } = useTranslation()
  const isHome = variant === 'home'
  const asked = dueToday + newToday
  const isEmpty = !loading && totalCards === 0
  const isDone = !loading && !isEmpty && asked === 0
  // The edge: for study, cards done over cards asked; on Home, the day across
  // cards, tasks and routine items, so the measure and the readout agree.
  const doneCount = reviewedToday + (isHome ? (tasksToday?.done ?? 0) + (routine?.done ?? 0) : 0)
  const total = doneCount + asked + (isHome ? (tasksToday?.open ?? 0) + Math.max(0, (routine?.total ?? 0) - (routine?.done ?? 0)) : 0)
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0
  const now = new Date()
  const dateLong = now.toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'short' })
  const dateShort = now.toLocaleDateString(i18n.language, { weekday: 'short', day: 'numeric', month: 'short' })
  const future = forecast?.days ?? []

  const dot = (
    <Typography component='span' sx={{ color: 'text.tertiary' }} aria-hidden='true'>
      ·
    </Typography>
  )
  /** A phrase never breaks inside; the readout wraps only between phrases. */
  const phrase = (children, sx = {}) => (
    <Typography component='span' level='body-sm' sx={{ whiteSpace: 'nowrap', color: 'text.secondary', ...tabularNums, ...sx }}>
      {children}
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
      {isDone
        ? phrase(t('study.today.allDone'), { color: 'text.primary', fontWeight: 'md' })
        : phrase(
            <Skeleton loading={loading} variant='text' width='6ch'>
              {t(isHome ? 'study.today.cardsCount' : 'study.today.todayCount', { count: asked })}
            </Skeleton>,
            { color: 'text.primary', fontWeight: 'md' }
          )}
      {isHome && tasksToday && (
        <>
          {dot}
          {phrase(t('study.today.tasksCount', { count: tasksToday.open }))}
        </>
      )}
      {isHome && routine && routine.total > 0 && (
        <>
          {dot}
          {phrase(t('study.today.routineCount', { done: routine.done, total: routine.total }))}
        </>
      )}
      {!isHome && (
        <>
          {dot}
          {phrase(t('study.today.doneCount', { count: reviewedToday }))}
        </>
      )}
      {dot}
      {phrase(
        <>
          <LocalFireDepartmentRounded
            sx={{ fontSize: 'sm', color: streak > 0 ? 'warning.plainColor' : 'text.tertiary', verticalAlign: '-0.15em', mr: 0.5 }}
            aria-hidden='true'
          />
          {streakLine()}
        </>
      )}
    </Stack>
  )

  const keys = isEmpty ? (
    <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap className='today-keys'>
      <Button variant='soft' color='neutral' onClick={onImport}>
        {t('study.today.import')}
      </Button>
      <Button variant='soft' color='neutral' onClick={onBrowseDecks}>
        {t('study.today.browseDecks')}
      </Button>
      <Button onClick={onCreateDeck}>{t('study.today.createDeck')}</Button>
    </Stack>
  ) : isDone ? (
    <Stack direction='row' className='today-keys'>
      <Button variant='soft' color='neutral' onClick={onBrowse}>
        {t('study.today.browse')}
      </Button>
    </Stack>
  ) : (
    <Stack direction='row' spacing={1} className='today-keys'>
      {!isHome && asked > QUICK_SIZE && (
        <Button variant='soft' color='neutral' onClick={onQuick} aria-label={t('study.today.quickAria', { count: QUICK_SIZE })}>
          {t('study.today.quick', { count: QUICK_SIZE })}
        </Button>
      )}
      <Button onClick={onStudy} disabled={loading} sx={tabularNums}>
        {t('study.today.study', { count: asked })}
      </Button>
    </Stack>
  )

  const strip = !isEmpty && (weekly.length > 0 || future.length > 0) && (
    <Box className='today-strip'>
      <ForecastStrip past={weekly} today={asked} future={future} variant={isHome ? 'future' : 'full'} />
    </Box>
  )

  return (
    <Box
      component='section'
      aria-labelledby='study-today-title'
      data-testid='today-object'
      data-variant={variant}
      sx={{
        containerType: 'inline-size',
        borderRadius: 'lg',
        bgcolor: 'background.surface',
        px: { xs: 2, md: 3 },
        py: { xs: 2, md: 2.5 },
        mb: 4,
        // Stacked by default; the two folds below open it up as ITS width allows.
        '& .today-body': { display: 'flex', flexDirection: 'column', gap: 2 },
        '& .today-right': { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 },
        '& .today-keys': { width: '100%', '& > button': { flex: 1 } },
        '& .today-keys.MuiStack-root': { flexDirection: 'column', gap: 1 },
        '& .today-date-long': { display: 'none' },
        [`@container (min-width: ${FOLD.split}px)`]: {
          '& .today-right': { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', width: '100%' },
          '& .today-keys': { width: 'auto', '& > button': { flex: 'initial' } },
          '& .today-keys.MuiStack-root': { flexDirection: 'row' },
          '& .today-date-long': { display: 'inline' },
          '& .today-date-short': { display: 'none' }
        },
        [`@container (min-width: ${FOLD.row}px)`]: {
          '& .today-body': { flexDirection: 'row', alignItems: 'flex-start', gap: 3 },
          '& .today-right': { width: 'auto', flexShrink: 0, gap: 3 },
          '& .today-strip': { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }
        }
      }}
    >
      <Box className='today-body'>
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <Stack direction='row' spacing={1.25} alignItems='baseline' sx={{ whiteSpace: 'nowrap' }}>
            <Typography id='study-today-title' level='title-lg'>
              {t('study.today.title')}
            </Typography>
            <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
              <span className='today-date-long'>{dateLong}</span>
              <span className='today-date-short'>{dateShort}</span>
            </Typography>
          </Stack>
          {readoutLine}
        </Box>
        {!isEmpty && (
          <Box className='today-right'>
            {strip}
            {keys}
          </Box>
        )}
      </Box>
      {isEmpty && <Box sx={{ mt: 2 }}>{keys}</Box>}
      {!isEmpty && (
        <Box
          role='progressbar'
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={doneCount}
          aria-label={t('study.today.progress', { done: doneCount, total })}
          sx={{ mt: 2, height: 3, borderRadius: 'full', bgcolor: 'background.level2', overflow: 'hidden' }}
        >
          <Box sx={{ width: `${pct}%`, height: '100%', borderRadius: 'full', bgcolor: 'primary.solidBg' }} />
        </Box>
      )}
    </Box>
  )
}

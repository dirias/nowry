import React from 'react'
import { Box, IconButton, Link, Sheet, Skeleton, Typography } from '@mui/joy'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'

import { focusRing, touchTargetBox } from '../Common/Form/formStyles'
import { formatDayLabel, formatDaySide, formatMonthTitle } from './agendaGroups'
import { COMPLETABLE } from './eventHelpers'
import EventTypeTile from './EventTypeTile'

const rowSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1.5,
  minHeight: 52,
  pl: 2,
  pr: 1,
  borderBottom: '1px solid',
  borderColor: 'divider'
}

const GroupHeader = ({ group, language, t }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'baseline',
      gap: 1,
      px: 2,
      pt: 1.25,
      pb: 0.75,
      bgcolor: group.isToday ? 'primary.softBg' : 'background.level1',
      borderBottom: '1px solid',
      borderColor: 'divider'
    }}
  >
    <Typography level='title-sm' sx={{ color: group.isToday ? 'primary.softColor' : 'text.primary' }}>
      {group.isToday ? t('calendarPage.agenda.today') : formatDayLabel(group.date, language)}
    </Typography>
    <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
      {formatDaySide(group.date, language, group.isToday)}
    </Typography>
  </Box>
)

const AgendaRow = ({ ev, onSelect, onToggleComplete, t }) => {
  const completed = ev.status === 'completed'
  const typeLabel = t(`calendarPage.agenda.type.${ev.type}`)
  const tickable = Boolean(onToggleComplete) && COMPLETABLE.includes(ev.type)
  const tickLabel = completed ? t('calendarPage.agenda.markUndone') : t('calendarPage.agenda.markDone')
  return (
    <Box sx={rowSx}>
      <EventTypeTile type={ev.type} color={ev.color} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Link
          component='button'
          level='body-sm'
          onClick={() => onSelect(ev)}
          sx={{
            display: 'block',
            maxWidth: '100%',
            textAlign: 'left',
            color: 'text.primary',
            fontWeight: 'md',
            textDecoration: completed ? 'line-through' : 'none',
            opacity: completed ? 0.6 : 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            ...focusRing
          }}
        >
          {ev.title}
        </Link>
        <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
          {[ev.areaName, typeLabel].filter(Boolean).join(' · ')}
        </Typography>
      </Box>
      {/* The app's completion idiom (PriorityList, Task): empty circle to
          finish, filled success check to undo. `aria-pressed` carries the
          state so a screen reader hears it as well as the action. */}
      {tickable && (
        <IconButton
          size='sm'
          variant='plain'
          color={completed ? 'success' : 'neutral'}
          onClick={() => onToggleComplete(ev)}
          aria-label={tickLabel}
          aria-pressed={completed}
          sx={{
            ...touchTargetBox,
            borderRadius: 'sm',
            flexShrink: 0,
            color: completed ? 'success.plainColor' : 'text.tertiary',
            ...focusRing
          }}
        >
          {completed ? <CheckCircleIcon fontSize='small' /> : <RadioButtonUncheckedIcon fontSize='small' />}
        </IconButton>
      )}
    </Box>
  )
}

const SkeletonRow = () => (
  <Box sx={rowSx}>
    <Skeleton variant='rectangular' width={28} height={28} sx={{ borderRadius: 'sm', flexShrink: 0 }} />
    <Box sx={{ flex: 1 }}>
      <Skeleton variant='text' level='body-sm' width='55%' />
      <Skeleton variant='text' level='body-xs' width='30%' />
    </Box>
  </Box>
)

/**
 * The calendar's Agenda view — Nowry's own list rather than FullCalendar's
 * (ADR-016, decision 5).
 *
 * One group per day of the cursor month that has something due; Today is
 * always the first group of the current month, even when it only says
 * "Nothing due today", so the page always opens on a "now". No "all-day"
 * column: every event is all-day, and a column with one value is not a
 * column. One 28px tile carries type (the glyph) and area (the fill), where
 * the phone list used to spend a dot and a glyph on the same fact.
 *
 * States (§13): rows load as skeletons, never a page gate; a month with
 * nothing in it uses the §13.2 empty pattern; errors are the page's Alert,
 * above this surface.
 */
const CalendarAgenda = ({ groups, cursor, loading, language, onSelectEvent, onToggleComplete, t }) => {
  const showSkeleton = loading && groups.every((group) => group.events.length === 0)
  const monthEmpty = !loading && groups.length === 0

  return (
    <Sheet
      variant='outlined'
      data-testid='calendar-agenda'
      sx={{ flex: 1, minHeight: { xs: 400, sm: 0 }, overflowY: 'auto', borderRadius: 'sm', bgcolor: 'background.surface' }}
    >
      {showSkeleton && [0, 1, 2].map((i) => <SkeletonRow key={i} />)}

      {monthEmpty && (
        <Box sx={{ py: 8, px: 2, textAlign: 'center' }}>
          <Typography level='title-md' sx={{ mb: 0.5, color: 'text.secondary' }}>
            {t('calendarPage.agenda.empty.title', { month: formatMonthTitle(cursor, language) })}
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            {t('calendarPage.agenda.empty.body')}
          </Typography>
        </Box>
      )}

      {!showSkeleton &&
        groups.map((group) => (
          <React.Fragment key={group.date.getTime()}>
            <GroupHeader group={group} language={language} t={t} />
            {group.isToday && group.events.length === 0 && (
              <Typography
                level='body-sm'
                sx={{ color: 'text.tertiary', px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}
              >
                {t('calendarPage.agenda.emptyToday')}
              </Typography>
            )}
            {group.events.map((ev) => (
              <AgendaRow key={ev.id} ev={ev} onSelect={onSelectEvent} onToggleComplete={onToggleComplete} t={t} />
            ))}
          </React.Fragment>
        ))}
    </Sheet>
  )
}

export default CalendarAgenda

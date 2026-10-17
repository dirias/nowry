import React from 'react'
import { Box, IconButton, Link, Sheet, Skeleton, Typography } from '@mui/joy'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'

import { focusRing, tabularNums, touchTargetBox } from '../Common/Form/formStyles'
import { formatDayLabel, formatDaySide, formatMonthTitle } from '@nowry/core/domain/calendar/agendaGroups'
import { COMPLETABLE } from '@nowry/core/domain/calendar/eventHelpers'
import { clockOn, stateOf } from '@nowry/core/domain/blocks'
import EventTypeTile from './EventTypeTile'
import { BlockTile, blockMeta } from './blockEvents'

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

const titleSx = (struck) => ({
  display: 'block',
  maxWidth: '100%',
  textAlign: 'left',
  color: 'text.primary',
  fontWeight: 'md',
  textDecoration: struck ? 'line-through' : 'none',
  opacity: struck ? 0.6 : 1,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  ...focusRing
})

const tickSx = (on) => ({
  ...touchTargetBox,
  borderRadius: 'sm',
  flexShrink: 0,
  color: on ? 'success.plainColor' : 'text.tertiary',
  ...focusRing
})

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
        <Link component='button' level='body-sm' onClick={() => onSelect(ev)} sx={titleSx(completed)}>
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
          sx={tickSx(completed)}
        >
          {completed ? <CheckCircleIcon fontSize='small' /> : <RadioButtonUncheckedIcon fontSize='small' />}
        </IconButton>
      )}
    </Box>
  )
}

/**
 * A block on the day (PLAN-004, PRD D11): the time as the row's left readout,
 * the source tile, the title, "20 min · study", and the same tick the task
 * row has — kept on, undo off. Skipped is a strike, running lifts the time to
 * the accent; state never tints the row (§15.5).
 */
const BlockRow = ({ occurrence, focusAreas, todayKey, nowMinutes, onSelect, onToggleKept, t }) => {
  const state = stateOf(occurrence, clockOn(occurrence.date, todayKey, nowMinutes))
  const kept = state === 'kept' || state === 'partial'
  const skipped = state === 'skipped'
  const running = state === 'running'
  const tickLabel = kept ? t('calendarPage.blocks.undoKept') : t('calendarPage.blocks.markKept')
  return (
    <Box sx={rowSx} data-testid='agenda-block-row'>
      <Typography
        level='body-sm'
        sx={{
          width: 44,
          flexShrink: 0,
          color: running ? 'primary.plainColor' : 'text.tertiary',
          fontWeight: running ? 'lg' : 'md',
          ...tabularNums
        }}
      >
        {occurrence.start}
      </Typography>
      <BlockTile occurrence={occurrence} focusAreas={focusAreas} size={28} glyph />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Link component='button' level='body-sm' onClick={() => onSelect(occurrence)} sx={titleSx(skipped)}>
          {occurrence.title}
        </Link>
        <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
          {blockMeta(occurrence, t)}
        </Typography>
      </Box>
      {onToggleKept && (
        <IconButton
          size='sm'
          variant='plain'
          color={kept ? 'success' : 'neutral'}
          onClick={() => onToggleKept(occurrence)}
          aria-label={tickLabel}
          aria-pressed={kept}
          sx={tickSx(kept)}
        >
          {kept ? <CheckCircleIcon fontSize='small' /> : <RadioButtonUncheckedIcon fontSize='small' />}
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

const isEmptyGroup = (group) => group.events.length === 0 && (group.blocks?.length ?? 0) === 0

/**
 * The calendar's Agenda view — Nowry's own list rather than FullCalendar's
 * (ADR-016, decision 5).
 *
 * One group per day of the cursor month that has something due or planned;
 * Today is always the first group of the current month, even when it only
 * says "Nothing due today", so the page always opens on a "now". No "all-day"
 * column: a deadline is all-day, and a block carries its own time as the
 * row's readout (PLAN-004). Blocks come first in each day, in clock order,
 * then the day's deadlines. One 28px tile carries type (the glyph) and area
 * (the fill), where the phone list used to spend a dot and a glyph on the
 * same fact.
 *
 * States (§13): rows load as skeletons, never a page gate; a month with
 * nothing in it uses the §13.2 empty pattern; errors are the page's Alert,
 * above this surface.
 */
const CalendarAgenda = ({
  groups,
  cursor,
  loading,
  language,
  onSelectEvent,
  onToggleComplete,
  onSelectBlock,
  onToggleKept,
  focusAreas = [],
  todayKey,
  nowMinutes = 0,
  t
}) => {
  const showSkeleton = loading && groups.every(isEmptyGroup)
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
            {group.isToday && isEmptyGroup(group) && (
              <Typography
                level='body-sm'
                sx={{ color: 'text.tertiary', px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}
              >
                {t('calendarPage.agenda.emptyToday')}
              </Typography>
            )}
            {(group.blocks ?? []).map((occurrence) => (
              <BlockRow
                key={`${occurrence.blockId}:${occurrence.date}`}
                occurrence={occurrence}
                focusAreas={focusAreas}
                todayKey={todayKey}
                nowMinutes={nowMinutes}
                onSelect={onSelectBlock ?? (() => {})}
                onToggleKept={onToggleKept}
                t={t}
              />
            ))}
            {group.events.map((ev) => (
              <AgendaRow key={ev.id} ev={ev} onSelect={onSelectEvent} onToggleComplete={onToggleComplete} t={t} />
            ))}
          </React.Fragment>
        ))}
    </Sheet>
  )
}

export default CalendarAgenda

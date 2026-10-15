import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import allLocales from '@fullcalendar/core/locales-all'
import { useIsMobile } from '../../hooks/useIsMobile'
import Container from '@mui/joy/Container'
import Stack from '@mui/joy/Stack'
import Box from '@mui/joy/Box'
import Typography from '@mui/joy/Typography'
import Button from '@mui/joy/Button'
import IconButton from '@mui/joy/IconButton'
import Alert from '@mui/joy/Alert'
import Dropdown from '@mui/joy/Dropdown'
import Menu from '@mui/joy/Menu'
import MenuButton from '@mui/joy/MenuButton'
import MenuItem from '@mui/joy/MenuItem'
import ListDivider from '@mui/joy/ListDivider'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import { calendarService } from '@nowry/core/api/services/calendar.service'
import { tasksService, annualPlanningService } from '@nowry/core/api/services'
import { useCalendarFilters } from '@nowry/core/hooks/useCalendarFilters'
import { useBlocks } from '@nowry/core/hooks/useBlocks'
import { useBlockLog } from '@nowry/core/hooks/useBlockLog'
import { useAuth } from '@nowry/core/context/AuthContext'
import { usePomodoro } from '@nowry/core/context/PomodoroContext'
import { useNavigate } from 'react-router-dom'
import { focusRing, touchTarget } from '../Common/Form/formStyles'
import EventFormModal from './EventFormModal'
import BlockFormModal from './BlockFormModal'
import CalendarToolbar from './CalendarToolbar'
import CalendarAgenda from './CalendarAgenda'
import EventTypeTile from './EventTypeTile'
import { BlockEventContent, formatMinutes } from './blockEvents'
import { useBlocksSummary } from './useBlocksSummary'
import { useTodayData } from '../Study/useTodayData'
import { filterCalendarEvents } from '@nowry/core/domain/calendar/calendarFilters'
import { completionPatch, stripTypePrefix, undoneStatus } from '@nowry/core/domain/calendar/eventHelpers'
import {
  BLOCK_EVENT_KIND,
  dropChanges,
  gridRangeKeys,
  localDateKey,
  mergeAgendaBlocks,
  minutesOfDay,
  monthRangeKeys,
  parseDateKey,
  resizeChanges,
  selectionToBlock,
  toBlockEvents
} from '@nowry/core/domain/blocks'
import {
  addDays,
  addMonths,
  formatMonthTitle,
  formatWeekTitle,
  groupAgenda,
  isSameDay,
  isSameMonth,
  startOfWeek
} from '@nowry/core/domain/calendar/agendaGroups'

// ADR-016 made Week a day grid because every event was all-day. ADR-045 gives
// the hours something to hold — the blocks — so Day and Week are time grids
// again (PLAN-004), with the deadlines in the all-day row above them. Month
// stays a day grid; Agenda is Nowry's own list and never mounts FullCalendar.
const FC_VIEWS = { day: 'timeGridDay', week: 'timeGridWeek', month: 'dayGridMonth' }
const TIME_GRID_VIEWS = ['day', 'week']

/** The hours the grid shows (PRD: 06:00–22:00 by default), on half-hour slots, opening at seven. */
const TIME_GRID = {
  slotMinTime: '06:00:00',
  slotMaxTime: '22:00:00',
  slotDuration: '00:30:00',
  scrollTime: '07:00:00',
  slotLabelFormat: { hour: 'numeric', minute: '2-digit' }
}

/** The four things the Add menu makes through the event form (ADR-017). */
const EVENT_TYPES = ['task', 'priority', 'goal', 'milestone']

/** The clock is re-read once a minute: a block's state changes on the minute. */
const TICK_MS = 60 * 1000

const menuSx = { minWidth: 200, borderRadius: 'md', p: 0.5 }
const itemSx = { borderRadius: 'sm', ...focusRing }

/**
 * The FullCalendar event object for one service event. No colours are set on
 * it: the row is transparent by stylesheet (ADR-019) and `eventContent` draws
 * the colour on a tile from the service event, which rides whole on
 * `extendedProps` so the editor receives the same object the agenda hands it.
 */
export const toCalendarEvent = (ev) => ({ id: ev.id, title: ev.title, start: ev.date, allDay: true, extendedProps: { ...ev } })

const formatDayTitle = (date, language) =>
  new Intl.DateTimeFormat(language, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date)

const CalendarPage = () => {
  const { t, i18n } = useTranslation()
  const language = i18n?.language ?? 'en'
  const { user } = useAuth()
  // CACHE-008 / ADR-008: calendarService.getAllEvents()/invalidateCache() read/write
  // through the ['calendarEvents', userId, ...] React Query key.
  const userId = user?.id ?? null
  const calendarRef = useRef(null)
  const isMobile = useIsMobile()

  const [view, setView] = useState('month')
  const [cursor, setCursor] = useState(() => new Date())
  // The year fetched is the year on screen, not today's (PLAN-010): paging
  // into next January has to fetch next January, as the phone already does.
  const year = cursor.getFullYear()
  const [events, setEvents] = useState([])
  const [focusAreas, setFocusAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const [calendarError, setCalendarError] = useState(null)
  const [notice, setNotice] = useState(null)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState('create')
  const [formType, setFormType] = useState('task')
  const [editingEvent, setEditingEvent] = useState(null)
  const [formDefaultDate, setFormDefaultDate] = useState(null)

  const [blockOpen, setBlockOpen] = useState(false)
  const [blockMode, setBlockMode] = useState('create')
  const [blockEditing, setBlockEditing] = useState(null)
  const [blockPrefill, setBlockPrefill] = useState(null)

  const { filters, setFilters, applyPreset } = useCalendarFilters()

  // The phone has one view. Everything below reads `effectiveView`, so a
  // rotation from a desktop Week into a phone Agenda and back is lossless.
  const effectiveView = isMobile ? 'agenda' : view
  const isTimeGrid = TIME_GRID_VIEWS.includes(effectiveView)

  // ── The clock: today's key and the minute, for a block's state ──────────
  const [clock, setClock] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), TICK_MS)
    return () => clearInterval(id)
  }, [])
  const todayKey = localDateKey(clock)
  const nowMinutes = minutesOfDay(clock)

  // One load into state; both the grid and the agenda derive from it, so the
  // two views can never disagree about what is due (ADR-016, consequence 3).
  const loadEvents = useCallback(async () => {
    setLoading(true)
    setCalendarError(null)
    try {
      const { events: allEvents, focusAreas: loadedAreas } = await calendarService.getAllEvents(userId, year)
      setEvents(allEvents)
      setFocusAreas(loadedAreas)
    } catch (err) {
      setCalendarError(err)
    } finally {
      setLoading(false)
    }
  }, [userId, year])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  const reload = useCallback(() => {
    calendarService.invalidateCache(userId)
    loadEvents()
  }, [userId, loadEvents])

  // ── Blocks for the range on screen (PLAN-004) ───────────────────────────
  // FullCalendar names the grid's visible range through `datesSet`; the
  // agenda's is the cursor's month. Either is within the API's 62-day cap.
  const [gridRange, setGridRange] = useState(null)
  const handleDatesSet = useCallback((arg) => setGridRange(gridRangeKeys(arg.start, arg.end)), [])
  const monthRange = useMemo(() => monthRangeKeys(cursor), [cursor])
  const blockRange = effectiveView === 'agenda' ? monthRange : gridRange
  const { blocks, occurrences, update: updateBlock } = useBlocks({ from: blockRange?.from, to: blockRange?.to })
  const { keep, undo } = useBlockLog()
  const { dueToday } = useTodayData()
  const { summary } = useBlocksSummary({ from: blockRange?.from, to: blockRange?.to, enabled: isTimeGrid })

  const filteredEvents = useMemo(() => filterCalendarEvents(events, filters), [events, filters])
  const blockEvents = useMemo(
    () => toBlockEvents(occurrences ?? [], { groupRoutines: effectiveView === 'week' }),
    [occurrences, effectiveView]
  )
  const calendarEvents = useMemo(() => [...filteredEvents.map(toCalendarEvent), ...blockEvents], [filteredEvents, blockEvents])
  const agendaGroups = useMemo(
    () => mergeAgendaBlocks(groupAgenda(filteredEvents, cursor, clock), occurrences ?? [], cursor, clock),
    [filteredEvents, occurrences, cursor, clock]
  )

  const summaryText = useMemo(() => {
    if (!isTimeGrid || !summary || summary.planned === 0) return null
    return [t('calendarPage.blocks.summaryKept', { kept: summary.kept, count: summary.planned }), formatMinutes(summary.minutes, t)].join(
      ' · '
    )
  }, [isTimeGrid, summary, t])

  // Tile and title (ADR-019): colour on a 16px tile, the title on the surface.
  // Done is visible wherever the item appears (ADR-018): strike and fade on the
  // title only, the tile keeps its colour. A block draws its state as a ground.
  const eventContent = useCallback(
    (eventInfo) => {
      if (eventInfo.event.extendedProps.kind === BLOCK_EVENT_KIND) {
        return (
          <BlockEventContent
            event={eventInfo.event}
            focusAreas={focusAreas}
            todayKey={todayKey}
            nowMinutes={nowMinutes}
            dueToday={dueToday}
            t={t}
          />
        )
      }
      const { type, status, color } = eventInfo.event.extendedProps
      const completed = status === 'completed'
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minHeight: 22, px: 0.5, overflow: 'hidden' }}>
          <EventTypeTile type={type} color={color} size={16} glyphSize='xs' />
          <Typography
            level='body-xs'
            noWrap
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: 'text.primary',
              fontWeight: 'md',
              textDecoration: completed ? 'line-through' : 'none',
              opacity: completed ? 0.6 : 1
            }}
          >
            {eventInfo.event.title}
          </Typography>
        </Box>
      )
    },
    [focusAreas, todayKey, nowMinutes, dueToday, t]
  )

  // ── Navigation: the page owns the cursor; FullCalendar follows it ────────
  // ADR-016's rule: ‹ › step by a day in Day, a week in Week, a month in Month
  // and Agenda; the readout shows the day, the week range or the month.
  const showsToday =
    effectiveView === 'day'
      ? isSameDay(cursor, clock)
      : effectiveView === 'week'
        ? isSameDay(startOfWeek(cursor), startOfWeek(clock))
        : isSameMonth(cursor, clock)
  const step = useCallback(
    (direction) =>
      setCursor((prev) => {
        if (effectiveView === 'day') return addDays(prev, direction)
        if (effectiveView === 'week') return addDays(prev, 7 * direction)
        return addMonths(prev, direction)
      }),
    [effectiveView]
  )
  const goToToday = useCallback(() => setCursor(new Date()), [])
  const title =
    effectiveView === 'day'
      ? formatDayTitle(cursor, language)
      : effectiveView === 'week'
        ? formatWeekTitle(cursor, language)
        : formatMonthTitle(cursor, language)

  useEffect(() => {
    const api = calendarRef.current?.getApi()
    if (!api) return
    api.changeView(FC_VIEWS[effectiveView] ?? FC_VIEWS.month, cursor)
  }, [effectiveView, cursor])

  // ── Editing ──────────────────────────────────────────────────────────────
  // Both surfaces hand over the service event itself: the agenda directly, the
  // grid through the extendedProps it was given above.
  const openEditor = useCallback((ev) => {
    setEditingEvent(ev)
    setFormMode('edit')
    setFormOpen(true) // modal re-mounts cleanly via key prop (see EventFormModal below)
  }, [])

  const timer = usePomodoro()
  const navigate = useNavigate()
  /*
   * Start runs the block on the timer (PRD D7). A study block is the block's
   * work (PRD D8): the review opens on the budget its length implies (about
   * 40 s a card) with the timer's chip in the corner; any other block opens
   * the Focus sheet, named after it.
   */
  const startBlock = useCallback(
    (occurrence) => {
      timer.startBlock(occurrence)
      if (occurrence.block?.source?.type === 'study') {
        timer.setShowWidget(false)
        navigate(`/study/daily-review?limit=${Math.max(1, Math.round((occurrence.lengthMin || 0) * 1.5))}`)
      }
    },
    [timer, navigate]
  )

  const openBlockEditor = useCallback((occurrence) => {
    setBlockEditing({ block: occurrence.block, occurrence })
    setBlockPrefill(null)
    setBlockMode('edit')
    setBlockOpen(true)
  }, [])

  const openBlockCreate = useCallback((prefill = null) => {
    setBlockEditing(null)
    setBlockPrefill(prefill)
    setBlockMode('create')
    setBlockOpen(true)
  }, [])

  const openEventCreate = useCallback((type, date = new Date()) => {
    setEditingEvent(null)
    setFormMode('create')
    setFormType(type)
    setFormDefaultDate(date)
    setFormOpen(true)
  }, [])

  // A grouped run in Week hides its items; Day draws every one, so a click on
  // the run opens that day rather than guessing which item was meant.
  const handleEventClick = useCallback(
    (clickInfo) => {
      const { kind, occurrence, group } = clickInfo.event.extendedProps
      if (kind !== BLOCK_EVENT_KIND) return openEditor(clickInfo.event.extendedProps)
      if (group) {
        setCursor(parseDateKey(occurrence.date))
        setView('day')
        return
      }
      openBlockEditor(occurrence)
    },
    [openEditor, openBlockEditor]
  )

  // CAL-002 / ADR-016 decision 6: a task or priority is finished from its
  // agenda row. Optimistic-then-revert, as `usePriorityStatus` does: the list
  // is patched first, the request follows, and a rejection restores the exact
  // status the row had. Only `is_completed` is ever sent.
  const toggleComplete = useCallback(
    async (ev) => {
      const next = ev.status !== 'completed'
      const patch = (status) => setEvents((prev) => prev.map((item) => (item.id === ev.id ? { ...item, status } : item)))
      patch(next ? 'completed' : undoneStatus(ev.type))
      try {
        const body = completionPatch(ev.type, next)
        if (ev.type === 'task') await tasksService.update(stripTypePrefix(ev.id), body)
        else if (ev.type === 'priority') await annualPlanningService.updatePriority(stripTypePrefix(ev.id), body)
        else await annualPlanningService.updateMilestone(ev.goalId, ev.milestoneId, body)
        calendarService.invalidateCache(userId)
      } catch (err) {
        patch(ev.status)
        setCalendarError(err)
      }
    },
    [userId]
  )

  // The block's tick (PRD D5): `useBlockLog` is optimistic across every cached
  // range, so the row moves at once; a rejection is the cache's own revert.
  const toggleKept = useCallback(
    async (occurrence) => {
      try {
        if (occurrence.log?.status === 'kept') await undo(occurrence)
        else await keep(occurrence)
      } catch (err) {
        setCalendarError(err)
      }
    },
    [keep, undo]
  )

  // A selection on the hours makes a block there (one-off, on the five-minute
  // grid); a selection on days or the all-day row makes a deadline, as before.
  const handleSelect = useCallback(
    (selectionInfo) => {
      if (selectionInfo.allDay) openEventCreate('task', selectionInfo.start)
      else openBlockCreate(selectionToBlock(selectionInfo.start, selectionInfo.end))
      calendarRef.current?.getApi().unselect()
    },
    [openEventCreate, openBlockCreate]
  )

  const handleFormSuccess = useCallback(() => {
    setFormOpen(false)
    reload()
  }, [reload])

  // CAL-03: Drag-and-drop rescheduling. A block writes what its rule allows
  // (PRD D1): a one-off its date and start, a recurring block its start on the
  // same weekday; dropped on another weekday it goes back and the page says why.
  const handleEventDrop = useCallback(
    async (info) => {
      const { event, revert } = info
      if (event.extendedProps.kind === BLOCK_EVENT_KIND) {
        const { occurrence } = event.extendedProps
        const changes = dropChanges(occurrence, event.start)
        if (!changes) {
          revert()
          setNotice('dragRuleKept')
          return
        }
        try {
          await updateBlock({ id: occurrence.blockId, changes })
        } catch (err) {
          revert()
          setCalendarError(err)
        }
        return
      }
      // The day the user dropped on, in their own zone: `toISOString` would
      // name the UTC day, which east of Greenwich is already yesterday by the
      // evening (PLAN-010).
      const dateStr = localDateKey(event.start)
      const rawId = stripTypePrefix(event.id)
      const type = event.extendedProps.type
      try {
        switch (type) {
          case 'task':
            await tasksService.update(rawId, { deadline: dateStr })
            break
          case 'priority':
            await annualPlanningService.updatePriority(rawId, { deadline: dateStr })
            break
          case 'goal':
            await annualPlanningService.updateGoal(rawId, { target_date: dateStr })
            break
          default:
            // Milestones are sub-objects; activities are recurring — DnD not applicable
            revert()
            return
        }
        reload()
      } catch (err) {
        revert()
        setCalendarError(err)
      }
    },
    [reload, updateBlock]
  )

  // A resize writes the block's length alone, in five-minute steps.
  const handleEventResize = useCallback(
    async (info) => {
      const { event, revert } = info
      if (event.extendedProps.kind !== BLOCK_EVENT_KIND) return revert()
      try {
        await updateBlock({ id: event.extendedProps.occurrence.blockId, changes: resizeChanges(event.start, event.end) })
      } catch (err) {
        revert()
        setCalendarError(err)
      }
    },
    [updateBlock]
  )

  // A deadline stays all-day and milestones and activities stay put
  // (T-08-04-02); a block stays on the hours, and a grouped run is not dragged.
  const handleEventAllow = useCallback((dropInfo, draggedEvent) => {
    const { kind, group, type } = draggedEvent.extendedProps
    if (kind === BLOCK_EVENT_KIND) return !group && dropInfo.allDay === false
    return dropInfo.allDay !== false && type !== 'milestone' && type !== 'activity'
  }, [])

  return (
    <Container maxWidth='xl' sx={{ px: { xs: 2, md: 3 }, py: { xs: 3, sm: 4 }, height: { xs: 'auto', sm: 'calc(100vh - 64px)' } }}>
      <Stack spacing={2} sx={{ height: '100%' }}>
        {/* Row one: the page and its one solid-primary action (ADR-016, decision 1).
            Since PLAN-004 the key is a menu: a block, or one of the four deadlines. */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Typography level='h2' component='h1'>
            {t('calendarPage.title')}
          </Typography>
          <Dropdown>
            <MenuButton
              slots={{ root: Button }}
              slotProps={{ root: { variant: 'solid', color: 'primary', size: 'sm' } }}
              startDecorator={<AddRoundedIcon />}
              endDecorator={<KeyboardArrowDown fontSize='small' />}
              sx={{ ...focusRing, ...touchTarget, flexShrink: 0 }}
            >
              {t('calendarPage.add')}
            </MenuButton>
            <Menu placement='bottom-end' sx={menuSx}>
              <MenuItem onClick={() => openBlockCreate()} sx={itemSx}>
                <Typography level='body-sm'>{t('calendarPage.blocks.menuBlock')}</Typography>
              </MenuItem>
              <ListDivider />
              {EVENT_TYPES.map((type) => (
                <MenuItem key={type} onClick={() => openEventCreate(type)} sx={itemSx}>
                  <Typography level='body-sm'>{t(`calendarModal.form.types.${type}`)}</Typography>
                </MenuItem>
              ))}
            </Menu>
          </Dropdown>
        </Box>

        {/* Row two: one toolbar on the grid's rails */}
        <CalendarToolbar
          view={effectiveView}
          onViewChange={setView}
          title={title}
          summary={summaryText}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          onToday={goToToday}
          showsToday={showsToday}
          filters={filters}
          setFilters={setFilters}
          applyPreset={applyPreset}
          focusAreas={focusAreas}
          isMobile={isMobile}
          t={t}
        />

        {calendarError && (
          <Alert color='danger' variant='soft' role='alert' aria-live='assertive'>
            {t('calendarPage.error')}
          </Alert>
        )}

        {notice && (
          <Alert
            color='neutral'
            variant='soft'
            role='status'
            endDecorator={
              <IconButton
                variant='plain'
                color='neutral'
                size='sm'
                onClick={() => setNotice(null)}
                aria-label={t('common.close')}
                sx={focusRing}
              >
                <CloseRoundedIcon fontSize='small' />
              </IconButton>
            }
          >
            {t(`calendarPage.blocks.${notice}`)}
          </Alert>
        )}

        {effectiveView === 'agenda' ? (
          <CalendarAgenda
            groups={agendaGroups}
            cursor={cursor}
            loading={loading}
            language={language}
            onSelectEvent={openEditor}
            onToggleComplete={toggleComplete}
            onSelectBlock={openBlockEditor}
            onToggleKept={toggleKept}
            onStartBlock={startBlock}
            focusAreas={focusAreas}
            todayKey={todayKey}
            nowMinutes={nowMinutes}
            t={t}
          />
        ) : (
          <Box sx={{ flex: 1, overflow: 'hidden', minHeight: { xs: 500, sm: 0 } }}>
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView={FC_VIEWS[effectiveView]}
              initialDate={cursor}
              headerToolbar={false}
              locales={allLocales}
              locale={language}
              events={calendarEvents}
              editable
              eventDurationEditable={false}
              selectable
              allDaySlot
              allDayText={t('calendarPage.blocks.dueRow')}
              nowIndicator
              {...TIME_GRID}
              datesSet={handleDatesSet}
              eventDrop={handleEventDrop}
              eventResize={handleEventResize}
              select={handleSelect}
              eventClick={handleEventClick}
              eventAllow={handleEventAllow}
              eventContent={eventContent}
              height='100%'
            />
          </Box>
        )}
      </Stack>

      {/* Event create/edit modal — key forces clean re-mount when editing a different event */}
      <EventFormModal
        key={editingEvent?.id ?? 'new'}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={handleFormSuccess}
        mode={formMode}
        event={editingEvent}
        defaultDate={formDefaultDate}
        initialType={formType}
      />

      {/* The block sheet (PLAN-004). `useBlocks` invalidates the family on
          every write, so the grid and the readout refetch without a reload here. */}
      <BlockFormModal
        key={blockEditing?.block?.id ?? 'new-block'}
        open={blockOpen}
        onClose={() => setBlockOpen(false)}
        mode={blockMode}
        block={blockEditing?.block ?? null}
        occurrence={blockEditing?.occurrence ?? null}
        prefill={blockPrefill}
        blocks={blocks ?? []}
      />
    </Container>
  )
}

export default CalendarPage

import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import { useIsMobile } from '../../hooks/useIsMobile'
import Container from '@mui/joy/Container'
import Stack from '@mui/joy/Stack'
import Box from '@mui/joy/Box'
import Typography from '@mui/joy/Typography'
import Button from '@mui/joy/Button'
import Alert from '@mui/joy/Alert'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined'
import AdjustOutlinedIcon from '@mui/icons-material/AdjustOutlined'
import DiamondOutlinedIcon from '@mui/icons-material/DiamondOutlined'
import StarRoundedIcon from '@mui/icons-material/StarRounded'
import RepeatRoundedIcon from '@mui/icons-material/RepeatRounded'
import { calendarService } from '../../api/services/calendar.service'
import { tasksService, annualPlanningService } from '../../api/services'
import { useCalendarFilters } from '../../hooks/useCalendarFilters'
import { useAuth } from '../../context/AuthContext'
import { readableTextOn } from '../../theme/colorSchemeGenerator'
import { focusRing, touchTarget } from '../Common/Form/formStyles'
import EventFormModal from './EventFormModal'
import CalendarToolbar from './CalendarToolbar'
import CalendarAgenda from './CalendarAgenda'
import { filterCalendarEvents } from './calendarFilters'
import { addDays, addMonths, formatMonthTitle, formatWeekTitle, groupAgenda, isSameDay, isSameMonth, startOfWeek } from './agendaGroups'

// Strip type prefix from compound event ID (e.g. 'task-abc123' → 'abc123')
// Uses startsWith to avoid truncating hyphenated IDs (e.g. UUIDs, compound timestamp IDs)
const TYPE_PREFIXES = ['task-', 'priority-', 'goal-', 'milestone-', 'activity-']
const stripTypePrefix = (eventId) => {
  for (const prefix of TYPE_PREFIXES) {
    if (eventId.startsWith(prefix)) return eventId.slice(prefix.length)
  }
  return eventId
}

// CAL-01: Icon map for eventContent — milestone handled separately via isKeyResult branch
const EVENT_ICON_MAP = {
  task: CheckCircleOutlinedIcon,
  priority: FlagOutlinedIcon,
  goal: AdjustOutlinedIcon,
  activity: RepeatRoundedIcon
}

// ADR-016: every event is all-day, so the two grid views are day grids — a
// time grid would render 24 empty hour rows under a one-line strip. The third
// view, Agenda, is Nowry's own list and never mounts FullCalendar.
const FC_VIEWS = { month: 'dayGridMonth', week: 'dayGridWeek' }

/**
 * The FullCalendar event object for one service event. `textColor` is derived
 * here rather than in `eventContent` because FullCalendar's own chrome (the
 * "+2 more" popover) reads it off the event, and a saturated area colour
 * fails AA for `text.primary` in at least one scheme (measured: amber 1.94:1).
 */
const toCalendarEvent = (ev) => {
  const textColor = readableTextOn(ev.color)
  return {
    id: ev.id,
    title: ev.title,
    start: ev.date,
    allDay: true,
    backgroundColor: ev.color,
    borderColor: ev.color,
    textColor,
    extendedProps: {
      type: ev.type,
      status: ev.status,
      category: ev.category,
      areaName: ev.areaName,
      goalTitle: ev.goalTitle,
      isKeyResult: ev.isKeyResult,
      focusAreaId: ev.focusAreaId,
      textColor
    }
  }
}

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
  const [events, setEvents] = useState([])
  const [focusAreas, setFocusAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const [calendarError, setCalendarError] = useState(null)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState('create')
  const [editingEvent, setEditingEvent] = useState(null)
  const [formDefaultDate, setFormDefaultDate] = useState(null)

  const { filters, setFilters, applyPreset } = useCalendarFilters()

  // The phone has one view. Everything below reads `effectiveView`, so a
  // rotation from a desktop Week into a phone Agenda and back is lossless.
  const effectiveView = isMobile ? 'agenda' : view

  // One load into state; both the grid and the agenda derive from it, so the
  // two views can never disagree about what is due (ADR-016, consequence 3).
  const loadEvents = useCallback(async () => {
    setLoading(true)
    setCalendarError(null)
    try {
      const { events: allEvents, focusAreas: loadedAreas } = await calendarService.getAllEvents(userId)
      setEvents(allEvents)
      setFocusAreas(loadedAreas)
    } catch (err) {
      setCalendarError(err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  const reload = useCallback(() => {
    calendarService.invalidateCache(userId)
    loadEvents()
  }, [userId, loadEvents])

  const filteredEvents = useMemo(() => filterCalendarEvents(events, filters), [events, filters])
  const calendarEvents = useMemo(() => filteredEvents.map(toCalendarEvent), [filteredEvents])
  const agendaGroups = useMemo(() => groupAgenda(filteredEvents, cursor), [filteredEvents, cursor])

  // CAL-01/CAL-02: Custom event rendering — icon + title for all event types
  const eventContent = useCallback((eventInfo) => {
    const { type, isKeyResult, textColor } = eventInfo.event.extendedProps
    let IconComponent
    if (type === 'milestone') {
      IconComponent = isKeyResult ? StarRoundedIcon : DiamondOutlinedIcon
    } else {
      IconComponent = EVENT_ICON_MAP[type] ?? AdjustOutlinedIcon
    }
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, overflow: 'hidden', color: textColor }}>
        <IconComponent sx={{ fontSize: 'sm', flexShrink: 0 }} />
        <Typography level='body-xs' noWrap sx={{ overflow: 'hidden', textOverflow: 'ellipsis', color: 'inherit' }}>
          {eventInfo.event.title}
        </Typography>
      </Box>
    )
  }, [])

  // ── Navigation: the page owns the cursor; FullCalendar follows it ────────
  const today = new Date()
  const showsToday = effectiveView === 'week' ? isSameDay(startOfWeek(cursor), startOfWeek(today)) : isSameMonth(cursor, today)
  const step = useCallback(
    (direction) => setCursor((prev) => (effectiveView === 'week' ? addDays(prev, 7 * direction) : addMonths(prev, direction))),
    [effectiveView]
  )
  const goToToday = useCallback(() => setCursor(new Date()), [])
  const title = effectiveView === 'week' ? formatWeekTitle(cursor, language) : formatMonthTitle(cursor, language)

  useEffect(() => {
    const api = calendarRef.current?.getApi()
    if (!api) return
    api.changeView(FC_VIEWS[effectiveView] ?? FC_VIEWS.month, cursor)
  }, [effectiveView, cursor])

  // ── Editing ──────────────────────────────────────────────────────────────
  const openEditor = useCallback((ev) => {
    setEditingEvent({ id: ev.id, type: ev.type, title: ev.title, date: ev.date, status: ev.status, category: ev.category })
    setFormMode('edit')
    setFormOpen(true) // modal re-mounts cleanly via key prop (see EventFormModal below)
  }, [])

  // CAL-002 / ADR-016 decision 6: a task or priority is finished from its
  // agenda row. Optimistic-then-revert, as `usePriorityStatus` does: the list
  // is patched first, the request follows, and a rejection restores the exact
  // status the row had. Only `is_completed` is ever sent.
  const toggleComplete = useCallback(
    async (ev) => {
      const next = ev.status !== 'completed'
      const patch = (status) => setEvents((prev) => prev.map((item) => (item.id === ev.id ? { ...item, status } : item)))
      patch(next ? 'completed' : ev.type === 'task' ? 'pending' : 'active')
      try {
        const rawId = stripTypePrefix(ev.id)
        if (ev.type === 'task') await tasksService.update(rawId, { is_completed: next })
        else await annualPlanningService.updatePriority(rawId, { is_completed: next })
        calendarService.invalidateCache(userId)
      } catch (err) {
        patch(ev.status)
        setCalendarError(err)
      }
    },
    [userId]
  )

  const handleEventClick = useCallback(
    (clickInfo) => {
      const ev = clickInfo.event
      openEditor({
        id: ev.id,
        type: ev.extendedProps.type,
        title: ev.title,
        date: ev.start,
        status: ev.extendedProps.status,
        category: ev.extendedProps.category
      })
    },
    [openEditor]
  )

  // CAL-02: Time-block creation — click+drag on the grid
  const handleSelect = useCallback((selectionInfo) => {
    setEditingEvent(null)
    setFormMode('create')
    setFormDefaultDate(selectionInfo.start)
    setFormOpen(true)
    calendarRef.current?.getApi().unselect()
  }, [])

  const handleAddEvent = useCallback(() => {
    setEditingEvent(null)
    setFormMode('create')
    setFormDefaultDate(new Date())
    setFormOpen(true)
  }, [])

  const handleFormSuccess = useCallback(() => {
    setFormOpen(false)
    reload()
  }, [reload])

  // CAL-03: Drag-and-drop rescheduling
  const handleEventDrop = useCallback(
    async (info) => {
      const { event, revert } = info
      const dateStr = event.start.toISOString().split('T')[0]
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
    [reload]
  )

  // Disable DnD for milestone and activity types (T-08-04-02)
  const handleEventAllow = useCallback((_dropInfo, draggedEvent) => {
    const type = draggedEvent.extendedProps.type
    return type !== 'milestone' && type !== 'activity'
  }, [])

  return (
    <Container maxWidth='xl' sx={{ px: { xs: 2, md: 3 }, py: { xs: 3, sm: 4 }, height: { xs: 'auto', sm: 'calc(100vh - 64px)' } }}>
      <Stack spacing={2} sx={{ height: '100%' }}>
        {/* Row one: the page and its one solid-primary action (ADR-016, decision 1) */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Typography level='h2'>{t('calendarPage.title')}</Typography>
          <Button
            startDecorator={<AddRoundedIcon />}
            size='sm'
            onClick={handleAddEvent}
            sx={{ ...focusRing, ...touchTarget, flexShrink: 0 }}
          >
            {t('calendarPage.addEvent')}
          </Button>
        </Box>

        {/* Row two: one toolbar on the grid's rails */}
        <CalendarToolbar
          view={effectiveView}
          onViewChange={setView}
          title={title}
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

        {effectiveView === 'agenda' ? (
          <CalendarAgenda
            groups={agendaGroups}
            cursor={cursor}
            loading={loading}
            language={language}
            onSelectEvent={openEditor}
            onToggleComplete={toggleComplete}
            t={t}
          />
        ) : (
          <Box sx={{ flex: 1, overflow: 'hidden', minHeight: { xs: 500, sm: 0 } }}>
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView={FC_VIEWS[effectiveView]}
              initialDate={cursor}
              headerToolbar={false}
              events={calendarEvents}
              editable
              selectable
              eventDrop={handleEventDrop}
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
      />
    </Container>
  )
}

export default CalendarPage

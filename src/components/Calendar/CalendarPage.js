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
import { calendarService } from '../../api/services/calendar.service'
import { tasksService, annualPlanningService } from '../../api/services'
import { useCalendarFilters } from '../../hooks/useCalendarFilters'
import { useAuth } from '../../context/AuthContext'
import { focusRing, keyButton, touchTarget } from '../Common/Form/formStyles'
import EventFormModal from './EventFormModal'
import CalendarToolbar from './CalendarToolbar'
import CalendarAgenda from './CalendarAgenda'
import EventTypeTile from './EventTypeTile'
import { filterCalendarEvents } from './calendarFilters'
import { completionPatch, stripTypePrefix, undoneStatus } from './eventHelpers'
import { addDays, addMonths, formatMonthTitle, formatWeekTitle, groupAgenda, isSameDay, isSameMonth, startOfWeek } from './agendaGroups'

// ADR-016: every event is all-day, so the two grid views are day grids — a
// time grid would render 24 empty hour rows under a one-line strip. The third
// view, Agenda, is Nowry's own list and never mounts FullCalendar.
const FC_VIEWS = { month: 'dayGridMonth', week: 'dayGridWeek' }

/**
 * The FullCalendar event object for one service event. No colours are set on
 * it: the row is transparent by stylesheet (ADR-019) and `eventContent` draws
 * the colour on a tile from the service event, which rides whole on
 * `extendedProps` so the editor receives the same object the agenda hands it.
 */
export const toCalendarEvent = (ev) => ({ id: ev.id, title: ev.title, start: ev.date, allDay: true, extendedProps: { ...ev } })

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

  // Tile and title (ADR-019): colour on a 16px tile, the title on the surface.
  // Done is visible wherever the item appears (ADR-018): strike and fade on the
  // title only, the tile keeps its colour.
  const eventContent = useCallback((eventInfo) => {
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
  // Both surfaces hand over the service event itself: the agenda directly, the
  // grid through the extendedProps it was given above.
  const openEditor = useCallback((ev) => {
    setEditingEvent(ev)
    setFormMode('edit')
    setFormOpen(true) // modal re-mounts cleanly via key prop (see EventFormModal below)
  }, [])

  const handleEventClick = useCallback((clickInfo) => openEditor(clickInfo.event.extendedProps), [openEditor])

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
            sx={{ ...focusRing, ...touchTarget, ...keyButton('primary'), flexShrink: 0 }}
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

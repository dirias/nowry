import React, { useRef, useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import Container from '@mui/joy/Container'
import Stack from '@mui/joy/Stack'
import Box from '@mui/joy/Box'
import Typography from '@mui/joy/Typography'
import Button from '@mui/joy/Button'
import Alert from '@mui/joy/Alert'
import Chip from '@mui/joy/Chip'
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
import EventFormModal from './EventFormModal'

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
  task:     CheckCircleOutlinedIcon,
  priority: FlagOutlinedIcon,
  goal:     AdjustOutlinedIcon,
  activity: RepeatRoundedIcon
}

const CalendarPage = () => {
  const { t } = useTranslation()
  const calendarRef = useRef(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState('create')
  const [editingEvent, setEditingEvent] = useState(null)
  const [formDefaultDate, setFormDefaultDate] = useState(null)
  const [calendarError, setCalendarError] = useState(null)

  const { filters, setFilters } = useCalendarFilters() // CAL-03: per D-11

  // CAL-01/CAL-02: Custom event rendering — icon + title for all event types
  const eventContent = useCallback((eventInfo) => {
    const { type, isKeyResult } = eventInfo.event.extendedProps

    let IconComponent
    if (type === 'milestone') {
      IconComponent = isKeyResult ? StarRoundedIcon : DiamondOutlinedIcon
    } else {
      IconComponent = EVENT_ICON_MAP[type] ?? AdjustOutlinedIcon
    }

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, overflow: 'hidden' }}>
        <IconComponent sx={{ fontSize: 14, flexShrink: 0 }} />
        <Typography level='body-xs' noWrap sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {eventInfo.event.title}
        </Typography>
      </Box>
    )
  }, [])

  // CAL-01: FullCalendar eventSources — wraps existing calendarService.getAllEvents()
  // Maps service output to FullCalendar event object shape
  const eventSources = useMemo(
    () => [
      {
        events: async (_fetchInfo, successCallback, failureCallback) => {
          try {
            setCalendarError(null)
            const allEvents = await calendarService.getAllEvents()
            const filtered = allEvents.filter((ev) => {
              if (ev.type === 'activity' && !filters.habitsEnabled) return false
              return true
            })
            successCallback(
              filtered.map((ev) => ({
                id: ev.id,
                title: ev.title,
                start: ev.date,
                allDay: true,
                backgroundColor: ev.color,
                borderColor: ev.color,
                extendedProps: {
                  type: ev.type,
                  status: ev.status,
                  category: ev.category,
                  areaName: ev.areaName,
                  goalTitle: ev.goalTitle,
                  isKeyResult: ev.isKeyResult  // CAL-02: from calendar.service.js (Plan 01 Task 2)
                }
              }))
            )
          } catch (err) {
            setCalendarError(err)
            failureCallback(err)
          }
        }
      }
    ],
    [filters.habitsEnabled] // CAL-03: habits toggle dep; Phase 16 adds activeTypes, activeAreaIds
  )

  // CAL-03: Drag-and-drop rescheduling
  const handleEventDrop = useCallback(async (info) => {
    const { event, revert } = info
    const newDate = event.start
    const dateStr = newDate.toISOString().split('T')[0]
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
        case 'milestone':
        case 'activity':
          // Milestones are sub-objects; activities are recurring — DnD not applicable
          revert()
          return
        default:
          revert()
          return
      }
      calendarService.invalidateCache()
    } catch (err) {
      revert()
      setCalendarError(err)
    }
  }, [])

  // CAL-02: Time-block creation — click+drag on day/week view
  const handleSelect = useCallback((selectionInfo) => {
    setEditingEvent(null)
    setFormMode('create')
    setFormDefaultDate(selectionInfo.start)
    setFormOpen(true)
    calendarRef.current?.getApi().unselect()
  }, [])

  // Edit existing event via click
  const handleEventClick = useCallback((clickInfo) => {
    const ev = clickInfo.event
    setEditingEvent({
      id: ev.id,
      type: ev.extendedProps.type,
      title: ev.title,
      date: ev.start,
      status: ev.extendedProps.status,
      category: ev.extendedProps.category
    })
    setFormMode('edit')
    setFormOpen(true) // modal re-mounts cleanly via key prop (see EventFormModal below)
  }, [])

  // Disable DnD for milestone and activity types (T-08-04-02)
  const handleEventAllow = useCallback((_dropInfo, draggedEvent) => {
    const type = draggedEvent.extendedProps.type
    return type !== 'milestone' && type !== 'activity'
  }, [])

  const handleFormSuccess = useCallback(() => {
    setFormOpen(false)
    calendarService.invalidateCache()
    calendarRef.current?.getApi().refetchEvents()
  }, [])

  const handleAddEvent = useCallback(() => {
    setEditingEvent(null)
    setFormMode('create')
    setFormDefaultDate(new Date())
    setFormOpen(true)
  }, [])

  return (
    <Container maxWidth='xl' sx={{ py: 4, height: 'calc(100vh - 64px)' }}>
      <Stack spacing={2} sx={{ height: '100%' }}>
        {/* Header row */}
        <Stack direction='row' justifyContent='space-between' alignItems='center'>
          <Typography level='h2'>{t('calendarPage.title')}</Typography>
          <Button startDecorator={<AddRoundedIcon />} size='sm' onClick={handleAddEvent} aria-label={t('calendarPage.addEvent')}>
            {t('calendarPage.addEvent')}
          </Button>
        </Stack>

        {/* CAL-03: Filter strip — Phase 16 appends chips here */}
        <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap' }}>
          <Chip
            size='sm'
            variant={filters.habitsEnabled ? 'soft' : 'outlined'}
            color='neutral'
            onClick={() => setFilters((f) => ({ ...f, habitsEnabled: !f.habitsEnabled }))}
            aria-label={t('calendarPage.showHabitsAriaLabel')}
            aria-pressed={filters.habitsEnabled}
          >
            {t('calendarPage.showHabits')}
          </Chip>
          {/* Phase 16: area filter chips inserted here */}
        </Stack>

        {/* Error state */}
        {calendarError && (
          <Alert color='danger' variant='soft' role='alert' aria-live='assertive'>
            {t('calendarPage.error')}
          </Alert>
        )}

        {/* FullCalendar — fills remaining height */}
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView='dayGridMonth'
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            eventSources={eventSources}
            editable={true}
            selectable={true}
            eventDrop={handleEventDrop}
            select={handleSelect}
            eventClick={handleEventClick}
            eventAllow={handleEventAllow}
            eventContent={eventContent}   {/* CAL-01: type-specific icon rendering */}
            height='100%'
          />
        </Box>
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

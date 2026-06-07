import React, { useRef, useState, useCallback } from 'react'
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
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import { calendarService } from '../../api/services/calendar.service'
import { tasksService, annualPlanningService } from '../../api/services'
import EventFormModal from './EventFormModal'

const CalendarPage = () => {
  const { t } = useTranslation()
  const calendarRef = useRef(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState('create')
  const [editingEvent, setEditingEvent] = useState(null)
  const [formDefaultDate, setFormDefaultDate] = useState(null)
  const [calendarError, setCalendarError] = useState(null)

  // CAL-01: FullCalendar eventSources — wraps existing calendarService.getAllEvents()
  // Maps service output to FullCalendar event object shape
  const eventSources = [
    {
      events: async (_fetchInfo, successCallback, failureCallback) => {
        try {
          setCalendarError(null)
          const allEvents = await calendarService.getAllEvents()
          successCallback(
            allEvents.map((ev) => ({
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
                goalTitle: ev.goalTitle
              }
            }))
          )
        } catch (err) {
          setCalendarError(err)
          failureCallback(err)
        }
      }
    }
  ]

  // Strip type prefix from compound event ID (e.g. 'task-abc123' → 'abc123')
  const _rawId = (eventId) => eventId.replace(/^[a-z]+-/, '')

  // CAL-03: Drag-and-drop rescheduling
  const handleEventDrop = useCallback(async (info) => {
    const { event, revert } = info
    const newDate = event.start
    const dateStr = newDate.toISOString().split('T')[0]
    const rawId = _rawId(event.id)
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
      calendarService.invalidateCache?.()
    } catch {
      revert()
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
    setFormOpen(false) // brief reset to force modal re-mount
    setTimeout(() => setFormOpen(true), 0)
  }, [])

  // Disable DnD for milestone and activity types (T-08-04-02)
  const handleEventAllow = useCallback((_dropInfo, draggedEvent) => {
    const type = draggedEvent.extendedProps.type
    return type !== 'milestone' && type !== 'activity'
  }, [])

  const handleFormSuccess = useCallback(() => {
    setFormOpen(false)
    calendarService.invalidateCache?.()
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

        {/* Error state */}
        {calendarError && (
          <Alert color='danger' variant='soft'>
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
            height='100%'
          />
        </Box>
      </Stack>

      {/* Event create/edit modal */}
      <EventFormModal
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

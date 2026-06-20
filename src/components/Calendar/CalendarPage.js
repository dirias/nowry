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
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded'
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

  // Phase 16: local filter expanded state (not persisted) and focusAreas from getAllEvents
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [focusAreas, setFocusAreas] = useState([])

  const { filters, setFilters, resetFilters, applyPreset } = useCalendarFilters() // CAL-03: per D-11

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
            // Phase 16 D-01: destructure { events, focusAreas } from getAllEvents()
            const { events: allEvents, focusAreas: loadedAreas } = await calendarService.getAllEvents()
            setFocusAreas(loadedAreas)

            // Phase 16 D-13: three-step filter (in exact order)
            const filtered = allEvents.filter((ev) => {
              // Step 1: habits toggle
              if (!filters.habitsEnabled && ev.type === 'activity') return false
              // Step 2: type filter (only active when not all 4 types selected)
              if (filters.activeTypes.length < 4 && !filters.activeTypes.includes(ev.type)) return false
              // Step 3: area filter (null focusAreaId always passes through)
              if (
                filters.activeAreaIds.length > 0 &&
                ev.focusAreaId !== null &&
                !filters.activeAreaIds.includes(ev.focusAreaId)
              ) return false
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
                  isKeyResult: ev.isKeyResult,  // CAL-02: from calendar.service.js
                  focusAreaId: ev.focusAreaId,  // D-02: for area filter (Pitfall 4 prevention)
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
    // D-14: focusAreas NOT in deps (would cause infinite refetch loop — Pitfall 1)
    [filters.habitsEnabled, filters.activeTypes, filters.activeAreaIds]
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

  // Phase 16: Type chip toggle handler — no-op when trying to deselect the last active type
  const handleTypeClick = useCallback((typeName) => {
    setFilters((f) => {
      const isActive = f.activeTypes.includes(typeName)
      if (isActive && f.activeTypes.length === 1) return f // no-op: can't deselect last type
      const next = isActive
        ? f.activeTypes.filter((t) => t !== typeName)
        : [...f.activeTypes, typeName]
      return { ...f, activeTypes: next }
    })
  }, [setFilters])

  // Phase 16: Area chip toggle handler
  const handleAreaClick = useCallback((areaId) => {
    setFilters((f) => {
      const isActive = f.activeAreaIds.includes(areaId)
      const next = isActive
        ? f.activeAreaIds.filter((id) => id !== areaId)
        : [...f.activeAreaIds, areaId]
      return { ...f, activeAreaIds: next }
    })
  }, [setFilters])

  // Phase 16: "All Types" chip is active when all 4 non-habit types are present (D-12)
  const allTypesActive = filters.activeTypes.length === 4 &&
    ['task', 'priority', 'goal', 'milestone'].every((t) => filters.activeTypes.includes(t))

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

        {/* Phase 16 FLT-01/02/03: Filter bar — collapsed row always visible */}
        <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Habits toggle (D-10) */}
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

          {/* Preset buttons — Button not Chip per D-09 */}
          <Button variant='outlined' size='sm' onClick={() => applyPreset('goals_only')}
            aria-label={t('calendarPage.presets.goalsOnlyAriaLabel')}>
            {t('calendarPage.presets.goalsOnly')}
          </Button>
          <Button variant='outlined' size='sm' onClick={() => applyPreset('today')}
            aria-label={t('calendarPage.presets.todayAriaLabel')}>
            {t('calendarPage.presets.today')}
          </Button>
          <Button variant='outlined' size='sm' onClick={() => applyPreset('this_week')}
            aria-label={t('calendarPage.presets.thisWeekAriaLabel')}>
            {t('calendarPage.presets.thisWeek')}
          </Button>

          {/* More/Less filters toggle chip (D-08) */}
          <Chip
            size='sm'
            variant={filtersExpanded ? 'soft' : 'outlined'}
            color='neutral'
            onClick={() => setFiltersExpanded((prev) => !prev)}
            aria-label={t('calendarPage.moreFiltersAriaLabel')}
            aria-expanded={filtersExpanded}
            endDecorator={filtersExpanded
              ? <ExpandLessRoundedIcon sx={{ fontSize: 14 }} />
              : <ExpandMoreRoundedIcon sx={{ fontSize: 14 }} />
            }
          >
            {filtersExpanded ? t('calendarPage.lessFilters') : t('calendarPage.moreFilters')}
          </Chip>

          {/* Expanded: area chips + type chips (D-08) */}
          {filtersExpanded && (
            <>
              {/* "All Areas" chip — active when no area filter (D-11) */}
              <Chip
                size='sm'
                variant={filters.activeAreaIds.length === 0 ? 'soft' : 'outlined'}
                color='primary'
                onClick={() => setFilters((f) => ({ ...f, activeAreaIds: [] }))}
                aria-label={t('calendarPage.filters.allAreasAriaLabel')}
                aria-pressed={filters.activeAreaIds.length === 0}
              >
                {t('calendarPage.filters.allAreas')}
              </Chip>

              {/* Individual area chips (D-11) */}
              {focusAreas.length > 0
                ? focusAreas.map((area) => (
                    <Chip
                      key={area.id}
                      size='sm'
                      onClick={() => handleAreaClick(area.id)}
                      aria-label={t('calendarPage.filters.areaAriaLabel', { name: area.name })}
                      aria-pressed={filters.activeAreaIds.includes(area.id)}
                      sx={
                        filters.activeAreaIds.includes(area.id)
                          // area.color is user-defined data hex — not a design token (D-11 exception)
                          ? { bgcolor: area.color, color: 'common.white', '&:hover': { bgcolor: area.color, opacity: 0.9 } }
                          : undefined
                      }
                      variant={filters.activeAreaIds.includes(area.id) ? undefined : 'outlined'}
                      color={filters.activeAreaIds.includes(area.id) ? undefined : 'neutral'}
                    >
                      {area.name}
                    </Chip>
                  ))
                : (
                    <Box sx={{ py: 1 }}>
                      <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                        {t('calendarPage.filters.noAreas')}
                      </Typography>
                    </Box>
                  )
              }

              {/* "All Types" chip (D-12) */}
              <Chip
                size='sm'
                variant={allTypesActive ? 'soft' : 'outlined'}
                color='primary'
                onClick={() => setFilters((f) => ({ ...f, activeTypes: ['task', 'priority', 'goal', 'milestone'] }))}
                aria-label={t('calendarPage.filters.allTypesAriaLabel')}
                aria-pressed={allTypesActive}
              >
                {t('calendarPage.filters.allTypes')}
              </Chip>

              {/* Individual type chips (D-12) */}
              {[
                { key: 'goal', labelKey: 'calendarPage.filters.typeGoal', ariaKey: 'calendarPage.filters.typeGoalAriaLabel' },
                { key: 'task', labelKey: 'calendarPage.filters.typeTask', ariaKey: 'calendarPage.filters.typeTaskAriaLabel' },
                { key: 'priority', labelKey: 'calendarPage.filters.typePriority', ariaKey: 'calendarPage.filters.typePriorityAriaLabel' },
                { key: 'milestone', labelKey: 'calendarPage.filters.typeMilestone', ariaKey: 'calendarPage.filters.typeMilestoneAriaLabel' },
              ].map(({ key, labelKey, ariaKey }) => (
                <Chip
                  key={key}
                  size='sm'
                  variant={filters.activeTypes.includes(key) ? 'soft' : 'outlined'}
                  color='neutral'
                  onClick={() => handleTypeClick(key)}
                  aria-label={t(ariaKey)}
                  aria-pressed={filters.activeTypes.includes(key)}
                >
                  {t(labelKey)}
                </Chip>
              ))}
            </>
          )}
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
            eventContent={eventContent}
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

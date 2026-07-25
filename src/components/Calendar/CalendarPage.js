import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import { useIsMobile } from '../../hooks/useIsMobile'
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

// Canonical type set used for filter-bypass check (WR-02) and allTypesActive UI
const ALL_TYPES = ['task', 'priority', 'goal', 'milestone']

// Phase 17 MOB-02: Toolbar constants — desktop shows view switcher, mobile hides it (listWeek locked)
const DESKTOP_TOOLBAR = { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }
const MOBILE_TOOLBAR = { left: 'prev,next today', center: 'title', right: '' }

// CAL-01: Icon map for eventContent — milestone handled separately via isKeyResult branch
const EVENT_ICON_MAP = {
  task: CheckCircleOutlinedIcon,
  priority: FlagOutlinedIcon,
  goal: AdjustOutlinedIcon,
  activity: RepeatRoundedIcon
}

const CalendarPage = () => {
  const { t } = useTranslation()
  const calendarRef = useRef(null)
  const isMobile = useIsMobile()
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState('create')
  const [editingEvent, setEditingEvent] = useState(null)
  const [formDefaultDate, setFormDefaultDate] = useState(null)
  const [calendarError, setCalendarError] = useState(null)

  // Phase 16: local filter expanded state (not persisted) and focusAreas from getAllEvents
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [focusAreas, setFocusAreas] = useState([])

  const { filters, setFilters, resetFilters, applyPreset, activePreset } = useCalendarFilters() // CAL-03: per D-11

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
              // Step 2: type filter — bypass only when every canonical type is present (WR-02)
              const allActive = ALL_TYPES.every((typeName) => filters.activeTypes.includes(typeName))
              if (!allActive && !filters.activeTypes.includes(ev.type)) return false
              // Step 3: area filter (null focusAreaId always passes through)
              if (filters.activeAreaIds.length > 0 && ev.focusAreaId !== null && !filters.activeAreaIds.includes(ev.focusAreaId))
                return false
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
                  isKeyResult: ev.isKeyResult, // CAL-02: from calendar.service.js
                  focusAreaId: ev.focusAreaId // D-02: for area filter (Pitfall 4 prevention)
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

  // Phase 17 D-04: Live view switch on resize/rotation — optional chaining guards null on initial render (RESEARCH.md Pitfall 1)
  useEffect(() => {
    const api = calendarRef.current?.getApi()
    if (!api) return
    api.changeView(isMobile ? 'listWeek' : 'dayGridMonth')
  }, [isMobile])

  // Phase 16: Type chip toggle handler
  // When All Types is active (all 4 present), clicking a type isolates to that type only.
  // When a subset is active, clicking an inactive type adds it; clicking an active type removes it.
  // No-op when trying to deselect the last remaining type.
  const handleTypeClick = useCallback(
    (typeName) => {
      setFilters((f) => {
        const allActive = ALL_TYPES.every((t) => f.activeTypes.includes(t))
        if (allActive) {
          // Isolate: switch from "all" to just this one type
          return { ...f, activeTypes: [typeName] }
        }
        const isActive = f.activeTypes.includes(typeName)
        if (isActive && f.activeTypes.length === 1) return f // no-op: can't deselect last type
        const next = isActive ? f.activeTypes.filter((existingType) => existingType !== typeName) : [...f.activeTypes, typeName]
        return { ...f, activeTypes: next }
      })
    },
    [setFilters]
  )

  // Phase 16: Area chip toggle handler
  const handleAreaClick = useCallback(
    (areaId) => {
      setFilters((f) => {
        const isActive = f.activeAreaIds.includes(areaId)
        const next = isActive ? f.activeAreaIds.filter((id) => id !== areaId) : [...f.activeAreaIds, areaId]
        return { ...f, activeAreaIds: next }
      })
    },
    [setFilters]
  )

  // Phase 16: "All Types" chip is active when all 4 non-habit types are present (D-12)
  const allTypesActive = ALL_TYPES.every((typeName) => filters.activeTypes.includes(typeName))

  return (
    <Container maxWidth='xl' sx={{ px: { xs: 1, sm: 2, md: 3 }, py: 4, height: { xs: 'auto', sm: 'calc(100vh - 64px)' } }}>
      <Stack spacing={2} sx={{ height: '100%' }}>
        {/* Header row */}
        <Stack spacing={1.5}>
          <Typography level='h2'>{t('calendarPage.title')}</Typography>
          <Button
            startDecorator={<AddRoundedIcon />}
            size='sm'
            onClick={handleAddEvent}
            aria-label={t('calendarPage.addEvent')}
            sx={{ alignSelf: 'flex-end' }}
          >
            {t('calendarPage.addEvent')}
          </Button>
        </Stack>

        {/* Phase 16 FLT-01/02/03: Filter bar — collapsed row always visible */}
        <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Habits toggle (D-10) */}
          <Chip
            size='sm'
            variant={filters.habitsEnabled ? 'solid' : 'outlined'}
            color={filters.habitsEnabled ? 'primary' : 'neutral'}
            sx={filters.habitsEnabled ? { color: 'primary.solidColor' } : { bgcolor: 'background.level1' }}
            onClick={() => setFilters((f) => ({ ...f, habitsEnabled: !f.habitsEnabled }))}
            aria-label={t('calendarPage.showHabitsAriaLabel')}
            aria-pressed={filters.habitsEnabled}
          >
            {t('calendarPage.showHabits')}
          </Chip>

          {/* Preset buttons — Button not Chip per D-09 */}
          <Button
            variant={activePreset === 'goals_only' ? 'solid' : 'outlined'}
            color={activePreset === 'goals_only' ? 'primary' : 'neutral'}
            size='sm'
            onClick={() => applyPreset('goals_only')}
            aria-label={t('calendarPage.presets.goalsOnlyAriaLabel')}
            aria-pressed={activePreset === 'goals_only'}
          >
            {t('calendarPage.presets.goalsOnly')}
          </Button>
          <Button
            variant={activePreset === 'today' ? 'solid' : 'outlined'}
            color={activePreset === 'today' ? 'primary' : 'neutral'}
            size='sm'
            onClick={() => {
              applyPreset('today')
              calendarRef.current?.getApi().today()
            }}
            aria-label={t('calendarPage.presets.todayAriaLabel')}
            aria-pressed={activePreset === 'today'}
          >
            {t('calendarPage.presets.today')}
          </Button>
          <Button
            variant={activePreset === 'this_week' ? 'solid' : 'outlined'}
            color={activePreset === 'this_week' ? 'primary' : 'neutral'}
            size='sm'
            onClick={() => {
              applyPreset('this_week')
              const api = calendarRef.current?.getApi()
              api?.changeView(isMobile ? 'listWeek' : 'timeGridWeek')
              api?.today()
            }}
            aria-label={t('calendarPage.presets.thisWeekAriaLabel')}
            aria-pressed={activePreset === 'this_week'}
          >
            {t('calendarPage.presets.thisWeek')}
          </Button>

          {/* More/Less filters toggle chip (D-08) */}
          <Chip
            size='sm'
            variant='outlined'
            color='neutral'
            sx={{ bgcolor: 'background.level1' }}
            onClick={() => setFiltersExpanded((prev) => !prev)}
            aria-label={t('calendarPage.moreFiltersAriaLabel')}
            aria-expanded={filtersExpanded}
            endDecorator={
              filtersExpanded ? <ExpandLessRoundedIcon sx={{ fontSize: 14 }} /> : <ExpandMoreRoundedIcon sx={{ fontSize: 14 }} />
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
                variant={filters.activeAreaIds.length === 0 ? 'solid' : 'outlined'}
                color={filters.activeAreaIds.length === 0 ? 'primary' : 'neutral'}
                sx={filters.activeAreaIds.length === 0 ? { color: 'primary.solidColor' } : { bgcolor: 'background.level1' }}
                onClick={() => setFilters((f) => ({ ...f, activeAreaIds: [] }))}
                aria-label={t('calendarPage.filters.allAreasAriaLabel')}
                aria-pressed={filters.activeAreaIds.length === 0}
              >
                {t('calendarPage.filters.allAreas')}
              </Chip>

              {/* Individual area chips (D-11) */}
              {focusAreas.length > 0 ? (
                focusAreas.map((area) => {
                  const areaActive = filters.activeAreaIds.includes(area.id)
                  return (
                    <Chip
                      key={area.id}
                      size='sm'
                      variant={areaActive ? 'solid' : 'outlined'}
                      color='neutral'
                      onClick={() => handleAreaClick(area.id)}
                      aria-label={t('calendarPage.filters.areaAriaLabel', { name: area.name })}
                      aria-pressed={areaActive}
                      sx={
                        areaActive
                          ? // area.color is user-defined data hex — not a design token (D-11 exception applies to bgcolor only)
                            {
                              bgcolor: area.color,
                              color: 'white',
                              borderColor: area.color,
                              '&:hover': { bgcolor: area.color, filter: 'brightness(0.92)' }
                            }
                          : { bgcolor: 'background.level1', borderColor: 'divider' }
                      }
                    >
                      {area.name}
                    </Chip>
                  )
                })
              ) : (
                <Box sx={{ py: 1 }}>
                  <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                    {t('calendarPage.filters.noAreas')}
                  </Typography>
                </Box>
              )}

              {/* "All Types" chip (D-12) */}
              <Chip
                size='sm'
                variant={allTypesActive ? 'solid' : 'outlined'}
                color={allTypesActive ? 'primary' : 'neutral'}
                sx={allTypesActive ? { color: 'primary.solidColor' } : { bgcolor: 'background.level1' }}
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
                { key: 'milestone', labelKey: 'calendarPage.filters.typeMilestone', ariaKey: 'calendarPage.filters.typeMilestoneAriaLabel' }
              ].map(({ key, labelKey, ariaKey }) => (
                <Chip
                  key={key}
                  size='sm'
                  variant={filters.activeTypes.includes(key) ? 'solid' : 'outlined'}
                  color={filters.activeTypes.includes(key) ? 'primary' : 'neutral'}
                  sx={filters.activeTypes.includes(key) ? { color: 'primary.solidColor' } : { bgcolor: 'background.level1' }}
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
        <Box
          sx={{
            flex: 1,
            overflow: 'hidden',
            minHeight: { xs: 500, sm: 0 },
            // FullCalendar toolbar — styled to match Joy UI Button variant="outlined"
            '& .fc-button, & .fc-button-primary': {
              minWidth: '44px !important',
              minHeight: '44px !important',
              backgroundColor: 'var(--joy-palette-background-surface) !important',
              color: 'var(--joy-palette-text-primary) !important',
              border: '1px solid var(--joy-palette-divider) !important',
              borderRadius: 'var(--joy-radius-sm) !important',
              fontSize: '0.875rem !important',
              fontWeight: 'var(--joy-fontWeight-md) !important',
              fontFamily: 'var(--joy-fontFamily-body) !important',
              padding: '0 12px !important',
              boxShadow: 'none !important',
              transition: 'background-color 0.2s, border-color 0.2s !important',
              textTransform: 'none !important'
            },
            '& .fc-button-primary:hover': {
              backgroundColor: 'var(--joy-palette-background-level1) !important',
              borderColor: 'var(--joy-palette-neutral-outlinedBorder) !important',
              color: 'var(--joy-palette-text-primary) !important'
            },
            '& .fc-button-primary:not(:disabled):active': {
              backgroundColor: 'var(--joy-palette-background-level2) !important',
              borderColor: 'var(--joy-palette-neutral-outlinedBorder) !important',
              color: 'var(--joy-palette-text-primary) !important'
            },
            '& .fc-button-primary:focus, & .fc-button-primary:focus-visible': {
              outline: 'none !important',
              boxShadow: 'none !important',
              borderColor: 'var(--joy-palette-primary-outlinedBorder) !important'
            },
            // Active/selected view button (e.g. "Month" when in month view)
            '& .fc-button-primary:not(:disabled).fc-button-active': {
              backgroundColor: 'var(--joy-palette-primary-softBg) !important',
              color: 'var(--joy-palette-primary-softColor) !important',
              borderColor: 'var(--joy-palette-primary-outlinedBorder) !important'
            },
            '& .fc-button:disabled': {
              opacity: '0.4 !important',
              cursor: 'not-allowed !important'
            },
            // Toolbar title — match title-md typography
            '& .fc-toolbar-title': {
              color: 'var(--joy-palette-text-primary) !important',
              fontSize: '1.125rem !important',
              fontWeight: 'var(--joy-fontWeight-lg) !important',
              fontFamily: 'var(--joy-fontFamily-body) !important'
            }
          }}
        >
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            initialView={isMobile ? 'listWeek' : 'dayGridMonth'}
            headerToolbar={isMobile ? MOBILE_TOOLBAR : DESKTOP_TOOLBAR}
            eventSources={eventSources}
            editable={!isMobile}
            selectable={!isMobile}
            noEventsContent={() => (
              <Box sx={{ py: 8, textAlign: 'center' }}>
                <Typography level='title-md' sx={{ mb: 0.5, color: 'text.secondary' }}>
                  {t('calendarPage.empty.week.title')}
                </Typography>
                <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                  {t('calendarPage.empty.week.body')}
                </Typography>
              </Box>
            )}
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

import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, ModalDialog, Box, Typography, IconButton, Chip, Stack, CircularProgress, Tooltip } from '@mui/joy'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import TodayRoundedIcon from '@mui/icons-material/TodayRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import { calendarService } from '../../api/services/calendar.service'
import EventFormModal from './EventFormModal'

// ─── Type Metadata ──────────────────────────────────────────────────────────
const TYPE_META = {
  task: { color: '#6366f1', i18nKey: 'calendarModal.filters.tasks' },
  priority: { color: '#f59e0b', i18nKey: 'calendarModal.filters.priorities' },
  goal: { color: '#10b981', i18nKey: 'calendarModal.filters.goals' },
  milestone: { color: '#14b8a6', i18nKey: 'calendarModal.filters.milestones' },
  activity: { color: '#3b82f6', i18nKey: 'calendarModal.filters.habits' }
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const isSameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

const startOfMonth = (y, m) => new Date(y, m, 1)
const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate()

/** Build a { [listId]: label } map from the same localStorage key SideMenu uses */
const getListLabelMap = () => {
  try {
    const raw = localStorage.getItem('nowry_task_lists')
    const lists = raw ? JSON.parse(raw) : []
    return Object.fromEntries(lists.map((l) => [l.id, l.label]))
  } catch {
    /* ignore */
    return {}
  }
}

// ─── Component ───────────────────────────────────────────────────────────────
const CalendarModal = ({ open, onClose }) => {
  const { t } = useTranslation()
  const today = new Date()

  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState(today)
  const [activeFilters, setActiveFilters] = useState(['task', 'priority', 'goal', 'milestone', 'activity'])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)

  // ── EventFormModal state ─────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState('create')
  const [editingEvent, setEditingEvent] = useState(null)

  // ── Fetch ────────────────────────────────────────────────────────────────
  const loadEvents = useCallback(async () => {
    if (!open) return
    setLoading(true)
    try {
      const data = await calendarService.getAllEvents()
      setEvents(data)
    } catch (e) {
      console.error('[CalendarModal] Failed to load events', e)
    } finally {
      setLoading(false)
    }
  }, [open])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  // ── Filter logic ─────────────────────────────────────────────────────────
  const visibleEvents = events.filter((ev) => activeFilters.includes(ev.type))

  const toggleFilter = (type) => {
    setActiveFilters((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]))
  }

  const eventsForDay = (date) => visibleEvents.filter((ev) => ev.date instanceof Date && !isNaN(ev.date) && isSameDay(ev.date, date))

  const eventsForSelectedDay = eventsForDay(selectedDay)

  // ── EventForm helpers ────────────────────────────────────────────────────
  const openCreate = () => {
    setFormMode('create')
    setEditingEvent(null)
    setFormOpen(true)
  }

  const openEdit = (ev) => {
    setFormMode('edit')
    setEditingEvent(ev)
    setFormOpen(true)
  }

  // ── Calendar grid ─────────────────────────────────────────────────────────
  const firstDow = startOfMonth(currentYear, currentMonth).getDay()
  const totalDays = daysInMonth(currentYear, currentMonth)
  const gridCells = []

  for (let i = 0; i < firstDow; i++) gridCells.push(null)
  for (let d = 1; d <= totalDays; d++) gridCells.push(d)
  while (gridCells.length % 7 !== 0) gridCells.push(null)

  // ── Month nav ──────────────────────────────────────────────────────────────
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear((y) => y - 1)
    } else setCurrentMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear((y) => y + 1)
    } else setCurrentMonth((m) => m + 1)
  }
  const goToday = () => {
    setCurrentYear(today.getFullYear())
    setCurrentMonth(today.getMonth())
    setSelectedDay(today)
  }

  const monthLabel = new Date(currentYear, currentMonth, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric'
  })

  const DOW_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

  const statusColor = (status) => {
    if (status === 'completed') return 'success'
    if (status === 'in_progress') return 'primary'
    if (status === 'pending') return 'warning'
    return 'neutral'
  }

  return (
    <>
      <Modal open={open} onClose={onClose}>
        <ModalDialog
          layout='center'
          sx={{
            width: { xs: '100vw', sm: 700, md: 820 },
            maxWidth: '100vw',
            maxHeight: { xs: '100dvh', sm: '90dvh' },
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            p: 0,
            borderRadius: { xs: 0, sm: 'lg' }
          }}
        >
          {/* ── Header ──────────────────────────────────────────────── */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2.5,
              py: 1.5,
              borderBottom: '1px solid',
              borderColor: 'divider',
              flexShrink: 0
            }}
          >
            <Typography level='title-md' fontWeight={600}>
              {t('calendarModal.title')}
            </Typography>
            <IconButton size='sm' variant='plain' color='neutral' onClick={onClose}>
              <CloseRoundedIcon />
            </IconButton>
          </Box>

          {/* ── Filter Chips ─────────────────────────────────────────── */}
          <Box
            sx={{
              px: 2.5,
              py: 1,
              borderBottom: '1px solid',
              borderColor: 'divider',
              flexShrink: 0,
              // Horizontal scroll on mobile — keeps chips in a single row
              overflowX: { xs: 'auto', sm: 'visible' },
              '&::-webkit-scrollbar': { display: 'none' }
            }}
          >
            <Stack direction='row' spacing={0.75} sx={{ flexWrap: { xs: 'nowrap', sm: 'wrap' }, minWidth: 'max-content' }}>
              {Object.entries(TYPE_META).map(([type, meta]) => {
                const isActive = activeFilters.includes(type)
                return (
                  <Chip
                    key={type}
                    size='sm'
                    variant={isActive ? 'solid' : 'outlined'}
                    onClick={() => toggleFilter(type)}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: isActive ? meta.color : 'transparent',
                      borderColor: meta.color,
                      color: isActive ? '#fff' : 'text.secondary',
                      transition: 'all 0.15s',
                      // Larger touch target on mobile
                      minHeight: { xs: 32, sm: 'auto' },
                      px: { xs: 1.25, sm: 1 },
                      '&:hover': { opacity: 0.85 }
                    }}
                  >
                    {t(meta.i18nKey)}
                  </Chip>
                )
              })}
            </Stack>
          </Box>

          {/* ── Body: Calendar + Day Panel ───────────────────────────── */}
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              overflow: 'hidden',
              minHeight: 0
            }}
          >
            {/* ── Calendar Grid ──────────────────────────────────────── */}
            <Box
              sx={{
                flex: { xs: '0 0 auto', sm: '0 0 360px' },
                borderRight: { xs: 'none', sm: '1px solid' },
                borderBottom: { xs: '1px solid', sm: 'none' },
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column',
                p: 2
              }}
            >
              {/* Month Navigation */}
              <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ mb: 1.5 }}>
                <IconButton
                  size='sm'
                  variant='plain'
                  color='neutral'
                  onClick={prevMonth}
                  sx={{ minWidth: { xs: 44, sm: 32 }, minHeight: { xs: 44, sm: 32 } }}
                >
                  <ChevronLeftRoundedIcon />
                </IconButton>
                <Stack direction='row' alignItems='center' spacing={1}>
                  <Typography level='title-sm' fontWeight={600} sx={{ textTransform: 'capitalize' }}>
                    {monthLabel}
                  </Typography>
                  <Tooltip title={t('calendarModal.today')} size='sm'>
                    <IconButton
                      size='sm'
                      variant='plain'
                      color='neutral'
                      onClick={goToday}
                      sx={{ minWidth: { xs: 44, sm: 32 }, minHeight: { xs: 44, sm: 32 } }}
                    >
                      <TodayRoundedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
                <IconButton
                  size='sm'
                  variant='plain'
                  color='neutral'
                  onClick={nextMonth}
                  sx={{ minWidth: { xs: 44, sm: 32 }, minHeight: { xs: 44, sm: 32 } }}
                >
                  <ChevronRightRoundedIcon />
                </IconButton>
              </Stack>

              {/* Day-of-week labels */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 0.5 }}>
                {DOW_LABELS.map((d) => (
                  <Typography
                    key={d}
                    level='body-xs'
                    sx={{
                      textAlign: 'center',
                      color: 'text.tertiary',
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      py: 0.25
                    }}
                  >
                    {d}
                  </Typography>
                ))}
              </Box>

              {/* Day cells */}
              {loading ? (
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CircularProgress size='sm' />
                </Box>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.25, flex: 1 }}>
                  {gridCells.map((day, idx) => {
                    if (!day) return <Box key={`blank-${idx}`} />

                    const cellDate = new Date(currentYear, currentMonth, day)
                    const isToday = isSameDay(cellDate, today)
                    const isSelected = isSameDay(cellDate, selectedDay)
                    const dayEvents = eventsForDay(cellDate)
                    const dotColors = [...new Set(dayEvents.map((e) => e.color))].slice(0, 3)

                    return (
                      <Box
                        key={day}
                        onClick={() => setSelectedDay(cellDate)}
                        sx={{
                          aspectRatio: '1',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 'sm',
                          cursor: 'pointer',
                          bgcolor: isSelected ? 'primary.solidBg' : isToday ? 'primary.softBg' : 'transparent',
                          transition: 'all 0.12s',
                          '&:hover': {
                            bgcolor: isSelected ? 'primary.solidBg' : 'background.level1'
                          }
                        }}
                      >
                        <Typography
                          level='body-xs'
                          sx={{
                            fontWeight: isToday || isSelected ? 700 : 400,
                            color: isSelected ? 'primary.solidColor' : isToday ? 'primary.plainColor' : 'text.primary',
                            fontSize: '0.8rem',
                            lineHeight: 1
                          }}
                        >
                          {day}
                        </Typography>
                        {dotColors.length > 0 && (
                          <Stack direction='row' spacing='2px' sx={{ mt: '2px' }}>
                            {dotColors.map((color, i) => (
                              <Box
                                key={i}
                                sx={{
                                  width: 4,
                                  height: 4,
                                  borderRadius: '50%',
                                  bgcolor: isSelected ? 'rgba(255,255,255,0.85)' : color,
                                  flexShrink: 0
                                }}
                              />
                            ))}
                          </Stack>
                        )}
                      </Box>
                    )
                  })}
                </Box>
              )}
            </Box>

            {/* ── Day Panel ─────────────────────────────────────────── */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
              {/* Day panel header with + button */}
              <Box
                sx={{
                  px: 2.5,
                  py: 1.5,
                  flexShrink: 0,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between'
                }}
              >
                <Box>
                  <Typography level='title-sm' fontWeight={600}>
                    {selectedDay.toLocaleDateString(undefined, {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Typography>
                  <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
                    {eventsForSelectedDay.length === 0
                      ? t('calendarModal.noEvents')
                      : t('calendarModal.eventCount', {
                          count: eventsForSelectedDay.length,
                          defaultValue: `${eventsForSelectedDay.length} event${eventsForSelectedDay.length !== 1 ? 's' : ''}`
                        })}
                  </Typography>
                </Box>
                {/* Add event button */}
                <Tooltip title={t('calendarModal.addEvent')} size='sm' placement='left'>
                  <IconButton
                    size='sm'
                    variant='outlined'
                    color='neutral'
                    onClick={openCreate}
                    sx={{
                      '--IconButton-size': '28px',
                      borderRadius: 'sm',
                      transition: 'all 0.15s',
                      '&:hover': { borderColor: 'primary.outlinedBorder', color: 'primary.plainColor' }
                    }}
                  >
                    <AddRoundedIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>

              {/* Event list */}
              <Box sx={{ flex: 1, overflowY: 'auto', px: 2.5, py: 1.5 }}>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
                    <CircularProgress size='sm' />
                  </Box>
                ) : eventsForSelectedDay.length === 0 ? (
                  <Box
                    sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, opacity: 0.5 }}
                  >
                    <Typography level='body-sm' sx={{ color: 'text.secondary', textAlign: 'center' }}>
                      {t('calendarModal.noEvents')}
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={1}>
                    {eventsForSelectedDay.map((ev) => (
                      <Box
                        key={ev.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 1.25,
                          py: 1,
                          px: 1.25,
                          borderRadius: 'sm',
                          border: '1px solid',
                          borderColor: 'divider',
                          bgcolor: 'background.surface',
                          transition: 'all 0.12s',
                          '&:hover': {
                            bgcolor: 'background.level1',
                            borderColor: ev.color + '55',
                            '& .edit-btn': { opacity: 1 }
                          }
                        }}
                      >
                        {/* Color accent bar */}
                        <Box sx={{ width: 4, alignSelf: 'stretch', borderRadius: '2px', bgcolor: ev.color, flexShrink: 0, mt: 0.25 }} />

                        {/* Event info */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            level='body-sm'
                            fontWeight={500}
                            sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'text.primary' }}
                          >
                            {ev.title}
                          </Typography>
                          {ev.areaName && (
                            <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                              {ev.goalTitle ? `🏁 ${ev.goalTitle}` : ev.areaName}
                            </Typography>
                          )}
                        </Box>

                        {/* Chips + edit button */}
                        <Stack direction='row' spacing={0.5} alignItems='center' flexShrink={0}>
                          <Chip
                            size='sm'
                            variant='soft'
                            sx={{ bgcolor: ev.color + '22', color: ev.color, fontWeight: 600, fontSize: '0.65rem', height: 20, px: 0.75 }}
                          >
                            {t(TYPE_META[ev.type]?.i18nKey || ev.type)}
                          </Chip>
                          {ev.status && ev.status !== 'active' && ev.status !== 'pending' && (
                            <Chip
                              size='sm'
                              variant='soft'
                              color={statusColor(ev.status)}
                              sx={{ height: 20, fontSize: '0.65rem', px: 0.75 }}
                            >
                              {ev.status}
                            </Chip>
                          )}
                          {ev.type === 'task' &&
                            ev.category &&
                            ev.category !== 'general' &&
                            (() => {
                              const listLabel = getListLabelMap()[ev.category]
                              const display = listLabel || ev.category
                              return (
                                <Chip
                                  size='sm'
                                  variant='soft'
                                  color='neutral'
                                  sx={{
                                    height: 20,
                                    fontSize: '0.65rem',
                                    px: 0.75,
                                    maxWidth: 90,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {display}
                                </Chip>
                              )
                            })()}
                          {/* Edit button (hover-only) */}
                          <Tooltip title={t('calendarModal.editEvent')} size='sm'>
                            <IconButton
                              className='edit-btn'
                              size='sm'
                              variant='plain'
                              color='neutral'
                              onClick={() => openEdit(ev)}
                              sx={{
                                '--IconButton-size': '24px',
                                opacity: 0,
                                transition: 'opacity 0.15s'
                              }}
                            >
                              <EditRoundedIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>
            </Box>
          </Box>
        </ModalDialog>
      </Modal>

      {/* ── Event Form Modal ───────────────────────────────────────────────── */}
      <EventFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={loadEvents}
        mode={formMode}
        event={editingEvent}
        defaultDate={selectedDay}
      />
    </>
  )
}

export default CalendarModal

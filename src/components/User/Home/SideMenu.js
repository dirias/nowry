import * as React from 'react'
import { useTranslation } from 'react-i18next'
import {
  Sheet,
  Typography,
  Stack,
  Box,
  Button,
  Input,
  IconButton,
  Tooltip,
  CircularProgress,
  LinearProgress,
  Chip,
  ChipDelete,
  Divider,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Link as JoyLink
} from '@mui/joy'
import { Link as RouterLink } from 'react-router-dom'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import WbSunnyIcon from '@mui/icons-material/WbSunny'
import WbTwilightIcon from '@mui/icons-material/WbTwilight'
import NightsStayIcon from '@mui/icons-material/NightsStay'
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted'
import SortableTask from '../../Task/SortableTask'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { tasksService, annualPlanningService } from '../../../api/services'
import { useTaskData } from '../../../hooks/useTaskData'
import { apiCache } from '../../../api/utils/cache'
import { ROUTINE_CACHE_KEY, ROUTINE_TTL, todayKey } from '../../../api/utils/routineCache'

// ─── localStorage helpers ─────────────────────────────────────────────────────
const LISTS_KEY = 'nowry_task_lists'
const ACTIVE_LIST_KEY = 'nowry_active_task_list'

const loadLists = () => {
  try {
    const raw = localStorage.getItem(LISTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const saveLists = (lists) => {
  try {
    localStorage.setItem(LISTS_KEY, JSON.stringify(lists))
  } catch {
    /* ignore storage write errors */
  }
}

const loadActiveList = () => {
  return localStorage.getItem(ACTIVE_LIST_KEY) || 'all'
}

const saveActiveList = (id) => {
  localStorage.setItem(ACTIVE_LIST_KEY, id)
}
// ─────────────────────────────────────────────────────────────────────────────

const SideMenu = () => {
  const { t } = useTranslation()

  // Chip style helpers — use semantic primary tokens so dark mode and
  // user color preference both work correctly through the Joy UI palette.
  const activeChipSx = {
    bgcolor: 'primary.softBg',
    color: 'primary.plainColor',
    fontWeight: 600,
    border: 'none'
  }
  const inactiveChipSx = {
    bgcolor: 'background.level2',
    color: 'text.secondary',
    border: 'none'
  }
  const [tasks, setTasks] = React.useState([])
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('pending')
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(false)
  const [routine, setRoutine] = React.useState(null)
  // Keys: item.id -> true when checked (D-05: migrated from index-based keys to stay
  // consistent with DailyRoutinePlanner.js, which uses the same id-based format).
  // Sourced from backend (cross-device sync) — seeding logic below is key-format-agnostic.
  const [routineCompletions, setRoutineCompletions] = React.useState({})

  // ── Task lists state ──────────────────────────────────────────────────────
  const [lists, setLists] = React.useState(loadLists)
  const [activeList, setActiveList] = React.useState(loadActiveList)
  const [addingList, setAddingList] = React.useState(false)
  const [newListName, setNewListName] = React.useState('')
  const newListInputRef = React.useRef(null)
  const searchInputRef = React.useRef(null)
  // ─────────────────────────────────────────────────────────────────────────

  // Helper function to determine current time period
  const getCurrentPeriod = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'morning'
    if (hour < 18) return 'afternoon'
    return 'evening'
  }

  const [activeTab, setActiveTab] = React.useState(getCurrentPeriod())

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor))

  const { tasks: tasksData, loading: tasksLoading, reload: reloadTasks } = useTaskData()

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(false)
      const routineData = await apiCache.get(ROUTINE_CACHE_KEY, ROUTINE_TTL, () => annualPlanningService.getDailyRoutine())
      setTasks(tasksData)
      setRoutine(routineData)
      // Seed completion state from backend (cross-device sync + midnight reset via date key)
      const today = todayKey()
      const backendCompletions = routineData?.daily_completions?.[today] || []
      // Convert array of keys to object map { "morning_0": true, ... }
      const completionMap = Object.fromEntries(backendCompletions.map((k) => [k, true]))
      setRoutineCompletions(completionMap)
    } catch (err) {
      console.error('Error loading data:', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [tasksData])

  // Load data when tasks are ready
  React.useEffect(() => {
    if (tasksLoading) return
    loadData()
  }, [tasksLoading, loadData])

  // Focus new list input when shown
  React.useEffect(() => {
    if (addingList && newListInputRef.current) {
      newListInputRef.current.focus()
    }
  }, [addingList])

  // ── List management ───────────────────────────────────────────────────────
  const handleSelectList = (id) => {
    setActiveList(id)
    saveActiveList(id)
    setSearch('')
  }

  const handleStartAddList = () => {
    setAddingList(true)
    setNewListName('')
  }

  const handleConfirmAddList = () => {
    const trimmed = newListName.trim()
    if (!trimmed) {
      setAddingList(false)
      return
    }
    const id = `list_${Date.now()}`
    const updated = [...lists, { id, label: trimmed }]
    setLists(updated)
    saveLists(updated)
    setActiveList(id)
    saveActiveList(id)
    setAddingList(false)
    setNewListName('')
  }

  const handleCancelAddList = () => {
    setAddingList(false)
    setNewListName('')
  }

  const handleDeleteList = (e, id) => {
    e.stopPropagation()
    const updated = lists.filter((l) => l.id !== id)
    setLists(updated)
    saveLists(updated)
    if (activeList === id) {
      setActiveList('all')
      saveActiveList('all')
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  // Task Management
  const addTask = async (title) => {
    try {
      const newTask = {
        title: title.trim(),
        description: '',
        is_completed: false,
        priority: 'medium',
        deadline: null,
        tags: [],
        category: activeList === 'all' ? 'general' : activeList
      }

      const created = await tasksService.create(newTask)
      setTasks([...tasks, created])
      reloadTasks()
      setSearch('')
    } catch (error) {
      console.error('Error adding task:', error)
    }
  }

  const removeTask = async (id) => {
    try {
      await tasksService.delete(id)
      setTasks(tasks.filter((t) => (t._id || t.id) !== id))
      reloadTasks()
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  const toggleTask = async (task) => {
    try {
      const updated = await tasksService.toggleComplete(task._id || task.id, task.is_completed)
      setTasks(tasks.map((t) => ((t._id || t.id) === (updated._id || updated.id) ? updated : t)))
      reloadTasks()
    } catch (error) {
      console.error('Error toggling task:', error)
    }
  }

  const updateTask = async (updatedTask) => {
    try {
      const taskId = updatedTask._id || updatedTask.id
      const updates = {
        title: updatedTask.title,
        deadline: updatedTask.deadline,
        priority: updatedTask.priority,
        is_completed: updatedTask.is_completed
      }

      const updated = await tasksService.update(taskId, updates)
      setTasks((prev) => prev.map((t) => ((t._id || t.id) === taskId ? updated : t)))
      reloadTasks()
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' ? true : statusFilter === 'completed' ? t.is_completed : !t.is_completed
    const matchesList = activeList === 'all' ? true : t.category === activeList
    return matchesSearch && matchesStatus && matchesList
  })

  const isExactTitleMatch = (text) => tasks.some((t) => t.title.trim().toLowerCase() === text.trim().toLowerCase())

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && search.trim() && !isExactTitleMatch(search)) {
      addTask(search)
    }
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (active.id !== over?.id) {
      const oldIndex = tasks.findIndex((t) => (t._id || t.id) === active.id)
      const newIndex = tasks.findIndex((t) => (t._id || t.id) === over.id)
      const newTasks = arrayMove(tasks, oldIndex, newIndex)
      setTasks(newTasks)
    }
  }

  // Toggle a routine item's completion — optimistic UI, persisted to backend for
  // cross-device sync. D-05: uses item.id directly (not `${period}_${index}`) to
  // stay consistent with DailyRoutinePlanner.js's id-based keys and avoid checkmarks
  // silently reattaching to the wrong item on reorder/delete.
  const toggleRoutineItem = (itemId) => {
    const previous = routineCompletions
    const updated = { ...routineCompletions, [itemId]: !routineCompletions[itemId] }
    setRoutineCompletions(updated)
    const activeKeys = Object.entries(updated)
      .filter(([, v]) => v)
      .map(([k]) => k)
    annualPlanningService
      .updateRoutineCompletions(todayKey(), activeKeys)
      .then(() => apiCache.invalidate(ROUTINE_CACHE_KEY))
      .catch((err) => {
        console.error('Failed to save routine completion:', err)
        setRoutineCompletions(previous)
      })
  }

  if (loading) {
    return (
      <Sheet
        variant='outlined'
        sx={{ borderRadius: 'md', p: 2, minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <CircularProgress />
      </Sheet>
    )
  }

  // Routine Helper
  const getRoutineItems = (period) => {
    if (!routine) return []
    return routine[`${period}_routine`] || []
  }

  const periodIcon = {
    morning: <WbSunnyIcon sx={{ fontSize: 32, color: 'warning.solidBg' }} />,
    afternoon: <WbTwilightIcon sx={{ fontSize: 32, color: 'warning.solidBg' }} />,
    evening: <NightsStayIcon sx={{ fontSize: 32, color: 'primary.plainColor' }} />
  }

  const renderRoutineList = (items, period) => {
    if (error) {
      return (
        <Box
          sx={{
            py: 4,
            px: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1.5,
            textAlign: 'center'
          }}
        >
          <Typography level='body-sm' sx={{ color: 'danger.plainColor' }}>
            {t('annualPlanning.tabs.errorLoading')}
          </Typography>
          <Button size='sm' variant='soft' onClick={loadData} aria-label={t('common.retry')}>
            {t('common.retry')}
          </Button>
        </Box>
      )
    }
    if (!items || items.length === 0) {
      return (
        <Box
          sx={{
            py: 4,
            px: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1.5,
            textAlign: 'center'
          }}
        >
          {periodIcon[period]}
          <Box>
            <Typography level='title-sm' sx={{ mb: 0.5 }}>
              {t(`annualPlanning.dailyRoutine.${period}EmptyTitle`)}
            </Typography>
            <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
              {t('annualPlanning.dailyRoutine.emptySubtitle')}
            </Typography>
          </Box>
          <Button
            component={RouterLink}
            to='/annual-planning/daily-routine'
            size='sm'
            variant='outlined'
            color='neutral'
            aria-label={t('annualPlanning.dailyRoutine.emptyCta')}
            sx={{ mt: 0.5, fontSize: 'xs' }}
          >
            {t('annualPlanning.dailyRoutine.emptyCta')}
          </Button>
        </Box>
      )
    }
    return (
      <Stack
        sx={{
          maxHeight: 240,
          overflowY: 'auto',
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'neutral.outlinedBorder', borderRadius: 2 },
          '&::-webkit-scrollbar-track': { bgcolor: 'transparent' }
        }}
      >
        {items.map((item, index) => {
          const isChecked = !!routineCompletions[item.id]
          return (
            <Box
              key={item.id || index}
              onClick={() => toggleRoutineItem(item.id)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                py: 0.75,
                px: 0.5,
                borderBottom: index < items.length - 1 ? '1px solid' : 'none',
                borderColor: 'divider',
                transition: 'background 0.12s',
                borderRadius: index === items.length - 1 ? '0 0 sm sm' : 0,
                cursor: 'pointer',
                '&:hover': { bgcolor: 'background.level1' }
              }}
            >
              {/* Checkbox — §5 custom checkbox pattern */}
              <Box
                role='checkbox'
                aria-checked={isChecked}
                aria-label={t('annualPlanning.dailyRoutine.toggleItem')}
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleRoutineItem(item.id)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    e.stopPropagation()
                    toggleRoutineItem(item.id)
                  }
                }}
                sx={{
                  width: 16,
                  height: 16,
                  border: '1.5px solid',
                  borderColor: isChecked ? 'primary.outlinedBorder' : 'neutral.outlinedBorder',
                  borderRadius: '4px',
                  flexShrink: 0,
                  bgcolor: isChecked ? 'primary.solidBg' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', borderRadius: 'sm' }
                }}
              >
                {isChecked && (
                  <Box
                    component='svg'
                    viewBox='0 0 24 24'
                    sx={{
                      width: 10,
                      height: 10,
                      fill: 'none',
                      stroke: 'var(--joy-palette-common-white)',
                      strokeWidth: 3,
                      strokeLinecap: 'round',
                      strokeLinejoin: 'round'
                    }}
                  >
                    <polyline points='20 6 9 17 4 12' />
                  </Box>
                )}
              </Box>
              <Typography
                level='body-sm'
                sx={{
                  color: isChecked ? 'text.tertiary' : 'text.primary',
                  flex: 1,
                  userSelect: 'none',
                  textDecoration: isChecked ? 'line-through' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                {item.title}
              </Typography>
            </Box>
          )
        })}
      </Stack>
    )
  }

  // Map a category id → display label
  const getCategoryLabel = (catId) => {
    if (!catId || catId === 'general' || catId === 'all') return t('tasks.lists.general')
    const found = lists.find((l) => l.id === catId)
    return found ? found.label : catId
  }

  // Group filteredTasks by category — only used when activeList === 'all'
  const getGroupedTasks = () => {
    const groups = {}
    filteredTasks.forEach((task) => {
      const cat = task.category || 'general'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(task)
    })
    return Object.entries(groups).map(([id, items]) => ({ id, label: getCategoryLabel(id), tasks: items }))
  }

  return (
    <Sheet
      variant='outlined'
      sx={{
        backgroundColor: 'background.body',
        borderRadius: 'md',
        p: 2,
        boxShadow: 'sm',
        height: '100%',
        minHeight: 500,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Tabs
        aria-label='Routine and Tasks'
        value={activeTab}
        onChange={(e, val) => setActiveTab(val)}
        sx={{ bgcolor: 'transparent', height: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}
      >
        <TabList
          disableUnderline
          sx={{
            p: 0.5,
            gap: 0.5,
            borderRadius: 'xl',
            bgcolor: 'background.level1',
            mb: 2,
            flexShrink: 0
          }}
        >
          <Tab
            disableIndicator
            value='morning'
            variant={activeTab === 'morning' ? 'solid' : 'plain'}
            color={activeTab === 'morning' ? 'primary' : 'neutral'}
            sx={{ borderRadius: 'lg', flex: 1 }}
          >
            <Tooltip title={t('annualPlanning.dailyRoutine.morning')} size='sm'>
              <WbSunnyIcon />
            </Tooltip>
          </Tab>
          <Tab
            disableIndicator
            value='afternoon'
            variant={activeTab === 'afternoon' ? 'solid' : 'plain'}
            color={activeTab === 'afternoon' ? 'primary' : 'neutral'}
            sx={{ borderRadius: 'lg', flex: 1 }}
          >
            <Tooltip title={t('annualPlanning.dailyRoutine.afternoon')} size='sm'>
              <WbTwilightIcon />
            </Tooltip>
          </Tab>
          <Tab
            disableIndicator
            value='evening'
            variant={activeTab === 'evening' ? 'solid' : 'plain'}
            color={activeTab === 'evening' ? 'primary' : 'neutral'}
            sx={{ borderRadius: 'lg', flex: 1 }}
          >
            <Tooltip title={t('annualPlanning.dailyRoutine.evening')} size='sm'>
              <NightsStayIcon />
            </Tooltip>
          </Tab>
          <Tab
            disableIndicator
            value='tasks'
            variant={activeTab === 'tasks' ? 'solid' : 'plain'}
            color={activeTab === 'tasks' ? 'primary' : 'neutral'}
            sx={{ borderRadius: 'lg', flex: 1 }}
          >
            <Tooltip title={t('tasks.title')} size='sm'>
              <FormatListBulletedIcon />
            </Tooltip>
          </Tab>
        </TabList>

        {/* Tab Panels */}

        {/* Morning */}
        {activeTab === 'morning' && (
          <TabPanel
            value='morning'
            sx={{
              p: '0 !important',
              m: 0,
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 1.5, flexShrink: 0 }}>
              <Typography level='title-md' startDecorator={<WbSunnyIcon color='primary' />}>
                {t('annualPlanning.dailyRoutine.morning')}
              </Typography>
              <IconButton
                component={RouterLink}
                to='/annual-planning/daily-routine'
                size='sm'
                variant='plain'
                color='neutral'
                aria-label={t('annualPlanning.dailyRoutine.editRoutine')}
              >
                <EditRoundedIcon />
              </IconButton>
            </Stack>
            {renderRoutineList(getRoutineItems('morning'), 'morning')}
          </TabPanel>
        )}

        {/* Afternoon */}
        {activeTab === 'afternoon' && (
          <TabPanel
            value='afternoon'
            sx={{
              p: '0 !important',
              m: 0,
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 1.5, flexShrink: 0 }}>
              <Typography level='title-md' startDecorator={<WbTwilightIcon color='primary' />}>
                {t('annualPlanning.dailyRoutine.afternoon')}
              </Typography>
              <IconButton
                component={RouterLink}
                to='/annual-planning/daily-routine'
                size='sm'
                variant='plain'
                color='neutral'
                aria-label={t('annualPlanning.dailyRoutine.editRoutine')}
              >
                <EditRoundedIcon />
              </IconButton>
            </Stack>
            {renderRoutineList(getRoutineItems('afternoon'), 'afternoon')}
          </TabPanel>
        )}

        {/* Evening */}
        {activeTab === 'evening' && (
          <TabPanel
            value='evening'
            sx={{
              p: '0 !important',
              m: 0,
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 1.5, flexShrink: 0 }}>
              <Typography level='title-md' startDecorator={<NightsStayIcon color='primary' />}>
                {t('annualPlanning.dailyRoutine.evening')}
              </Typography>
              <IconButton
                component={RouterLink}
                to='/annual-planning/daily-routine'
                size='sm'
                variant='plain'
                color='neutral'
                aria-label={t('annualPlanning.dailyRoutine.editRoutine')}
              >
                <EditRoundedIcon />
              </IconButton>
            </Stack>
            {renderRoutineList(getRoutineItems('evening'), 'evening')}
          </TabPanel>
        )}

        {/* Tasks */}
        {activeTab === 'tasks' && (
          <TabPanel value='tasks' sx={{ p: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Header & Filter */}
            <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ mb: 1 }}>
              <Typography level='title-md' startDecorator={<FormatListBulletedIcon sx={{ fontSize: 18, color: 'primary.plainColor' }} />}>
                {t('tasks.title')}
              </Typography>
              <Stack direction='row' spacing={0.5}>
                {['all', 'pending', 'completed'].map((f) => (
                  <Chip
                    key={f}
                    size='sm'
                    variant='plain'
                    color='neutral'
                    onClick={() => setStatusFilter(f)}
                    sx={{ cursor: 'pointer', fontSize: '0.7rem', px: 1, ...(statusFilter === f ? activeChipSx : inactiveChipSx) }}
                  >
                    {t(`tasks.filter.${f}`)}
                  </Chip>
                ))}
              </Stack>
            </Stack>

            {/* ── Completion progress ─────────────────────────────────────── */}
            {(() => {
              const listTasks = activeList === 'all' ? tasks : tasks.filter((t) => t.category === activeList)
              const total = listTasks.length
              const done = listTasks.filter((t) => t.is_completed).length
              const pct = total === 0 ? 0 : Math.round((done / total) * 100)
              return (
                <Box sx={{ mb: 1.5, flexShrink: 0 }}>
                  <Stack direction='row' justifyContent='space-between' alignItems='baseline' sx={{ mb: 0.5 }}>
                    <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
                      {total === 0 ? t('tasks.progress.noTasks') : t('tasks.progress.label', { done, total })}
                    </Typography>
                    {total > 0 && (
                      <Typography
                        level='body-xs'
                        sx={{ color: pct === 100 ? 'success.plainColor' : 'text.tertiary', fontWeight: pct === 100 ? 600 : 400 }}
                      >
                        {pct}%
                      </Typography>
                    )}
                  </Stack>
                  <LinearProgress
                    determinate
                    value={pct}
                    color='primary'
                    size='sm'
                    sx={{
                      borderRadius: 'sm',
                      '--LinearProgress-thickness': '5px',
                      bgcolor: 'background.level2'
                    }}
                  />
                </Box>
              )
            })()}
            {/* ────────────────────────────────────────────────────────────── */}

            {/* ── List chips row ──────────────────────────────────────────── */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                flexWrap: 'nowrap',
                overflowX: 'auto',
                mb: 1,
                pb: 0.5,
                flexShrink: 0,
                // hide scrollbar but keep functionality
                '&::-webkit-scrollbar': { display: 'none' },
                scrollbarWidth: 'none'
              }}
            >
              {/* "All" chip */}
              <Chip
                size='sm'
                variant='plain'
                color='neutral'
                onClick={() => handleSelectList('all')}
                sx={{ cursor: 'pointer', flexShrink: 0, ...(activeList === 'all' ? activeChipSx : inactiveChipSx) }}
              >
                {t('tasks.lists.all')}
              </Chip>

              {/* User-created list chips */}
              {lists.map((list) => (
                <Chip
                  key={list.id}
                  size='sm'
                  variant='plain'
                  color='neutral'
                  onClick={() => handleSelectList(list.id)}
                  endDecorator={
                    <ChipDelete onDelete={(e) => handleDeleteList(e, list.id)} sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }} />
                  }
                  sx={{
                    cursor: 'pointer',
                    flexShrink: 0,
                    ...(activeList === list.id ? activeChipSx : inactiveChipSx)
                  }}
                >
                  {list.label}
                </Chip>
              ))}

              {/* Inline new-list input or + button */}
              {addingList ? (
                <Input
                  size='sm'
                  placeholder={t('tasks.lists.listPlaceholder')}
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirmAddList()
                    if (e.key === 'Escape') handleCancelAddList()
                  }}
                  onBlur={handleConfirmAddList}
                  slotProps={{ input: { ref: newListInputRef } }}
                  sx={{ width: 110, flexShrink: 0, '--Input-minHeight': '24px', py: 0 }}
                />
              ) : (
                <Tooltip title={t('tasks.lists.addList')} size='sm'>
                  <IconButton
                    size='sm'
                    variant='plain'
                    color='neutral'
                    onClick={handleStartAddList}
                    sx={{ flexShrink: 0, '--IconButton-size': '24px', opacity: 0.6, '&:hover': { opacity: 1 } }}
                  >
                    <AddRoundedIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
            {/* ────────────────────────────────────────────────────────────── */}

            {/* Search / Add Input */}
            <Box sx={{ position: 'relative', mb: 1 }}>
              <Input
                size='sm'
                placeholder={
                  activeList === 'all'
                    ? t('tasks.searchPlaceholder')
                    : t('tasks.addToListPlaceholder', { list: getCategoryLabel(activeList) })
                }
                startDecorator={<SearchRoundedIcon />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                slotProps={{ input: { ref: searchInputRef } }}
                sx={{ width: '100%' }}
              />
              {search.trim() && !isExactTitleMatch(search) && (
                <Tooltip title={t('tasks.addTooltip', { title: search })}>
                  <IconButton
                    onClick={() => addTask(search)}
                    size='sm'
                    color='primary'
                    variant='soft'
                    sx={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)' }}
                  >
                    <AddRoundedIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Box>

            {/* Task List */}
            <Box
              sx={{
                flex: 1,
                overflowY: 'auto',
                '&::-webkit-scrollbar': { width: 4 },
                '&::-webkit-scrollbar-thumb': { bgcolor: 'neutral.outlinedBorder', borderRadius: 2 },
                '&::-webkit-scrollbar-track': { bgcolor: 'transparent' }
              }}
            >
              {tasks.length === 0 ? (
                /* ── Fully empty ── */
                <Box sx={{ py: 4, px: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, textAlign: 'center' }}>
                  <FormatListBulletedIcon sx={{ fontSize: 32, color: 'text.secondary' }} />
                  <Box>
                    <Typography level='title-sm' sx={{ mb: 0.5 }}>
                      {t('tasks.emptyTitle')}
                    </Typography>
                    <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
                      {t('tasks.emptySubtitle')}
                    </Typography>
                  </Box>
                </Box>
              ) : filteredTasks.length === 0 ? (
                /* ── No match ── */
                <Box sx={{ py: 3, px: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, textAlign: 'center' }}>
                  <FormatListBulletedIcon sx={{ fontSize: 24, color: 'text.secondary', opacity: 0.6 }} />
                  <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                    {t('tasks.noMatchTitle')}
                  </Typography>
                </Box>
              ) : activeList === 'all' ? (
                /* ── Grouped by category ── */
                <Stack spacing={0}>
                  {getGroupedTasks().map((group, gi) => (
                    <Box key={group.id}>
                      {gi > 0 && <Divider sx={{ my: 1 }} />}
                      <Typography
                        level='body-xs'
                        sx={{
                          px: 0.5,
                          pb: 0.5,
                          color: 'text.tertiary',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em'
                        }}
                      >
                        {group.label}
                      </Typography>
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={group.tasks.map((t) => t._id || t.id)} strategy={verticalListSortingStrategy}>
                          <Stack spacing={0.5}>
                            {group.tasks.map((task) => (
                              <SortableTask
                                key={task._id || task.id}
                                task={task}
                                onToggle={() => toggleTask(task)}
                                onDelete={() => removeTask(task._id || task.id)}
                                onUpdate={updateTask}
                              />
                            ))}
                          </Stack>
                        </SortableContext>
                      </DndContext>
                    </Box>
                  ))}
                </Stack>
              ) : (
                /* ── Single list flat view ── */
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={filteredTasks.map((t) => t._id || t.id)} strategy={verticalListSortingStrategy}>
                    <Stack spacing={0.5}>
                      {filteredTasks.map((task) => (
                        <SortableTask
                          key={task._id || task.id}
                          task={task}
                          onToggle={() => toggleTask(task)}
                          onDelete={() => removeTask(task._id || task.id)}
                          onUpdate={updateTask}
                        />
                      ))}
                    </Stack>
                  </SortableContext>
                </DndContext>
              )}
            </Box>
          </TabPanel>
        )}
      </Tabs>
    </Sheet>
  )
}

export default SideMenu

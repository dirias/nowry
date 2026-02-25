import * as React from 'react'
import { useTranslation } from 'react-i18next'
import {
  Sheet,
  Typography,
  Stack,
  Box,
  Input,
  IconButton,
  Tooltip,
  CircularProgress,
  Chip,
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
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import SortableTask from '../../Task/SortableTask'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { tasksService, annualPlanningService } from '../../../api/services'

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
  const [tasks, setTasks] = React.useState([])
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('pending')
  const [loading, setLoading] = React.useState(true)
  const [routine, setRoutine] = React.useState(null)

  // ── Task lists state ──────────────────────────────────────────────────────
  const [lists, setLists] = React.useState(loadLists)
  const [activeList, setActiveList] = React.useState(loadActiveList)
  const [addingList, setAddingList] = React.useState(false)
  const [newListName, setNewListName] = React.useState('')
  const newListInputRef = React.useRef(null)
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

  // Load data on mount
  React.useEffect(() => {
    loadData()
  }, [])

  // Focus new list input when shown
  React.useEffect(() => {
    if (addingList && newListInputRef.current) {
      newListInputRef.current.focus()
    }
  }, [addingList])

  const loadData = async () => {
    try {
      setLoading(true)
      const [tasksData, routineData] = await Promise.all([tasksService.getAll(), annualPlanningService.getDailyRoutine()])
      setTasks(tasksData)
      setRoutine(routineData)
    } catch (error) {
      console.error('Error loading data:', error)
      setLoading(false)
    } finally {
      setLoading(false)
    }
  }

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
      setSearch('')
    } catch (error) {
      console.error('Error adding task:', error)
    }
  }

  const removeTask = async (id) => {
    try {
      await tasksService.delete(id)
      setTasks(tasks.filter((t) => (t._id || t.id) !== id))
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  const toggleTask = async (task) => {
    try {
      const updated = await tasksService.toggleComplete(task._id || task.id, task.is_completed)
      setTasks(tasks.map((t) => ((t._id || t.id) === (updated._id || updated.id) ? updated : t)))
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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && search.trim() && filteredTasks.length === 0) {
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

  const renderRoutineList = (items, period) => {
    if (!items || items.length === 0) {
      return (
        <Box
          sx={{
            py: 6,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <Typography level='body-sm' sx={{ color: 'text.tertiary', textAlign: 'center' }}>
            {t(`annualPlanning.dailyRoutine.${period}Empty`, 'No routine items set')}
          </Typography>
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
        {items.map((item, index) => (
          <Box
            key={index}
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
              '&:hover': { bgcolor: 'background.level1' }
            }}
          >
            {/* Custom checkbox per DESIGN_GUIDELINES §5 */}
            <Box
              sx={{
                width: 16,
                height: 16,
                border: '1.5px solid',
                borderColor: 'neutral.outlinedBorder',
                borderRadius: '4px',
                flexShrink: 0,
                cursor: 'default'
              }}
            />
            <Typography level='body-sm' sx={{ color: 'text.primary', flex: 1, userSelect: 'none' }}>
              {item.title}
            </Typography>
          </Box>
        ))}
      </Stack>
    )
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
              <IconButton component={RouterLink} to='/annual-planning/daily-routine' size='sm' variant='plain' color='neutral'>
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
              <IconButton component={RouterLink} to='/annual-planning/daily-routine' size='sm' variant='plain' color='neutral'>
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
              <IconButton component={RouterLink} to='/annual-planning/daily-routine' size='sm' variant='plain' color='neutral'>
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
              <Typography level='title-md' startDecorator={<FormatListBulletedIcon sx={{ fontSize: 18, color: 'primary.500' }} />}>
                {t('tasks.title')}
              </Typography>
              <Stack direction='row' spacing={0.5}>
                {['all', 'pending', 'completed'].map((f) => (
                  <Chip
                    key={f}
                    size='sm'
                    variant={statusFilter === f ? 'solid' : 'plain'}
                    color={statusFilter === f ? 'primary' : 'neutral'}
                    onClick={() => setStatusFilter(f)}
                    sx={{ cursor: 'pointer', fontSize: '0.7rem', px: 1 }}
                  >
                    {t(`tasks.filter.${f}`)}
                  </Chip>
                ))}
              </Stack>
            </Stack>

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
                variant={activeList === 'all' ? 'solid' : 'outlined'}
                color={activeList === 'all' ? 'primary' : 'neutral'}
                onClick={() => handleSelectList('all')}
                sx={{ cursor: 'pointer', flexShrink: 0, fontSize: '0.72rem' }}
              >
                {t('tasks.lists.all')}
              </Chip>

              {/* User-created list chips */}
              {lists.map((list) => (
                <Chip
                  key={list.id}
                  size='sm'
                  variant={activeList === list.id ? 'solid' : 'outlined'}
                  color={activeList === list.id ? 'primary' : 'neutral'}
                  onClick={() => handleSelectList(list.id)}
                  endDecorator={
                    <Box
                      component='span'
                      onClick={(e) => handleDeleteList(e, list.id)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        opacity: 0.5,
                        '&:hover': { opacity: 1 },
                        ml: 0.25
                      }}
                    >
                      <CloseRoundedIcon sx={{ fontSize: 12 }} />
                    </Box>
                  }
                  sx={{ cursor: 'pointer', flexShrink: 0, fontSize: '0.72rem' }}
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
                  sx={{ width: 110, flexShrink: 0, fontSize: '0.72rem', '--Input-minHeight': '24px', py: 0 }}
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
                placeholder={t('tasks.searchPlaceholder')}
                startDecorator={<SearchRoundedIcon />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                sx={{ width: '100%' }}
              />
              {search && filteredTasks.length === 0 && (
                <Tooltip title={t('tasks.addTooltip', { title: search })}>
                  <IconButton
                    onClick={() => addTask(search)}
                    size='sm'
                    color='success'
                    variant='plain'
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
                maxHeight: 240,
                overflowY: 'auto',
                '&::-webkit-scrollbar': { width: 4 },
                '&::-webkit-scrollbar-thumb': { bgcolor: 'neutral.outlinedBorder', borderRadius: 2 },
                '&::-webkit-scrollbar-track': { bgcolor: 'transparent' }
              }}
            >
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={filteredTasks.map((t) => t._id || t.id)} strategy={verticalListSortingStrategy}>
                  <Stack spacing={1}>
                    {filteredTasks.length > 0 ? (
                      filteredTasks.map((task) => (
                        <SortableTask
                          key={task._id || task.id}
                          task={task}
                          onToggle={() => toggleTask(task)}
                          onDelete={() => removeTask(task._id || task.id)}
                          onUpdate={updateTask}
                        />
                      ))
                    ) : (
                      <Box sx={{ textAlign: 'center', color: 'text.tertiary', py: 3 }}>
                        <Typography level='body-sm'>
                          {tasks.length === 0 ||
                          (activeList !== 'all' &&
                            filteredTasks.length === 0 &&
                            tasks.filter((t) => t.category === activeList).length === 0)
                            ? t('tasks.empty')
                            : t('tasks.noMatch')}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </SortableContext>
              </DndContext>
            </Box>
          </TabPanel>
        )}
      </Tabs>
    </Sheet>
  )
}

export default SideMenu

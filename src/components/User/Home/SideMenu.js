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
  Select,
  Option,
  CircularProgress,
  Button,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  List,
  ListItem,
  Checkbox,
  Link as JoyLink
} from '@mui/joy'
import { Link as RouterLink } from 'react-router-dom'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import FilterAltRoundedIcon from '@mui/icons-material/FilterAltRounded'
import WbSunnyIcon from '@mui/icons-material/WbSunny'
import WbTwilightIcon from '@mui/icons-material/WbTwilight'
import NightsStayIcon from '@mui/icons-material/NightsStay'
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted'
import SortableTask from '../../Task/SortableTask'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { tasksService, annualPlanningService } from '../../../api/services'

const SideMenu = () => {
  const { t } = useTranslation()
  const [tasks, setTasks] = React.useState([])
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [loading, setLoading] = React.useState(true)
  const [routine, setRoutine] = React.useState(null)
  const [activeTab, setActiveTab] = React.useState('tasks')

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor))

  // Load data on mount
  React.useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [tasksData, routineData] = await Promise.all([tasksService.getAll(), annualPlanningService.getDailyRoutine()])
      setTasks(tasksData)
      setRoutine(routineData)
    } catch (error) {
      console.error('Error loading data:', error)
      // Ensure we stop loading even on error
      setLoading(false)
    } finally {
      setLoading(false)
    }
  }

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
        category: 'general'
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
    return matchesSearch && matchesStatus
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
            py: 8,
            px: 2,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            bgcolor: 'background.level1',
            borderRadius: 'sm',
            mt: 2
          }}
        >
          <Typography level='body-sm' sx={{ color: 'text.secondary', textAlign: 'center' }}>
            {t(`annualPlanning.dailyRoutine.${period}Empty`, 'No routine items set')}
          </Typography>
        </Box>
      )
    }
    return (
      <List sx={{ '--ListItem-paddingY': '0.5rem', maxHeight: 400, overflowY: 'auto' }}>
        {items.map((item, index) => (
          <ListItem
            key={index}
            sx={{
              bgcolor: 'background.surface',
              border: '1px solid',
              borderColor: 'neutral.outlinedBorder',
              borderRadius: 'sm',
              mb: 1,
              boxShadow: 'sm',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: 1.5
            }}
          >
            <Checkbox variant='outlined' color='neutral' sx={{ bgcolor: 'transparent' }} />
            <Typography level='body-sm' sx={{ color: 'text.primary', flex: 1 }}>
              {item.title}
            </Typography>
          </ListItem>
        ))}
      </List>
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
        minHeight: 500, // Ensure valuable height matching the NewsCarousel usually
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Tabs
        aria-label='Routine and Tasks'
        value={activeTab}
        onChange={(e, val) => setActiveTab(val)}
        sx={{ bgcolor: 'transparent', height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        <TabList
          disableUnderline
          sx={{
            p: 0.5,
            gap: 0.5,
            borderRadius: 'xl',
            bgcolor: 'background.level1',
            mb: 2
          }}
        >
          <Tab
            disableIndicator
            value='morning'
            variant={activeTab === 'morning' ? 'solid' : 'plain'}
            color={activeTab === 'morning' ? 'primary' : 'neutral'}
            sx={{ borderRadius: 'lg', flex: 1 }}
          >
            <Tooltip title='Morning Routine' size='sm'>
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
            <Tooltip title='Afternoon Routine' size='sm'>
              <WbTwilightIcon />
            </Tooltip>
          </Tab>
          <Tab
            disableIndicator
            value='evening' // Mapping 'night' to 'evening' data key
            variant={activeTab === 'evening' ? 'solid' : 'plain'}
            color={activeTab === 'evening' ? 'primary' : 'neutral'}
            sx={{ borderRadius: 'lg', flex: 1 }}
          >
            <Tooltip title='Night Routine' size='sm'>
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
            <Tooltip title='Tasks' size='sm'>
              <FormatListBulletedIcon />
            </Tooltip>
          </Tab>
        </TabList>

        {/* Tab Panels */}
        {/* Note: TabPanel by default in Joy might not fill height, we use Box to ensure correct scrolling if needed */}

        {/* Morning */}
        <TabPanel value='morning' sx={{ p: 0, flex: 1, overflowY: 'hidden' }}>
          <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 2 }}>
            <Typography level='title-md' startDecorator={<WbSunnyIcon color='primary' />}>
              Morning Routine
            </Typography>
            <IconButton component={RouterLink} to='/annual-planning/daily-routine' size='sm' variant='plain' color='neutral'>
              <EditRoundedIcon />
            </IconButton>
          </Stack>
          {renderRoutineList(getRoutineItems('morning'), 'morning')}
        </TabPanel>

        {/* Afternoon */}
        <TabPanel value='afternoon' sx={{ p: 0, flex: 1, overflowY: 'hidden' }}>
          <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 2 }}>
            <Typography level='title-md' startDecorator={<WbTwilightIcon color='primary' />}>
              Afternoon Routine
            </Typography>
            <IconButton component={RouterLink} to='/annual-planning/daily-routine' size='sm' variant='plain' color='neutral'>
              <EditRoundedIcon />
            </IconButton>
          </Stack>
          {renderRoutineList(getRoutineItems('afternoon'), 'afternoon')}
        </TabPanel>

        {/* Evening */}
        <TabPanel value='evening' sx={{ p: 0, flex: 1, overflowY: 'hidden' }}>
          <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 2 }}>
            <Typography level='title-md' startDecorator={<NightsStayIcon color='primary' />}>
              Night Routine
            </Typography>
            <IconButton component={RouterLink} to='/annual-planning/daily-routine' size='sm' variant='plain' color='neutral'>
              <EditRoundedIcon />
            </IconButton>
          </Stack>
          {renderRoutineList(getRoutineItems('evening'), 'evening')}
        </TabPanel>

        {/* Tasks */}
        <TabPanel value='tasks' sx={{ p: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Header & Filter */}
          <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ mb: 1 }}>
            <Typography level='title-md' color='primary'>
              {t('tasks.title')}
            </Typography>

            <Select
              size='sm'
              variant='soft'
              value={statusFilter}
              onChange={(_, val) => setStatusFilter(val)}
              startDecorator={<FilterAltRoundedIcon fontSize='sm' />}
              sx={{ width: 130 }}
            >
              <Option value='all'>{t('tasks.filter.all')}</Option>
              <Option value='completed'>{t('tasks.filter.completed')}</Option>
              <Option value='pending'>{t('tasks.filter.pending')}</Option>
            </Select>
          </Stack>

          {/* Search / Add Input */}
          <Box sx={{ position: 'relative', mt: 1, mb: 1 }}>
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
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
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
                      <Typography level='body-sm'>{tasks.length === 0 ? t('tasks.empty') : t('tasks.noMatch')}</Typography>
                    </Box>
                  )}
                </Stack>
              </SortableContext>
            </DndContext>
          </Box>
        </TabPanel>
      </Tabs>
    </Sheet>
  )
}

export default SideMenu

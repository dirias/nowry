import * as React from 'react'
import { Sheet, Typography, Stack, Box, Input, IconButton, Tooltip, Select, Option, CircularProgress } from '@mui/joy'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import FilterAltRoundedIcon from '@mui/icons-material/FilterAltRounded'
import SortableTask from '../../Task/SortableTask'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { tasksService } from '../../../api/services'

const SideMenu = () => {
  const [tasks, setTasks] = React.useState([])
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [loading, setLoading] = React.useState(true)

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor))

  // Load tasks on mount
  React.useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      setLoading(true)
      const data = await tasksService.getAll()
      setTasks(data)
      setLoading(false)
    } catch (error) {
      console.error('Error loading tasks:', error)
      setLoading(false)
    }
  }

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
      // Note: You could also persist the new order to the backend here if needed
    }
  }

  if (loading) {
    return (
      <Sheet
        variant='outlined'
        sx={{
          backgroundColor: 'background.body',
          borderRadius: 'md',
          p: 2,
          boxShadow: 'sm',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 300
        }}
      >
        <CircularProgress />
      </Sheet>
    )
  }

  return (
    <Sheet
      variant='outlined'
      sx={{
        backgroundColor: 'background.body',
        borderRadius: 'md',
        p: 2,
        boxShadow: 'sm'
      }}
    >
      {/* Header */}
      <Stack direction='row' alignItems='center' justifyContent='space-between'>
        <Typography level='title-md' color='primary'>
          Tasks
        </Typography>

        <Select
          size='sm'
          variant='soft'
          value={statusFilter}
          onChange={(_, val) => setStatusFilter(val)}
          startDecorator={<FilterAltRoundedIcon fontSize='sm' />}
          sx={{ width: 130 }}
        >
          <Option value='all'>All</Option>
          <Option value='completed'>Completed</Option>
          <Option value='pending'>Pending</Option>
        </Select>
      </Stack>

      {/* Search / Add Input */}
      <Box sx={{ position: 'relative', mt: 1, mb: 1 }}>
        <Input
          size='sm'
          placeholder='Search or add tasks...'
          startDecorator={<SearchRoundedIcon />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          sx={{ width: '100%' }}
        />
        {search && filteredTasks.length === 0 && (
          <Tooltip title={`Add "${search}"`}>
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
                  {tasks.length === 0 ? 'No tasks yet. Type to add one!' : 'No tasks match your filters'}
                </Typography>
              </Box>
            )}
          </Stack>
        </SortableContext>
      </DndContext>
    </Sheet>
  )
}

export default SideMenu

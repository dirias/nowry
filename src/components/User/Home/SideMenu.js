import * as React from 'react'
import { Sheet, Typography, Stack, Box, Input, IconButton, Tooltip, Select, Option } from '@mui/joy'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import FilterAltRoundedIcon from '@mui/icons-material/FilterAltRounded'
import { v4 as uuidv4 } from 'uuid'
import SortableTask from '../../Task/SortableTask'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

const SideMenu = () => {
  const [tasks, setTasks] = React.useState([])
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('all')

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor))

  const addTask = (title) => {
    const now = new Date().toISOString()
    const task = {
      id: uuidv4(),
      user_id: uuidv4(),
      title: title.trim(),
      description: '',
      is_completed: false,
      priority: 'medium',
      deadline: null,
      created_at: now,
      updated_at: now,
      tags: [],
      position: tasks.length + 1,
      repeat_interval: null
    }
    setTasks([...tasks, task])
    setSearch('')
  }

  const removeTask = (id) => setTasks(tasks.filter((t) => t.id !== id))

  const toggleTask = (id) => setTasks(tasks.map((t) => (t.id === id ? { ...t, is_completed: !t.is_completed } : t)))

  const updateTask = (updatedTask) => {
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)))
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
      const oldIndex = tasks.findIndex((t) => t.id === active.id)
      const newIndex = tasks.findIndex((t) => t.id === over.id)
      const newTasks = arrayMove(tasks, oldIndex, newIndex).map((t, i) => ({
        ...t,
        position: i + 1
      }))
      setTasks(newTasks)
    }
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
        <SortableContext items={filteredTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <Stack spacing={1}>
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => (
                <SortableTask
                  key={task.id}
                  task={task}
                  onToggle={() => toggleTask(task.id)}
                  onDelete={() => removeTask(task.id)}
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

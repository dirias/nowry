import * as React from 'react'
import { Sheet, Typography, Checkbox, Stack, Box } from '@mui/joy'

const initialTasks = [
  { text: 'Refactor header with Joy UI', completed: true },
  { text: 'Improve horizontal scroll cards', completed: true },
  { text: 'Implement responsive SideMenu', completed: false },
  { text: 'Add drag-to-scroll support', completed: false },
  { text: 'Create dark/light theme toggle', completed: false }
]

const SideMenu = () => {
  const [tasks, setTasks] = React.useState(initialTasks)

  const toggleTask = (index) => {
    const updated = [...tasks]
    updated[index].completed = !updated[index].completed
    setTasks(updated)
  }

  return (
    <Sheet
      variant='outlined'
      sx={{
        backgroundColor: 'background.body',
        borderRadius: 'md',
        p: 3,
        boxShadow: 'sm'
      }}
    >
      <Typography level='title-md' sx={{ mb: 2, color: 'primary.500' }}>
        Your Tasks
      </Typography>

      <Stack spacing={1.5}>
        {tasks.map((task, index) => (
          <Box
            key={index}
            sx={{
              backgroundColor: task.completed ? 'neutral.softBg' : 'transparent',
              borderRadius: 'sm',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1,
              py: 1,
              '&:hover': {
                backgroundColor: 'neutral.plainHoverBg'
              }
            }}
          >
            <Checkbox size='sm' checked={task.completed} onChange={() => toggleTask(index)} variant='soft' color='success' />
            <Typography
              level='body-sm'
              sx={{
                textDecoration: task.completed ? 'line-through' : 'none',
                color: task.completed ? 'text.tertiary' : 'text.primary'
              }}
            >
              {task.text}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Sheet>
  )
}

export default SideMenu

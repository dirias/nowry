import * as React from 'react'
import { Box, Checkbox, Typography, IconButton, Tooltip, Input } from '@mui/joy'
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded'
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded'

const Task = ({ task, onToggle, onDelete, onUpdate }) => {
  const [editingDeadline, setEditingDeadline] = React.useState(false)
  const [tempDeadline, setTempDeadline] = React.useState(task.deadline ? task.deadline.split('T')[0] : '')

  // keep synced with parent
  React.useEffect(() => {
    setTempDeadline(task.deadline ? task.deadline.split('T')[0] : '')
  }, [task.deadline])

  const priorityColor = task.priority === 'high' ? 'danger.400' : task.priority === 'medium' ? 'warning.500' : 'success.500'

  const handleDeadlineSave = () => {
    setEditingDeadline(false)
    onUpdate?.({
      ...task,
      deadline: tempDeadline ? new Date(tempDeadline).toISOString() : null,
      updated_at: new Date().toISOString()
    })
  }

  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && !task.is_completed

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 1,
        py: 0.6,
        borderRadius: 'sm',
        backgroundColor: task.is_completed ? 'neutral.softBg' : 'transparent',
        '&:hover': { backgroundColor: 'neutral.plainHoverBg' },
        '&:hover .hover-only': { opacity: 1, transform: 'translateX(0)' },
        transition: 'background 0.2s'
      }}
    >
      {/* Left side */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Checkbox size='sm' checked={task.is_completed} onChange={onToggle} color='success' variant='soft' />
        <Typography
          level='body-sm'
          sx={{
            textDecoration: task.is_completed ? 'line-through' : 'none',
            color: task.is_completed ? 'text.tertiary' : 'text.primary'
          }}
        >
          {task.title}
        </Typography>
      </Box>

      {/* Right side */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {/* Deadline (always visible if set) */}
        {editingDeadline ? (
          <Input
            size='sm'
            type='date'
            value={tempDeadline}
            onChange={(e) => setTempDeadline(e.target.value)}
            onBlur={handleDeadlineSave}
            onKeyDown={(e) => e.key === 'Enter' && handleDeadlineSave()}
            autoFocus
            sx={{ width: 130 }}
          />
        ) : (
          <Tooltip title={task.deadline ? 'Edit deadline' : 'Add deadline'}>
            <Box
              onClick={() => setEditingDeadline(true)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                cursor: 'pointer',
                color: isOverdue ? 'danger.400' : 'neutral.400',
                '&:hover': { color: isOverdue ? 'danger.300' : 'neutral.100' }
              }}
            >
              <AccessTimeRoundedIcon fontSize='sm' />
              {task.deadline && (
                <Typography level='body-xs' sx={{ color: isOverdue ? 'danger.400' : 'neutral' }}>
                  {new Date(task.deadline).toLocaleDateString()}
                </Typography>
              )}
            </Box>
          </Tooltip>
        )}

        {/* Priority dot */}
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: priorityColor
          }}
        />

        {/* Delete (hover-only) */}
        <Tooltip title='Delete'>
          <IconButton
            className='hover-only'
            size='sm'
            color='danger'
            variant='plain'
            onClick={onDelete}
            sx={{
              ml: 0.5,
              opacity: 0,
              transform: 'translateX(4px)',
              transition: 'all 0.2s ease'
            }}
          >
            <DeleteRoundedIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  )
}

export default Task

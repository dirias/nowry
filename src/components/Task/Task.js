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
    // Save as plain YYYY-MM-DD — avoid toISOString() which converts to UTC
    // and shifts the date back in negative-offset timezones (e.g. CST = UTC-6)
    onUpdate?.({
      ...task,
      deadline: tempDeadline || null,
      updated_at: new Date().toISOString()
    })
  }

  // Parse deadline as local time: date-only strings are UTC in JS → wrong day in CST
  const parseDeadlineLocal = (d) => {
    if (!d) return null
    const s = typeof d === 'string' ? d : String(d)
    const match = s.match(/^(\d{4}-\d{2}-\d{2})/)
    return match ? new Date(`${match[1]}T00:00:00`) : new Date(s)
  }
  const deadlineDate = parseDeadlineLocal(task.deadline)
  const isOverdue = deadlineDate && deadlineDate < new Date() && !task.is_completed

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
                color: isOverdue ? 'danger.outlinedColor' : 'text.tertiary',
                '&:hover': { color: isOverdue ? 'danger.plainColor' : 'text.secondary' }
              }}
            >
              <AccessTimeRoundedIcon fontSize='sm' />
              {task.deadline && (
                <Typography level='body-xs' sx={{ color: isOverdue ? 'danger.plainColor' : 'text.tertiary' }}>
                  {deadlineDate ? deadlineDate.toLocaleDateString() : ''}
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

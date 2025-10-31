import * as React from 'react'
import { Box, IconButton } from '@mui/joy'
import DragIndicatorRoundedIcon from '@mui/icons-material/DragIndicatorRounded'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Task from './Task'

const SortableTask = ({ task, onToggle, onDelete, onUpdate }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: task.id
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5
      }}
      {...attributes}
    >
      {/* Drag handle */}
      <IconButton
        {...listeners}
        size='sm'
        variant='plain'
        color='neutral'
        sx={{
          cursor: 'grab',
          opacity: 0.4,
          '&:hover': { opacity: 1 },
          '&:active': { cursor: 'grabbing' },
          flexShrink: 0
        }}
      >
        <DragIndicatorRoundedIcon fontSize='small' />
      </IconButton>

      {/* Task content */}
      <Box sx={{ flex: 1 }}>
        <Task task={task} onToggle={onToggle} onDelete={onDelete} onUpdate={onUpdate} />
      </Box>
    </Box>
  )
}

export default SortableTask

import React, { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { Box, Typography, Chip, IconButton, Tooltip } from '@mui/joy'
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import FlagRoundedIcon from '@mui/icons-material/FlagRounded'
import TrackChangesRoundedIcon from '@mui/icons-material/TrackChangesRounded'
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded'

const TYPE_CONFIG = {
  goal: {
    icon: TrackChangesRoundedIcon,
    color: '#10b981',
    bg: '#d1fae5',
    label: 'Goal'
  },
  priority: {
    icon: FlagRoundedIcon,
    color: '#f59e0b',
    bg: '#fef3c7',
    label: 'Priority'
  },
  task: {
    icon: TaskAltRoundedIcon,
    color: '#6366f1',
    bg: '#ede9fe',
    label: 'Task'
  }
}

const EntityNode = memo(({ data, selected }) => {
  const config = TYPE_CONFIG[data.entityType] || TYPE_CONFIG.goal
  const Icon = config.icon

  return (
    <Box
      sx={{
        width: 200,
        bgcolor: config.bg,
        border: `2px solid ${selected ? config.color : config.color + '66'}`,
        borderRadius: 'md',
        p: 1.5,
        boxShadow: selected ? `0 8px 24px ${config.color}44` : '0 3px 12px rgba(0,0,0,0.1)',
        transition: 'box-shadow 0.2s, border-color 0.2s',
        cursor: 'default'
      }}
    >
      <Handle type='target' position={Position.Top} style={{ opacity: 0, width: 8, height: 8 }} />
      <Handle type='source' position={Position.Bottom} style={{ opacity: 0, width: 8, height: 8 }} />

      {/* Type chip */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
        <Icon sx={{ fontSize: 14, color: config.color }} />
        <Chip
          size='sm'
          sx={{
            bgcolor: config.color + '22',
            color: config.color,
            fontWeight: 700,
            fontSize: '0.6rem',
            height: 18,
            px: 0.75
          }}
        >
          {config.label}
        </Chip>
        <Box sx={{ ml: 'auto', display: 'flex', gap: 0.25 }}>
          {data.onNavigate && (
            <Tooltip title='Open' size='sm'>
              <IconButton
                size='sm'
                variant='plain'
                sx={{ '--IconButton-size': '20px', color: config.color, opacity: 0.7, '&:hover': { opacity: 1 } }}
                onClick={(e) => {
                  e.stopPropagation()
                  data.onNavigate()
                }}
              >
                <OpenInNewRoundedIcon sx={{ fontSize: 12 }} />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title='Remove' size='sm'>
            <IconButton
              size='sm'
              variant='plain'
              sx={{ '--IconButton-size': '20px', color: '#ef4444', opacity: 0.6, '&:hover': { opacity: 1 } }}
              onClick={(e) => {
                e.stopPropagation()
                data.onDelete?.()
              }}
            >
              <DeleteRoundedIcon sx={{ fontSize: 12 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Title */}
      <Typography
        level='body-sm'
        sx={{
          fontWeight: 600,
          color: config.color,
          lineHeight: 1.3,
          wordBreak: 'break-word',
          fontSize: '0.78rem'
        }}
      >
        {data.title || 'Untitled'}
      </Typography>

      {/* Status badge */}
      {data.status && (
        <Box
          sx={{
            mt: 0.75,
            display: 'inline-flex',
            alignItems: 'center',
            px: 0.75,
            py: 0.25,
            borderRadius: 'sm',
            bgcolor: 'rgba(0,0,0,0.07)'
          }}
        >
          <Typography level='body-xs' sx={{ fontSize: '0.6rem', color: config.color, opacity: 0.8, textTransform: 'capitalize' }}>
            {data.status?.replace('_', ' ')}
          </Typography>
        </Box>
      )}

      {/* Area name */}
      {data.areaName && (
        <Typography level='body-xs' sx={{ mt: 0.5, fontSize: '0.6rem', color: config.color, opacity: 0.6 }}>
          {data.areaName}
        </Typography>
      )}
    </Box>
  )
})

EntityNode.displayName = 'EntityNode'
export default EntityNode

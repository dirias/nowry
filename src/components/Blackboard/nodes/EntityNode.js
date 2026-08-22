import React, { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { Box, Typography, Chip, IconButton, Tooltip } from '@mui/joy'
import { useTheme, useColorScheme } from '@mui/joy/styles'
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded'
import FlagRoundedIcon from '@mui/icons-material/FlagRounded'
import TrackChangesRoundedIcon from '@mui/icons-material/TrackChangesRounded'
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded'

// Maps each entity type to the theme palette family that represents it —
// matches the convention already established in BlackboardToolbar.js:
// success = Goal, warning = Priority, primary = Task.
const TYPE_CONFIG = {
  goal: {
    icon: TrackChangesRoundedIcon,
    family: 'success',
    label: 'Goal'
  },
  priority: {
    icon: FlagRoundedIcon,
    family: 'warning',
    label: 'Priority'
  },
  task: {
    icon: TaskAltRoundedIcon,
    family: 'primary',
    label: 'Task'
  }
}

const EntityNode = memo(({ data, selected }) => {
  const theme = useTheme()
  const { mode } = useColorScheme()
  const isDark = mode === 'dark'

  const config = TYPE_CONFIG[data.entityType] || TYPE_CONFIG.goal
  const Icon = config.icon
  // CSS-var backed values — safe to use directly, react to theme/mode changes.
  const palette = theme.vars.palette[config.family]
  // Literal (non-var) hex for the active mode — needed for alpha-suffix
  // concatenation (`${hex}66`), since `var(--x)66` is not valid CSS.
  const literal = theme.colorSchemes[isDark ? 'dark' : 'light'].palette[config.family]

  return (
    <Box
      sx={{
        width: 200,
        bgcolor: palette.softBg,
        border: `2px solid ${selected ? literal.plainColor : literal.plainColor + '66'}`,
        borderRadius: 'md',
        p: 1.5,
        boxShadow: selected ? `0 8px 24px ${literal.plainColor}44` : theme.vars.shadow.sm,
        transition: 'box-shadow 0.2s, border-color 0.2s',
        cursor: 'default'
      }}
    >
      <Handle type='target' position={Position.Top} style={{ opacity: 0, width: 8, height: 8 }} />
      <Handle type='source' position={Position.Bottom} style={{ opacity: 0, width: 8, height: 8 }} />

      {/*
        Type sizing note — read before reintroducing a sub-12px fontSize here.

        These are @xyflow/react nodes on a zoomable canvas, so the tempting
        argument is that canvas text scales with zoom and a 0.6rem value is not
        really 9.6px to the user. That argument does not hold for this board:
        BlackboardModal mounts ReactFlow with `defaultViewport` initialised to
        `{ x: 0, y: 0, zoom: 1 }` and no `fitView`, so the canvas opens at 1:1
        and 0.6rem was a literal 9.6px on screen until the user manually zoomed.

        The overrides are therefore gone and these render at the theme floor
        (body-xs = 12px). If the board ever gains a fitView or a default zoom
        above 1, this is worth re-deriving — but derive it, do not assume it.

        Note also that `Blackboard/nodes/**` is excluded from the
        no-restricted-syntax lint rule (raw @xyflow `style` objects), so nothing
        will flag a regression here automatically.
      */}
      {/* Type chip */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
        <Icon sx={{ fontSize: 14, color: palette.plainColor }} />
        <Chip
          size='sm'
          sx={{
            bgcolor: literal.plainColor + '22',
            color: palette.plainColor,
            fontWeight: 700,
            px: 0.75
          }}
        >
          {config.label}
        </Chip>
        <Box sx={{ ml: 'auto', display: 'flex', gap: 0.25 }}>
          <Tooltip title='Remove' size='sm'>
            <IconButton
              size='sm'
              variant='plain'
              sx={{ '--IconButton-size': '20px', color: 'danger.plainColor', opacity: 0.6, '&:hover': { opacity: 1 } }}
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
          color: palette.plainColor,
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
            bgcolor: 'background.level1'
          }}
        >
          <Typography level='body-xs' sx={{ color: palette.plainColor, opacity: 0.8, textTransform: 'capitalize' }}>
            {data.status?.replace('_', ' ')}
          </Typography>
        </Box>
      )}

      {/* Area name */}
      {data.areaName && (
        <Typography level='body-xs' sx={{ mt: 0.5, color: palette.plainColor, opacity: 0.6 }}>
          {data.areaName}
        </Typography>
      )}
    </Box>
  )
})

EntityNode.displayName = 'EntityNode'
export default EntityNode

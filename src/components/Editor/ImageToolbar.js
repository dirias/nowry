import React from 'react'
import { Box, IconButton, Tooltip } from '@mui/joy'
import { AlignLeft, AlignCenter, AlignRight, AlignJustify, Trash2 } from 'lucide-react'

export default function ImageToolbar({ alignment, onAlignmentChange, onDelete }) {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: -50,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        bgcolor: 'background.surface',
        borderRadius: 'sm',
        boxShadow: 'md',
        p: 0.5,
        display: 'flex',
        gap: 0.5,
        animation: 'fadeIn 0.2s ease-in-out',
        '@keyframes fadeIn': {
          from: { opacity: 0, transform: 'translateX(-50%) translateY(10px)' },
          to: { opacity: 1, transform: 'translateX(-50%) translateY(0)' }
        }
      }}
      onMouseDown={(e) => e.preventDefault()} // Prevent losing focus from editor
    >
      <Tooltip title='Align Left' variant='soft'>
        <IconButton
          size='sm'
          variant={alignment === 'left' ? 'solid' : 'plain'}
          color={alignment === 'left' ? 'primary' : 'neutral'}
          onClick={() => onAlignmentChange('left')}
        >
          <AlignLeft size={18} />
        </IconButton>
      </Tooltip>

      <Tooltip title='Align Center' variant='soft'>
        <IconButton
          size='sm'
          variant={alignment === 'center' ? 'solid' : 'plain'}
          color={alignment === 'center' ? 'primary' : 'neutral'}
          onClick={() => onAlignmentChange('center')}
        >
          <AlignCenter size={18} />
        </IconButton>
      </Tooltip>

      <Tooltip title='Align Right' variant='soft'>
        <IconButton
          size='sm'
          variant={alignment === 'right' ? 'solid' : 'plain'}
          color={alignment === 'right' ? 'primary' : 'neutral'}
          onClick={() => onAlignmentChange('right')}
        >
          <AlignRight size={18} />
        </IconButton>
      </Tooltip>

      <Tooltip title='Inline' variant='soft'>
        <IconButton
          size='sm'
          variant={alignment === 'inline' ? 'solid' : 'plain'}
          color={alignment === 'inline' ? 'primary' : 'neutral'}
          onClick={() => onAlignmentChange('inline')}
        >
          <AlignJustify size={18} />
        </IconButton>
      </Tooltip>

      <Box sx={{ width: 1, bgcolor: 'divider', mx: 0.5, my: 0.5 }} />

      <Tooltip title='Delete Image' variant='soft' color='danger'>
        <IconButton size='sm' variant='plain' color='danger' onClick={onDelete}>
          <Trash2 size={18} />
        </IconButton>
      </Tooltip>
    </Box>
  )
}

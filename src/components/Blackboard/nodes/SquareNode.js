import React from 'react'
import { Box } from '@mui/joy'

export default function SquareNode({ data, selected }) {
  return (
    <Box
      sx={{
        width: 300,
        height: 300,
        bgcolor: 'background.level1',
        border: '2px solid',
        borderColor: selected ? 'primary.outlinedBorder' : 'divider',
        borderRadius: 'lg',
        position: 'relative',
        transition: 'all 0.2s',
        opacity: 0.5,
        '&:hover': {
          opacity: 0.8
        }
      }}
    />
  )
}

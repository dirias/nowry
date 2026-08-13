import React from 'react'
import { Box } from '@mui/joy'
import { NodeResizer } from '@xyflow/react'

export default function SquareNode({ data, selected }) {
  return (
    <>
      <NodeResizer color='var(--joy-palette-primary-outlinedBorder)' isVisible={selected} minWidth={150} minHeight={150} />
      <Box
        sx={{
          width: '100%',
          height: '100%',
          minWidth: 150,
          minHeight: 150,
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
    </>
  )
}

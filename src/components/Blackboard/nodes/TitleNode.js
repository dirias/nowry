import React from 'react'
import { Handle, Position } from '@xyflow/react'
import { Box } from '@mui/joy'

export default function TitleNode({ data, selected }) {
  const handleChange = (e) => {
    if (data.onChange) {
      data.onChange(e.target.value)
    }
  }

  return (
    <Box
      sx={{
        minWidth: 150,
        position: 'relative',
        '&:hover .react-flow__handle': { opacity: 1 }
      }}
    >
      <Handle
        type='target'
        position={Position.Top}
        className='nodrag'
        style={{
          opacity: selected ? 1 : 0,
          transition: 'opacity 0.2s',
          width: 8,
          height: 8,
          background: 'var(--joy-palette-primary-solidBg)'
        }}
      />

      <textarea
        defaultValue={data.label}
        onChange={handleChange}
        placeholder='Heading...'
        className='nodrag'
        style={{
          width: '100%',
          minHeight: 40,
          background: 'transparent',
          border: selected ? '1px dashed var(--joy-palette-primary-outlinedBorder)' : '1px dashed transparent',
          borderRadius: 8,
          resize: 'both',
          outline: 'none',
          fontFamily: 'inherit',
          fontSize: '1.5rem',
          fontWeight: 700,
          color: 'var(--joy-palette-text-primary)',
          padding: '4px 8px',
          overflow: 'hidden',
          lineHeight: 1.2,
          transition: 'border-color 0.2s'
        }}
        onInput={(e) => {
          e.target.style.height = 'auto'
          e.target.style.height = `${e.target.scrollHeight}px`
        }}
      />

      <Handle
        type='source'
        position={Position.Bottom}
        className='nodrag'
        style={{
          opacity: selected ? 1 : 0,
          transition: 'opacity 0.2s',
          width: 8,
          height: 8,
          background: 'var(--joy-palette-primary-solidBg)'
        }}
      />
    </Box>
  )
}

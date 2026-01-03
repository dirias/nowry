import React from 'react'
import { Box } from '@mui/joy'

const HANDLE_SIZE = 10

export default function ResizeHandles({ width, height, onResize }) {
  const handleMouseDown = (direction, e) => {
    e.preventDefault()
    e.stopPropagation()

    const startX = e.clientX
    const startWidth = width
    const aspectRatio = width / height

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - startX
      let newWidth = startWidth

      if (direction.includes('e')) {
        newWidth = startWidth + deltaX
      } else if (direction.includes('w')) {
        newWidth = startWidth - deltaX
      }

      // Constrain min/max
      newWidth = Math.max(100, Math.min(newWidth, 800))

      const newHeight = Math.round(newWidth / aspectRatio)

      onResize(newWidth, newHeight, false)
    }

    const handleMouseUp = (e) => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)

      // Calculate final dimensions to commit
      const deltaX = e.clientX - startX
      let newWidth = startWidth
      if (direction.includes('e')) {
        newWidth = startWidth + deltaX
      } else if (direction.includes('w')) {
        newWidth = startWidth - deltaX
      }
      newWidth = Math.max(100, Math.min(newWidth, 800))
      const newHeight = Math.round(newWidth / aspectRatio)

      onResize(newWidth, newHeight, true)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  // Styles for handles
  const handleStyle = {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    backgroundColor: 'var(--joy-palette-primary-500)',
    border: '1px solid white',
    borderRadius: '50%',
    zIndex: 10,
    cursor: 'pointer'
  }

  return (
    <>
      {/* Corners */}
      <Box
        sx={{ ...handleStyle, top: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2, cursor: 'nwse-resize' }}
        onMouseDown={(e) => handleMouseDown('nw', e)}
      />
      <Box
        sx={{ ...handleStyle, top: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2, cursor: 'nesw-resize' }}
        onMouseDown={(e) => handleMouseDown('ne', e)}
      />
      <Box
        sx={{ ...handleStyle, bottom: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2, cursor: 'nwse-resize' }}
        onMouseDown={(e) => handleMouseDown('se', e)}
      />
      <Box
        sx={{ ...handleStyle, bottom: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2, cursor: 'nesw-resize' }}
        onMouseDown={(e) => handleMouseDown('sw', e)}
      />
    </>
  )
}

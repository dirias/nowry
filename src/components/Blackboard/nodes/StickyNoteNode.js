import React, { memo, useState, useRef, useCallback } from 'react'
import { Handle, Position } from '@xyflow/react'
import { Box, IconButton, Tooltip } from '@mui/joy'
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'

// 8 colors mapped to Nowry palette — each adapts to dark/light mode
export const STICKY_COLORS = [
  { id: 'yellow', bg: '#fef3c7', border: '#f59e0b', text: '#78350f' },
  { id: 'green', bg: '#d1fae5', border: '#10b981', text: '#064e3b' },
  { id: 'blue', bg: '#dbeafe', border: '#3b82f6', text: '#1e3a8a' },
  { id: 'purple', bg: '#ede9fe', border: '#8b5cf6', text: '#4c1d95' },
  { id: 'pink', bg: '#fce7f3', border: '#ec4899', text: '#831843' },
  { id: 'teal', bg: '#ccfbf1', border: '#14b8a6', text: '#134e4a' },
  { id: 'red', bg: '#fee2e2', border: '#ef4444', text: '#7f1d1d' },
  { id: 'slate', bg: '#f1f5f9', border: '#64748b', text: '#0f172a' }
]

const StickyNoteNode = memo(({ data, selected }) => {
  const [editing, setEditing] = useState(false)
  const [titleVal, setTitleVal] = useState(data.title || '')
  const [bodyVal, setBodyVal] = useState(data.body || '')
  const [showColorPicker, setShowColorPicker] = useState(false)
  const titleRef = useRef(null)

  const color = STICKY_COLORS.find((c) => c.id === data.color) || STICKY_COLORS[0]

  const commitEdit = useCallback(() => {
    setEditing(false)
    setShowColorPicker(false)
    data.onUpdate?.({ title: titleVal, body: bodyVal })
  }, [data, titleVal, bodyVal])

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      commitEdit()
    }
    if (e.key === 'Escape') commitEdit()
  }

  const startEdit = () => {
    setEditing(true)
    setTimeout(() => titleRef.current?.focus(), 50)
  }

  return (
    <Box
      sx={{
        position: 'relative',
        width: 200,
        minHeight: 140,
        bgcolor: color.bg,
        border: `2px solid ${selected ? color.border : color.border + '99'}`,
        borderRadius: '12px 12px 12px 2px',
        boxShadow: selected ? `0 8px 32px ${color.border}44, 0 2px 8px rgba(0,0,0,0.15)` : '0 4px 16px rgba(0,0,0,0.12)',
        p: 1.5,
        transition: 'box-shadow 0.2s, border-color 0.2s',
        cursor: 'grab',
        '&:active': { cursor: 'grabbing' },
        // Dog-ear fold decoration
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: -1,
          right: -1,
          width: 20,
          height: 20,
          background: `linear-gradient(225deg, ${color.border}33 50%, transparent 50%)`,
          borderRadius: '0 0 12px 0'
        }
      }}
    >
      {/* Handles for connections */}
      <Handle type='target' position={Position.Top} style={{ opacity: 0, width: 8, height: 8 }} />
      <Handle type='source' position={Position.Bottom} style={{ opacity: 0, width: 8, height: 8 }} />

      {/* Header row — emoji + color dot */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
        <Box component='span' sx={{ fontSize: '1rem', lineHeight: 1, userSelect: 'none' }}>
          {data.emoji || '📝'}
        </Box>

        {/* Color dot picker */}
        <Box sx={{ position: 'relative', ml: 'auto' }}>
          <Box
            onClick={(e) => {
              e.stopPropagation()
              setShowColorPicker((v) => !v)
            }}
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              bgcolor: color.border,
              cursor: 'pointer',
              border: '1.5px solid rgba(0,0,0,0.15)',
              transition: 'transform 0.15s',
              '&:hover': { transform: 'scale(1.3)' }
            }}
          />
          {showColorPicker && (
            <Box
              sx={{
                position: 'absolute',
                top: 18,
                right: 0,
                zIndex: 10,
                display: 'flex',
                gap: 0.5,
                flexWrap: 'wrap',
                width: 80,
                bgcolor: 'background.surface',
                borderRadius: 'sm',
                boxShadow: 'lg',
                p: 0.75,
                border: '1px solid',
                borderColor: 'divider'
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {STICKY_COLORS.map((c) => (
                <Box
                  key={c.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    data.onUpdate?.({ color: c.id })
                    setShowColorPicker(false)
                  }}
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    bgcolor: c.border,
                    cursor: 'pointer',
                    border: data.color === c.id ? '2px solid #000' : '1px solid rgba(0,0,0,0.1)',
                    transition: 'transform 0.1s',
                    '&:hover': { transform: 'scale(1.25)' }
                  }}
                />
              ))}
            </Box>
          )}
        </Box>
      </Box>

      {/* Title */}
      {editing ? (
        <input
          ref={titleRef}
          value={titleVal}
          onChange={(e) => setTitleVal(e.target.value)}
          onKeyDown={handleTitleKeyDown}
          onBlur={commitEdit}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: color.text,
            marginBottom: 4,
            fontFamily: 'inherit'
          }}
          placeholder='Note title...'
        />
      ) : (
        <Box
          onDoubleClick={startEdit}
          sx={{
            fontSize: '0.8rem',
            fontWeight: 600,
            color: color.text,
            mb: 0.5,
            lineHeight: 1.3,
            minHeight: 18,
            wordBreak: 'break-word'
          }}
        >
          {titleVal || <span style={{ opacity: 0.4 }}>Double-click to edit</span>}
        </Box>
      )}

      {/* Body */}
      {editing ? (
        <textarea
          value={bodyVal}
          onChange={(e) => setBodyVal(e.target.value)}
          onBlur={commitEdit}
          rows={3}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontSize: '0.72rem',
            color: color.text,
            opacity: 0.8,
            fontFamily: 'inherit',
            lineHeight: 1.5
          }}
          placeholder='Add details...'
        />
      ) : bodyVal ? (
        <Box
          onDoubleClick={startEdit}
          sx={{
            fontSize: '0.72rem',
            color: color.text,
            opacity: 0.75,
            lineHeight: 1.5,
            wordBreak: 'break-word'
          }}
        >
          {bodyVal}
        </Box>
      ) : null}

      {/* Action buttons — appear on hover/select */}
      {(selected || editing) && (
        <Box
          sx={{
            position: 'absolute',
            top: -14,
            right: -2,
            display: 'flex',
            gap: 0.25
          }}
        >
          <Tooltip title='Edit' size='sm'>
            <IconButton
              size='sm'
              variant='solid'
              sx={{ '--IconButton-size': '22px', bgcolor: color.border, color: '#fff', borderRadius: 'sm' }}
              onClick={(e) => {
                e.stopPropagation()
                startEdit()
              }}
            >
              <EditRoundedIcon sx={{ fontSize: 12 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title='Delete' size='sm'>
            <IconButton
              size='sm'
              variant='solid'
              sx={{ '--IconButton-size': '22px', bgcolor: '#ef4444', color: '#fff', borderRadius: 'sm' }}
              onClick={(e) => {
                e.stopPropagation()
                data.onDelete?.()
              }}
            >
              <DeleteRoundedIcon sx={{ fontSize: 12 }} />
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  )
})

StickyNoteNode.displayName = 'StickyNoteNode'
export default StickyNoteNode

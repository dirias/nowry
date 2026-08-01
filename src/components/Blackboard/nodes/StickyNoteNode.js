import React, { memo, useState, useRef, useCallback } from 'react'
import { Handle, Position, NodeResizer } from '@xyflow/react'
import { Box, IconButton, Tooltip } from '@mui/joy'
import { useTheme, useColorScheme } from '@mui/joy/styles'
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'

// 8 sticky note color ids — actual bg/border/text values live in the theme
// under theme.vars.palette.stickyNote.<id> (see theme/colorSchemeGenerator.js),
// so every swatch adapts automatically between light and dark mode.
export const STICKY_COLORS = [
  { id: 'yellow' },
  { id: 'green' },
  { id: 'blue' },
  { id: 'purple' },
  { id: 'pink' },
  { id: 'teal' },
  { id: 'red' },
  { id: 'slate' }
]

const StickyNoteNode = memo(({ data, selected }) => {
  const [editing, setEditing] = useState(false)
  const [titleVal, setTitleVal] = useState(data.title || '')
  const [bodyVal, setBodyVal] = useState(data.body || '')
  const [showColorPicker, setShowColorPicker] = useState(false)
  const titleRef = useRef(null)

  const theme = useTheme()
  const { mode } = useColorScheme()
  const isDark = mode === 'dark'

  const colorId = (STICKY_COLORS.find((c) => c.id === data.color) || STICKY_COLORS[0]).id
  // CSS-var backed values — safe to use directly (bgcolor/color/borderColor), react
  // to theme/mode changes automatically via CSS custom properties.
  const color = theme.vars.palette.stickyNote[colorId]
  // Literal (non-var) hex for the active mode — needed anywhere we concatenate an
  // alpha suffix (e.g. `${hex}44`), since `var(--x)44` is not valid CSS.
  const colorLiteral = theme.colorSchemes[isDark ? 'dark' : 'light'].palette.stickyNote[colorId]

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
    <>
      <NodeResizer color={color.border} isVisible={selected} minWidth={200} minHeight={140} />
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: '100%',
          minWidth: 200,
          minHeight: 140,
          bgcolor: color.bg,
          border: `2px solid ${selected ? colorLiteral.border : colorLiteral.border + '99'}`,
          borderRadius: '12px 12px 12px 2px',
          boxShadow: selected ? `0 8px 32px ${colorLiteral.border}44, ${theme.vars.shadow.md}` : theme.vars.shadow.sm,
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
            background: `linear-gradient(225deg, ${colorLiteral.border}33 50%, transparent 50%)`,
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
                border: '1.5px solid',
                borderColor: 'divider',
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
                      bgcolor: theme.vars.palette.stickyNote[c.id].border,
                      cursor: 'pointer',
                      border: data.color === c.id ? '2px solid' : '1px solid',
                      // background.surface (not neutral.solidBg) — neutral.solidBg resolves to a
                      // fixed mid-gray in both modes, which nearly matches the "slate" swatch tone
                      // and would make the selection ring disappear on that swatch specifically.
                      // background.surface sits at the opposite extreme of lightness from every
                      // swatch color in both modes (near-white on light, near-black on dark),
                      // guaranteeing contrast against all 8 swatches either way.
                      borderColor: data.color === c.id ? 'background.surface' : 'divider',
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
                sx={{ '--IconButton-size': '22px', bgcolor: color.border, color: 'primary.solidColor', borderRadius: 'sm' }}
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
                sx={{ '--IconButton-size': '22px', bgcolor: 'danger.solidBg', color: 'danger.solidColor', borderRadius: 'sm' }}
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
    </>
  )
})

StickyNoteNode.displayName = 'StickyNoteNode'
export default StickyNoteNode

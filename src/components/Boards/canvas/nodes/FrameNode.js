import React, { memo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NodeResizer } from '@xyflow/react'
import { Box, Input, Typography } from '@mui/joy'
import { FRAME_TITLE_BAND } from '@nowry/core/domain/board'
import { useBoardCanvas } from '../BoardCanvasContext'
import { useFocusOnMount } from '../useFocusOnMount'
import PlusHandles from '../PlusHandles'
import { oneLine } from '../../../Common/Form/formStyles'

/** The title being typed: Enter or a click away keeps it, Esc leaves it as it was. */
function FrameTitleInput({ id, title }) {
  const { t } = useTranslation()
  const canvas = useBoardCanvas()
  const [value, setValue] = useState(title ?? '')
  const done = useRef(false)
  const inputRef = useRef(null)
  useFocusOnMount(inputRef)
  const finish = (keep, refocus = true) => {
    if (done.current) return
    done.current = true
    if (keep && value !== (title ?? '')) canvas.writeTitle(id, value.trim())
    canvas.finishEditing(id, { refocus })
  }
  return (
    <Input
      size='sm'
      variant='plain'
      value={value}
      placeholder={t('boards.frame.untitled')}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => finish(true, false)}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.key === 'Enter') finish(true)
        if (event.key === 'Escape') finish(false)
      }}
      slotProps={{ input: { ref: inputRef, className: 'nodrag nopan', 'aria-label': t('boards.frame.titleAria') } }}
      sx={{ minHeight: 0, px: 0.5, bgcolor: 'background.surface', '--Input-focusedThickness': '0px', fontWeight: 'lg' }}
    />
  )
}

/**
 * A frame (PRD D2, D3): a titled area that sits behind everything and carries
 * what it holds when moved. Only its title band takes the pointer — the body
 * is empty canvas, so a drag there pans and a double-click makes a note there,
 * inside the frame. Drag it by its title; resize it when selected.
 */
function FrameNode({ id, data, selected }) {
  const { t } = useTranslation()
  const canvas = useBoardCanvas()
  const { node, editing } = data

  return (
    <>
      <NodeResizer
        isVisible={selected && !editing}
        minWidth={120}
        minHeight={80}
        onResizeStart={canvas.checkpoint}
        handleClassName='board-resize-handle'
        lineClassName='board-resize-line'
      />
      <PlusHandles id={id} connectable={false} />
      <Box
        data-testid={`board-frame-${id}`}
        sx={{
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
          borderRadius: 'lg',
          bgcolor: 'background.level2',
          border: '1px solid',
          borderColor: selected ? 'primary.solidBg' : 'divider',
          position: 'relative'
        }}
      >
        <Box
          className='board-frame-title'
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            maxWidth: '100%',
            height: FRAME_TITLE_BAND,
            px: 1.5,
            display: 'flex',
            alignItems: 'center',
            cursor: 'grab',
            pointerEvents: 'all'
          }}
        >
          {editing ? (
            <FrameTitleInput id={id} title={node.title} />
          ) : (
            <Typography level='title-sm' sx={{ ...oneLine, color: node.title ? 'text.secondary' : 'text.tertiary' }}>
              {node.title || t('boards.frame.untitled')}
            </Typography>
          )}
        </Box>
      </Box>
    </>
  )
}

export default memo(FrameNode)

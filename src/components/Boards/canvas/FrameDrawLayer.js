import React, { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Box } from '@mui/joy'

/**
 * The Frame tool (F): a layer over the canvas that draws one frame. Drag to
 * draw it; a click drops one at its default size. `onDraw(from, to)` gets the
 * two screen points; the canvas turns them into board coordinates.
 */
export default function FrameDrawLayer({ onDraw }) {
  const { t } = useTranslation()
  const ref = useRef(null)
  const start = useRef(null)
  const [box, setBox] = useState(null)

  const local = (event) => {
    const rect = ref.current?.getBoundingClientRect?.() ?? { left: 0, top: 0 }
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const onPointerDown = (event) => {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    start.current = { client: { x: event.clientX, y: event.clientY }, local: local(event) }
    setBox({ from: start.current.local, to: start.current.local })
  }
  const onPointerMove = (event) => {
    if (!start.current) return
    setBox({ from: start.current.local, to: local(event) })
  }
  const onPointerUp = (event) => {
    if (!start.current) return
    const from = start.current.client
    start.current = null
    setBox(null)
    onDraw(from, { x: event.clientX, y: event.clientY })
  }

  return (
    <Box
      ref={ref}
      role='presentation'
      aria-label={t('boards.tools.frame')}
      data-testid='board-frame-layer'
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      sx={{ position: 'absolute', inset: 0, zIndex: 'table', cursor: 'crosshair', touchAction: 'none' }}
    >
      {box && (
        <Box
          aria-hidden='true'
          sx={{
            position: 'absolute',
            left: Math.min(box.from.x, box.to.x),
            top: Math.min(box.from.y, box.to.y),
            width: Math.abs(box.to.x - box.from.x),
            height: Math.abs(box.to.y - box.from.y),
            borderRadius: 'lg',
            border: '1px dashed',
            borderColor: 'primary.solidBg',
            bgcolor: 'primary.softBg'
          }}
        />
      )}
    </Box>
  )
}

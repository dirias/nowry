import React, { memo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BaseEdge, EdgeLabelRenderer, Position, getBezierPath, useInternalNode } from '@xyflow/react'
import { Box, Input, Typography } from '@mui/joy'
import { useBoardCanvas } from './BoardCanvasContext'
import { useFocusOnMount } from './useFocusOnMount'

const rectOf = (internal) => {
  const { x, y } = internal.internals.positionAbsolute
  return { x, y, w: internal.measured?.width ?? internal.width ?? 0, h: internal.measured?.height ?? internal.height ?? 0 }
}

/**
 * Where a link leaves and arrives: the sides of the two nodes that face each
 * other, so a link never wraps round a note to reach a handle on its far side.
 */
export const facingEnds = (source, target) => {
  const s = rectOf(source)
  const t = rectOf(target)
  const dx = t.x + t.w / 2 - (s.x + s.w / 2)
  const dy = t.y + t.h / 2 - (s.y + s.h / 2)
  if (Math.abs(dx) >= Math.abs(dy)) {
    const right = dx >= 0
    return {
      sourceX: right ? s.x + s.w : s.x,
      sourceY: s.y + s.h / 2,
      sourcePosition: right ? Position.Right : Position.Left,
      targetX: right ? t.x : t.x + t.w,
      targetY: t.y + t.h / 2,
      targetPosition: right ? Position.Left : Position.Right
    }
  }
  const down = dy >= 0
  return {
    sourceX: s.x + s.w / 2,
    sourceY: down ? s.y + s.h : s.y,
    sourcePosition: down ? Position.Bottom : Position.Top,
    targetX: t.x + t.w / 2,
    targetY: down ? t.y : t.y + t.h,
    targetPosition: down ? Position.Top : Position.Bottom
  }
}

function LabelInput({ id, label }) {
  const { t } = useTranslation()
  const canvas = useBoardCanvas()
  const [value, setValue] = useState(label ?? '')
  const done = useRef(false)
  const inputRef = useRef(null)
  useFocusOnMount(inputRef)
  const finish = (keep, refocus = true) => {
    if (done.current) return
    done.current = true
    canvas.finishLabel(id, keep ? value.trim() : null, { refocus })
  }
  return (
    <Input
      size='sm'
      value={value}
      placeholder={t('boards.link.placeholder')}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => finish(true, false)}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.key === 'Enter') finish(true)
        if (event.key === 'Escape') finish(false)
      }}
      slotProps={{ input: { ref: inputRef, 'aria-label': t('boards.link.labelAria') } }}
      sx={{ minWidth: 120 }}
    />
  )
}

/**
 * A link (PRD D2, canvas board 2): a curve of one quiet weight with an arrow
 * at its end and an optional label on it. Double-click the line or its label
 * to write the label. Not animated — no marching ants.
 */
function LinkEdge({ id, source, target, data, selected, markerEnd }) {
  const canvas = useBoardCanvas()
  const sourceNode = useInternalNode(source)
  const targetNode = useInternalNode(target)
  if (!sourceNode || !targetNode) return null
  const [path, labelX, labelY] = getBezierPath(facingEnds(sourceNode, targetNode))
  const label = data?.label ?? ''
  const editing = Boolean(data?.editing)

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        interactionWidth={18}
        style={{
          stroke: selected ? 'var(--joy-palette-primary-solidBg)' : 'var(--joy-palette-text-tertiary)',
          strokeWidth: 1.6
        }}
      />
      {(label || editing) && (
        <EdgeLabelRenderer>
          <Box
            className='nodrag nopan'
            data-testid={`board-link-label-${id}`}
            onDoubleClick={(event) => {
              event.stopPropagation()
              canvas.editLabel(id)
            }}
            sx={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
              px: 0.5,
              borderRadius: 'xs',
              bgcolor: 'background.level1'
            }}
          >
            {editing ? (
              <LabelInput id={id} label={label} />
            ) : (
              <Typography level='body-xs' sx={{ color: selected ? 'text.primary' : 'text.secondary' }}>
                {label}
              </Typography>
            )}
          </Box>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export default memo(LinkEdge)

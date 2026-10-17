import React from 'react'
import { Box } from '@mui/joy'
import { BOARD_NOTE_COLORS, noteVar } from './canvas/noteColors'

/*
 * Each kind's fill, by class, so the drawing stays plain SVG and every colour
 * is a theme variable (light and dark follow on their own).
 */
const FILLS = {
  '& .o-frame': { fill: 'var(--joy-palette-background-level2)', stroke: 'var(--joy-palette-divider)' },
  '& .o-text': { fill: 'var(--joy-palette-text-secondary)', opacity: 0.6 },
  '& .o-item': { fill: 'var(--joy-palette-background-surface)', stroke: 'var(--joy-palette-divider)' },
  ...Object.fromEntries(BOARD_NOTE_COLORS.map((color) => [`& .o-note-${color}`, { fill: noteVar(color, 'bg') }]))
}

const classOf = (rect) => {
  if (rect.kind === 'note') return `o-note-${BOARD_NOTE_COLORS.includes(rect.color) ? rect.color : 'yellow'}`
  return `o-${rect.kind === 'frame' || rect.kind === 'text' || rect.kind === 'item' ? rect.kind : 'item'}`
}

/** The box round the outline, with room on every side. */
export const outlineViewBox = (rects) => {
  if (!rects?.length) return null
  const minX = Math.min(...rects.map((r) => r.x))
  const minY = Math.min(...rects.map((r) => r.y))
  const maxX = Math.max(...rects.map((r) => r.x + r.w))
  const maxY = Math.max(...rects.map((r) => r.y + r.h))
  const pad = Math.max(maxX - minX, maxY - minY) * 0.08 + 24
  return `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`
}

/**
 * A tile's thumbnail (PRD D1, canvas board 1): the board's outline — up to
 * sixty rectangles the API sends with the list — scaled into the tile on the
 * canvas's dotted ground. A text block is a bar; a frame an outlined box.
 */
export default function BoardOutline({ outline }) {
  const viewBox = outlineViewBox(outline)
  return (
    <Box
      aria-hidden='true'
      sx={{
        height: 150,
        bgcolor: 'background.level1',
        backgroundImage: 'radial-gradient(var(--joy-palette-neutral-outlinedBorder) 1px, transparent 1px)',
        backgroundSize: '16px 16px',
        overflow: 'hidden'
      }}
    >
      {viewBox && (
        <Box
          component='svg'
          viewBox={viewBox}
          preserveAspectRatio='xMidYMid meet'
          data-testid='board-outline'
          sx={{ display: 'block', width: '100%', height: '100%', ...FILLS }}
        >
          {outline.map((rect, index) => (
            <rect
              key={index}
              className={classOf(rect)}
              x={rect.x}
              y={rect.y}
              width={Math.max(rect.w, 1)}
              height={rect.kind === 'text' ? Math.max(rect.h * 0.45, 1) : Math.max(rect.h, 1)}
              rx={rect.kind === 'frame' ? 14 : 8}
              vectorEffect='non-scaling-stroke'
            />
          ))}
        </Box>
      )}
    </Box>
  )
}

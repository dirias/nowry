import React from 'react'
import { Box } from '@mui/joy'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined'
import AdjustOutlinedIcon from '@mui/icons-material/AdjustOutlined'
import DiamondOutlinedIcon from '@mui/icons-material/DiamondOutlined'
import RepeatRoundedIcon from '@mui/icons-material/RepeatRounded'

import { readableTextOn } from '../../theme/colorSchemeGenerator'

/** One glyph per event type. Every milestone is a measurable step (CAL-005), so one diamond. */
export const EVENT_TYPE_ICONS = {
  task: CheckCircleOutlinedIcon,
  priority: FlagOutlinedIcon,
  goal: AdjustOutlinedIcon,
  milestone: DiamondOutlinedIcon,
  activity: RepeatRoundedIcon
}

/**
 * The tile that carries an event's colour and type — 28px on the agenda row,
 * 16px on the grid (ADR-019). Colour keeps its full identity in a small
 * area while the title sits on a neutral surface; one anatomy for every view.
 *
 * `color` is the focus area's own colour — user data, not a token — so the
 * glyph's colour is derived from the fill it sits on with the same helper the
 * accent swatches use.
 */
const EventTypeTile = ({ type, color, size = 28, glyphSize = 'md' }) => {
  const Icon = EVENT_TYPE_ICONS[type] ?? AdjustOutlinedIcon
  return (
    <Box
      aria-hidden='true'
      sx={{
        width: size,
        height: size,
        borderRadius: 'sm',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: color,
        color: readableTextOn(color)
      }}
    >
      <Icon sx={{ fontSize: glyphSize, color: 'inherit' }} />
    </Box>
  )
}

export default EventTypeTile

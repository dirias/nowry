import React from 'react'
import { Box } from '@mui/joy'
import { categoryDot } from '@nowry/core/tokens/colorSystem'
import { readableTextOn } from '@nowry/core/tokens/colorSchemeGenerator'
import { EVENT_TYPE_ICONS } from '../Calendar/EventTypeTile'
import { identityTile } from '../Common/Form/formStyles'

/** An area saved without a colour (ADR-034 category family), as PriorityList draws it. */
const UNCOLOURED_AREA = categoryDot('iris')

/** The colour an item's tile takes: its goal's area for a milestone or a goal; a task has none. */
export const areaColorOf = (areaId, areas = []) => {
  if (!areaId) return null
  const area = areas.find((candidate) => String(candidate._id ?? candidate.id) === String(areaId))
  return area?.color || UNCOLOURED_AREA
}

/**
 * An item's identity tile (§15.11, as the calendar and the priority list
 * draw it): the kind's glyph, on its area's colour for a milestone or a
 * goal, on a quiet ground in ink for a task.
 */
export default function ItemGlyph({ kind, color = null, size = 28 }) {
  const Icon = EVENT_TYPE_ICONS[kind] ?? EVENT_TYPE_ICONS.task
  return (
    <Box
      aria-hidden='true'
      sx={{
        ...identityTile(color ?? 'background.level2', size),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color ? readableTextOn(color) : 'text.secondary'
      }}
    >
      <Icon sx={{ fontSize: 'md', color: 'inherit' }} />
    </Box>
  )
}

import React, { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Typography } from '@mui/joy'
import TaskAltRounded from '@mui/icons-material/TaskAltRounded'
import FlagRounded from '@mui/icons-material/FlagRounded'
import TrackChangesRounded from '@mui/icons-material/TrackChangesRounded'
import PlusHandles from '../PlusHandles'
import { identityTile, oneLine } from '../../../Common/Form/formStyles'
import { selectedRing } from './nodeStyles'

const GLYPHS = { task: TaskAltRounded, milestone: FlagRounded, goal: TrackChangesRounded }

/**
 * An item on the board (PRD D2): a task, a milestone or a goal, by reference.
 * A placeholder tile until BOARD-005 reads the real item — its title, due date
 * and tick — through the reference; today it names the kind it points at.
 */
function ItemNode({ id, data, selected }) {
  const { t } = useTranslation()
  const { node } = data
  const kind = GLYPHS[node.ref?.kind] ? node.ref.kind : 'task'
  const Glyph = GLYPHS[kind]

  return (
    <>
      <PlusHandles id={id} />
      <Box
        data-testid={`board-item-${id}`}
        sx={{
          width: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          px: 1.5,
          py: 1.25,
          borderRadius: 'md',
          bgcolor: 'background.surface',
          border: '1px solid',
          borderColor: 'divider',
          ...selectedRing(selected)
        }}
      >
        <Box
          sx={{
            ...identityTile('background.level2', 28),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'text.secondary'
          }}
        >
          <Glyph aria-hidden='true' />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography level='title-sm' sx={oneLine}>
            {t(`boards.item.kind.${kind}`)}
          </Typography>
          <Typography level='body-xs' sx={{ ...oneLine, color: 'text.tertiary' }}>
            {t('boards.item.linked')}
          </Typography>
        </Box>
      </Box>
    </>
  )
}

export default memo(ItemNode)

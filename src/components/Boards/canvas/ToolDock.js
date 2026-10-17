import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, IconButton, Sheet, Tooltip } from '@mui/joy'
import NearMeRounded from '@mui/icons-material/NearMeRounded'
import PanToolRounded from '@mui/icons-material/PanToolRounded'
import StickyNote2Rounded from '@mui/icons-material/StickyNote2Rounded'
import TitleRounded from '@mui/icons-material/TitleRounded'
import CropFreeRounded from '@mui/icons-material/CropFreeRounded'
import TaskAltRounded from '@mui/icons-material/TaskAltRounded'
import { focusRing } from '../../Common/Form/formStyles'

const GROUPS = [
  [
    { id: 'select', Icon: NearMeRounded },
    { id: 'hand', Icon: PanToolRounded }
  ],
  [
    { id: 'note', Icon: StickyNote2Rounded },
    { id: 'text', Icon: TitleRounded },
    { id: 'frame', Icon: CropFreeRounded },
    // Items arrive with BOARD-005; the key is held for them.
    { id: 'item', Icon: TaskAltRounded, later: true }
  ]
]

/**
 * The tools, one dock on the left rail (canvas board 2). The engaged tool sits
 * on level2 with the accent edge turned inward (ADR-020, §15.5); each tooltip
 * names its key, so the keys are shown, not hinted.
 */
export default function ToolDock({ tool, onTool }) {
  const { t } = useTranslation()
  return (
    <Sheet
      role='toolbar'
      aria-label={t('boards.tools.label')}
      aria-orientation='vertical'
      sx={{
        position: 'absolute',
        // Top, not centred: both bottom corners belong to the app's floating
        // widgets (the timer chip and the companion, useTimerCorner.js), and a
        // centred dock ran under the chip on a short window.
        left: 16,
        top: 16,
        zIndex: 'floating',
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        p: 0.75,
        borderRadius: 'lg',
        bgcolor: 'background.surface',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 'md'
      }}
    >
      {GROUPS.map((group, index) => (
        <React.Fragment key={group[0].id}>
          {index > 0 && <Box aria-hidden='true' sx={{ height: '1px', mx: 0.75, my: 0.25, bgcolor: 'divider' }} />}
          {group.map(({ id, Icon, later }) => {
            const on = tool === id
            const label = t(`boards.tools.${id}`)
            const button = (
              <IconButton
                aria-label={label}
                aria-pressed={on}
                disabled={later}
                onClick={() => onTool(id)}
                variant='plain'
                color='neutral'
                sx={{
                  '--IconButton-size': '40px',
                  borderRadius: 'md',
                  bgcolor: on ? 'background.level2' : 'transparent',
                  color: on ? 'text.primary' : 'text.secondary',
                  boxShadow: on ? 'inset 2px 0 0 0 var(--joy-palette-primary-solidBg)' : 'none',
                  '&:hover': { color: 'text.primary' },
                  ...focusRing
                }}
              >
                <Icon />
              </IconButton>
            )
            return (
              <Tooltip key={id} title={label} placement='right' size='sm'>
                {later ? <span>{button}</span> : button}
              </Tooltip>
            )
          })}
        </React.Fragment>
      ))}
    </Sheet>
  )
}

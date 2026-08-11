import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Dropdown, IconButton, ListDivider, Menu, MenuButton, MenuItem, Tooltip } from '@mui/joy'
import {
  MoreHoriz as MoreHorizIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  RestartAlt as RestartAltIcon
} from '@mui/icons-material'

const focusRing = {
  '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' }
}

// 44x44 on touch, compact on pointer devices.
const touchTarget = { minWidth: { xs: 44, md: 32 }, minHeight: { xs: 44, md: 32 } }

/**
 * GoalOverflowMenu — the single, always-present, low-contrast action affordance.
 *
 * Replaces two Edit/Delete IconButton stacks in which a danger-coloured Delete
 * sat at equal visual weight to Edit on every card. Delete is de-escalated
 * behind a divider, always labelled, never icon-only, and still routes through
 * DeleteConfirmationModal (ADR-003 §5).
 *
 * Never hover-revealed: a hover-revealed control does not exist on a touch
 * device. When the goal's quarter is closed the button is rendered *disabled*
 * with an explaining tooltip rather than removed, so the affordance does not
 * silently vanish.
 *
 * Pattern matches PlanScopeBar.js's Dropdown/MenuButton/Menu/MenuItem usage.
 */
const GoalOverflowMenu = ({ goal, locked = false, onEdit, onDelete, onStatusChange }) => {
  const { t } = useTranslation()
  const isCompleted = goal?.status === 'completed'

  if (locked) {
    return (
      <Tooltip title={t('annualPlanning.goal.lockedAction')} size='sm' placement='top'>
        {/* A disabled button emits no pointer events, so the tooltip needs a live
            wrapper to anchor to. */}
        <Box component='span' sx={{ display: 'inline-flex' }}>
          <IconButton
            size='sm'
            variant='plain'
            color='neutral'
            disabled
            // The button's name says what it is; the tooltip says why it is off.
            aria-label={t('annualPlanning.goal.moreActions', { title: goal?.title || '' })}
            sx={{ ...touchTarget, ...focusRing }}
          >
            <MoreHorizIcon fontSize='small' />
          </IconButton>
        </Box>
      </Tooltip>
    )
  }

  return (
    <Dropdown>
      <MenuButton
        slots={{ root: IconButton }}
        slotProps={{
          root: {
            size: 'sm',
            variant: 'plain',
            color: 'neutral',
            // Interpolating the title keeps five overflow buttons on one screen
            // distinguishable to a screen-reader user.
            'aria-label': t('annualPlanning.goal.moreActions', { title: goal?.title || '' })
          }
        }}
        sx={{ ...touchTarget, ...focusRing }}
      >
        <MoreHorizIcon fontSize='small' />
      </MenuButton>
      <Menu placement='bottom-end' size='sm'>
        <MenuItem onClick={() => onEdit?.(goal)}>
          <EditIcon fontSize='small' />
          {t('annualPlanning.goal.edit')}
        </MenuItem>
        {isCompleted ? (
          <MenuItem onClick={() => onStatusChange?.(goal, 'in_progress')}>
            <RestartAltIcon fontSize='small' />
            {t('annualPlanning.goal.reopen')}
          </MenuItem>
        ) : (
          <MenuItem onClick={() => onStatusChange?.(goal, 'completed')}>
            <CheckCircleOutlineIcon fontSize='small' />
            {t('annualPlanning.goal.markComplete')}
          </MenuItem>
        )}
        <ListDivider />
        <MenuItem color='danger' onClick={() => onDelete?.(goal)}>
          <DeleteIcon fontSize='small' />
          {t('annualPlanning.goal.delete')}
        </MenuItem>
      </Menu>
    </Dropdown>
  )
}

export default GoalOverflowMenu

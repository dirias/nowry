import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Checkbox, IconButton, Input, Tooltip } from '@mui/joy'
import { Delete as DeleteIcon } from '@mui/icons-material'
import { isMilestoneOverdue } from '../goalDerivation'
import MilestoneDueDateBadge from './MilestoneDueDateBadge'
import { focusRing } from './goalStyles'

/**
 * One editable milestone row: done checkbox, title, due date, delete.
 *
 * Replaces the goal form's hand-rolled controls — a 20x20 <Box onClick> with an
 * inline <svg><polyline> checkmark, and a <Box onClick> date chip. Neither had
 * a role, tabIndex, keydown handler or accessible name, so a keyboard user
 * could reach the title field and nothing else on the row.
 *
 * Owns no array logic: every mutation goes out through onChange/onDelete.
 */
const GoalMilestoneEditorRow = ({ milestone, index, onChange, onDelete, onEnter, inputRef }) => {
  const { t } = useTranslation()

  // A brand-new row has no title, and "Delete " with nothing after it is not an
  // accessible name. Fall back to the row's position.
  const name = milestone.title?.trim() || t('annualPlanning.goal.milestoneNumber', { index: index + 1 })
  const overdue = isMilestoneOverdue(milestone)

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        // At xs the row is too dense for one line. Wrap rather than shrink the
        // controls below the 44px touch target.
        flexWrap: { xs: 'wrap', sm: 'nowrap' }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: { xs: '100%', sm: 0 } }}>
        <Checkbox
          size='sm'
          color='success'
          checked={Boolean(milestone.completed)}
          onChange={(e) => onChange(index, 'completed', e.target.checked)}
          // Joy puts a top-level aria-label on the root <span>, leaving the
          // <input> that carries role=checkbox unnamed. Label the input slot.
          slotProps={{ input: { 'aria-label': t('annualPlanning.goal.milestoneToggleAria', { title: name }) } }}
          sx={{ flexShrink: 0, minWidth: { xs: 44, sm: 'auto' }, minHeight: { xs: 44, sm: 'auto' }, ...focusRing }}
        />
        <Input
          fullWidth
          value={milestone.title || ''}
          onChange={(e) => onChange(index, 'title', e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onEnter?.()
            }
          }}
          placeholder={t('annualPlanning.goal.milestonePlaceholder')}
          slotProps={{ input: { ref: inputRef, 'aria-label': t('annualPlanning.goal.milestoneTitleAria', { index: index + 1 }) } }}
          sx={{
            textDecoration: milestone.completed ? 'line-through' : 'none',
            color: milestone.completed ? 'text.tertiary' : 'text.primary',
            '&:focus-within': { borderColor: 'primary.outlinedBorder' }
          }}
        />
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          flexShrink: 0,
          width: { xs: '100%', sm: 'auto' },
          justifyContent: { xs: 'flex-end', sm: 'flex-start' }
        }}
      >
        <MilestoneDueDateBadge
          interactive
          dueDate={milestone.due_date || ''}
          overdue={overdue}
          milestoneTitle={name}
          onPick={(value) => onChange(index, 'due_date', value)}
          onClear={() => onChange(index, 'due_date', '')}
        />
        <Tooltip title={t('annualPlanning.goal.milestoneDeleteAria', { title: name })} size='sm' placement='top'>
          <IconButton
            size='sm'
            variant='plain'
            color='danger'
            onClick={() => onDelete(index)}
            aria-label={t('annualPlanning.goal.milestoneDeleteAria', { title: name })}
            sx={{ minWidth: { xs: 44, sm: 32 }, minHeight: { xs: 44, sm: 32 }, ...focusRing }}
          >
            <DeleteIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  )
}

export default GoalMilestoneEditorRow

import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Button, Checkbox, Tooltip, Typography } from '@mui/joy'
import { Add as AddIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material'

const focusRing = {
  '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' }
}

// Sits above the Card's <Link overlay> so it stays independently clickable and
// focusable; 44x44 on touch.
const aboveOverlay = {
  position: 'relative',
  zIndex: 1,
  minHeight: { xs: 44, md: 'auto' }
}

// A goal's window is only a nudge inside this many days. Beyond it, a countdown
// is noise rather than a prompt.
const NUDGE_WINDOW_DAYS = 30

/**
 * GoalNextAction — the one line on a goal that says what to *do*.
 *
 * The card it replaces was a read-only status dump: five colour signals, two
 * accordions, and nothing actionable. This renders exactly one rung of a fixed
 * five-step ladder, first match wins, always exactly one line — never two,
 * never zero (ADR-003 §3).
 *
 *   1. completed                     -> "Completed"
 *   2. next milestone is overdue     -> checkbox, danger
 *   3. an incomplete milestone exists-> checkbox, neutral
 *   4. all milestones done           -> "mark it complete"
 *   5. no milestones at all          -> "add a milestone"
 *
 * Rungs 2 and 3 are the product hook: the at-risk state is the trigger, this
 * checkbox is the one-tap action, and the bar animating plus the state pill
 * flipping is the reward — all without expanding anything.
 */
const GoalNextAction = ({
  next = null,
  deadline = null,
  state,
  hasMilestones = false,
  locked = false,
  busy = false,
  onToggleMilestone,
  onAddMilestone,
  onComplete
}) => {
  const { t } = useTranslation()

  const disabled = locked || busy
  const lockedTooltip = locked ? t('annualPlanning.goal.lockedAction') : ''

  // Rung 1 — completed.
  if (state === 'completed') {
    return (
      <Typography level='body-sm' startDecorator={<CheckCircleIcon fontSize='small' />} sx={{ color: 'success.plainColor', minWidth: 0 }}>
        {t('annualPlanning.goal.next.completed')}
      </Typography>
    )
  }

  // Rungs 2 and 3 — the next milestone, checkable in place.
  if (next) {
    const overdue = next.isOverdue
    // Only rungs 2 and 3 carry time context, and only inside the nudge window.
    // A negative count would render "-5d left", so the past is excluded too —
    // an elapsed quarter is already said by the state pill.
    const showDaysLeft = deadline && deadline.daysLeft >= 0 && deadline.daysLeft <= NUDGE_WINDOW_DAYS

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
        <Tooltip title={lockedTooltip} size='sm' placement='top'>
          <Box component='span' sx={{ display: 'inline-flex', ...aboveOverlay, alignItems: 'center' }}>
            <Checkbox
              size='sm'
              checked={false}
              disabled={disabled}
              aria-label={t('annualPlanning.goal.next.toggleAria', { title: next.milestone.title })}
              onChange={() => onToggleMilestone?.(next.index)}
              sx={focusRing}
            />
          </Box>
        </Tooltip>
        <Typography
          level='body-sm'
          sx={{
            flex: 1,
            minWidth: 0,
            color: overdue ? 'danger.plainColor' : 'text.secondary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {overdue
            ? t('annualPlanning.goal.next.overdue', { title: next.milestone.title })
            : t('annualPlanning.goal.next.label', { title: next.milestone.title })}
        </Typography>
        {showDaysLeft && (
          <Typography level='body-xs' sx={{ color: 'text.tertiary', flexShrink: 0 }}>
            {t('annualPlanning.goal.daysLeftShort', { count: deadline.daysLeft })}
          </Typography>
        )}
      </Box>
    )
  }

  // Rung 4 — every milestone ticked, but the goal is still open. The investment
  // rung: one tap away from closing it.
  if (hasMilestones) {
    return (
      <Tooltip title={lockedTooltip} size='sm' placement='top'>
        <Box component='span' sx={{ display: 'inline-flex', ...aboveOverlay }}>
          <Button variant='plain' size='sm' disabled={disabled} onClick={() => onComplete?.()} sx={{ px: 0.5, ...focusRing }}>
            {t('annualPlanning.goal.next.readyToComplete')}
          </Button>
        </Box>
      </Tooltip>
    )
  }

  // Rung 5 — nothing to track yet. Asking for the first milestone is what loads
  // the next trigger.
  return (
    <Tooltip title={lockedTooltip} size='sm' placement='top'>
      <Box component='span' sx={{ display: 'inline-flex', ...aboveOverlay }}>
        <Button
          variant='plain'
          size='sm'
          disabled={disabled}
          startDecorator={<AddIcon />}
          onClick={() => onAddMilestone?.()}
          sx={{ px: 0.5, ...focusRing }}
        >
          {t('annualPlanning.goal.next.addMilestone')}
        </Button>
      </Box>
    </Tooltip>
  )
}

export default GoalNextAction

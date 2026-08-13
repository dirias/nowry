import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Step, StepIndicator, Stepper, Tooltip, Typography } from '@mui/joy'
import { Check as CheckIcon } from '@mui/icons-material'
import { isMilestoneOverdue } from '../goalDerivation'
import MilestoneDueDateBadge from './MilestoneDueDateBadge'
import { focusRing } from './goalStyles'

/**
 * GoalMilestoneStepper — the single surviving Stepper, consolidated from the two
 * duplicated copies in the old grid-card and list-row components.
 *
 * It keeps the union of both: the grid card's richer due-date badge (which the
 * list row lacked), plus the lock gating, Enter/Space toggling and
 * milestone.locked tooltip both shared. Milestones stay toggleable in any
 * order — there is no sequential-completion rule.
 *
 * Drawer-only now: burying the single most frequent action in the feature
 * behind a chevron on the card is what ADR-003 removed. The *next* milestone
 * lives on the card; the rest live here.
 */
const GoalMilestoneStepper = ({ goal, locked = false, onToggle }) => {
  const { t } = useTranslation()
  const milestones = goal?.milestones || []

  if (milestones.length === 0) {
    return (
      <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
        {t('annualPlanning.goal.noMilestones')}
      </Typography>
    )
  }

  return (
    <Stepper orientation='vertical' sx={{ '--Step-connectorThickness': '2px', '--Step-gap': '0.75rem', '--StepIndicator-size': '28px' }}>
      {milestones.map((milestone, idx) => {
        const overdue = isMilestoneOverdue(milestone)
        return (
          <Step
            key={milestone.id || idx}
            indicator={
              <StepIndicator
                variant={milestone.completed ? 'solid' : 'outlined'}
                color={milestone.completed ? 'success' : locked ? 'neutral' : 'primary'}
              >
                {milestone.completed ? <CheckIcon fontSize='small' /> : idx + 1}
              </StepIndicator>
            }
          >
            <Tooltip title={locked ? t('annualPlanning.milestone.locked') : ''} size='sm' placement='top'>
              <Box
                role='button'
                tabIndex={locked ? -1 : 0}
                aria-label={milestone.title}
                aria-pressed={Boolean(milestone.completed)}
                onClick={(e) => {
                  e.stopPropagation()
                  if (!locked) onToggle?.(goal, idx)
                }}
                onKeyDown={(e) => {
                  if (!locked && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    onToggle?.(goal, idx)
                  }
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  py: 0.5,
                  px: 1,
                  borderRadius: 'sm',
                  cursor: locked ? 'not-allowed' : 'pointer',
                  opacity: locked ? 0.65 : 1,
                  '&:hover': locked ? {} : { bgcolor: 'background.level1' },
                  ...focusRing
                }}
              >
                <Typography
                  level='body-sm'
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    textDecoration: milestone.completed ? 'line-through' : 'none',
                    color: milestone.completed ? 'text.tertiary' : 'text.primary',
                    lineHeight: 1.4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {milestone.title}
                </Typography>
                {!milestone.completed && <MilestoneDueDateBadge dueDate={milestone.due_date} overdue={overdue} />}
              </Box>
            </Tooltip>
          </Step>
        )
      })}
    </Stepper>
  )
}

export default GoalMilestoneStepper

import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Step, StepIndicator, Stepper, Tooltip, Typography } from '@mui/joy'
import { CalendarToday as CalendarTodayIcon, Check as CheckIcon } from '@mui/icons-material'
import { isMilestoneOverdue } from '../goalDerivation'

/**
 * GoalMilestoneStepper — the single surviving Stepper, consolidated from the two
 * duplicated copies in GoalCardGrid.js and GoalRowList.js.
 *
 * It keeps the union of both: GoalCardGrid's richer due-date badge (which
 * GoalRowList lacked), plus the lock gating, Enter/Space toggling and
 * milestone.locked tooltip both shared. Milestones stay toggleable in any
 * order — there is no sequential-completion rule.
 *
 * Drawer-only now: burying the single most frequent action in the feature
 * behind a chevron on the card is what ADR-003 removed. The *next* milestone
 * lives on the card; the rest live here.
 */
const GoalMilestoneStepper = ({ goal, locked = false, onToggle }) => {
  const { t, i18n } = useTranslation()
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
                  '&:focus-visible': {
                    outline: '2px solid',
                    outlineColor: 'primary.outlinedBorder',
                    outlineOffset: '2px'
                  }
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
                {milestone.due_date && !milestone.completed && (
                  <Typography
                    level='body-xs'
                    startDecorator={<CalendarTodayIcon fontSize='inherit' />}
                    sx={{
                      flexShrink: 0,
                      px: 0.75,
                      py: 0.25,
                      borderRadius: 'sm',
                      bgcolor: overdue ? 'danger.softBg' : 'primary.softBg',
                      border: '1px solid',
                      borderColor: overdue ? 'danger.outlinedBorder' : 'primary.outlinedBorder',
                      fontWeight: 600,
                      color: overdue ? 'danger.plainColor' : 'primary.plainColor',
                      whiteSpace: 'nowrap',
                      // Format against the app's active language, not the browser's:
                      // `undefined` renders "30 jun." inside an otherwise-English drawer
                      // whenever the two disagree.
                      '--Typography-gap': '0.25rem'
                    }}
                  >
                    {new Date(`${milestone.due_date}T00:00:00`).toLocaleDateString(i18n.language, {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </Typography>
                )}
              </Box>
            </Tooltip>
          </Step>
        )
      })}
    </Stepper>
  )
}

export default GoalMilestoneStepper

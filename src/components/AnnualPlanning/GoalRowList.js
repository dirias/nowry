import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Typography,
  Stack,
  IconButton,
  Button,
  Chip,
  Tooltip,
  Stepper,
  Step,
  StepIndicator,
  AccordionGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Skeleton
} from '@mui/joy'
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  KeyboardArrowDown as ExpandIcon,
  KeyboardArrowUp as CollapseIcon
} from '@mui/icons-material'

// Health-status chip mapping (D-01/D-02). Independent copy from
// GoalCardGrid.js's identical const — no shared file, per D-05's 2-file scope.
const HEALTH_STATUS_MAP = {
  on_track: { key: 'onTrack', color: 'success' },
  at_risk: { key: 'atRisk', color: 'warning' },
  behind: { key: 'behind', color: 'danger' },
  completed: { key: 'completed', color: 'success' }
}

/**
 * GoalRowList
 * Presentational list-view goal row extracted from FocusAreaView.js's inline
 * renderGoalRowList (PriorityList.js extraction precedent, D-05).
 *
 * Pure prop-driven component — no internal data fetching, no service imports.
 * FocusAreaView.js owns all state and mutation logic and renders this when
 * viewMode === 'list' (D-08). Prop contract is IDENTICAL to GoalCardGrid.js.
 *
 * Returns a Fragment: [row, optional Stepper block] — the caller wraps each
 * instance in its own <Box key={goal._id}> so no outer wrapper is added here.
 */
const GoalRowList = ({
  goal,
  area,
  isQuarterClosed,
  expandedMilestones,
  expandedGoals,
  goalActivities,
  handleStatusChange,
  handleEditGoal,
  handleDeleteGoal,
  handleToggleMilestones,
  handleToggleMilestone,
  handleToggleExpand,
  calculateProgress,
  getStatusConfig,
  getHealthStatus
}) => {
  const { t } = useTranslation()
  const health = HEALTH_STATUS_MAP[getHealthStatus(goal)]

  return (
    <>
      {/* Goal Row (List View) - Section 6.2 Compliance */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          py: 1.5,
          px: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          minHeight: 56,
          '&:hover': {
            bgcolor: 'background.level1'
          }
        }}
      >
        {/* Status Indicator — lifecycle chip + health-status chip side by side (D-01) */}
        <Box
          onClick={() => {
            if (!isQuarterClosed) handleStatusChange(goal)
          }}
          sx={{
            cursor: isQuarterClosed ? 'default' : 'pointer',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1,
              py: 0.5,
              borderRadius: 'sm',
              border: '1px solid',
              borderColor: `${getStatusConfig(goal.status).color}.outlinedBorder`,
              color: `${getStatusConfig(goal.status).color}.plainColor`,
              fontWeight: 600,
              fontSize: '0.625rem',
              minWidth: 90,
              justifyContent: 'center'
            }}
          >
            <span>{getStatusConfig(goal.status).icon}</span>
            <span>{getStatusConfig(goal.status).label}</span>
          </Box>
          <Chip size='sm' variant='soft' color={health?.color || 'neutral'} sx={{ flexShrink: 0 }}>
            {t(`annualPlanning.goal.healthStatus.${health?.key || 'onTrack'}`)}
          </Chip>
        </Box>

        {/* Title */}
        <Typography level='title-sm' sx={{ flex: 1, minWidth: 0 }}>
          {goal.title}
        </Typography>

        {/* Progress */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1, width: 120 }}>
          <Box
            sx={{
              flex: 1,
              height: 6,
              bgcolor: 'background.level2',
              borderRadius: 'sm',
              overflow: 'hidden'
            }}
          >
            <Box
              sx={{
                width: `${calculateProgress(goal)}%`,
                height: '100%',
                bgcolor: area?.color || 'primary.softBg',
                transition: 'width 0.3s ease'
              }}
            />
          </Box>
          <Typography level='body-xs' sx={{ minWidth: 40, textAlign: 'right' }}>
            {calculateProgress(goal)}%
          </Typography>
        </Box>

        {/* Milestones toggle — reveals the vertical Stepper below the row (GOAL-04) */}
        {goal.milestones && goal.milestones.length > 0 && (
          <Button
            variant='plain'
            size='sm'
            onClick={(e) => {
              e.stopPropagation()
              handleToggleMilestones(goal._id)
            }}
            endDecorator={expandedMilestones.has(goal._id) ? <CollapseIcon /> : <ExpandIcon />}
            sx={{ display: { xs: 'none', sm: 'inline-flex' }, minHeight: 'auto', py: 0.5, px: 1, color: 'text.secondary', fontWeight: 600 }}
          >
            {t('annualPlanning.milestone.label', {
              completed: goal.milestones.filter((m) => m.completed).length,
              total: goal.milestones.length
            })}
          </Button>
        )}

        {/* Actions */}
        {!isQuarterClosed && (
          <Stack direction='row' spacing={0.5}>
            <IconButton size='sm' variant='plain' aria-label={t('annualPlanning.goal.edit')} onClick={() => handleEditGoal(goal)}>
              <EditIcon fontSize='small' />
            </IconButton>
            <IconButton
              size='sm'
              variant='plain'
              color='danger'
              aria-label={t('annualPlanning.goal.delete')}
              onClick={() => handleDeleteGoal(goal)}
            >
              <DeleteIcon fontSize='small' />
            </IconButton>
          </Stack>
        )}
      </Box>

      {/* Vertical milestones Stepper — below the row, aligned to its horizontal padding */}
      {expandedMilestones.has(goal._id) && (
        <Box sx={{ px: 2, pb: 2 }}>
          <Stepper
            orientation='vertical'
            sx={{ '--Step-connectorThickness': '2px', '--Step-gap': '0.75rem', '--StepIndicator-size': '28px' }}
          >
            {goal.milestones.map((milestone, idx) => {
              const locked = goal.status === 'completed' || isQuarterClosed
              return (
                <Step
                  key={idx}
                  indicator={
                    <StepIndicator
                      variant={milestone.completed ? 'solid' : 'outlined'}
                      color={milestone.completed ? 'success' : locked ? 'neutral' : 'primary'}
                    >
                      {milestone.completed ? '✓' : idx + 1}
                    </StepIndicator>
                  }
                >
                  <Tooltip title={locked ? t('annualPlanning.milestone.locked') : ''} size='sm' placement='top'>
                    <Box
                      role='button'
                      tabIndex={locked ? -1 : 0}
                      aria-label={milestone.title}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!locked) handleToggleMilestone(goal, idx)
                      }}
                      onKeyDown={(e) => {
                        if (!locked && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault()
                          handleToggleMilestone(goal, idx)
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
                        '&:hover': locked ? {} : { bgcolor: 'background.level1' }
                      }}
                    >
                      <Typography
                        level='body-sm'
                        sx={{
                          flex: 1,
                          textDecoration: milestone.completed ? 'line-through' : 'none',
                          color: milestone.completed ? 'text.tertiary' : 'text.primary'
                        }}
                      >
                        {milestone.title}
                      </Typography>
                    </Box>
                  </Tooltip>
                </Step>
              )
            })}
          </Stepper>
        </Box>
      )}

      {/* Activities accordion — controlled by expandedGoals/handleToggleExpand (D-09/D-10/D-11) */}
      <Box sx={{ px: 2, pb: expandedGoals.has(goal._id) ? 2 : 0 }}>
        <AccordionGroup>
          <Accordion expanded={expandedGoals.has(goal._id)} onChange={() => handleToggleExpand(goal._id)}>
            <AccordionSummary>
              <Typography level='body-md' fontWeight={600}>
                {t('annualPlanning.goal.activities')} ({goalActivities[goal._id]?.length || 0})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {goalActivities[goal._id] === undefined ? (
                <Skeleton variant='rectangular' height={40} sx={{ borderRadius: 'sm' }} />
              ) : goalActivities[goal._id] === null ? (
                <Typography level='body-sm' sx={{ color: 'danger.plainColor' }}>
                  {t('annualPlanning.goal.activitiesError')}
                </Typography>
              ) : goalActivities[goal._id].length === 0 ? (
                <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
                  {t('annualPlanning.goal.noActivities')}
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {goalActivities[goal._id].map((activity) => (
                    <Box key={activity._id} sx={{ py: 1, px: 1, borderRadius: 'sm', bgcolor: 'background.level1' }}>
                      <Typography level='body-sm' sx={{ fontWeight: 600 }}>
                        {activity.title}
                      </Typography>
                      <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
                        {new Date(activity.created_at).toLocaleDateString()} -{' '}
                        {t(`annualPlanning.activity.frequencies.${activity.frequency}`, { defaultValue: activity.frequency })}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </AccordionDetails>
          </Accordion>
        </AccordionGroup>
      </Box>
    </>
  )
}

export default GoalRowList

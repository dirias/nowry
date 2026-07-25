import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  IconButton,
  Button,
  Divider,
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

// Health-status → chip color/i18n-key mapping (D-01/D-02). Intentionally
// duplicated in GoalRowList.js to keep both extracted components
// self-contained (D-05 two-file scope) — do not extract into a shared module.
const HEALTH_STATUS_MAP = {
  on_track: { key: 'onTrack', color: 'success' },
  at_risk: { key: 'atRisk', color: 'warning' },
  behind: { key: 'behind', color: 'danger' },
  completed: { key: 'completed', color: 'success' }
}

/**
 * GoalCardGrid — grid-view goal card extracted from FocusAreaView.js's inline
 * renderGoalCardGrid (D-05, following the PriorityList.js extraction
 * precedent). Pure presentational: all state and mutation logic lives in the
 * parent (FocusAreaView.js) and arrives via props; no service imports here.
 */
const GoalCardGrid = ({
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
  const hasMilestones = goal.milestones && goal.milestones.length > 0
  const health = HEALTH_STATUS_MAP[getHealthStatus(goal)]

  return (
    <Card
      variant='outlined'
      sx={{
        position: 'relative',
        height: { xs: 220, md: 280 },
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        p: 0,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.surface',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          borderColor: 'primary.outlinedBorder',
          boxShadow: 'md',
          transform: 'translateY(-4px)'
        }
      }}
    >
      {/* Visual Identifier - Image OR Color Accent */}
      {goal.image_url ? (
        <>
          {/* Background Image Layer - Visible but elegant */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 0,
              backgroundImage: `url(${goal.image_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.25,
              filter: 'grayscale(0.2) brightness(1.1)'
            }}
          />
          {/* Theme-aware overlay for text contrast */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 1,
              bgcolor: 'background.surface',
              opacity: 0.75
            }}
          />
        </>
      ) : (
        /* Colored accent for cards without images */
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            zIndex: 0,
            bgcolor: area?.color || 'primary.softBg',
            opacity: 0.8
          }}
        />
      )}

      {/* Content Layer */}
      <CardContent
        sx={{
          position: 'relative',
          zIndex: 2,
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          p: 2,
          gap: 1
        }}
      >
        {/* Header: Status chips + Actions */}
        <Stack direction='row' justifyContent='space-between' alignItems='flex-start'>
          <Stack direction='row' spacing={0.75} alignItems='center' sx={{ flexWrap: 'wrap', minWidth: 0, rowGap: 0.5 }}>
            <Box
              onClick={(e) => {
                e.stopPropagation()
                if (!isQuarterClosed) handleStatusChange(goal)
              }}
              sx={{
                cursor: isQuarterClosed ? 'default' : 'pointer',
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
                transition: 'all 0.2s',
                '&:hover': isQuarterClosed
                  ? {}
                  : {
                      borderColor: `${getStatusConfig(goal.status).color}.solidBg`,
                      bgcolor: 'background.level1'
                    }
              }}
            >
              <span>{getStatusConfig(goal.status).icon}</span>
              <span>{getStatusConfig(goal.status).label}</span>
            </Box>
            {/* Health-status chip — separate from the lifecycle chip (D-01) */}
            <Chip size='sm' variant='soft' color={health?.color || 'neutral'} sx={{ flexShrink: 0 }}>
              {t(`annualPlanning.goal.healthStatus.${health?.key || 'onTrack'}`)}
            </Chip>
          </Stack>
          {!isQuarterClosed && (
            <Stack direction='row' spacing={0.5}>
              <IconButton
                size='sm'
                variant='plain'
                aria-label={t('annualPlanning.goal.edit')}
                onClick={(e) => {
                  e.stopPropagation()
                  handleEditGoal(goal)
                }}
                sx={{
                  transition: 'all 0.2s',
                  '&:hover': { transform: 'scale(1.1)' }
                }}
              >
                <EditIcon fontSize='small' />
              </IconButton>
              <IconButton
                size='sm'
                variant='plain'
                color='danger'
                aria-label={t('annualPlanning.goal.delete')}
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteGoal(goal)
                }}
                sx={{
                  transition: 'all 0.2s',
                  '&:hover': { transform: 'scale(1.1)' }
                }}
              >
                <DeleteIcon fontSize='small' />
              </IconButton>
            </Stack>
          )}
        </Stack>

        {/* Title */}
        <Typography
          level='title-md'
          sx={{
            fontWeight: 700,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.4,
            color: 'text.primary',
            letterSpacing: '-0.01em'
          }}
        >
          {goal.title}
        </Typography>

        {/* Progress */}
        <Box sx={{ mt: 'auto' }}>
          <Box
            sx={{
              width: '100%',
              height: 6,
              bgcolor: 'background.level2',
              borderRadius: 'sm',
              overflow: 'hidden',
              mb: 0.5
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
          <Typography
            level='body-sm'
            sx={{
              fontWeight: 600,
              color: 'text.secondary'
            }}
          >
            {t('annualPlanning.goal.percentComplete', { percent: calculateProgress(goal) })}
          </Typography>
        </Box>

        {/* Milestones */}
        {hasMilestones && (
          <Box
            sx={{
              pt: 1.5,
              mt: 0.5,
              borderTop: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Divider sx={{ mb: 0.5 }} />
            <Button
              variant='plain'
              size='sm'
              onClick={(e) => {
                e.stopPropagation()
                handleToggleMilestones(goal._id)
              }}
              endDecorator={expandedMilestones.has(goal._id) ? <CollapseIcon /> : <ExpandIcon />}
              sx={{
                width: '100%',
                justifyContent: 'space-between',
                py: 0.75,
                px: 1,
                minHeight: 'auto',
                fontWeight: 600,
                color: 'text.secondary',
                borderRadius: 'sm',
                '&:hover': { bgcolor: 'background.level1' }
              }}
            >
              {t('annualPlanning.milestone.label', {
                completed: goal.milestones.filter((m) => m.completed).length,
                total: goal.milestones.length
              })}
            </Button>

            {expandedMilestones.has(goal._id) && (
              <Stepper
                orientation='vertical'
                sx={{ '--Step-connectorThickness': '2px', '--Step-gap': '0.75rem', '--StepIndicator-size': '28px', mt: 1 }}
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
                          {milestone.due_date &&
                            !milestone.completed &&
                            (() => {
                              const due = new Date(milestone.due_date + 'T00:00:00')
                              const now = new Date()
                              const overdue = due < now
                              const label = due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                              return (
                                <Box
                                  sx={{
                                    flexShrink: 0,
                                    px: 0.75,
                                    py: 0.25,
                                    borderRadius: 'sm',
                                    bgcolor: overdue ? 'danger.softBg' : 'primary.softBg',
                                    border: '1px solid',
                                    borderColor: overdue ? 'danger.outlinedBorder' : 'primary.outlinedBorder',
                                    fontSize: '0.625rem',
                                    fontWeight: 600,
                                    color: overdue ? 'danger.plainColor' : 'primary.plainColor',
                                    whiteSpace: 'nowrap',
                                    lineHeight: 1.4
                                  }}
                                >
                                  🗓 {label}
                                </Box>
                              )
                            })()}
                        </Box>
                      </Tooltip>
                    </Step>
                  )
                })}
              </Stepper>
            )}
          </Box>
        )}

        {/* Activities — controlled accordion, fetch triggered by parent's
            handleToggleExpand on first expand (D-09/D-10/D-11) */}
        <AccordionGroup sx={{ mt: 1.5 }}>
          <Accordion expanded={expandedGoals.has(goal._id)} onChange={() => handleToggleExpand(goal._id)}>
            <AccordionSummary>
              <Typography level='body-md' fontWeight={600}>
                {t('annualPlanning.goal.activities')} ({goalActivities[goal._id]?.length || 0})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {goalActivities[goal._id] === undefined ? (
                <Skeleton data-testid='activities-loading' variant='rectangular' height={40} sx={{ borderRadius: 'sm' }} />
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
                        {t(`annualPlanning.activity.frequencies.${activity.frequency}`, {
                          defaultValue: activity.frequency
                        })}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </AccordionDetails>
          </Accordion>
        </AccordionGroup>
      </CardContent>
    </Card>
  )
}

export default GoalCardGrid

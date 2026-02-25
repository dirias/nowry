import React, { useState, useEffect } from 'react'
import { Box, Typography, Tooltip, Sheet } from '@mui/joy'
import { Link as RouterLink } from 'react-router-dom'
import { annualPlanningService } from '../../../api/services'

/**
 * FocusBar - Horizontal strip showing goals + priorities at a glance
 *
 * Following DESIGN_GUIDELINES.md:
 * - Minimalistic: Single compact row
 * - Horizontal space optimization
 * - Progressive disclosure: Only shows if data exists
 */
const FocusBar = () => {
  const [focusAreas, setFocusAreas] = useState([])
  const [priorities, setPriorities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const annualPlanData = await annualPlanningService.getAnnualPlan().catch(() => null)

      if (annualPlanData) {
        const [areas, prioritiesData] = await Promise.all([
          annualPlanningService.getFocusAreas(annualPlanData._id || annualPlanData.id),
          annualPlanningService.getPriorities(annualPlanData._id || annualPlanData.id)
        ])

        // Fetch goals for each focus area and calculate progress
        const goals = await Promise.all(areas.map((a) => annualPlanningService.getGoals(a._id || a.id)))

        // Create a flat map of all goals with their focus area IDs
        const allGoals = []
        areas.forEach((area, index) => {
          const areaGoals = goals[index] || []
          areaGoals.forEach((goal) => {
            allGoals.push({
              ...goal,
              focus_area_id: area._id || area.id
            })
          })
        })

        // Enrich areas with calculated progress
        const enrichedAreas = areas.map((area, index) => {
          const areaGoals = goals[index] || []
          let areaProgressSum = 0

          areaGoals.forEach((g) => {
            let p = 0
            // Calculate progress based on milestones if they exist
            if (g.milestones && g.milestones.length > 0) {
              const completed = g.milestones.filter((m) => m.completed).length
              p = (completed / g.milestones.length) * 100
            } else {
              // Otherwise use manual progress field
              p = g.progress || 0
            }
            areaProgressSum += p
          })

          return {
            ...area,
            progress: areaGoals.length > 0 ? Math.round(areaProgressSum / areaGoals.length) : 0
          }
        })

        setFocusAreas(enrichedAreas || [])

        // Enrich priorities with focus_area_id from linked goals
        const enrichedPriorities = (prioritiesData || []).map((priority) => {
          if (priority.linked_entity_type === 'goal' && priority.linked_entity_id) {
            const linkedGoal = allGoals.find((g) => (g._id || g.id) === priority.linked_entity_id)
            if (linkedGoal && linkedGoal.focus_area_id) {
              return {
                ...priority,
                focus_area_id: linkedGoal.focus_area_id
              }
            }
          }
          return priority
        })

        // Get top 2 upcoming priorities
        const sortedPriorities = enrichedPriorities
          .filter((p) => p.deadline)
          .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
          .slice(0, 2)
        setPriorities(sortedPriorities)
      }
    } catch (error) {
      console.error('Error loading focus data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateProgress = (focusArea) => {
    return focusArea.progress || 0
  }

  // Don't show if no data
  if (loading || (focusAreas.length === 0 && priorities.length === 0)) {
    return null
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 1, md: 1.5 },
        mb: 2,
        px: { xs: 1, md: 1.5 },
        py: 0.75,
        borderRadius: 'sm',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.surface',
        flexWrap: 'wrap'
      }}
    >
      {/* Focus Areas */}
      {focusAreas.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, md: 0.75 } }}>
          {focusAreas.slice(0, 3).map((area) => {
            const progress = calculateProgress(area)
            const hexColor = area.color || '#8B5CF6'

            return (
              <Tooltip key={area._id || area.id} title={`${area.name}: ${progress}%`} size='sm'>
                <Box
                  component={RouterLink}
                  to={`/annual-planning/area/${area._id || area.id}`}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: { xs: 0.75, md: 1 },
                    py: 0.5,
                    borderRadius: 'sm',
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.level1',
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: hexColor,
                      bgcolor: `${hexColor}10`
                    }
                  }}
                >
                  <Typography sx={{ fontSize: { xs: '0.875rem', md: '1rem' }, lineHeight: 1 }}>{area.icon || '🎯'}</Typography>
                  <Typography
                    level='body-xs'
                    sx={{
                      fontWeight: 700,
                      color: 'text.primary',
                      fontSize: { xs: '0.7rem', md: '0.75rem' }
                    }}
                  >
                    {progress}%
                  </Typography>
                </Box>
              </Tooltip>
            )
          })}
        </Box>
      )}

      {/* Divider - Desktop only */}
      {focusAreas.length > 0 && priorities.length > 0 && (
        <Box
          sx={{
            width: '1px',
            height: 20,
            bgcolor: 'divider',
            flexShrink: 0,
            display: { xs: 'none', md: 'block' }
          }}
        />
      )}

      {/* Priorities - Ultra compact */}
      {priorities.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, md: 0.75 }, flex: 1, minWidth: 0 }}>
          {priorities.map((priority) => {
            const deadline = new Date(priority.deadline)
            const daysUntil = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24))
            const isOverdue = daysUntil < 0
            const isUrgent = daysUntil <= 3 && daysUntil >= 0

            // Determine navigation path
            let navigationPath = '/annual-planning'
            if (priority.linked_entity_type === 'goal' && priority.focus_area_id) {
              navigationPath = `/annual-planning/area/${priority.focus_area_id}`
            } else if (
              priority.linked_entity_type === 'routine_morning' ||
              priority.linked_entity_type === 'routine_afternoon' ||
              priority.linked_entity_type === 'routine_evening'
            ) {
              navigationPath = '/annual-planning/daily-routine'
            }

            return (
              <Tooltip
                key={priority._id || priority.id}
                title={`${priority.title} - ${isOverdue ? 'Overdue' : `${daysUntil} days left`}`}
                size='sm'
              >
                <Box
                  component={RouterLink}
                  to={navigationPath}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: { xs: 0.75, md: 1 },
                    py: 0.5,
                    borderRadius: 'sm',
                    border: '1px solid',
                    borderColor: isOverdue ? 'danger.outlinedBorder' : isUrgent ? 'warning.outlinedBorder' : 'divider',
                    bgcolor: 'background.level1',
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                    minWidth: 0,
                    maxWidth: { xs: 120, sm: 160, md: 200 },
                    '&:hover': {
                      bgcolor: isOverdue ? 'danger.softBg' : isUrgent ? 'warning.softBg' : 'background.level2',
                      borderColor: isOverdue ? 'danger.solidBg' : isUrgent ? 'warning.solidBg' : 'neutral.outlinedHoverBorder'
                    }
                  }}
                >
                  <Typography
                    level='body-xs'
                    sx={{
                      color: 'text.primary',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontWeight: 600,
                      fontSize: { xs: '0.7rem', md: '0.75rem' },
                      flex: 1,
                      minWidth: 0
                    }}
                  >
                    {priority.title}
                  </Typography>
                  <Typography
                    level='body-xs'
                    sx={{
                      fontSize: { xs: '0.625rem', md: '0.65rem' },
                      color: isOverdue ? 'danger.solidColor' : isUrgent ? 'warning.solidColor' : 'text.tertiary',
                      fontWeight: 700,
                      flexShrink: 0
                    }}
                  >
                    {isOverdue ? '!' : `${daysUntil}d`}
                  </Typography>
                </Box>
              </Tooltip>
            )
          })}
        </Box>
      )}
    </Box>
  )
}

export default FocusBar

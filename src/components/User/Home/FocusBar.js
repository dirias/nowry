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

        // Get top 2 upcoming priorities
        const sortedPriorities = (prioritiesData || [])
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
    <Sheet
      variant='outlined'
      sx={{
        borderRadius: 'md',
        p: 1.5,
        mb: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        flexWrap: 'wrap',
        bgcolor: 'background.surface'
      }}
    >
      {/* Focus Areas */}
      {focusAreas.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {focusAreas.slice(0, 4).map((area) => {
            const progress = calculateProgress(area)
            const hexColor = area.color || '#8B5CF6'

            return (
              <Tooltip key={area._id || area.id} title={`${area.name}: ${progress}%`} size='sm' placement='top'>
                <Box
                  component={RouterLink}
                  to={`/annual-planning/area/${area._id || area.id}`}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1,
                    py: 0.5,
                    borderRadius: 'sm',
                    bgcolor: `${hexColor}15`,
                    border: '1px solid',
                    borderColor: `${hexColor}40`,
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: hexColor,
                      transform: 'translateY(-1px)'
                    }
                  }}
                >
                  <Typography sx={{ fontSize: '1rem', lineHeight: 1 }}>{area.icon || '🎯'}</Typography>
                  <Typography
                    level='body-xs'
                    sx={{
                      fontWeight: 600,
                      color: hexColor,
                      fontSize: '0.7rem'
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

      {/* Divider */}
      {focusAreas.length > 0 && priorities.length > 0 && (
        <Box
          sx={{
            width: '1px',
            height: 24,
            bgcolor: 'divider',
            flexShrink: 0
          }}
        />
      )}

      {/* Priorities */}
      {priorities.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
          {priorities.map((priority) => {
            const deadline = new Date(priority.deadline)
            const daysUntil = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24))
            const isOverdue = daysUntil < 0
            const isUrgent = daysUntil <= 7 && daysUntil >= 0

            return (
              <Box
                key={priority._id || priority.id}
                component={RouterLink}
                to={priority.focus_area_id ? `/annual-planning/area/${priority.focus_area_id}` : '/annual-planning'}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1,
                  py: 0.5,
                  borderRadius: 'sm',
                  bgcolor: 'background.level1',
                  border: '1px solid',
                  borderColor: isOverdue ? 'danger.outlinedBorder' : isUrgent ? 'warning.outlinedBorder' : 'neutral.outlinedBorder',
                  textDecoration: 'none',
                  transition: 'all 0.15s',
                  minWidth: 0,
                  maxWidth: 300,
                  '&:hover': {
                    bgcolor: 'background.level2',
                    borderColor: isOverdue ? 'danger.solidBg' : isUrgent ? 'warning.solidBg' : 'neutral.solidBg'
                  }
                }}
              >
                <Typography sx={{ fontSize: '0.9rem', lineHeight: 1, flexShrink: 0 }}>🎯</Typography>
                <Typography
                  level='body-xs'
                  sx={{
                    color: 'text.primary',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    flex: 1,
                    minWidth: 0
                  }}
                >
                  {priority.title}
                </Typography>
                <Typography
                  level='body-xs'
                  sx={{
                    fontSize: '0.65rem',
                    color: isOverdue ? 'danger.solidColor' : isUrgent ? 'warning.solidColor' : 'text.tertiary',
                    fontWeight: 700,
                    flexShrink: 0
                  }}
                >
                  {isOverdue ? 'Overdue' : `${daysUntil}d`}
                </Typography>
              </Box>
            )
          })}
        </Box>
      )}
    </Sheet>
  )
}

export default FocusBar

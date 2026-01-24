import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Typography, LinearProgress, Button, Stack, CircularProgress, Sheet } from '@mui/joy'
import { useNavigate } from 'react-router-dom'
import { Target, TrendingUp } from 'lucide-react'
import { annualPlanningService } from '../../../api/services'

/**
 * AnnualGoalsCard - Shows top annual goals with progress
 *
 * Following DESIGN_GUIDELINES.md:
 * - Minimalistic design
 * - Visual progress indicators
 * - Clear action (View Full Plan)
 * - Theme-aware colors
 */
const AnnualGoalsCard = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGoals()
  }, [])

  const fetchGoals = async () => {
    try {
      setLoading(true)
      const data = await annualPlanningService.getGoals()

      // Sort by progress (show goals needing attention first)
      const sortedGoals = data
        .map((goal) => ({
          ...goal,
          progress: calculateProgress(goal)
        }))
        .sort((a, b) => a.progress - b.progress) // Lowest progress first
        .slice(0, 4) // Top 4 goals

      setGoals(sortedGoals)
    } catch (error) {
      console.error('Error fetching goals:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateProgress = (goal) => {
    if (!goal.activities || goal.activities.length === 0) return 0
    const completed = goal.activities.filter((a) => a.completed).length
    return Math.round((completed / goal.activities.length) * 100)
  }

  const getProgressColor = (progress) => {
    if (progress >= 70) return 'success'
    if (progress >= 40) return 'warning'
    return 'danger'
  }

  if (loading) {
    return (
      <Sheet
        variant='outlined'
        sx={{
          p: 3,
          borderRadius: 'lg',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 240
        }}
      >
        <CircularProgress size='sm' />
      </Sheet>
    )
  }

  return (
    <Sheet
      variant='outlined'
      sx={{
        p: 3,
        borderRadius: 'lg',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: 'md',
          transform: 'translateY(-2px)'
        }
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
        <Target size={24} strokeWidth={2} />
        <Typography level='title-lg' fontWeight={600}>
          {t('dashboard.annualGoals.title', 'Annual Goals')}
        </Typography>
      </Box>

      {/* Goals List */}
      {goals.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Typography level='body-sm' sx={{ color: 'text.tertiary', mb: 2 }}>
            {t('dashboard.annualGoals.noGoals', 'No goals set yet')}
          </Typography>
          <Button size='sm' variant='soft' onClick={() => navigate('/annual-planning')}>
            {t('dashboard.annualGoals.createGoal', 'Create Your First Goal')}
          </Button>
        </Box>
      ) : (
        <>
          <Stack spacing={2.5} sx={{ flex: 1 }}>
            {goals.map((goal) => (
              <Box key={goal._id || goal.id}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography level='body-sm' fontWeight={600} sx={{ color: 'text.primary' }}>
                    {goal.category}
                  </Typography>
                  <Typography level='body-xs' fontWeight={600} sx={{ color: `${getProgressColor(goal.progress)}.600` }}>
                    {goal.progress}%
                  </Typography>
                </Box>
                <LinearProgress
                  determinate
                  value={goal.progress}
                  color={getProgressColor(goal.progress)}
                  sx={{
                    height: 6,
                    borderRadius: 'sm',
                    bgcolor: 'background.level1'
                  }}
                />
              </Box>
            ))}
          </Stack>

          {/* View Full Plan Button */}
          <Button
            variant='plain'
            endDecorator={<TrendingUp size={16} />}
            onClick={() => navigate('/annual-planning')}
            sx={{
              mt: 3,
              justifyContent: 'center',
              fontWeight: 600
            }}
          >
            {t('dashboard.annualGoals.viewFullPlan', 'View Full Plan')}
          </Button>
        </>
      )}
    </Sheet>
  )
}

export default AnnualGoalsCard

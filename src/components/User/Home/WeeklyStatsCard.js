import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Typography, Stack, CircularProgress, Sheet, Chip } from '@mui/joy'
import { TrendingUp, CheckCircle2, BookOpen, Flame } from 'lucide-react'
import { tasksService, cardsService, annualPlanningService } from '../../../api/services'

/**
 * WeeklyStatsCard - Shows key weekly metrics
 *
 * Following DESIGN_GUIDELINES.md:
 * - Minimal: Only the most important stats
 * - Visual: Icons and numbers that stand out
 * - Motivating: Show progress, not clutter
 */
const WeeklyStatsCard = () => {
  const { t } = useTranslation()
  const [stats, setStats] = useState({
    goalsOnTrack: 0,
    totalGoals: 0,
    tasksCompleted: 0,
    cardsReviewed: 0,
    studyStreak: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const [goals, tasks, cards] = await Promise.all([annualPlanningService.getGoals(), tasksService.getAll(), cardsService.getAll()])

      // Calculate goals on track (>= 40% progress)
      const goalsWithProgress = goals.map((goal) => ({
        ...goal,
        progress: calculateProgress(goal)
      }))
      const onTrack = goalsWithProgress.filter((g) => g.progress >= 40).length

      // Count tasks completed this week
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const completedThisWeek = tasks.filter((t) => t.is_completed && new Date(t.updated_at) >= weekAgo).length

      // Count cards reviewed this week
      const reviewedThisWeek = cards.filter((c) => c.last_reviewed && new Date(c.last_reviewed) >= weekAgo).length

      // Calculate study streak (consecutive days with reviews)
      const streak = calculateStreak(cards)

      setStats({
        goalsOnTrack: onTrack,
        totalGoals: goals.length,
        tasksCompleted: completedThisWeek,
        cardsReviewed: reviewedThisWeek,
        studyStreak: streak
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateProgress = (goal) => {
    if (!goal.activities || goal.activities.length === 0) return 0
    const completed = goal.activities.filter((a) => a.completed).length
    return Math.round((completed / goal.activities.length) * 100)
  }

  const calculateStreak = (cards) => {
    const reviewDates = cards
      .filter((c) => c.last_reviewed)
      .map((c) => new Date(c.last_reviewed).toDateString())
      .filter((date, index, self) => self.indexOf(date) === index) // Unique dates
      .sort((a, b) => new Date(b) - new Date(a)) // Most recent first

    if (reviewDates.length === 0) return 0

    let streak = 0
    const today = new Date().toDateString()
    let currentDate = new Date()

    for (let i = 0; i < reviewDates.length; i++) {
      const expectedDate = new Date(currentDate).toDateString()
      if (reviewDates[i] === expectedDate) {
        streak++
        currentDate.setDate(currentDate.getDate() - 1)
      } else {
        break
      }
    }

    return streak
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

  const statItems = [
    {
      icon: TrendingUp,
      label: t('dashboard.stats.goalsOnTrack', 'Goals On Track'),
      value: `${stats.goalsOnTrack}/${stats.totalGoals}`,
      color: stats.goalsOnTrack >= stats.totalGoals * 0.7 ? 'success' : 'warning'
    },
    {
      icon: CheckCircle2,
      label: t('dashboard.stats.tasksCompleted', 'Tasks Completed'),
      value: stats.tasksCompleted,
      color: 'primary'
    },
    {
      icon: BookOpen,
      label: t('dashboard.stats.cardsReviewed', 'Cards Reviewed'),
      value: stats.cardsReviewed,
      color: 'primary'
    },
    {
      icon: Flame,
      label: t('dashboard.stats.studyStreak', 'Study Streak'),
      value: `${stats.studyStreak} ${t('dashboard.stats.days', 'days')}`,
      color: stats.studyStreak >= 7 ? 'success' : 'neutral'
    }
  ]

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
        <TrendingUp size={24} strokeWidth={2} />
        <Typography level='title-lg' fontWeight={600}>
          {t('dashboard.stats.title', 'This Week')}
        </Typography>
      </Box>

      {/* Stats Grid */}
      <Stack spacing={2.5} sx={{ flex: 1 }}>
        {statItems.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Box
              key={index}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 1.5,
                borderRadius: 'sm',
                bgcolor: 'background.level1',
                transition: 'all 0.15s',
                '&:hover': {
                  bgcolor: 'background.level2',
                  transform: 'translateX(4px)'
                }
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 40,
                  height: 40,
                  borderRadius: 'sm',
                  bgcolor: `${stat.color}.softBg`,
                  color: `${stat.color}.solidColor`
                }}
              >
                <Icon size={20} strokeWidth={2.5} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography level='body-xs' sx={{ color: 'text.tertiary', mb: 0.5 }}>
                  {stat.label}
                </Typography>
                <Typography level='title-md' fontWeight={700}>
                  {stat.value}
                </Typography>
              </Box>
            </Box>
          )
        })}
      </Stack>
    </Sheet>
  )
}

export default WeeklyStatsCard

import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Typography, Checkbox, Button, Stack, CircularProgress, Sheet, Chip } from '@mui/joy'
import { useNavigate } from 'react-router-dom'
import { CheckSquare, Clock } from 'lucide-react'
import { tasksService, annualPlanningService } from '../../../api/services'

/**
 * TodaysPrioritiesCard - Shows today's tasks and routine
 *
 * Following DESIGN_GUIDELINES.md:
 * - Content-first: Show what needs to be done NOW
 * - Actionable: Check off tasks immediately
 * - Minimal: Top 5 priorities only
 */
const TodaysPrioritiesCard = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [tasks, setTasks] = useState([])
  const [routine, setRoutine] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPriorities()
  }, [])

  const fetchPriorities = async () => {
    try {
      setLoading(true)
      const [tasksData, routineData] = await Promise.all([tasksService.getAll(), annualPlanningService.getDailyRoutine()])

      // Filter pending tasks, sort by deadline and priority
      const pendingTasks = tasksData
        .filter((t) => !t.is_completed)
        .sort((a, b) => {
          // Overdue first
          const aOverdue = a.deadline && new Date(a.deadline) < new Date()
          const bOverdue = b.deadline && new Date(b.deadline) < new Date()
          if (aOverdue && !bOverdue) return -1
          if (!aOverdue && bOverdue) return 1

          // Then by priority
          const priorityOrder = { high: 0, medium: 1, low: 2 }
          return priorityOrder[a.priority] - priorityOrder[b.priority]
        })
        .slice(0, 5) // Top 5 priorities

      setTasks(pendingTasks)
      setRoutine(routineData)
    } catch (error) {
      console.error('Error fetching priorities:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleTask = async (task) => {
    try {
      const updated = await tasksService.update(task._id || task.id, {
        ...task,
        is_completed: !task.is_completed
      })
      setTasks(tasks.map((t) => ((t._id || t.id) === (updated._id || updated.id) ? updated : t)))
    } catch (error) {
      console.error('Error toggling task:', error)
    }
  }

  const getCurrentPeriod = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'morning'
    if (hour < 18) return 'afternoon'
    return 'evening'
  }

  const getRoutineItems = () => {
    if (!routine) return []
    const period = getCurrentPeriod()
    return routine[period] || []
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

  const routineItems = getRoutineItems()
  const allItems = [...routineItems.map((r) => ({ ...r, isRoutine: true })), ...tasks]

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
        <CheckSquare size={24} strokeWidth={2} />
        <Typography level='title-lg' fontWeight={600}>
          {t('dashboard.priorities.title', "Today's Priorities")}
        </Typography>
      </Box>

      {/* Priorities List */}
      {allItems.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Typography level='body-sm' sx={{ color: 'text.tertiary', mb: 2 }}>
            {t('dashboard.priorities.noTasks', "You're all caught up!")}
          </Typography>
          <Button size='sm' variant='soft' onClick={() => navigate('/home')}>
            {t('dashboard.priorities.addTask', 'Add a Task')}
          </Button>
        </Box>
      ) : (
        <>
          <Stack spacing={1.5} sx={{ flex: 1 }}>
            {allItems.slice(0, 5).map((item, index) => (
              <Box
                key={item.id || item._id || index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  p: 1,
                  borderRadius: 'sm',
                  transition: 'background 0.15s',
                  '&:hover': {
                    bgcolor: 'background.level1'
                  }
                }}
              >
                <Checkbox
                  size='sm'
                  checked={item.is_completed || false}
                  onChange={() => !item.isRoutine && handleToggleTask(item)}
                  disabled={item.isRoutine}
                  color='success'
                  variant='soft'
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    level='body-sm'
                    sx={{
                      textDecoration: item.is_completed ? 'line-through' : 'none',
                      color: item.is_completed ? 'text.tertiary' : 'text.primary',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {item.title || item.activity}
                  </Typography>
                </Box>
                {!item.isRoutine && item.deadline && (
                  <Chip
                    size='sm'
                    variant='soft'
                    color={new Date(item.deadline) < new Date() ? 'danger' : 'neutral'}
                    startDecorator={<Clock size={12} />}
                  >
                    {new Date(item.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Chip>
                )}
              </Box>
            ))}
          </Stack>

          {/* View All Tasks Button */}
          <Button
            variant='plain'
            onClick={() => navigate('/home')}
            sx={{
              mt: 3,
              justifyContent: 'center',
              fontWeight: 600
            }}
          >
            {t('dashboard.priorities.viewAll', 'View All Tasks')}
          </Button>
        </>
      )}
    </Sheet>
  )
}

export default TodaysPrioritiesCard

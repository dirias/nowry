import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Stack,
  IconButton,
  Skeleton,
  Chip,
  LinearProgress,
  Container,
  CardOverflow,
  AspectRatio
} from '@mui/joy'
import {
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  KeyboardArrowDown as ExpandIcon,
  KeyboardArrowUp as CollapseIcon
} from '@mui/icons-material'

import { annualPlanningService } from '../../api/services'
import GoalDialog from './GoalDialog'

const FocusAreaView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [area, setArea] = useState(null)
  const [priorities, setPriorities] = useState([])
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState(null)

  // Expanded Activities State
  const [expandedGoals, setExpandedGoals] = useState(new Set())
  const [goalActivities, setGoalActivities] = useState({}) // Cache: { goalId: [activities] }

  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    try {
      setLoading(true)
      // We don't have getFocusAreaById but we can get all and filter, or I should have added getFocusAreaById.
      // But I can get it from the list. Or assume I pass it via state?
      // Better to fetch. Endpoints.js has update(id) but typically one GETs by ID too.
      // I'll cheat and fetch all for the plan if I knew the plan ID, but I don't know plan ID.
      // Wait, I can get plan first?
      // Actually, I should update the service to get By ID or just fetch all areas for current year plan and find it.
      // Let's fetch plan first.

      const plan = await annualPlanningService.getAnnualPlan(new Date().getFullYear())
      if (plan) {
        const areas = await annualPlanningService.getFocusAreas(plan._id)
        const foundArea = areas.find((a) => a._id === id)
        setArea(foundArea)

        if (foundArea) {
          const [pData, gData] = await Promise.all([
            annualPlanningService.getPriorities(plan._id), // This gets all priorities for plan, we filter
            annualPlanningService.getGoals(foundArea._id)
          ])
          setGoals(gData)

          // Filter Priorities:
          // 1. Explicitly assigned to this Focus Area
          // 2. OR Linked to a Goal that belongs to this Focus Area
          const areaGoalIds = new Set(gData.map((g) => g._id))
          const areaPriorities = pData.filter((p) => {
            const isDirectlyAssigned = p.focus_area_id === id
            const isLinkedToAreaGoal = p.linked_entity_type === 'goal' && areaGoalIds.has(p.linked_entity_id)
            return isDirectlyAssigned || isLinkedToAreaGoal
          })

          setPriorities(areaPriorities)
        }
      }
    } catch (error) {
      console.error('Failed to load focus area:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddGoal = () => {
    setSelectedGoal(null)
    setDialogOpen(true)
  }

  const handleEditGoal = (goal) => {
    setSelectedGoal(goal)
    setDialogOpen(true)
  }

  const handleDeleteGoal = async (goalId) => {
    if (window.confirm('Delete this goal?')) {
      await annualPlanningService.deleteGoal(goalId)
      fetchData()
    }
  }

  const handleToggleExpand = async (goalId) => {
    const newExpanded = new Set(expandedGoals)

    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId)
    } else {
      newExpanded.add(goalId)
      // Fetch if not in cache or if we want to refresh on open (for now cache-first)
      if (!goalActivities[goalId]) {
        try {
          const activities = await annualPlanningService.getActivities(goalId)
          setGoalActivities((prev) => ({ ...prev, [goalId]: activities }))
        } catch (error) {
          console.error('Failed to load goal activities', error)
        }
      }
    }
    setExpandedGoals(newExpanded)
  }

  const handleGoalSuccess = async () => {
    await fetchData()
    // Refresh activities for any currently expanded goals to ensure consistency
    // We could just refresh the one that was edited, but simple iteration is fine for MVP
    const expandedIds = Array.from(expandedGoals)
    if (expandedIds.length > 0) {
      try {
        const promises = expandedIds.map((id) => annualPlanningService.getActivities(id))
        const results = await Promise.all(promises)
        const newCache = { ...goalActivities }
        results.forEach((activities, index) => {
          newCache[expandedIds[index]] = activities
        })
        setGoalActivities(newCache)
      } catch (error) {
        console.error('Failed to refresh expanded activities', error)
      }
    }
  }

  if (loading) {
    return (
      <Container maxWidth='xl' sx={{ py: 4 }}>
        <Skeleton variant='rectangular' width={120} height={36} sx={{ mb: 2 }} />
        <Skeleton variant='rectangular' height={160} sx={{ mb: 4, borderRadius: 'md' }} />

        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Skeleton width={200} height={32} />
            <Skeleton width={100} height={32} />
          </Box>
          <Skeleton variant='rectangular' height={100} sx={{ borderRadius: 'md' }} />
        </Box>

        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Skeleton width={150} height={32} />
            <Skeleton width={100} height={32} />
          </Box>
          <Grid container spacing={2}>
            <Grid xs={12} md={6}>
              <Skeleton variant='rectangular' height={200} sx={{ borderRadius: 'md' }} />
            </Grid>
            <Grid xs={12} md={6}>
              <Skeleton variant='rectangular' height={200} sx={{ borderRadius: 'md' }} />
            </Grid>
          </Grid>
        </Box>
      </Container>
    )
  }
  if (!area) return <Typography>Area not found</Typography>

  return (
    <Container maxWidth='xl' sx={{ py: 4, pb: 10 }}>
      {/* Header */}
      <Button variant='plain' startDecorator={<ArrowBackIcon />} onClick={() => navigate('/annual-planning')} sx={{ mb: 2 }}>
        Back to Plan
      </Button>

      <Card variant='soft' sx={{ mb: 4, bgcolor: area.color ? `${area.color}20` : undefined, borderColor: area.color }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ fontSize: '3rem' }}>{area.icon}</Box>
            <Box>
              <Typography level='h2'>{area.name}</Typography>
              <Typography level='body-lg'>{area.description}</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Priorities */}
      <Box sx={{ mb: 4 }}>
        <Stack direction='row' justifyContent='space-between' alignItems='center' mb={2}>
          <Typography level='h3'>{t('annualPlanning.priority.title')}</Typography>
        </Stack>
        <Grid container spacing={2}>
          {priorities.map((priority) => (
            <Grid key={priority._id} xs={12}>
              <Card orientation='horizontal' variant='outlined'>
                <CardContent>
                  <Typography level='title-lg'>{priority.title}</Typography>
                  <Typography level='body-sm'>{priority.description}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {priorities.length === 0 && (
            <Typography level='body-sm' textColor='text.tertiary'>
              No priorities linked to this area yet.
            </Typography>
          )}
        </Grid>
      </Box>

      {/* Goals */}
      <Box>
        <Stack direction='row' justifyContent='space-between' alignItems='center' mb={2}>
          <Typography level='h3'>{t('annualPlanning.goal.title')}s</Typography>
          <Button startDecorator={<AddIcon />} onClick={handleAddGoal}>
            {t('annualPlanning.goal.add')}
          </Button>
        </Stack>

        <Grid container spacing={2}>
          {goals.map((goal) => (
            <Grid key={goal._id} xs={12} md={6}>
              <Card variant='outlined' sx={{ height: '100%' }}>
                {goal.image_url && (
                  <CardOverflow>
                    <AspectRatio ratio='4'>
                      <img src={goal.image_url} alt={goal.title} loading='lazy' />
                    </AspectRatio>
                  </CardOverflow>
                )}
                <CardContent>
                  <Stack direction='row' justifyContent='space-between' alignItems='flex-start'>
                    <Box>
                      <Typography level='title-lg'>{goal.title}</Typography>
                      <Typography level='body-sm'>{goal.description}</Typography>
                    </Box>
                    <Stack direction='row' spacing={1}>
                      <IconButton size='sm' onClick={() => handleToggleExpand(goal._id)}>
                        {expandedGoals.has(goal._id) ? <CollapseIcon /> : <ExpandIcon />}
                      </IconButton>
                      <IconButton size='sm' onClick={() => handleEditGoal(goal)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size='sm' color='danger' onClick={() => handleDeleteGoal(goal._id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  </Stack>

                  <Box sx={{ mt: 2 }}>
                    <Stack direction='row' justifyContent='space-between' mb={0.5}>
                      <Typography level='body-xs'>Progress</Typography>
                      <Typography level='body-xs'>{goal.progress}%</Typography>
                    </Stack>
                    <LinearProgress determinate value={goal.progress} />
                  </Box>

                  {goal.target_date && (
                    <Chip size='sm' variant='soft' sx={{ mt: 2 }}>
                      Due: {new Date(goal.target_date).toLocaleDateString()}
                    </Chip>
                  )}

                  {/* Expanded Activities Section */}
                  {expandedGoals.has(goal._id) && (
                    <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                      <Typography level='title-sm' mb={1}>
                        Key Activities
                      </Typography>
                      {!goalActivities[goal._id] ? (
                        <Skeleton variant='text' width='60%' />
                      ) : goalActivities[goal._id].length === 0 ? (
                        <Typography level='body-xs' textColor='text.tertiary'>
                          No activities yet.
                        </Typography>
                      ) : (
                        <Stack spacing={1}>
                          {goalActivities[goal._id].map((activity) => (
                            <Box key={activity.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.solidBg' }} />
                              <Typography level='body-sm'>{activity.title}</Typography>
                            </Box>
                          ))}
                        </Stack>
                      )}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      <GoalDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        focusAreaId={id}
        priorities={priorities}
        goal={selectedGoal}
        onSuccess={handleGoalSuccess}
      />
    </Container>
  )
}

export default FocusAreaView

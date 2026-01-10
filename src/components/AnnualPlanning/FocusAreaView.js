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
  AspectRatio,
  Modal,
  ModalDialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemDecorator
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

  // Error Modal State
  const [errorModal, setErrorModal] = useState({ open: false, message: '', milestones: [] })

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

  const handleStatusChange = async (goal) => {
    const statusCycle = { not_started: 'in_progress', in_progress: 'completed', completed: 'not_started' }
    const newStatus = statusCycle[goal.status] || 'in_progress'

    // Validate: Cannot mark as completed if there are uncompleted milestones
    if (newStatus === 'completed' && goal.milestones && goal.milestones.length > 0) {
      const uncompletedMilestones = goal.milestones.filter((m) => !m.completed)
      if (uncompletedMilestones.length > 0) {
        setErrorModal({
          open: true,
          message: 'Cannot mark goal as completed',
          milestones: uncompletedMilestones
        })
        return
      }
    }

    try {
      await annualPlanningService.updateGoal(goal._id, { ...goal, status: newStatus })
      fetchData()
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const getStatusConfig = (status) => {
    const configs = {
      not_started: { label: 'Not Started', color: 'neutral', icon: '○' },
      in_progress: { label: 'In Progress', color: 'primary', icon: '◐' },
      completed: { label: 'Completed', color: 'success', icon: '●' }
    }
    return configs[status] || configs.not_started
  }

  const calculateProgress = (goal) => {
    // If goal has milestones, calculate based on completion
    if (goal.milestones && goal.milestones.length > 0) {
      const completedCount = goal.milestones.filter((m) => m.completed).length
      return Math.round((completedCount / goal.milestones.length) * 100)
    }
    // Otherwise use manual progress field
    return goal.progress || 0
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

  // Determine current quarter for authentic default
  const getCurrentQuarter = () => {
    const month = new Date().getMonth() + 1
    return Math.ceil(month / 3)
  }

  // Quarter State
  const [quarterFilter, setQuarterFilter] = useState(getCurrentQuarter())
  const [activeTab, setActiveTab] = useState(0) // 0: Goals, 1: Priorities

  // Calculate days left in quarter
  const getDaysLeftInQuarter = (q) => {
    const year = new Date().getFullYear()
    const quarterEndMonth = q * 3 - 1 // 0-indexed (2, 5, 8, 11)
    // Get last day of that month
    const endDate = new Date(year, quarterEndMonth + 1, 0)
    const today = new Date()
    const diffTime = endDate - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  // Split Goals into Objectives and Quarterly Goals
  const yearlyObjectives = goals.filter((g) => g.type === 'yearly' || (!g.type && !g.quarter))
  const quarterlyGoals = goals.filter((g) => g.type === 'quarterly' || g.quarter)

  // Filter Children by Quarter
  const currentQuarterGoals = quarterlyGoals.filter((g) => g.quarter === quarterFilter)

  // Map Children to Parents
  const goalsByParent = currentQuarterGoals.reduce((acc, goal) => {
    const pid = goal.parent_id || 'orphan'
    if (!acc[pid]) acc[pid] = []
    acc[pid].push(goal)
    return acc
  }, {})

  const handleAddObjective = () => {
    // If we have a specific quarter selected, assume we want to add a goal to that quarter
    if (quarterFilter) {
      setSelectedGoal({ type: 'quarterly', quarter: quarterFilter })
    } else {
      setSelectedGoal({ type: 'yearly' })
    }
    setDialogOpen(true)
  }

  const handleAddChildGoal = (parentId) => {
    setSelectedGoal({ type: 'quarterly', quarter: quarterFilter, parent_id: parentId })
    setDialogOpen(true)
  }

  if (loading) {
    return (
      <Container maxWidth='xl' sx={{ py: 4 }}>
        <Skeleton variant='rectangular' width={120} height={36} sx={{ mb: 2 }} />
        <Skeleton variant='rectangular' height={160} sx={{ mb: 4, borderRadius: 'md' }} />
        {/* ... Skeletons ... */}
      </Container>
    )
  }
  if (!area) return <Typography>Area not found</Typography>

  return (
    <Container maxWidth='xl' sx={{ py: 4, pb: 10 }}>
      {/* Header */}
      <Button
        variant='plain'
        color='neutral'
        startDecorator={<ArrowBackIcon />}
        onClick={() => navigate('/annual-planning')}
        sx={{ mb: 2, pl: 0 }}
      >
        Back to Plan
      </Button>

      <Box sx={{ mb: 4 }}>
        <Box
          sx={{
            p: { xs: 3, md: 4 },
            width: '100%',
            bgcolor: area.color ? `${area.color}15` : 'background.level1',
            borderRadius: 'lg',
            border: '1px solid',
            borderColor: area.color ? `${area.color}30` : 'divider',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            textAlign: 'left',
            gap: 2
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                fontSize: { xs: '2.5rem', md: '3rem' },
                lineHeight: 1,
                flexShrink: 0
              }}
            >
              {area.icon}
            </Box>
            <Typography level='h2' fontWeight={700}>
              {area.name}
            </Typography>
          </Box>

          <Typography level='body-md' textColor='text.tertiary' maxWidth='600px'>
            {area.description}
          </Typography>
        </Box>
      </Box>

      {/* Smart Banner: Days Left (Minimalist) */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
        <Typography level='title-sm' sx={{ color: 'primary.600' }}>
          🚀 <b>{getDaysLeftInQuarter(quarterFilter)} days left</b> to crush your Q{quarterFilter} goals!
        </Typography>
      </Box>

      {/* Mobile Tabs (View Switcher) */}
      <Box
        sx={{
          display: { xs: 'flex', md: 'none' },
          p: 0.5,
          mb: 4,
          borderRadius: 'xl',
          bgcolor: 'background.level1',
          overflow: 'hidden'
        }}
      >
        {['Goals', 'Priorities'].map((tabLabel, index) => {
          const isActive = activeTab === index
          return (
            <Box
              key={index}
              onClick={() => setActiveTab(index)}
              sx={{
                flex: 1,
                py: 1,
                px: 1,
                textAlign: 'center',
                borderRadius: 'lg',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                bgcolor: isActive ? 'background.surface' : 'transparent',
                boxShadow: isActive ? 'sm' : 'none',
                color: isActive ? 'primary.main' : 'text.secondary',
                fontWeight: isActive ? 600 : 500,
                userSelect: 'none'
              }}
            >
              <Typography level='body-sm' textColor='inherit' fontWeight='inherit'>
                {tabLabel}
              </Typography>
            </Box>
          )
        })}
      </Box>

      {/* Goals View (Tab 0) */}
      <Box sx={{ display: { xs: activeTab === 0 ? 'block' : 'none', md: 'block' } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent='space-between'
          alignItems={{ xs: 'stretch', sm: 'center' }}
          mb={3}
          spacing={2}
        >
          <Typography level='h3'>{t('annualPlanning.goal.title')}s</Typography>

          {/* Quarter Selector Tabs */}
          <Box
            sx={{
              display: 'flex',
              gap: 0.5,
              bgcolor: 'background.level1',
              p: 0.5,
              borderRadius: 'md',
              alignSelf: { xs: 'center', sm: 'auto' }
            }}
          >
            {[1, 2, 3, 4].map((q) => (
              <Box
                key={q}
                onClick={() => setQuarterFilter(q)}
                sx={{
                  px: 2,
                  py: 0.5,
                  borderRadius: 'sm',
                  cursor: 'pointer',
                  bgcolor: quarterFilter === q ? 'background.surface' : 'transparent',
                  boxShadow: quarterFilter === q ? 'xs' : 'none',
                  color: quarterFilter === q ? 'text.primary' : 'text.tertiary',
                  fontWeight: quarterFilter === q ? 600 : 500,
                  fontSize: '0.875rem',
                  transition: 'all 0.2s'
                }}
              >
                Q{q}
              </Box>
            ))}
          </Box>

          <Button startDecorator={<AddIcon />} onClick={handleAddObjective}>
            {/* Context-aware Button Text */}
            {quarterFilter ? `Add Q${quarterFilter} Goal` : 'Add Objective'}
          </Button>
        </Stack>

        <Stack spacing={4}>
          {yearlyObjectives.map((objective) => (
            <Box key={objective._id}>
              {/* Objective Header Card */}
              <Card variant='outlined' sx={{ mb: 2, borderColor: 'primary.200', bgcolor: 'primary.50' }}>
                <CardContent>
                  <Stack direction='row' justifyContent='space-between' alignItems='center'>
                    <Box>
                      <Typography level='body-xs' fontWeight={700} textColor='primary.600' letterSpacing='1px' mb={0.5}>
                        YEARLY OBJECTIVE
                      </Typography>
                      <Typography level='h4' fontWeight={600}>
                        {objective.title}
                      </Typography>
                      {objective.description && (
                        <Typography level='body-sm' textColor='text.secondary'>
                          {objective.description}
                        </Typography>
                      )}
                    </Box>
                    <Stack direction='row'>
                      <IconButton size='sm' onClick={() => handleEditGoal(objective)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size='sm' color='danger' onClick={() => handleDeleteGoal(objective._id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>

              {/* Children Goals (Quarterly) */}
              <Box sx={{ pl: { xs: 0, md: 4 }, pr: 0 }}>
                <Grid container spacing={2}>
                  {(goalsByParent[objective._id] || []).map((goal) => (
                    <Grid key={goal._id} xs={12} md={6}>
                      <Card variant='soft' sx={{ position: 'relative' }}>
                        {goal.image_url && (
                          <AspectRatio
                            ratio='2'
                            sx={{
                              mb: 2,
                              borderRadius: 'md',
                              position: 'relative',
                              '&:hover .status-badge': { opacity: 1 }
                            }}
                          >
                            <img src={goal.image_url} alt={goal.title} loading='lazy' />
                            {/* Status Badge Overlay */}
                            <Box
                              className='status-badge'
                              onClick={(e) => {
                                e.stopPropagation()
                                handleStatusChange(goal)
                              }}
                              sx={{
                                position: 'absolute',
                                top: 12,
                                right: 12,
                                opacity: 0.9,
                                transition: 'all 0.3s ease',
                                cursor: 'pointer',
                                zIndex: 2,
                                '&:hover': {
                                  opacity: 1,
                                  transform: 'scale(1.05)'
                                }
                              }}
                            >
                              <Chip
                                color={getStatusConfig(goal.status).color}
                                variant='solid'
                                size='sm'
                                sx={{
                                  backdropFilter: 'blur(8px)',
                                  boxShadow: 'lg',
                                  fontWeight: 600,
                                  fontSize: '0.75rem',
                                  py: 0.5,
                                  px: 1.5,
                                  borderRadius: 'xl'
                                }}
                              >
                                {getStatusConfig(goal.status).icon} {getStatusConfig(goal.status).label}
                              </Chip>
                            </Box>
                          </AspectRatio>
                        )}
                        <CardContent>
                          <Stack direction='row' justifyContent='space-between'>
                            <Typography level='title-md'>{goal.title}</Typography>
                            <Stack direction='row' spacing={0.5}>
                              <IconButton size='sm' variant='plain' onClick={() => handleEditGoal(goal)}>
                                <EditIcon fontSize='small' />
                              </IconButton>
                              <IconButton size='sm' variant='plain' color='danger' onClick={() => handleDeleteGoal(goal._id)}>
                                <DeleteIcon fontSize='small' />
                              </IconButton>
                            </Stack>
                          </Stack>
                          <Box sx={{ my: 1 }}>
                            <Box
                              sx={{
                                width: '100%',
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
                                  bgcolor: area?.color || '#3B82F6',
                                  transition: 'width 0.3s ease'
                                }}
                              />
                            </Box>
                          </Box>
                          <Typography level='body-xs'>{calculateProgress(goal)}% Complete</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}

                  {/* Add Child Button */}
                  <Grid xs={12} md={6}>
                    <Button
                      variant='dashed'
                      fullWidth
                      sx={{ height: '100%', minHeight: 80, color: 'text.tertiary' }}
                      onClick={() => handleAddChildGoal(objective._id)}
                    >
                      + Add Goal to Q{quarterFilter}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          ))}

          {/* Orphan Goals Section (if any exist for this quarter) */}
          {goalsByParent['orphan'] && goalsByParent['orphan'].length > 0 && (
            <Box sx={{ mb: 6 }}>
              <Typography level='title-sm' sx={{ mb: 2, color: 'text.tertiary', textTransform: 'uppercase' }}>
                Other Q{quarterFilter} Goals
              </Typography>
              <Grid container spacing={2}>
                {goalsByParent['orphan'].map((goal) => (
                  <Grid key={goal._id} xs={12} md={6}>
                    <Card variant='soft' sx={{ position: 'relative' }}>
                      {goal.image_url && (
                        <AspectRatio
                          ratio='2'
                          sx={{
                            mb: 2,
                            borderRadius: 'md',
                            position: 'relative',
                            '&:hover .status-badge': { opacity: 1 }
                          }}
                        >
                          <img src={goal.image_url} alt={goal.title} loading='lazy' />
                          {/* Status Badge Overlay */}
                          <Box
                            className='status-badge'
                            onClick={(e) => {
                              e.stopPropagation()
                              handleStatusChange(goal)
                            }}
                            sx={{
                              position: 'absolute',
                              top: 12,
                              right: 12,
                              opacity: 0.9,
                              transition: 'all 0.3s ease',
                              cursor: 'pointer',
                              zIndex: 2,
                              '&:hover': {
                                opacity: 1,
                                transform: 'scale(1.05)'
                              }
                            }}
                          >
                            <Chip
                              color={getStatusConfig(goal.status).color}
                              variant='solid'
                              size='sm'
                              sx={{
                                backdropFilter: 'blur(8px)',
                                boxShadow: 'lg',
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                py: 0.5,
                                px: 1.5,
                                borderRadius: 'xl'
                              }}
                            >
                              {getStatusConfig(goal.status).icon} {getStatusConfig(goal.status).label}
                            </Chip>
                          </Box>
                        </AspectRatio>
                      )}
                      <CardContent>
                        <Stack direction='row' justifyContent='space-between'>
                          <Typography level='title-md'>{goal.title}</Typography>
                          <Stack direction='row' spacing={0.5}>
                            <IconButton size='sm' variant='plain' onClick={() => handleEditGoal(goal)}>
                              <EditIcon fontSize='small' />
                            </IconButton>
                            <IconButton size='sm' variant='plain' color='danger' onClick={() => handleDeleteGoal(goal._id)}>
                              <DeleteIcon fontSize='small' />
                            </IconButton>
                          </Stack>
                        </Stack>
                        <Box sx={{ my: 1 }}>
                          <Box
                            sx={{
                              width: '100%',
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
                                bgcolor: area?.color || '#3B82F6',
                                transition: 'width 0.3s ease'
                              }}
                            />
                          </Box>
                        </Box>
                        <Typography level='body-xs'>{calculateProgress(goal)}% Complete</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {yearlyObjectives.length === 0 && (!goalsByParent['orphan'] || goalsByParent['orphan'].length === 0) && (
            <Box sx={{ textAlign: 'center', py: 8, opacity: 0.6 }}>
              <Typography level='h4'>No objectives yet.</Typography>
              <Typography>Start by defining a Yearly Objective.</Typography>
            </Box>
          )}
        </Stack>
      </Box>

      {/* Priorities (Tab 1) */}
      <Box sx={{ mb: 4, mt: 8, display: { xs: activeTab === 1 ? 'block' : 'none', md: 'block' } }}>
        <Stack direction='row' justifyContent='space-between' alignItems='center' mb={2}>
          <Typography level='h3'>{t('annualPlanning.priority.title')}</Typography>
        </Stack>
        <Grid container spacing={2}>
          {priorities.map((priority) => (
            <Grid key={priority._id} xs={12}>
              <Card orientation='horizontal' variant='outlined' sx={{ alignItems: 'flex-start' }}>
                <CardContent>
                  <Typography level='title-lg' sx={{ mb: 0.5 }}>
                    {priority.title}
                  </Typography>
                  <Typography level='body-sm' textColor='text.tertiary'>
                    {priority.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {priorities.length === 0 && (
            <Typography level='body-sm' textColor='text.tertiary' sx={{ fontStyle: 'italic' }}>
              No priorities linked to this area yet.
            </Typography>
          )}
        </Grid>
      </Box>

      <GoalDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        focusAreaId={id}
        priorities={priorities}
        goal={selectedGoal}
        onSuccess={handleGoalSuccess}
        yearlyObjectives={yearlyObjectives} // Pass for parent selection
      />

      {/* Error Modal */}
      <Modal open={errorModal.open} onClose={() => setErrorModal({ open: false, message: '', milestones: [] })}>
        <ModalDialog
          variant='outlined'
          color='danger'
          sx={{
            maxWidth: 500,
            borderRadius: 'lg',
            p: 3,
            boxShadow: 'lg'
          }}
        >
          <DialogTitle sx={{ fontSize: '1.25rem', fontWeight: 700 }}>{errorModal.message}</DialogTitle>
          <DialogContent>
            <Typography level='body-sm' sx={{ mb: 2, color: 'text.secondary' }}>
              Please complete these milestones first:
            </Typography>
            <List marker='disc' size='sm'>
              {errorModal.milestones.map((milestone, idx) => (
                <ListItem key={idx}>
                  <Typography level='body-sm'>{milestone.title}</Typography>
                </ListItem>
              ))}
            </List>
            <Button
              variant='solid'
              color='danger'
              onClick={() => setErrorModal({ open: false, message: '', milestones: [] })}
              sx={{ mt: 2 }}
              fullWidth
            >
              Got it
            </Button>
          </DialogContent>
        </ModalDialog>
      </Modal>
    </Container>
  )
}

export default FocusAreaView

import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, Typography, Button, Grid, Card, CardContent, Container, Stack, Skeleton, LinearProgress, Divider } from '@mui/joy'
import {
  Timeline as TimelineIcon,
  Edit as EditIcon,
  Settings as SettingsIcon,
  ArrowForward as ArrowForwardIcon,
  LightMode as DayIcon,
  CheckCircle as CheckCircleIcon,
  Flag as FlagIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material'
import { annualPlanningService } from '../../api/services'
import PriorityDialog from './PriorityDialog'

const AnnualPlanningHome = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState(null)
  const [areas, setAreas] = useState([])
  const [metrics, setMetrics] = useState({ totalGoals: 0, completedGoals: 0, progress: 0 })
  const [priorities, setPriorities] = useState([])
  const [showPriorityDialog, setShowPriorityDialog] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  // Auto-redirect to setup if plan exists but no focus areas
  useEffect(() => {
    if (plan && areas.length === 0 && !loading) {
      navigate('/annual-planning/setup')
    }
  }, [plan, areas, loading, navigate])

  const fetchData = async () => {
    try {
      setLoading(true)
      const year = new Date().getFullYear()

      try {
        const planData = await annualPlanningService.getAnnualPlan(year)

        if (planData) {
          setPlan(planData)
          setEditTitle(planData.title || `Annual Plan ${year}`)

          const [areasData, prioritiesData] = await Promise.all([
            annualPlanningService.getFocusAreas(planData._id),
            annualPlanningService.getPriorities(planData._id)
          ])

          setPriorities(prioritiesData)

          // Calculate Metrics Aggregation
          // 1. Total Goals
          // 2. Completed Goals
          // 3. Overall Progress (Average of all goal progresses, where goal progress is based on milestones if present)

          const goals = await Promise.all(areasData.map((a) => annualPlanningService.getGoals(a._id)))
          // Initialize enriched areas with progress
          const enrichedAreas = areasData.map((area, index) => {
            const areaGoals = goals[index] || []
            let areaProgressSum = 0

            areaGoals.forEach((g) => {
              let p = 0
              if (g.milestones && g.milestones.length > 0) {
                const completed = g.milestones.filter((m) => m.completed).length
                p = (completed / g.milestones.length) * 100
              } else {
                p = g.progress || 0
              }
              areaProgressSum += p
            })

            return {
              ...area,
              progress: areaGoals.length > 0 ? Math.round(areaProgressSum / areaGoals.length) : 0
            }
          })

          setAreas(enrichedAreas)

          // Global Metrics Calculation
          const allGoals = goals.flat()
          let totalProgressSum = 0
          let totalGoalsCount = allGoals.length
          let completedGoalsCount = 0

          allGoals.forEach((g) => {
            let goalProgress = 0
            if (g.milestones && g.milestones.length > 0) {
              const completedMilestones = g.milestones.filter((m) => m.completed).length
              goalProgress = (completedMilestones / g.milestones.length) * 100
            } else {
              goalProgress = g.progress || 0
            }

            // Check if goal is completed based on status or 100% progress
            if (g.status === 'completed' || goalProgress === 100) {
              completedGoalsCount++
            }

            totalProgressSum += goalProgress
          })

          setMetrics({
            totalGoals: totalGoalsCount,
            completedGoals: completedGoalsCount,
            progress: totalGoalsCount > 0 ? Math.round(totalProgressSum / totalGoalsCount) : 0
          })
        } else {
          // No plan found, redirect to setup
          // navigate('/annual-planning/setup')
        }
      } catch (error) {
        // Handle 404 (no plan exists)
        if (error.response?.status === 404) {
          console.log('No annual plan found')
          setPlan(null)
        } else {
          console.error('Failed to load annual plan', error)
        }
      } finally {
        setLoading(false)
      }
    } catch (error) {
      console.error('Error in fetchData:', error)
      setLoading(false)
    }
  }

  const handleSaveTitle = async () => {
    if (!plan) return
    try {
      const updated = await annualPlanningService.updateAnnualPlan(plan._id, { title: editTitle })
      setPlan(updated)
      setIsEditingTitle(false)
    } catch (error) {
      console.error('Failed to update plan title', error)
    }
  }

  if (loading) {
    return (
      <Container maxWidth='xl' sx={{ py: 4 }}>
        <Skeleton variant='text' level='h1' width={200} sx={{ mb: 2 }} />
        <Grid container spacing={3}>
          {[1, 2, 3].map((i) => (
            <Grid key={i} xs={12} md={4}>
              <Skeleton variant='rectangular' height={200} sx={{ borderRadius: 'md' }} />
            </Grid>
          ))}
        </Grid>
      </Container>
    )
  }

  const handleCreatePlan = async () => {
    try {
      setLoading(true)
      const year = new Date().getFullYear()
      const newPlan = await annualPlanningService.createAnnualPlan({
        year,
        title: `My ${year} Plan`
      })
      setPlan(newPlan)
      setEditTitle(newPlan.title)
      // Navigate immediately to setup
      navigate('/annual-planning/setup')
    } catch (error) {
      console.error('Failed to create annual plan:', error)
      setLoading(false)
    }
  }

  if (!plan && !loading) {
    return (
      <Container maxWidth='md' sx={{ py: 10, textAlign: 'center' }}>
        <Box sx={{ mb: 4 }}>
          <TimelineIcon sx={{ fontSize: 80, color: 'primary.plainColor', mb: 2 }} />
          <Typography level='h2' sx={{ mb: 2 }}>
            {t('annualPlanning.home.startJourney', { year: new Date().getFullYear() })}
          </Typography>
          <Typography level='body-lg' sx={{ color: 'text.secondary', maxWidth: 500, mx: 'auto' }}>
            {t('annualPlanning.home.startDescription')}
          </Typography>
        </Box>
        <Button onClick={handleCreatePlan} size='lg' endDecorator={<ArrowForwardIcon />}>
          {t('annualPlanning.home.createPlan')}
        </Button>
      </Container>
    )
  }

  // Intermediate screen removed - handled by auto-redirect useEffect

  return (
    <Container maxWidth='xl' sx={{ py: 4 }}>
      {/* Header */}
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' alignItems='center' mb={4} spacing={2}>
        <Box>
          {isEditingTitle ? (
            <Stack direction='row' spacing={1} alignItems='center'>
              <Box
                component='input'
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                style={{
                  fontSize: '2.5rem',
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  border: 'none',
                  borderBottom: '2px solid',
                  borderColor: 'var(--joy-palette-text-primary)',
                  outline: 'none',
                  background: 'transparent',
                  maxWidth: '400px'
                }}
              />
              <Button size='sm' variant='soft' color='success' onClick={handleSaveTitle} startDecorator={<SaveIcon />}>
                {t('annualPlanning.home.save')}
              </Button>
              <Button size='sm' variant='plain' color='neutral' onClick={() => setIsEditingTitle(false)}>
                <CancelIcon />
              </Button>
            </Stack>
          ) : (
            <Typography level='h2' sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TimelineIcon sx={{ color: 'primary.plainColor' }} />
              {plan?.title || t('annualPlanning.title') + ' ' + plan.year}
              <Button size='sm' variant='plain' color='neutral' onClick={() => setIsEditingTitle(true)}>
                <EditIcon fontSize='small' />
              </Button>
            </Typography>
          )}
          <Typography level='body-md' textColor='text.tertiary'>
            {t('annualPlanning.home.overview')}
          </Typography>
        </Box>
        <Stack direction='row' spacing={2}>
          <Button component={Link} to='/annual-planning/daily-routine' variant='soft' color='warning' startDecorator={<DayIcon />}>
            {t('annualPlanning.home.dailyRoutineBtn')}
          </Button>
          <Button component={Link} to='/annual-planning/setup' variant='outlined' startDecorator={<EditIcon />}>
            {t('annualPlanning.home.editPlanBtn')}
          </Button>
        </Stack>
      </Stack>

      {/* Metrics Dashboard */}
      <Box sx={{ mb: 6 }}>
        {/* Desktop View */}
        <Grid container spacing={2} sx={{ display: { xs: 'none', md: 'flex' } }}>
          <Grid xs={4}>
            <Card variant='outlined' sx={{ height: '100%', bgcolor: 'background.surface' }}>
              <CardContent>
                <Typography level='title-sm' textColor='text.tertiary' mb={1}>
                  {t('annualPlanning.home.totalProgress')}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                  <Typography level='h2'>{metrics.progress}%</Typography>
                </Box>
                <LinearProgress
                  determinate
                  value={metrics.progress}
                  thickness={6}
                  sx={{
                    mt: 2,
                    bgcolor: 'background.level2',
                    color: 'primary.plainColor',
                    '--LinearProgress-radius': '4px'
                  }}
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid xs={4}>
            <Card variant='outlined' sx={{ height: '100%', bgcolor: 'background.surface' }}>
              <CardContent>
                <Stack direction='row' justifyContent='space-between' alignItems='flex-start'>
                  <Typography level='title-sm' textColor='text.tertiary'>
                    {t('annualPlanning.home.completedGoals')}
                  </Typography>
                  <CheckCircleIcon color='success' fontSize='small' />
                </Stack>
                <Typography level='h2' sx={{ mt: 1 }}>
                  {metrics.completedGoals}
                  <Typography level='h4' textColor='text.tertiary' component='span'>
                    /{metrics.totalGoals}
                  </Typography>
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid xs={4}>
            <Card variant='outlined' sx={{ height: '100%', bgcolor: 'background.surface' }}>
              <CardContent>
                <Stack direction='row' justifyContent='space-between' alignItems='flex-start' mb={2}>
                  <Typography level='title-sm' textColor='text.tertiary'>
                    {t('annualPlanning.home.topPriorities')}
                  </Typography>
                  <FlagIcon color='warning' fontSize='small' />
                </Stack>
                {priorities.length > 0 ? (
                  <Stack spacing={1}>
                    {priorities.slice(0, 3).map((p, i) => (
                      <Stack key={p._id || i} direction='row' spacing={1} alignItems='center'>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'warning.main', flexShrink: 0 }} />
                        <Typography level='body-sm' noWrap>
                          {p.title}
                        </Typography>
                      </Stack>
                    ))}
                    {priorities.length > 3 && (
                      <Typography level='body-xs' textColor='text.tertiary'>
                        +{priorities.length - 3} more
                      </Typography>
                    )}
                  </Stack>
                ) : (
                  <Typography level='body-sm' textColor='text.tertiary' fontStyle='italic'>
                    {t('annualPlanning.home.noPrioritiesSet')}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Mobile View: Minimalistic Row */}
        <Card variant='outlined' sx={{ display: { xs: 'flex', md: 'none' }, p: 2 }}>
          <Stack direction='row' justifyContent='space-between' alignItems='center' divider={<Divider orientation='vertical' />}>
            <Stack alignItems='center' spacing={0.5} sx={{ width: '33%' }}>
              <TimelineIcon fontSize='small' sx={{ color: 'primary.plainColor' }} />
              <Typography level='title-lg'>{metrics.progress}%</Typography>
              <Typography level='body-xs' textColor='text.tertiary'>
                Progress
              </Typography>
            </Stack>
            <Stack alignItems='center' spacing={0.5} sx={{ width: '33%' }}>
              <CheckCircleIcon fontSize='small' color='success' />
              <Typography level='title-lg'>
                {metrics.completedGoals}/{metrics.totalGoals}
              </Typography>
              <Typography level='body-xs' textColor='text.tertiary'>
                Goals
              </Typography>
            </Stack>
            <Stack alignItems='center' spacing={0.5} sx={{ width: '33%' }}>
              <FlagIcon fontSize='small' color='warning' />
              <Typography level='title-lg'>{priorities.length}</Typography>
              <Typography level='body-xs' textColor='text.tertiary'>
                Priorities
              </Typography>
            </Stack>
          </Stack>
        </Card>
      </Box>

      {/* Focus Areas Grid */}
      <Typography level='h4' sx={{ mb: 2 }}>
        {t('annualPlanning.home.focusAreas')}
      </Typography>
      <Grid container spacing={3} sx={{ mb: 6 }}>
        {areas.map((area, index) => (
          <Grid key={area._id || index} xs={12} md={4}>
            <Card
              component={Link}
              to={`/annual-planning/area/${area._id}`}
              variant='outlined'
              sx={{
                height: '100%',
                borderTop: `4px solid ${area.color}`,
                textDecoration: 'none',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 'md',
                  borderColor: 'primary.200'
                }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography level='h1' sx={{ fontSize: '2.5rem' }}>
                      {area.icon}
                    </Typography>
                    <Typography level='h3'>{area.name}</Typography>
                  </Box>
                  <ArrowForwardIcon sx={{ color: 'text.tertiary' }} />
                </Box>
                <Typography level='body-sm' textColor='text.secondary'>
                  {area.description}
                </Typography>

                <Box sx={{ mt: 'auto', pt: 2 }}>
                  <Stack direction='row' justifyContent='space-between' alignItems='center' mb={1}>
                    <Typography level='body-xs' textColor='text.tertiary'>
                      {t('annualPlanning.home.progress')}
                    </Typography>
                    <Typography level='body-xs' textColor='text.secondary'>
                      {area.progress || 0}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    determinate
                    value={area.progress || 0}
                    thickness={4}
                    sx={{
                      bgcolor: 'background.level2',
                      color: area.color || 'primary.plainColor' // Use area color if possible
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Yearly Priorities Section */}
      <Stack direction='row' alignItems='center' spacing={2} sx={{ mb: 2 }}>
        <Typography level='h4'>{t('annualPlanning.home.yearlyPriorities')}</Typography>
        <Button size='sm' variant='soft' color='neutral' onClick={() => setShowPriorityDialog(true)} sx={{ minHeight: 32, px: 1 }}>
          +
        </Button>
      </Stack>

      {priorities.length === 0 ? (
        <Typography level='body-md' textColor='text.tertiary'>
          {t('annualPlanning.home.noPrioritiesAdded')}
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {priorities.map((priority) => (
            <Grid key={priority._id} xs={12} md={6}>
              <Card variant='outlined' sx={{ flexDirection: 'row', alignItems: 'center', gap: 2, p: 2 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'warning.main', flexShrink: 0 }} />
                <Box>
                  <Typography level='title-md'>{priority.title}</Typography>
                  {priority.description && (
                    <Typography level='body-sm' textColor='text.tertiary'>
                      {priority.description}
                    </Typography>
                  )}
                </Box>
                {priority.deadline && (
                  <Typography level='body-xs' sx={{ ml: 'auto' }}>
                    {new Date(priority.deadline).toLocaleDateString()}
                  </Typography>
                )}
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <PriorityDialog
        open={showPriorityDialog}
        onClose={() => setShowPriorityDialog(false)}
        annualPlanId={plan?._id}
        focusAreas={areas}
        existingPriorities={priorities}
        onSuccess={fetchData}
      />
    </Container>
  )
}

export default AnnualPlanningHome

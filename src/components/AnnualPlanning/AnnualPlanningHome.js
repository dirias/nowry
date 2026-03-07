import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Container,
  Stack,
  Skeleton,
  LinearProgress,
  IconButton,
  Tooltip,
  Modal,
  ModalDialog,
  DialogTitle,
  DialogContent
} from '@mui/joy'
import {
  Timeline as TimelineIcon,
  Edit as EditIcon,
  Settings as SettingsIcon,
  ArrowForward as ArrowForwardIcon,
  LightMode as DayIcon,
  CheckCircle as CheckCircleIcon,
  Flag as FlagIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon
} from '@mui/icons-material'
import { annualPlanningService } from '../../api/services'
import { apiCache } from '../../api/utils/cache'
import useAnnualPlan from '../../hooks/useAnnualPlan'
import { useAuth } from '../../context/AuthContext'
import PriorityDialog from './PriorityDialog'
import PriorityList from './PriorityList'

const AnnualPlanningHome = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const year = new Date().getFullYear()
  const { user } = useAuth()
  const { plan: hookPlan, focusAreas: hookAreas, goals: hookGoals, priorities: hookPriorities, loading, reload } = useAnnualPlan(year, user)

  const [plan, setPlan] = useState(null)
  const [areas, setAreas] = useState([])
  const [metrics, setMetrics] = useState({ totalGoals: 0, completedGoals: 0, progress: 0 })
  const [priorities, setPriorities] = useState([])
  const [showPriorityDialog, setShowPriorityDialog] = useState(false)
  const [editingPriority, setEditingPriority] = useState(null)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState('')

  // Sync hook data into local state (needed so mutations can update UI immediately)
  useEffect(() => {
    if (loading) return
    setPlan(hookPlan)
    setEditTitle(hookPlan?.title || `Annual Plan ${year}`)
    setAreas(hookAreas)
    setPriorities(hookPriorities)

    // Compute global metrics from the flat goals list
    let totalProgressSum = 0
    let completedGoalsCount = 0
    hookGoals.forEach((g) => {
      let goalProgress = 0
      if (g.milestones?.length > 0) {
        const done = g.milestones.filter((m) => m.completed).length
        goalProgress = (done / g.milestones.length) * 100
      } else {
        goalProgress = g.progress || 0
      }
      if (g.status === 'completed' || goalProgress === 100) completedGoalsCount++
      totalProgressSum += goalProgress
    })

    setMetrics({
      totalGoals: hookGoals.length,
      completedGoals: completedGoalsCount,
      progress: hookGoals.length > 0 ? Math.round(totalProgressSum / hookGoals.length) : 0
    })
  }, [loading, hookPlan, hookAreas, hookGoals, hookPriorities])

  // Redirect to setup if loaded but no areas
  useEffect(() => {
    if (!loading && plan && areas.length === 0) {
      navigate('/annual-planning/setup')
    }
  }, [loading, plan, areas, navigate])

  const handleSaveTitle = async () => {
    if (!plan) return
    try {
      const updated = await annualPlanningService.updateAnnualPlan(plan._id, { title: editTitle })
      setPlan(updated)
      setIsEditingTitle(false)
      // Invalidate the cached plan so it reloads fresh
      apiCache.invalidatePrefix('annualPlan:')
    } catch (error) {
      console.error('Failed to update plan title', error)
    }
  }

  const handleEditPriority = (priority) => {
    setEditingPriority(priority)
    setShowPriorityDialog(true)
  }

  const handleDeletePriority = () => {
    // Re-fetch from server to reflect the deleted priority immediately
    reload()
  }

  // Early return removed to allow skeleton placeholders over actual layout

  const handleCreatePlan = async () => {
    // We don't have setLoading locally anymore, but creating a plan happens
    // when there is no plan, so it's a synchronous redirect mostly
    try {
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
    }
  }

  if (!plan && !loading) {
    return (
      <Container maxWidth='md' sx={{ py: { xs: 4, md: 8 }, textAlign: 'center' }}>
        <Box sx={{ mb: 3 }}>
          <TimelineIcon sx={{ fontSize: { xs: 60, md: 80 }, color: 'primary.plainColor', mb: 1.5 }} />
          <Typography level='title-md' sx={{ mb: 1.5, fontSize: { xs: '1.75rem', md: '2rem' } }}>
            {t('annualPlanning.home.startJourney', { year: new Date().getFullYear() })}
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.tertiary', maxWidth: 500, mx: 'auto', fontSize: { xs: '0.875rem', md: '1rem' } }}>
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
    <Container maxWidth='xl' sx={{ py: { xs: 1, md: 1.5 } }}>
      {/* Header */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent='space-between'
        alignItems='center'
        mb={{ xs: 1.5, md: 2 }}
        spacing={{ xs: 1.5, md: 1 }}
      >
        <Box>
          {isEditingTitle ? (
            <Stack direction='row' spacing={1} alignItems='center'>
              <Box
                component='input'
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                style={{
                  fontSize: '1.75rem',
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
            <Typography level='h3' sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: { xs: '1.5rem', md: '1.75rem' } }}>
              <TimelineIcon sx={{ color: 'primary.plainColor', fontSize: { xs: '1.5rem', md: '2rem' } }} />
              <Skeleton loading={loading} variant='text' width='12ch'>
                {plan?.title || t('annualPlanning.title') + ' ' + (plan?.year || '')}
              </Skeleton>
              {!loading && (
                <Button size='sm' variant='plain' color='neutral' onClick={() => setIsEditingTitle(true)}>
                  <EditIcon fontSize='small' />
                </Button>
              )}
            </Typography>
          )}
          <Typography level='body-md' textColor='text.tertiary' sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
            {t('annualPlanning.home.overview')}
          </Typography>
        </Box>
        <Stack direction='row' spacing={1}>
          {!loading && (
            <>
              <Button
                component={Link}
                to='/annual-planning/daily-routine'
                variant='soft'
                color='warning'
                startDecorator={<DayIcon />}
                size='sm'
              >
                {t('annualPlanning.home.dailyRoutineBtn')}
              </Button>
              <Button component={Link} to='/annual-planning/setup' variant='outlined' startDecorator={<EditIcon />} size='sm'>
                {t('annualPlanning.home.editPlanBtn')}
              </Button>
            </>
          )}
        </Stack>
      </Stack>

      {/* Metrics Dashboard - Ultra-Compact (Following Design Guidelines 5.6) */}
      <Box sx={{ mb: { xs: 2, md: 3 } }}>
        {/* Desktop View */}
        <Stack direction='row' spacing={1} sx={{ display: { xs: 'none', md: 'flex' } }}>
          <Box
            sx={{
              py: 1,
              px: 1.25,
              borderRadius: 'sm',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.surface',
              minWidth: 140,
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: 'primary.outlinedBorder',
                bgcolor: 'background.level1'
              }
            }}
          >
            <Stack direction='row' alignItems='center' spacing={0.75} mb={0.5}>
              <TimelineIcon sx={{ fontSize: 14, color: 'text.secondary', opacity: 0.5 }} />
              <Typography
                level='body-xs'
                sx={{
                  fontSize: '0.625rem',
                  opacity: 0.7,
                  color: 'text.tertiary',
                  textTransform: 'uppercase'
                }}
              >
                {t('annualPlanning.home.totalProgress')}
              </Typography>
            </Stack>
            <Typography
              level='h2'
              sx={{
                fontSize: '1.75rem',
                fontWeight: 700,
                lineHeight: 1,
                mb: 0.75
              }}
            >
              <Skeleton loading={loading} variant='text' width='2ch'>
                {metrics.progress}
              </Skeleton>
              {!loading && '%'}
            </Typography>
            <Skeleton loading={loading} variant='rectangular' height={6} sx={{ borderRadius: '2px', mb: 0.5 }} />
            {!loading && (
              <LinearProgress
                determinate
                value={metrics.progress}
                thickness={2}
                sx={{
                  bgcolor: 'background.level2',
                  color: 'primary.plainColor',
                  '--LinearProgress-radius': '2px'
                }}
              />
            )}
          </Box>

          {/* Only show completed goals if user has goals */}
          {metrics.totalGoals > 0 && (
            <Box
              sx={{
                py: 1,
                px: 1.25,
                borderRadius: 'sm',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.surface',
                minWidth: 140,
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: 'success.outlinedBorder',
                  bgcolor: 'background.level1'
                }
              }}
            >
              <Stack direction='row' alignItems='center' spacing={0.75} mb={0.5}>
                <CheckCircleIcon sx={{ fontSize: 14, color: 'text.secondary', opacity: 0.5 }} />
                <Typography
                  level='body-xs'
                  sx={{
                    fontSize: '0.625rem',
                    opacity: 0.7,
                    color: 'text.tertiary',
                    textTransform: 'uppercase'
                  }}
                >
                  {t('annualPlanning.home.completedGoals')}
                </Typography>
              </Stack>
              <Typography
                level='h2'
                sx={{
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  lineHeight: 1,
                  mb: 0.75
                }}
              >
                {metrics.completedGoals}
                <Typography level='body-sm' textColor='text.tertiary' component='span' sx={{ fontSize: '1rem' }}>
                  /{metrics.totalGoals}
                </Typography>
              </Typography>
              {/* Empty space to match progress bar height */}
              <Box sx={{ height: 2 }} />
            </Box>
          )}
        </Stack>

        {/* Mobile View: Minimalistic Row */}
        <Card variant='outlined' sx={{ display: { xs: 'flex', md: 'none' }, p: 1.5 }}>
          {!loading ? (
            <Stack direction='row' justifyContent='space-between' alignItems='center'>
              <Stack alignItems='center' spacing={0.25} sx={{ width: '33%' }}>
                <TimelineIcon sx={{ fontSize: 18, color: 'primary.plainColor' }} />
                <Typography level='h4' fontWeight={700} sx={{ fontSize: '1.25rem' }}>
                  {metrics.progress}%
                </Typography>
                <Typography level='body-xs' textColor='text.tertiary' sx={{ fontSize: '0.65rem' }}>
                  Progress
                </Typography>
              </Stack>
              <Stack alignItems='center' spacing={0.25} sx={{ width: '33%' }}>
                <CheckCircleIcon color='success' sx={{ fontSize: 18 }} />
                <Typography level='h4' fontWeight={700} sx={{ fontSize: '1.25rem' }}>
                  {metrics.completedGoals}/{metrics.totalGoals}
                </Typography>
                <Typography level='body-xs' textColor='text.tertiary' sx={{ fontSize: '0.65rem' }}>
                  Goals
                </Typography>
              </Stack>
              <Stack alignItems='center' spacing={0.25} sx={{ width: '33%' }}>
                <FlagIcon color='warning' sx={{ fontSize: 18 }} />
                <Typography level='h4' fontWeight={700} sx={{ fontSize: '1.25rem' }}>
                  {priorities.length}
                </Typography>
                <Typography level='body-xs' textColor='text.tertiary' sx={{ fontSize: '0.65rem' }}>
                  Priorities
                </Typography>
              </Stack>
            </Stack>
          ) : (
            <Skeleton variant='rectangular' height={60} />
          )}
        </Card>
      </Box>

      {/* Focus Areas Grid */}
      <Typography level='h4' sx={{ mb: 1.5, fontSize: { xs: '1.125rem', md: '1.25rem' } }}>
        {t('annualPlanning.home.focusAreas')}
      </Typography>
      <Grid container spacing={{ xs: 1.5, md: 2 }} sx={{ mb: { xs: 2, md: 3 } }}>
        {loading
          ? [1, 2, 3].map((i) => (
              <Grid key={i} xs={12} md={4}>
                <Skeleton variant='rectangular' height={200} sx={{ borderRadius: 'sm' }} />
              </Grid>
            ))
          : areas.map((area, index) => (
              <Grid key={area._id || index} xs={12} md={4}>
                <Card
                  variant='outlined'
                  sx={{
                    height: '100%',
                    borderTop: `3px solid ${area.color}`,
                    transition: 'box-shadow 0.2s'
                  }}
                >
                  <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
                    {/* Clickable Header */}
                    <Box
                      component={Link}
                      to={`/annual-planning/area/${area._id}`}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 1.5,
                        textDecoration: 'none',
                        transition: 'opacity 0.2s',
                        '&:hover': { opacity: 0.8 }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Typography sx={{ fontSize: { xs: '1.75rem', md: '2rem' } }}>{area.icon}</Typography>
                        <Typography level='h4' sx={{ fontSize: { xs: '1.125rem', md: '1.25rem' } }}>
                          {area.name}
                        </Typography>
                      </Box>
                      <ArrowForwardIcon sx={{ color: 'text.tertiary', fontSize: { xs: 18, md: 20 } }} />
                    </Box>

                    {/* Description */}
                    <Typography level='body-sm' textColor='text.secondary' sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                      {area.description}
                    </Typography>

                    {/* Progress Bar */}
                    <Box sx={{ mt: 'auto', pt: 1.5 }}>
                      <Stack direction='row' justifyContent='space-between' alignItems='center' mb={0.5}>
                        <Typography level='body-xs' textColor='text.tertiary' sx={{ fontSize: { xs: '0.65rem', md: '0.7rem' } }}>
                          {t('annualPlanning.home.progress')}
                        </Typography>
                        <Typography
                          level='body-xs'
                          textColor='text.secondary'
                          fontWeight={600}
                          sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }}
                        >
                          {area.progress || 0}%
                        </Typography>
                      </Stack>
                      <LinearProgress
                        determinate
                        value={area.progress || 0}
                        thickness={3}
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
      <Stack direction='row' alignItems='center' spacing={2} sx={{ mb: 1.5 }}>
        <Typography level='h4' sx={{ fontSize: { xs: '1.125rem', md: '1.25rem' } }}>
          {t('annualPlanning.home.yearlyPriorities')}
        </Typography>
        {!loading && (
          <Button
            size='sm'
            variant='soft'
            color='neutral'
            onClick={() => {
              setEditingPriority(null)
              setShowPriorityDialog(true)
            }}
            sx={{ minHeight: 28, px: 1 }}
          >
            +
          </Button>
        )}
      </Stack>

      {loading ? (
        <Stack spacing={1}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant='rectangular' height={40} sx={{ borderRadius: 'sm' }} />
          ))}
        </Stack>
      ) : (
        <PriorityList
          priorities={priorities.slice(0, 5)}
          onEdit={handleEditPriority}
          onDelete={handleDeletePriority}
          emptyMessage={t('annualPlanning.home.noPrioritiesAdded')}
        />
      )}

      {/* View All Link - Show when more than 5 priorities */}
      {priorities.length > 5 && (
        <Button
          component={Link}
          to='/annual-planning'
          variant='plain'
          size='sm'
          endDecorator={<ArrowForwardIcon />}
          sx={{
            justifyContent: 'flex-start',
            pl: 1.5,
            color: 'text.secondary',
            fontWeight: 500,
            fontSize: '0.875rem',
            mt: 1,
            '&:hover': {
              bgcolor: 'background.level1'
            }
          }}
        >
          {t('annualPlanning.home.viewAllPriorities', { count: priorities.length })}
        </Button>
      )}

      <PriorityDialog
        open={showPriorityDialog}
        onClose={() => {
          setShowPriorityDialog(false)
          setEditingPriority(null)
        }}
        annualPlanId={plan?._id}
        focusAreas={areas}
        existingPriorities={priorities}
        editingPriority={editingPriority}
        onSuccess={() => {
          reload()
          setShowPriorityDialog(false)
          setEditingPriority(null)
        }}
      />
    </Container>
  )
}

export default AnnualPlanningHome

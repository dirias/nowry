import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
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
  ModalDialog,
  DialogTitle,
  DialogContent,
  Alert,
  Select,
  Option,
  Tabs,
  TabList,
  Tab,
  tabClasses
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
import CloseQuarterModal from './CloseQuarterModal'
import QuarterReportsView from './QuarterReportsView'

const AnnualPlanningHome = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedQuarter = searchParams.get('q') || 'All'

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
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [quarterReports, setQuarterReports] = useState([])
  const [closingQuarter, setClosingQuarter] = useState(null)
  const [closingYear, setClosingYear] = useState(null)

  useEffect(() => {
    if (plan?._id) {
      annualPlanningService.getQuarterReports(plan._id).then(setQuarterReports).catch(console.error)
    }
  }, [plan])

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

    // Filter goals based on selected global Quarter
    let activeGoals = selectedQuarter === 'All' ? hookGoals : hookGoals.filter((g) => g.quarter === Number(selectedQuarter))

    // Pull from snapshot if the quarter is historically closed
    if (selectedQuarter !== 'All' && hookPlan?.year) {
      const report = quarterReports.find((r) => r.quarter === Number(selectedQuarter) && r.year === hookPlan.year)
      if (report && report.goals_summary) {
        activeGoals = report.goals_summary
      }
    }

    activeGoals.forEach((g) => {
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
      totalGoals: activeGoals.length,
      completedGoals: completedGoalsCount,
      progress: activeGoals.length > 0 ? Math.round(totalProgressSum / activeGoals.length) : 0
    })
  }, [loading, hookPlan, hookAreas, hookGoals, hookPriorities, selectedQuarter])

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

  // Quarter Closing Logic
  const now = new Date()
  const currentQMonth = now.getMonth()
  const currentQYear = now.getFullYear()
  const currentQ = Math.floor(currentQMonth / 3) + 1
  const currentQEndMonth = currentQ * 3 - 1
  const currentQEndDate = new Date(currentQYear, currentQEndMonth + 1, 0)
  const daysLeft = Math.ceil((currentQEndDate.getTime() - now.getTime()) / (1000 * 3600 * 24))

  let overdueQ = null
  let overdueY = null
  if (plan) {
    const pastQuarters = [1, 2, 3, 4].filter((q) => currentQYear > plan.year || (currentQYear === plan.year && currentQ > q))
    for (let pq of pastQuarters) {
      const hasReport = quarterReports.some((r) => r.quarter === pq && r.year === plan.year)
      const hasGoals = hookGoals.some((g) => g.quarter === pq && g.year === plan.year)
      if (!hasReport && hasGoals) {
        overdueQ = pq
        overdueY = plan.year
        break
      }
    }
  }

  const showCloseCurrentButton =
    daysLeft <= 10 && daysLeft >= 0 && !quarterReports.some((r) => r.quarter === currentQ && r.year === plan?.year)

  const handleOpenCloseModal = (q, y) => {
    setClosingQuarter(q)
    setClosingYear(y)
    setShowCloseModal(true)
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
      {/* Glass Hero Header */}
      <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 6 }, mt: { xs: 1, md: 2 } }}>
        {isEditingTitle ? (
          <Stack direction='row' spacing={1} alignItems='center' justifyContent='center' mb={1}>
            <Box
              component='input'
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              style={{
                fontSize: '2rem',
                fontWeight: 800,
                fontFamily: 'inherit',
                border: 'none',
                borderBottom: '2px solid',
                borderColor: 'var(--joy-palette-text-primary)',
                outline: 'none',
                background: 'transparent',
                textAlign: 'center',
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
          <Stack direction='row' alignItems='center' justifyContent='center' spacing={1} mb={0.5}>
            <Typography
              level='h2'
              fontWeight={800}
              startDecorator={<TimelineIcon sx={{ color: 'primary.plainColor', fontSize: { xs: '1.75rem', md: '2.5rem' } }} />}
              sx={{
                letterSpacing: '-0.02em',
                fontSize: { xs: '1.75rem', md: '2.5rem' },
                lineHeight: 1,
                m: 0,
                alignItems: 'center'
              }}
            >
              <Skeleton loading={loading} variant='text' width='12ch'>
                {plan?.title || t('annualPlanning.title') + ' ' + (plan?.year || '')}
              </Skeleton>
            </Typography>
            {!loading && (
              <IconButton size='sm' variant='plain' color='neutral' onClick={() => setIsEditingTitle(true)}>
                <EditIcon fontSize='small' />
              </IconButton>
            )}
          </Stack>
        )}

        <Typography
          level='body-md'
          sx={{ color: 'text.tertiary', mb: 3, maxWidth: 500, mx: 'auto', fontSize: { xs: '0.875rem', md: '1rem' } }}
        >
          {t('annualPlanning.home.overview')}
        </Typography>

        {/* Minimalist Inline Stats */}
        {!loading && (
          <Stack direction='row' spacing={2} justifyContent='center' alignItems='center' sx={{ mb: 4, flexWrap: 'wrap', rowGap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <TimelineIcon sx={{ fontSize: 18, color: 'primary.plainColor', opacity: 0.8 }} />
              <Typography level='title-md' fontWeight={700} sx={{ color: 'text.secondary', fontSize: '1rem' }}>
                <Skeleton loading={loading} variant='text' width='2ch'>
                  {metrics.progress}%
                </Skeleton>{' '}
                <Typography component='span' fontWeight={400} sx={{ color: 'text.tertiary' }}>
                  {t('annualPlanning.home.totalProgress')}
                </Typography>
              </Typography>
            </Box>

            {priorities.length > 0 && (
              <>
                <Typography sx={{ color: 'divider', display: { xs: 'none', sm: 'block' } }}>•</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <FlagIcon sx={{ fontSize: 18, color: 'warning.solidBg', opacity: 0.8 }} />
                  <Typography level='title-md' fontWeight={700} sx={{ color: 'text.secondary', fontSize: '1rem' }}>
                    {priorities.length}{' '}
                    <Typography component='span' fontWeight={400} sx={{ color: 'text.tertiary' }}>
                      Priorities
                    </Typography>
                  </Typography>
                </Box>
              </>
            )}

            {metrics.totalGoals > 0 && (
              <>
                <Typography sx={{ color: 'divider', display: { xs: 'none', sm: 'block' } }}>•</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <CheckCircleIcon sx={{ fontSize: 18, color: 'success.solidBg', opacity: 0.8 }} />
                  <Typography level='title-md' fontWeight={700} sx={{ color: 'text.secondary', fontSize: '1rem' }}>
                    {metrics.completedGoals} / {metrics.totalGoals}{' '}
                    <Typography component='span' fontWeight={400} sx={{ color: 'text.tertiary' }}>
                      {t('annualPlanning.home.completedGoals')}
                    </Typography>
                  </Typography>
                </Box>
              </>
            )}
          </Stack>
        )}

        {/* Global Action / Warning Row */}
        <Box sx={{ maxWidth: 640, mx: 'auto' }}>
          {(overdueQ || showCloseCurrentButton) && (
            <Alert
              variant='soft'
              color={overdueQ || daysLeft <= 2 ? 'danger' : 'warning'}
              startDecorator={<WarningIcon />}
              endDecorator={
                <Button
                  size='sm'
                  variant='solid'
                  color={overdueQ || daysLeft <= 2 ? 'danger' : 'warning'}
                  onClick={() => handleOpenCloseModal(overdueQ || currentQ, overdueY || currentQYear)}
                  sx={{ borderRadius: 'lg', fontWeight: 600 }}
                >
                  Review Now
                </Button>
              }
              sx={{
                mb: 3,
                alignItems: 'center',
                borderRadius: 'xl',
                boxShadow: 'sm',
                fontWeight: 600,
                textAlign: 'left'
              }}
            >
              {overdueQ
                ? `Quarter ${overdueQ} ends today!`
                : `Quarter ${currentQ} ends ${daysLeft === 0 ? 'today' : `in ${daysLeft} days`}!`}
            </Alert>
          )}

          {!loading && (
            <Stack
              direction='row'
              spacing={1.5}
              justifyContent='center'
              alignItems='center'
              sx={{ flexWrap: 'wrap', gap: { xs: 1.5, sm: 1.5 } }}
            >
              <Select
                value={selectedQuarter}
                onChange={(e, val) => setSearchParams({ q: val }, { replace: true })}
                placeholder='Quarter'
                size='sm'
                variant='plain'
                sx={{
                  minWidth: 100,
                  fontWeight: 600,
                  color: 'text.tertiary',
                  '&:hover': { bgcolor: 'transparent', color: 'text.primary' },
                  [`& .MuiSelect-button`]: {
                    justifyContent: 'center',
                    bgcolor: 'transparent'
                  }
                }}
              >
                <Option value='All'>{t('annualPlanning.home.allYear', 'All Year')}</Option>
                <Option value='1'>Q1</Option>
                <Option value='2'>Q2</Option>
                <Option value='3'>Q3</Option>
                <Option value='4'>Q4</Option>
              </Select>

              <Button
                component={Link}
                to='/annual-planning/setup'
                variant='outlined'
                color='neutral'
                startDecorator={<EditIcon />}
                size='sm'
                sx={{ minHeight: 36, borderRadius: 'md', fontWeight: 600 }}
              >
                {t('annualPlanning.home.editPlanBtn')}
              </Button>
              <Button
                component={Link}
                to='/annual-planning/daily-routine'
                variant='soft'
                color='warning'
                startDecorator={<DayIcon />}
                size='sm'
                sx={{ minHeight: 36, borderRadius: 'md', fontWeight: 600 }}
              >
                {t('annualPlanning.home.dailyRoutineBtn')}
              </Button>
            </Stack>
          )}
        </Box>
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
          : areas.map((area, index) => {
              let displayProgress = area.progress || 0

              if (selectedQuarter !== 'All') {
                let activeGoals = hookGoals.filter((g) => g.quarter === Number(selectedQuarter))

                // Pull from snapshot if the quarter is historically closed
                if (plan?.year) {
                  const report = quarterReports.find((r) => r.quarter === Number(selectedQuarter) && r.year === plan.year)
                  if (report && report.goals_summary) {
                    activeGoals = report.goals_summary
                  }
                }

                const areaGoals = activeGoals.filter((g) => g.focus_area_id === area._id || g.focus_area_id?._id === area._id)

                if (areaGoals.length > 0) {
                  let sum = 0
                  areaGoals.forEach((g) => {
                    let goalProgress = 0
                    if (g.milestones?.length > 0) {
                      const done = g.milestones.filter((m) => m.completed).length
                      goalProgress = (done / g.milestones.length) * 100
                    } else {
                      goalProgress = g.progress || 0
                    }
                    sum += goalProgress
                  })
                  displayProgress = Math.round(sum / areaGoals.length)
                } else {
                  displayProgress = 0
                }
              }

              return (
                <Grid key={area._id || index} xs={12} md={4}>
                  <Card
                    variant='outlined'
                    sx={{
                      height: '100%',
                      borderRadius: 'xl',
                      borderColor: 'divider',
                      boxShadow: 'sm',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      '&:hover': {
                        boxShadow: 'md',
                        transform: 'translateY(-2px)'
                      }
                    }}
                  >
                    <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
                      {/* Clickable Header */}
                      <Box
                        component={Link}
                        to={`/annual-planning/area/${area._id}${selectedQuarter !== 'All' ? '?q=' + selectedQuarter : ''}`}
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
                            {displayProgress}%
                          </Typography>
                        </Stack>
                        <LinearProgress
                          determinate
                          value={displayProgress}
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
              )
            })}
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

      {plan?._id && <QuarterReportsView planId={plan._id} focusAreas={areas} />}

      {showCloseModal && closingQuarter && closingYear && (
        <CloseQuarterModal
          open={showCloseModal}
          onClose={() => setShowCloseModal(false)}
          onSuccess={() => {
            setShowCloseModal(false)
            reload()
            annualPlanningService.getQuarterReports(plan._id).then(setQuarterReports)
          }}
          targetQuarter={closingQuarter}
          targetYear={closingYear}
          planId={plan._id}
          focusAreas={areas}
          goals={hookGoals}
        />
      )}
    </Container>
  )
}

export default AnnualPlanningHome

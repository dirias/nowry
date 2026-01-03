import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, Button, Grid, Card, CardContent, Stack, Skeleton, LinearProgress, IconButton, Container, Input } from '@mui/joy'
import {
  Add as AddIcon,
  EmojiEvents as TrophyIcon,
  Timeline as TimelineIcon,
  Edit as EditIcon,
  ArrowForward as ArrowForwardIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Delete as DeleteIcon
} from '@mui/icons-material'

import { annualPlanningService } from '../../api/services'
import '../../styles/AnnualPlanning.css'
import PriorityDialog from './PriorityDialog'

const AnnualPlanningHome = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState(null)
  const [focusAreas, setFocusAreas] = useState([])
  const [priorities, setPriorities] = useState([])
  const [allGoals, setAllGoals] = useState([])

  // UI State
  const [showPriorityDialog, setShowPriorityDialog] = useState(false)

  // Migration & Initial Fetch (Ensure routine items have IDs for robust linking)
  useEffect(() => {
    const init = async () => {
      try {
        // Fetch routine to check for missing IDs and patch if needed
        const routineData = await annualPlanningService.getDailyRoutine()
        let routineUpdated = false
        const migrationRoutine = { ...routineData }

        ;['morning', 'afternoon', 'evening'].forEach((section) => {
          const list = migrationRoutine[`${section}_routine`] || []
          const listWithIds = list.map((item) => {
            if (!item.id) {
              routineUpdated = true
              return { ...item, id: crypto.randomUUID() }
            }
            return item
          })
          migrationRoutine[`${section}_routine`] = listWithIds
        })

        if (routineUpdated) {
          await annualPlanningService.updateDailyRoutine(migrationRoutine)
          console.log('Migrated daily routine items with IDs')
        }
      } catch (err) {
        console.error('Failed to run migration', err)
      }
    }
    init()
  }, [])

  // Editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [tempTitle, setTempTitle] = useState('')

  useEffect(() => {
    if (plan) {
      setTempTitle(plan.title || t('annualPlanning.myPlan'))
    }
  }, [plan, t])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const year = new Date().getFullYear()
      const planData = await annualPlanningService.getAnnualPlan(year)
      setPlan(planData)
      setTempTitle(planData.title || t('annualPlanning.myPlan'))

      if (planData?._id) {
        const [areasData, prioritiesData] = await Promise.all([
          annualPlanningService.getFocusAreas(planData._id),
          annualPlanningService.getPriorities(planData._id)
        ])
        setFocusAreas(areasData)
        setPriorities(prioritiesData)

        // Fetch goals for all focus areas
        if (areasData.length > 0) {
          const goalsPromises = areasData.map((area) => annualPlanningService.getGoals(area._id).catch(() => []))
          const goalsArrays = await Promise.all(goalsPromises)
          const allGoalsData = goalsArrays.flat()
          setAllGoals(allGoalsData)
        } else {
          setAllGoals([])
        }
      }
    } catch (error) {
      console.error('Failed to load annual plan:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTitle = async () => {
    try {
      if (!plan?._id || !tempTitle.trim()) return

      const updatedPlan = await annualPlanningService.updateAnnualPlan({
        ...plan,
        title: tempTitle
      })
      setPlan(updatedPlan)
      setIsEditingTitle(false)
    } catch (error) {
      console.error('Failed to update plan title:', error)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSaveTitle()
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false)
      setTempTitle(plan?.title || t('annualPlanning.myPlan'))
    }
  }

  if (loading) {
    return (
      <Container maxWidth='xl' sx={{ py: 4, pb: 10 }}>
        <Box sx={{ mb: 4 }}>
          <Skeleton variant='text' level='h2' width={300} sx={{ mb: 1 }} />
          <Skeleton variant='text' level='body-lg' width={400} />
        </Box>
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid xs={12} md={3}>
            <Skeleton variant='rectangular' height={120} sx={{ borderRadius: 'md' }} />
          </Grid>
          <Grid xs={12} md={3}>
            <Skeleton variant='rectangular' height={120} sx={{ borderRadius: 'md' }} />
          </Grid>
        </Grid>
        <Grid container spacing={3}>
          <Grid xs={12} md={4}>
            <Skeleton variant='rectangular' height={200} sx={{ borderRadius: 'md' }} />
          </Grid>
          <Grid xs={12} md={4}>
            <Skeleton variant='rectangular' height={200} sx={{ borderRadius: 'md' }} />
          </Grid>
          <Grid xs={12} md={4}>
            <Skeleton variant='rectangular' height={200} sx={{ borderRadius: 'md' }} />
          </Grid>
        </Grid>
      </Container>
    )
  }

  const hasFocusAreas = focusAreas.length > 0
  const isSetupComplete = focusAreas.length === 3

  // Calculate stats from actual data
  const totalGoals = allGoals.length
  const completedGoals = allGoals.filter((goal) => goal.status === 'completed').length
  const completionRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0
  const totalPriorities = priorities.length

  return (
    <Container maxWidth='xl' sx={{ py: 4, pb: 10 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          {isEditingTitle ? (
            <Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 1 }}>
              <Input
                size='lg'
                variant='plain'
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                sx={{
                  backgroundColor: 'transparent',
                  padding: 0,
                  fontSize: 'var(--joy-fontSize-h2)',
                  fontWeight: 'var(--joy-fontWeight-h2)',
                  fontFamily: 'var(--joy-fontFamily-display)',
                  boxShadow: 'none',
                  border: 'none',
                  minWidth: '200px',
                  width: 'auto',
                  borderBottom: '2px solid',
                  borderColor: 'primary.500',
                  borderRadius: 0,
                  '--Input-focusedHighlight': 'transparent',
                  '--Input-focusedThickness': '0px',
                  '&::before': { display: 'none' },
                  '&:focus-within': {
                    outline: 'none',
                    borderColor: 'primary.500',
                    boxShadow: 'none'
                  },
                  '& input': {
                    padding: 0
                  }
                }}
              />
              <IconButton size='sm' variant='plain' color='success' onClick={handleSaveTitle}>
                <CheckIcon />
              </IconButton>
              <IconButton
                size='sm'
                variant='plain'
                color='neutral'
                onClick={() => {
                  setIsEditingTitle(false)
                  setTempTitle(plan?.title || t('annualPlanning.myPlan'))
                }}
              >
                <CloseIcon />
              </IconButton>
            </Stack>
          ) : (
            <Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 1, '&:hover .edit-icon': { opacity: 1 } }}>
              <Typography level='h2' component='h1'>
                {plan?.title || t('annualPlanning.myPlan')}
              </Typography>
              <IconButton
                className='edit-icon'
                variant='plain'
                color='neutral'
                size='sm'
                onClick={() => setIsEditingTitle(true)}
                sx={{ opacity: 0, transition: 'opacity 0.2s' }}
              >
                <EditIcon />
              </IconButton>
            </Stack>
          )}
          <Typography level='body-lg' textColor='text.tertiary'>
            {t('annualPlanning.subtitle')}
          </Typography>
        </Box>
        <Stack direction='row' spacing={2}>
          <Button variant='outlined' startDecorator={<TimelineIcon />} onClick={() => navigate('/annual-planning/daily-routine')}>
            {t('annualPlanning.actions.viewRoutine')}
          </Button>
          {!isSetupComplete && (
            <Button variant='solid' color='primary' startDecorator={<AddIcon />} onClick={() => navigate('/annual-planning/setup')}>
              {t('annualPlanning.actions.setFocusAreas')}
            </Button>
          )}
        </Stack>
      </Box>

      {/* Stats Overview */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid xs={12} md={3}>
          <Card variant='soft' color='primary' sx={{ height: '100%' }}>
            <CardContent>
              <Typography level='title-sm'>{t('annualPlanning.stats.totalGoals')}</Typography>
              <Typography level='h2'>{totalGoals}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} md={3}>
          <Card variant='outlined' sx={{ height: '100%' }}>
            <CardContent>
              <Typography level='title-sm'>{t('annualPlanning.stats.completionRate')}</Typography>
              <Typography level='h2'>{completionRate}%</Typography>
              <LinearProgress determinate value={completionRate} sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} md={3}>
          <Card variant='outlined' sx={{ height: '100%' }}>
            <CardContent>
              <Typography level='title-sm'>{t('annualPlanning.stats.priorities')}</Typography>
              <Typography level='h2'>{totalPriorities}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Focus Areas */}
      <Box sx={{ mb: 4 }}>
        <Typography level='h3' sx={{ mb: 2 }}>
          {t('annualPlanning.focusArea.title')}
        </Typography>

        {hasFocusAreas ? (
          <Grid container spacing={3}>
            {focusAreas.map((area) => (
              <Grid key={area._id} xs={12} md={4}>
                <Card
                  onClick={() => navigate(`/annual-planning/area/${area._id}`)}
                  sx={{
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'translateY(-4px)', boxShadow: 'md' },
                    height: '100%'
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          bgcolor: area.color || 'primary.500',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          mr: 2,
                          fontSize: '1.5rem'
                        }}
                      >
                        {/* We would render icon here based on name, or just first letter */}
                        {area.icon || area.name[0]}
                      </Box>
                      <Typography level='title-lg'>{area.name}</Typography>
                    </Box>
                    <Typography level='body-sm' sx={{ mb: 2 }}>
                      {area.description}
                    </Typography>
                    <Box sx={{ mt: 'auto' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography level='body-xs'>Progress</Typography>
                        <Typography level='body-xs'>0%</Typography>
                      </Box>
                      <LinearProgress determinate value={0} color='neutral' />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {focusAreas.length < 3 && (
              <Grid xs={12} md={4}>
                <Card
                  variant='outlined'
                  sx={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderStyle: 'dashed'
                  }}
                >
                  <Button variant='plain' startDecorator={<AddIcon />} onClick={() => navigate('/annual-planning/setup')}>
                    {t('annualPlanning.focusArea.add')}
                  </Button>
                </Card>
              </Grid>
            )}
          </Grid>
        ) : (
          <Card variant='soft' sx={{ p: 4, textAlign: 'center' }}>
            <Typography level='h4' sx={{ mb: 2 }}>
              {t('annualPlanning.empty')}
            </Typography>
            <Button size='lg' onClick={() => navigate('/annual-planning/setup')}>
              Start Planning
            </Button>
          </Card>
        )}
      </Box>

      {/* Priorities */}
      <Box>
        <Stack direction='row' alignItems='center' spacing={2} sx={{ mb: 2 }}>
          <Typography level='h3'>{t('annualPlanning.priority.title')}</Typography>
          <IconButton size='sm' variant='soft' color='primary' onClick={() => setShowPriorityDialog(true)}>
            <AddIcon />
          </IconButton>
        </Stack>

        {priorities.length === 0 ? (
          <Typography level='body-md' textColor='text.tertiary'>
            {t('annualPlanning.priority.noGoals')}
          </Typography>
        ) : (
          <Stack spacing={2}>
            {priorities.map((priority) => (
              <Card key={priority._id} variant='outlined' orientation='horizontal'>
                <CardContent sx={{ flex: 1 }}>
                  <Typography level='title-md'>
                    {priority.title}
                    {priority.linked_entity_type && (
                      <Typography
                        level='body-xs'
                        component='span'
                        sx={{
                          ml: 1,
                          color: 'primary.500',
                          bgcolor: 'primary.50',
                          px: 0.5,
                          borderRadius: 'sm',
                          textTransform: 'capitalize'
                        }}
                      >
                        {(() => {
                          const type = priority.linked_entity_type
                          if (type === 'goal') return 'Linked to Goal'
                          if (type === 'task') return 'Linked to Task'
                          if (type.startsWith('routine')) return `Linked to ${type.replace('routine_', '')} routine`
                          return `Linked to ${type.replace('_', ' ')}`
                        })()}
                      </Typography>
                    )}
                  </Typography>
                  <Typography level='body-sm'>{priority.description}</Typography>
                </CardContent>
                <IconButton
                  color='danger'
                  variant='plain'
                  size='sm'
                  onClick={async () => {
                    try {
                      await annualPlanningService.deletePriority(priority._id)
                      fetchData()
                    } catch (err) {
                      console.error('Failed to delete priority', err)
                    }
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Card>
            ))}
          </Stack>
        )}
      </Box>

      {/* Dialogs */}
      <PriorityDialog
        open={showPriorityDialog}
        onClose={() => setShowPriorityDialog(false)}
        annualPlanId={plan?._id}
        focusAreas={focusAreas}
        existingPriorities={priorities}
        onSuccess={fetchData}
      />
    </Container>
  )
}

export default AnnualPlanningHome

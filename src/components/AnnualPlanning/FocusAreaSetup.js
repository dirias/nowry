import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Input,
  Select,
  Option,
  Stack,
  LinearProgress,
  Grid,
  Container,
  FormControl,
  FormLabel,
  Textarea,
  IconButton,
  Skeleton,
  Tooltip
} from '@mui/joy'
import { ArrowForward as ArrowForwardIcon, ArrowBack as ArrowBackIcon, Check as CheckIcon } from '@mui/icons-material'

import { annualPlanningService } from '../../api/services'
import { useAnnualPlan } from '../../hooks/useAnnualPlan'
import { useNotification } from '../../context/NotificationContext'

const ICONS = ['⭐', '💼', '💪', '💰', '❤️', '🎨', '📚', '🌱', '✈️', '🏠']
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6']

const FocusAreaSetup = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { showNotification } = useNotification()
  const [activeStep, setActiveStep] = useState(0)
  const [planId, setPlanId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [areas, setAreas] = useState([
    { name: '', description: '', icon: '⭐', color: COLORS[0] },
    { name: '', description: '', icon: '💪', color: COLORS[1] },
    { name: '', description: '', icon: '💰', color: COLORS[2] }
  ])

  // Always maintain exactly 3 focus areas
  const REQUIRED_AREAS_COUNT = 3

  const { plan, areas: cacheAreas, loading: hookLoading } = useAnnualPlan()

  const fetchPlan = useCallback(async () => {
    try {
      setLoading(true)
      if (!plan) {
        setLoading(false)
        return
      }
      setPlanId(plan._id)

      // Try to load existing focus areas
      try {
        if (cacheAreas && cacheAreas.length > 0) {
          // Edit mode: load existing areas
          setIsEditMode(true)

          // Ensure we always have exactly 3 areas
          const loadedAreas = cacheAreas.slice(0, REQUIRED_AREAS_COUNT).map((area) => ({
            _id: area._id, // Keep the ID for updating
            name: area.name,
            description: area.description,
            icon: area.icon,
            color: area.color,
            order: area.order
          }))

          // Fill in missing slots with empty templates if needed
          while (loadedAreas.length < REQUIRED_AREAS_COUNT) {
            const index = loadedAreas.length
            loadedAreas.push({
              name: '',
              description: '',
              icon: ICONS[index],
              color: COLORS[index]
            })
          }

          setAreas(loadedAreas)
        }
      } catch (error) {
        // No existing areas, stay in create mode
        console.log('No existing areas found, starting fresh')
      }
    } catch (error) {
      console.error('Failed to init setup', error)
    } finally {
      setLoading(false)
    }
  }, [plan, cacheAreas, REQUIRED_AREAS_COUNT])

  useEffect(() => {
    if (hookLoading) return
    fetchPlan()
  }, [hookLoading, fetchPlan])

  const handleNext = () => {
    setActiveStep((prev) => prev + 1)
  }

  const handleBack = () => {
    setActiveStep((prev) => prev - 1)
  }

  const handleAreaChange = (index, field, value) => {
    const newAreas = [...areas]
    newAreas[index] = { ...newAreas[index], [field]: value }
    setAreas(newAreas)
  }

  // Alias for backward compatibility with user's code snippets
  const updateArea = handleAreaChange

  const handleSubmit = async () => {
    // Guard against double-submit (e.g. a slow first request + an impatient
    // second click) racing two full create loops against the 3-area backend limit.
    if (!planId || submitting) return

    setSubmitting(true)
    try {
      // Always save exactly 3 areas
      const savedAreas = []
      for (let i = 0; i < REQUIRED_AREAS_COUNT; i++) {
        if (areas[i]._id) {
          // Update existing area
          const updated = await annualPlanningService.updateFocusArea(areas[i]._id, {
            name: areas[i].name,
            description: areas[i].description,
            icon: areas[i].icon,
            color: areas[i].color,
            order: i + 1
          })
          savedAreas.push(updated)
        } else {
          // Create new area (only if one doesn't exist yet)
          const created = await annualPlanningService.createFocusArea({
            annual_plan_id: planId,
            name: areas[i].name,
            description: areas[i].description,
            icon: areas[i].icon,
            color: areas[i].color,
            order: i + 1
          })
          savedAreas.push(created)
        }
      }

      // Track the IDs we just created so a retry after a partial failure
      // updates instead of re-creating (and tripping the 3-area limit).
      setAreas((prev) => prev.map((area, i) => (savedAreas[i] ? { ...area, _id: savedAreas[i]._id || area._id } : area)))

      navigate('/annual-planning')
    } catch (error) {
      console.error('Failed to save focus areas:', error)
      showNotification(t('annualPlanning.focusArea.setup.saveError'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const renderIntro = () => (
    <Box sx={{ textAlign: 'center', maxWidth: 700, mx: 'auto', mt: 4 }}>
      <Typography level='h3' sx={{ mb: 2 }}>
        {isEditMode ? t('annualPlanning.focusArea.setup.intro.editTitle') : t('annualPlanning.focusArea.setup.intro.title')}
      </Typography>
      <Typography level='body-lg' sx={{ mb: 4 }}>
        {isEditMode ? t('annualPlanning.focusArea.setup.intro.editMessage') : t('annualPlanning.focusArea.setup.intro.message')}
      </Typography>
      <Card variant='soft' color='primary' sx={{ mb: 4, textAlign: 'left' }}>
        <CardContent>
          <Typography level='title-md' sx={{ mb: 1 }}>
            {t('annualPlanning.focusArea.setup.tipsLabel')}
          </Typography>
          <Box component='ul' sx={{ margin: 0, paddingLeft: '20px' }}>
            {t('annualPlanning.focusArea.setup.tips', { returnObjects: true }).map((tip, i) => (
              <li key={i}>
                <Typography>{tip}</Typography>
              </li>
            ))}
          </Box>
        </CardContent>
      </Card>
      <Button size='lg' endDecorator={<ArrowForwardIcon />} onClick={() => setActiveStep(1)}>
        {isEditMode ? t('annualPlanning.focusArea.setup.buttons.reviewEdit') : t('annualPlanning.focusArea.setup.buttons.letsStart')}
      </Button>
    </Box>
  )

  const renderAreaStep = (index) => (
    <Box sx={{ maxWidth: 700, mx: 'auto', mt: 4 }}>
      <Typography level='body-sm' sx={{ mb: 1 }}>
        {t('annualPlanning.focusArea.setup.areaOf', { current: index + 1, total: 3 })}
      </Typography>
      <Typography level='h3' sx={{ mb: 3 }}>
        {t('annualPlanning.focusArea.setup.defineArea', { number: index + 1 })}
      </Typography>

      <Stack spacing={3}>
        <FormControl>
          <FormLabel>{t('annualPlanning.focusArea.setup.nameLabel')}</FormLabel>
          <Input
            placeholder={t('annualPlanning.focusArea.setup.namePlaceholder')}
            value={areas[index].name}
            onChange={(e) => updateArea(index, 'name', e.target.value)}
          />
        </FormControl>

        <FormControl>
          <FormLabel>{t('annualPlanning.focusArea.setup.descriptionLabel')}</FormLabel>
          <Textarea
            minRows={3}
            placeholder={t('annualPlanning.focusArea.setup.descriptionPlaceholder')}
            value={areas[index].description}
            onChange={(e) => updateArea(index, 'description', e.target.value)}
          />
        </FormControl>

        <Box>
          <Typography level='title-sm' sx={{ mb: 1 }}>
            {t('annualPlanning.focusArea.selectIcon')}
          </Typography>
          <Select value={areas[index].icon} onChange={(e, val) => updateArea(index, 'icon', val)}>
            {ICONS.map((icon) => (
              <Option key={icon} value={icon}>
                {icon}
              </Option>
            ))}
          </Select>
        </Box>

        <Box>
          <FormLabel sx={{ mb: 1.5 }}>{t('annualPlanning.focusArea.setup.colorTheme')}</FormLabel>
          <Stack direction='row' spacing={1}>
            {COLORS.map((color) => (
              <Tooltip key={color} title={t('annualPlanning.focusArea.setup.colorSwatchLabel', { color })}>
                <IconButton
                  aria-label={t('annualPlanning.focusArea.setup.colorSwatchLabel', { color })}
                  onClick={() => updateArea(index, 'color', color)}
                  sx={{
                    bgcolor: color,
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    transform: areas[index].color === color ? 'scale(1.2)' : 'none',
                    border: areas[index].color === color ? '2px solid' : 'none',
                    borderColor: areas[index].color === color ? 'text.primary' : 'transparent',
                    '&:hover': { bgcolor: color },
                    '&:focus-visible': {
                      outline: '2px solid',
                      outlineColor: 'primary.outlinedBorder',
                      outlineOffset: '2px'
                    }
                  }}
                />
              </Tooltip>
            ))}
          </Stack>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button variant='plain' color='neutral' onClick={handleBack}>
            {t('annualPlanning.focusArea.setup.buttons.back')}
          </Button>
          <Button endDecorator={activeStep === 3 ? null : <ArrowForwardIcon />} onClick={handleNext} disabled={!areas[index].name}>
            {activeStep === 3 ? t('annualPlanning.focusArea.setup.buttons.review') : t('annualPlanning.focusArea.setup.buttons.next')}
          </Button>
        </Box>
      </Stack>
    </Box>
  )

  const renderReview = () => (
    <Box sx={{ maxWidth: 700, mx: 'auto', mt: 4 }}>
      <Typography level='h3' sx={{ mb: 4, textAlign: 'center' }}>
        {t('annualPlanning.focusArea.setup.reviewTitle', { year: new Date().getFullYear() })}
      </Typography>
      <Grid container spacing={3}>
        {areas.map((area, index) => (
          <Grid key={index} xs={12} md={4}>
            <Card sx={{ height: '100%', borderTop: `4px solid ${area.color}` }}>
              <CardContent>
                <Typography level='h1' sx={{ mb: 1 }}>
                  {area.icon}
                </Typography>
                <Typography level='title-lg'>{area.name}</Typography>
                <Typography level='body-sm'>{area.description}</Typography>
                <Button variant='plain' size='sm' sx={{ mt: 2 }} onClick={() => setActiveStep(index + 1)}>
                  {t('annualPlanning.focusArea.setup.buttons.edit')}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 6 }}>
        <Button variant='plain' onClick={handleBack} disabled={submitting}>
          {t('annualPlanning.focusArea.setup.buttons.back')}
        </Button>
        <Button
          size='lg'
          startDecorator={<CheckIcon />}
          onClick={handleSubmit}
          loading={submitting}
          disabled={submitting}
          aria-label={
            isEditMode ? t('annualPlanning.focusArea.setup.buttons.saveChanges') : t('annualPlanning.focusArea.setup.buttons.finalizePlan')
          }
        >
          {isEditMode ? t('annualPlanning.focusArea.setup.buttons.saveChanges') : t('annualPlanning.focusArea.setup.buttons.finalizePlan')}
        </Button>
      </Box>
    </Box>
  )

  return (
    <Container maxWidth='md' sx={{ py: 4 }}>
      {loading ? (
        <Box sx={{ maxWidth: 700, mx: 'auto' }}>
          <Skeleton variant='rectangular' sx={{ mb: 4, borderRadius: 'sm' }} height={4} />
          <Stack spacing={3} sx={{ mt: 4 }}>
            <Skeleton variant='text' level='body-sm' width='30%' />
            <Skeleton variant='text' level='h3' width='60%' />
            <Skeleton variant='rectangular' sx={{ borderRadius: 'sm' }} height={40} />
            <Skeleton variant='rectangular' sx={{ borderRadius: 'sm' }} height={96} />
            <Skeleton variant='rectangular' sx={{ borderRadius: 'sm' }} height={40} width='50%' />
          </Stack>
        </Box>
      ) : (
        <>
          <LinearProgress determinate value={((activeStep + 1) / 5) * 100} thickness={4} sx={{ mb: 4, maxWidth: 700, mx: 'auto' }} />

          {activeStep === 0 && renderIntro()}
          {activeStep === 1 && renderAreaStep(0)}
          {activeStep === 2 && renderAreaStep(1)}
          {activeStep === 3 && renderAreaStep(2)}
          {activeStep === 4 && renderReview()}
        </>
      )}
    </Container>
  )
}

export default FocusAreaSetup

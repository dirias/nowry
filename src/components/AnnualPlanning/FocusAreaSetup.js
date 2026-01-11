import React, { useState, useEffect } from 'react'
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
  IconButton
} from '@mui/joy'
import { ArrowForward as ArrowForwardIcon, ArrowBack as ArrowBackIcon, Check as CheckIcon } from '@mui/icons-material'

import { annualPlanningService } from '../../api/services'

const ICONS = ['⭐', '💼', '💪', '💰', '❤️', '🎨', '📚', '🌱', '✈️', '🏠']
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6']

const FocusAreaSetup = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [activeStep, setActiveStep] = useState(0)
  const [planId, setPlanId] = useState(null)

  const [areas, setAreas] = useState([
    { name: '', description: '', icon: '⭐', color: COLORS[0] },
    { name: '', description: '', icon: '💪', color: COLORS[1] },
    { name: '', description: '', icon: '💰', color: COLORS[2] }
  ])

  useEffect(() => {
    fetchPlan()
  }, [])

  const fetchPlan = async () => {
    try {
      const plan = await annualPlanningService.getAnnualPlan(new Date().getFullYear())
      setPlanId(plan._id)
    } catch (error) {
      console.error('Failed to init setup', error)
    }
  }

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
    if (!planId) return

    try {
      // Create all 3 areas
      for (let i = 0; i < areas.length; i++) {
        await annualPlanningService.createFocusArea({
          annual_plan_id: planId,
          name: areas[i].name,
          description: areas[i].description,
          icon: areas[i].icon,
          color: areas[i].color,
          order: i + 1
        })
      }
      navigate('/annual-planning')
    } catch (error) {
      console.error('Failed to save focus areas:', error)
    }
  }

  const renderIntro = () => (
    <Box sx={{ textAlign: 'center', maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Typography level='h1' sx={{ mb: 2 }}>
        {t('annualPlanning.focusArea.setup.intro.title')}
      </Typography>
      <Typography level='body-lg' sx={{ mb: 4 }}>
        {t('annualPlanning.focusArea.setup.intro.message')}
      </Typography>
      <Card variant='soft' color='primary' sx={{ mb: 4, textAlign: 'left' }}>
        <CardContent>
          <Typography level='title-md' sx={{ mb: 1 }}>
            Tips:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {t('annualPlanning.focusArea.setup.tips', { returnObjects: true }).map((tip, i) => (
              <li key={i}>
                <Typography>{tip}</Typography>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Button size='lg' endDecorator={<ArrowForwardIcon />} onClick={() => setActiveStep(1)}>
        Let&apos;s Start
      </Button>
    </Box>
  )

  const renderAreaStep = (index) => (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Typography level='body-sm' sx={{ mb: 1 }}>
        Focus Area {index + 1} of 3
      </Typography>
      <Typography level='h2' sx={{ mb: 3 }}>
        Define Focus Area {index + 1}
      </Typography>

      <Stack spacing={3}>
        <FormControl>
          <FormLabel>Name</FormLabel>
          <Input
            placeholder='e.g. Health & Fitness'
            value={areas[index].name}
            onChange={(e) => updateArea(index, 'name', e.target.value)}
          />
        </FormControl>

        <FormControl>
          <FormLabel>Description (Your &apos;Why&apos;)</FormLabel>
          <Textarea
            minRows={3}
            placeholder='Why is this area important to you this year?'
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
          <FormLabel sx={{ mb: 1.5 }}>Color Theme</FormLabel>
          <Stack direction='row' spacing={1}>
            {COLORS.map((color) => (
              <IconButton
                key={color}
                onClick={() => updateArea(index, 'color', color)}
                sx={{
                  bgcolor: color,
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  transform: areas[index].color === color ? 'scale(1.2)' : 'none',
                  border: areas[index].color === color ? '2px solid black' : 'none',
                  '&:hover': { bgcolor: color }
                }}
              />
            ))}
          </Stack>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button variant='plain' color='neutral' onClick={handleBack}>
            Back
          </Button>
          <Button endDecorator={activeStep === 3 ? null : <ArrowForwardIcon />} onClick={handleNext} disabled={!areas[index].name}>
            {activeStep === 3 ? 'Review' : 'Next'}
          </Button>
        </Box>
      </Stack>
    </Box>
  )

  const renderReview = () => (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4 }}>
      <Typography level='h2' sx={{ mb: 4, textAlign: 'center' }}>
        Your Plan for 2026
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
                  Edit
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 6 }}>
        <Button variant='plain' onClick={handleBack}>
          Back
        </Button>
        <Button size='lg' startDecorator={<CheckIcon />} onClick={handleSubmit}>
          Finalize Plan
        </Button>
      </Box>
    </Box>
  )

  return (
    <Container maxWidth='xl' sx={{ py: 4 }}>
      <LinearProgress determinate value={((activeStep + 1) / 5) * 100} thickness={4} sx={{ mb: 4, maxWidth: 800, mx: 'auto' }} />

      {activeStep === 0 && renderIntro()}
      {activeStep === 1 && renderAreaStep(0)}
      {activeStep === 2 && renderAreaStep(1)}
      {activeStep === 3 && renderAreaStep(2)}
      {activeStep === 4 && renderReview()}
    </Container>
  )
}

export default FocusAreaSetup

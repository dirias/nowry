import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Modal,
  ModalDialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Stack,
  Button,
  Card,
  Divider,
  Input,
  Textarea,
  RadioGroup,
  Radio,
  LinearProgress,
  Alert
} from '@mui/joy'
import {
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  ArrowForward as ArrowForwardIcon,
  EmojiEvents as EmojiEventsIcon
} from '@mui/icons-material'
import { annualPlanningService } from '../../api/services'
import { useAuth } from '../../context/AuthContext'
import QuarterReportDetail from './QuarterReportDetail'

const CloseQuarterModal = ({ open, onClose, onSuccess, targetQuarter, targetYear, planId, focusAreas, goals }) => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)

  const [activeStep, setActiveStep] = useState(0)
  const [reflections, setReflections] = useState({
    biggest_wins: '',
    biggest_challenges: '',
    next_quarter_focus: ''
  })

  // Filter goals for the target quarter
  const quarterGoals = goals.filter((g) => g.quarter === targetQuarter && g.year === targetYear)

  // Compute metrics
  const totalGoals = quarterGoals.length
  let completedGoalsCount = 0
  let totalMilestonesCount = 0
  let completedMilestonesCount = 0

  const pendingGoals = []
  let totalProgressSum = 0

  quarterGoals.forEach((g) => {
    let goalProgress = g.progress || 0

    if (g.milestones && g.milestones.length > 0) {
      const done = g.milestones.filter((m) => m.completed).length
      goalProgress = Math.round((done / g.milestones.length) * 100)
      totalMilestonesCount += g.milestones.length
      completedMilestonesCount += done
    }

    totalProgressSum += goalProgress

    let isCompleted = g.status === 'completed' || goalProgress === 100
    if (isCompleted) {
      completedGoalsCount++
    } else {
      pendingGoals.push(g)
    }
  })

  const progressPercentage = totalGoals > 0 ? Math.round(totalProgressSum / totalGoals) : 0

  // State for migrated goals
  const [migrationData, setMigrationData] = useState({})

  useEffect(() => {
    // Initialize migration data for pending goals
    const initialData = {}
    pendingGoals.forEach((g) => {
      // By default, suggest moving to next quarter and setting target date to 3 months from now
      let nextQuarter = targetQuarter === 4 ? 1 : targetQuarter + 1
      let nextYear = targetQuarter === 4 ? targetYear + 1 : targetYear

      // Default to end of next quarter
      let endMonth = nextQuarter * 3 - 1
      let newTargetDate = new Date(nextYear, endMonth + 1, 0).toISOString().split('T')[0]

      initialData[g._id] = {
        id: g._id,
        new_quarter: nextQuarter,
        new_target_date: newTargetDate,
        migrate: true // Default true to show them the full flow
      }
    })
    setMigrationData(initialData)
  }, [pendingGoals.length, targetQuarter, targetYear])

  const handleMigrationChange = (goalId, field, value) => {
    setMigrationData((prev) => {
      const updatedGoal = { ...prev[goalId], [field]: value }

      if (field === 'new_quarter' && value >= 1 && value <= 4) {
        const nextQuarter = value
        let nextYear = targetYear
        if (nextQuarter <= targetQuarter) {
          nextYear += 1
        }

        let endMonth = nextQuarter * 3 - 1
        updatedGoal.new_target_date = new Date(nextYear, endMonth + 1, 0).toISOString().split('T')[0]
      }

      return {
        ...prev,
        [goalId]: updatedGoal
      }
    })
  }

  const handleCloseQuarter = async () => {
    setLoading(true)
    try {
      const migrated_goals = Object.values(migrationData)
        .filter((data) => data.migrate) // Only include ones they actively migrate
        .map((data) => ({
          id: data.id,
          new_quarter: data.new_quarter,
          new_target_date: data.new_target_date + 'T23:59:59Z'
        }))

      await annualPlanningService.closeQuarter({
        year: targetYear,
        quarter: targetQuarter,
        annual_plan_id: planId,
        migrated_goals,
        reflections
      })
      onSuccess()
    } catch (error) {
      console.error('Failed to close quarter', error)
      // Error handling could be enhanced
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={!loading ? onClose : undefined}>
      <ModalDialog
        layout='center'
        maxWidth='lg'
        sx={{
          width: { xs: '95vw', sm: '90vw', md: '800px', lg: '900px' },
          maxHeight: '90vh',
          overflowY: 'auto',
          p: 0,
          borderRadius: { xs: 'lg', md: 'xl' },
          bgcolor: 'background.surface',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
        }}
      >
        <Box sx={{ p: 3, bgcolor: 'background.level1', borderBottom: '1px solid', borderColor: 'divider' }}>
          <DialogTitle sx={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {t('annualPlanning.home.closeQuarter', {
              quarter: targetQuarter,
              year: targetYear,
              defaultValue: `Close Q${targetQuarter} ${targetYear}`
            })}
          </DialogTitle>
          <Typography level='body-sm' sx={{ color: 'text.secondary', mt: 0.5 }}>
            {t('annualPlanning.home.closeQuarterDesc', {
              defaultValue: 'Review your progress and migrate pending goals to the next quarter.'
            })}
          </Typography>
        </Box>

        <DialogContent sx={{ p: 3 }}>
          <QuarterReportDetail
            report={{
              quarter: targetQuarter,
              year: targetYear,
              completed_goals: completedGoalsCount,
              total_goals: totalGoals,
              completed_milestones: completedMilestonesCount,
              total_milestones: totalMilestonesCount,
              progress_percentage: progressPercentage,
              goals_summary: quarterGoals
            }}
            focusAreas={focusAreas}
            isPreview={true}
            hideGoals={activeStep === 0}
            interactiveMigration={activeStep === 1}
            migrationData={migrationData}
            onMigrationChange={handleMigrationChange}
          />

          {activeStep === 0 && (
            <Box sx={{ mt: 2, px: { xs: 1, sm: 2 } }}>
              <Typography level='title-lg' sx={{ mb: 3 }}>
                Quarterly Reflection
              </Typography>
              <Stack spacing={4}>
                <Box>
                  <Typography level='title-sm' sx={{ mb: 1, color: 'success.600' }}>
                    What were your biggest wins this quarter?
                  </Typography>
                  <Textarea
                    minRows={3}
                    placeholder='E.g., I finally launched my project and hit my gym goals consistently!'
                    value={reflections.biggest_wins}
                    onChange={(e) => setReflections({ ...reflections, biggest_wins: e.target.value })}
                  />
                </Box>
                <Box>
                  <Typography level='title-sm' sx={{ mb: 1, color: 'danger.600' }}>
                    What were your biggest challenges?
                  </Typography>
                  <Textarea
                    minRows={3}
                    placeholder='E.g., I struggled with time management in February due to unexpected work.'
                    value={reflections.biggest_challenges}
                    onChange={(e) => setReflections({ ...reflections, biggest_challenges: e.target.value })}
                  />
                </Box>
                <Box>
                  <Typography level='title-sm' sx={{ mb: 1, color: 'primary.600' }}>
                    What is your main focus for next quarter?
                  </Typography>
                  <Textarea
                    minRows={2}
                    placeholder='E.g., Doubling down on language learning and maintaining my morning routine.'
                    value={reflections.next_quarter_focus}
                    onChange={(e) => setReflections({ ...reflections, next_quarter_focus: e.target.value })}
                  />
                </Box>
              </Stack>
            </Box>
          )}
        </DialogContent>
        <Box
          sx={{
            p: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Typography level='body-sm' sx={{ color: 'text.tertiary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 'sm' }}>
            Step {activeStep + 1} of 2
          </Typography>
          <Stack direction='row' spacing={1}>
            <Button variant='plain' color='neutral' onClick={activeStep === 1 ? () => setActiveStep(0) : onClose} disabled={loading}>
              {activeStep === 1 ? 'Back to Reflection' : t('common.cancel', { defaultValue: 'Cancel' })}
            </Button>
            {activeStep === 0 ? (
              <Button variant='solid' color='primary' onClick={() => setActiveStep(1)} endDecorator={<ArrowForwardIcon />}>
                Next: Review Goals
              </Button>
            ) : (
              <Button variant='solid' color='primary' onClick={handleCloseQuarter} loading={loading}>
                Finish & Close
              </Button>
            )}
          </Stack>
        </Box>
      </ModalDialog>
    </Modal>
  )
}

export default CloseQuarterModal

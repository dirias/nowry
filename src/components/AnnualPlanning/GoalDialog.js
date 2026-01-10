import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Modal,
  ModalDialog,
  DialogTitle,
  DialogContent,
  Stack,
  FormControl,
  FormLabel,
  Input,
  Button,
  Textarea,
  Select,
  Option,
  Typography,
  Box,
  IconButton,
  List,
  ListItem,
  Chip
} from '@mui/joy'
import { Add as AddIcon, Delete as DeleteIcon, CheckBox, CheckBoxOutlineBlank } from '@mui/icons-material'

import { annualPlanningService } from '../../api/services'

const GoalDialog = ({ open, onClose, focusAreaId, priorities = [], onSuccess, goal = null, yearlyObjectives = [] }) => {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    focus_area_id: focusAreaId,
    target_date: '',
    image_url: '',
    type: 'yearly',
    year: new Date().getFullYear(),
    status: 'not_started',
    milestones: []
  })
  const [activities, setActivities] = useState([])

  // Milestones State (Managed locally before submit)
  const [milestones, setMilestones] = useState([])
  const milestoneRefs = useRef([])

  // Auto-focus new milestone
  useEffect(() => {
    if (milestones.length > 0) {
      const lastIndex = milestones.length - 1
      // If the last milestone is new (empty title), try to focus it
      if (!milestones[lastIndex].title && milestoneRefs.current[lastIndex]) {
        // Tiny timeout ensuring DOM render
        setTimeout(() => {
          milestoneRefs.current[lastIndex]?.querySelector('input')?.focus()
        }, 50)
      }
    }
  }, [milestones.length])

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      if (goal && goal._id) {
        // Edit Mode
        setFormData({
          title: goal.title,
          description: goal.description,
          focus_area_id: goal.focus_area_id,
          target_date: goal.target_date ? goal.target_date.split('T')[0] : '',
          image_url: goal.image_url || '',
          type: goal.type || 'yearly',
          quarter: goal.quarter || '',
          parent_id: goal.parent_id || '',
          year: goal.year || new Date().getFullYear(),
          status: goal.status || 'not_started'
        })
        // Ensure milestones are objects
        const initMilestones = (goal.milestones || []).map((m) =>
          typeof m === 'string' ? { title: m, completed: false } : { title: m.title || '', completed: m.completed || false }
        )
        setMilestones(initMilestones)
        fetchActivities(goal._id)
      } else if (goal) {
        // Create Mode with Context
        setFormData({
          title: '',
          description: '',
          focus_area_id: focusAreaId,
          target_date: '',
          image_url: '',
          type: goal.type || 'yearly',
          quarter: goal.quarter || '',
          parent_id: goal.parent_id || '',
          year: new Date().getFullYear(),
          status: 'not_started'
        })
        setMilestones([])
        setActivities([])
      } else {
        // clean create
        setFormData({
          title: '',
          description: '',
          focus_area_id: focusAreaId,
          target_date: '',
          image_url: '',
          type: 'yearly',
          quarter: '',
          parent_id: '',
          year: new Date().getFullYear(),
          status: 'not_started'
        })
        setMilestones([])
        setActivities([])
      }
    }
  }, [open, goal, focusAreaId])

  const fetchActivities = async (goalId) => {
    try {
      const data = await annualPlanningService.getActivities(goalId)
      setActivities(data)
    } catch (error) {
      console.error('Failed to load activities', error)
    }
  }

  // Handler helpers
  const handleChange = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }))

  // Milestone Handlers
  const handleAddMilestone = () => setMilestones([...milestones, { title: '', completed: false }])

  const handleMilestoneChange = (index, val) => {
    const newM = [...milestones]
    newM[index] = { ...newM[index], title: val }
    setMilestones(newM)
  }

  const handleDeleteMilestone = (index) => setMilestones(milestones.filter((_, i) => i !== index))

  // Activity Handlers
  const handleAddActivity = () => {
    setActivities((prev) => [...prev, { title: '', frequency: 'daily', isNew: true }])
  }

  const handleActivityChange = (index, field, value) => {
    const newActivities = [...activities]
    newActivities[index] = { ...newActivities[index], [field]: value }
    setActivities(newActivities)
  }

  const handleActivityDelete = (index) => {
    setActivities((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!formData.title || loading) return

    setLoading(true)
    try {
      // Filter out empty milestones and ensure structure
      const validMilestones = milestones
        .filter((m) => m.title && m.title.trim() !== '')
        .map((m) => ({ title: m.title.trim(), completed: m.completed || false }))

      const payload = { ...formData, milestones: validMilestones }

      let savedGoal
      if (goal && goal._id) {
        savedGoal = await annualPlanningService.updateGoal(goal._id, payload)
      } else {
        savedGoal = await annualPlanningService.createGoal(payload)
      }

      // ... save activities ...
      const activityPromises = activities.map(async (act) => {
        if (act.isNew && act.title) {
          await annualPlanningService.createActivity(savedGoal._id, {
            title: act.title,
            frequency: act.frequency,
            goal_id: savedGoal._id
          })
        }
      })
      await Promise.all(activityPromises)

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Failed to save goal:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        sx={{
          maxWidth: { xs: '100%', md: 600 },
          width: { xs: '100%', md: 600 },
          height: { xs: '100%', md: 'auto' },
          overflowY: 'auto',
          p: { xs: 2, md: 3 },
          m: { xs: 0, md: 'auto' },
          borderRadius: { xs: 0, md: 'md' }
        }}
      >
        <DialogTitle>{goal && goal._id ? t('annualPlanning.goal.edit') : t('annualPlanning.goal.add')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {/* Context Header (Read-Only) */}
            {(goal && !goal._id && (goal.type || goal.quarter || goal.parent_id)) || (goal && goal._id) ? (
              <Box sx={{ bgcolor: 'background.level1', p: 1.5, borderRadius: 'sm', display: 'flex', gap: 2, alignItems: 'center' }}>
                {goal.quarter ? (
                  <Chip color='primary' variant='solid' size='sm'>
                    Q{goal.quarter}
                  </Chip>
                ) : (
                  <Chip color='neutral' variant='soft' size='sm'>
                    Yearly Objective
                  </Chip>
                )}
                {goal.parent_id && (
                  <Typography level='body-sm' fontWeight={500}>
                    ↳ {yearlyObjectives.find((o) => o._id === goal.parent_id)?.title || 'Parent Objective'}
                  </Typography>
                )}
              </Box>
            ) : (
              /* Editable Selectors (Only shown if no context exists, e.g. generic edit) */
              <Stack spacing={2}>
                {/* Timeframe Selection (Infers Type) */}
                <Stack direction='row' spacing={2}>
                  <FormControl sx={{ flex: 1 }}>
                    <FormLabel>Timeframe</FormLabel>
                    <Select
                      value={formData.type === 'yearly' ? 'yearly' : formData.quarter}
                      onChange={(e, val) => {
                        if (val === 'yearly') {
                          handleChange('type', 'yearly')
                          handleChange('quarter', '')
                        } else {
                          handleChange('type', 'quarterly')
                          handleChange('quarter', val)
                        }
                      }}
                    >
                      <Option value='yearly'>All Year (Objective)</Option>
                      <Option value={1}>Q1 (Jan - Mar)</Option>
                      <Option value={2}>Q2 (Apr - Jun)</Option>
                      <Option value={3}>Q3 (Jul - Sep)</Option>
                      <Option value={4}>Q4 (Oct - Dec)</Option>
                    </Select>
                  </FormControl>
                </Stack>

                {formData.type === 'quarterly' && (
                  <FormControl>
                    <FormLabel>Parent Objective</FormLabel>
                    <Select
                      value={formData.parent_id}
                      onChange={(e, val) => handleChange('parent_id', val)}
                      placeholder='Select Yearly Objective...'
                    >
                      {yearlyObjectives.map((obj) => (
                        <Option key={obj._id} value={obj._id}>
                          {obj.title}
                        </Option>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Stack>
            )}

            <FormControl required>
              <FormLabel>{t('annualPlanning.goal.title')}</FormLabel>
              <Input value={formData.title} onChange={(e) => handleChange('title', e.target.value)} autoFocus size='lg' />
            </FormControl>

            <FormControl>
              <FormLabel>{t('annualPlanning.goal.description')}</FormLabel>
              <Textarea minRows={3} value={formData.description} onChange={(e) => handleChange('description', e.target.value)} />
            </FormControl>

            {/* Milestones UI */}
            <Box>
              <Stack direction='row' justifyContent='space-between' alignItems='center' mb={1}>
                <Typography level='title-sm'>Key Results / Milestones</Typography>
                <Button size='sm' startDecorator={<AddIcon />} variant='plain' onClick={handleAddMilestone}>
                  Add
                </Button>
              </Stack>
              <Stack spacing={1}>
                {milestones.map((ms, index) => (
                  <Stack key={index} direction='row' spacing={1} alignItems='center'>
                    <Box
                      onClick={() => {
                        const newM = [...milestones]
                        newM[index] = { ...newM[index], completed: !ms.completed }
                        setMilestones(newM)
                      }}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: ms.completed ? 'primary.solidBg' : 'neutral.outlinedBorder',
                        cursor: 'pointer',
                        transition: 'color 0.2s ease',
                        '&:hover': {
                          color: ms.completed ? 'primary.solidHoverBg' : 'primary.plainColor'
                        }
                      }}
                    >
                      {ms.completed ? <CheckBox sx={{ fontSize: 24 }} /> : <CheckBoxOutlineBlank sx={{ fontSize: 24 }} />}
                    </Box>
                    <Input
                      slotProps={{ input: { ref: (el) => (milestoneRefs.current[index] = el?.parentElement) } }}
                      fullWidth
                      value={ms.title}
                      onChange={(e) => handleMilestoneChange(index, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddMilestone()
                        }
                      }}
                      placeholder='Milestone...'
                    />
                    <IconButton size='sm' variant='plain' color='danger' onClick={() => handleDeleteMilestone(index)}>
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl sx={{ flex: 1 }}>
                <FormLabel>{t('annualPlanning.goal.targetDate')}</FormLabel>
                <Input type='date' value={formData.target_date} onChange={(e) => handleChange('target_date', e.target.value)} size='lg' />
              </FormControl>
            </Stack>

            <FormControl>
              <FormLabel>{t('annualPlanning.goal.imageUrl')}</FormLabel>
              <Input placeholder='https://...' value={formData.image_url} onChange={(e) => handleChange('image_url', e.target.value)} />
              {/* Placeholder for AI generation button */}
            </FormControl>

            <Box sx={{ mt: 2 }}>
              <Stack direction='row' justifyContent='space-between' alignItems='center' mb={1}>
                <Typography level='title-sm'>{t('annualPlanning.activity.title')}</Typography>
                <Button size='sm' startDecorator={<AddIcon />} variant='plain' onClick={handleAddActivity}>
                  Add
                </Button>
              </Stack>
              <List>
                {activities.map((act, index) => (
                  <ListItem key={index}>
                    <Stack direction='row' spacing={1} sx={{ width: '100%' }}>
                      <Input
                        placeholder='Activity name'
                        value={act.title}
                        onChange={(e) => handleActivityChange(index, 'title', e.target.value)}
                        sx={{ flex: 1 }}
                      />
                      <Select
                        value={act.frequency}
                        onChange={(e, val) => handleActivityChange(index, 'frequency', val)}
                        sx={{ width: 100 }}
                      >
                        <Option value='daily'>Daily</Option>
                        <Option value='weekly'>Weekly</Option>
                      </Select>
                      {!act._id && (
                        <IconButton size='sm' color='danger' onClick={() => handleActivityDelete(index)}>
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </Stack>
                  </ListItem>
                ))}
              </List>
            </Box>

            <Stack
              direction='row'
              justifyContent='flex-end'
              spacing={2}
              sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}
            >
              <Button variant='plain' onClick={onClose} size='lg'>
                Cancel
              </Button>
              <Button loading={loading} onClick={handleSubmit} size='lg' disabled={loading}>
                Save Goal
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </ModalDialog>
    </Modal>
  )
}

export default GoalDialog

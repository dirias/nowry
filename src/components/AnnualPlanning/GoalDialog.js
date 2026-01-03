import React, { useState, useEffect } from 'react'
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
  ListItem
} from '@mui/joy'
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material'

import { annualPlanningService } from '../../api/services'

const GoalDialog = ({ open, onClose, focusAreaId, priorities = [], onSuccess, goal = null }) => {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    focus_area_id: focusAreaId,
    target_date: '',
    image_url: ''
  })
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      if (goal) {
        setFormData({
          title: goal.title,
          description: goal.description,
          focus_area_id: goal.focus_area_id,
          target_date: goal.target_date ? goal.target_date.split('T')[0] : '',
          image_url: goal.image_url || ''
        })
        fetchActivities(goal._id)
      } else {
        setFormData({
          title: '',
          description: '',
          focus_area_id: focusAreaId,
          target_date: '',
          image_url: ''
        })
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

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

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
    if (!formData.title) return

    setLoading(true)
    try {
      let savedGoal
      if (goal) {
        savedGoal = await annualPlanningService.updateGoal(goal._id, formData)
      } else {
        savedGoal = await annualPlanningService.createGoal(formData)
      }

      // Save activities
      // For existing goals, we only create new activities or update existing?
      // For simplicity in MVP, we create new ones and maybe update.
      // Let's just handle creation of isNew activities for now.

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
      <ModalDialog sx={{ maxWidth: 600, width: '100%', overflowY: 'auto' }}>
        <DialogTitle>{goal ? t('annualPlanning.goal.edit') : t('annualPlanning.goal.add')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <FormControl required>
              <FormLabel>{t('annualPlanning.goal.title')}</FormLabel>
              <Input value={formData.title} onChange={(e) => handleChange('title', e.target.value)} autoFocus />
            </FormControl>

            <FormControl>
              <FormLabel>{t('annualPlanning.goal.description')}</FormLabel>
              <Textarea minRows={2} value={formData.description} onChange={(e) => handleChange('description', e.target.value)} />
            </FormControl>

            <Stack direction='row' spacing={2}>
              <FormControl sx={{ flex: 1 }}>
                <FormLabel>{t('annualPlanning.goal.targetDate')}</FormLabel>
                <Input type='date' value={formData.target_date} onChange={(e) => handleChange('target_date', e.target.value)} />
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

            <Stack direction='row' justifyContent='flex-end' spacing={2} sx={{ mt: 2 }}>
              <Button variant='plain' onClick={onClose}>
                Cancel
              </Button>
              <Button loading={loading} onClick={handleSubmit}>
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

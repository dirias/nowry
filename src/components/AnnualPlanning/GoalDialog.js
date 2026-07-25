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
  Card,
  Divider,
  AspectRatio
} from '@mui/joy'
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material'

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
  const dateInputRefs = useRef([])

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
  }, [milestones])

  const [loading, setLoading] = useState(false)

  const fetchActivities = async (goalId) => {
    try {
      const data = await annualPlanningService.getActivities(goalId)
      setActivities(data)
    } catch (error) {
      console.error('Failed to load activities', error)
    }
  }

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
          typeof m === 'string'
            ? { title: m, completed: false, due_date: '' }
            : { title: m.title || '', completed: m.completed || false, due_date: m.due_date ? m.due_date.split('T')[0] : '' }
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
  }, [open, goal, focusAreaId, yearlyObjectives])

  // Handler helpers
  const handleChange = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }))

  // Milestone Handlers
  const handleAddMilestone = () => setMilestones([...milestones, { title: '', completed: false, due_date: '' }])

  const handleMilestoneChange = (index, field, val) => {
    const newM = [...milestones]
    newM[index] = { ...newM[index], [field]: val }
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
        .map((m) => ({ title: m.title.trim(), completed: m.completed || false, due_date: m.due_date || null }))

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
          // Mobile-first responsive width
          width: { xs: '95%', sm: '85%', md: '75%', lg: '700px' },
          maxWidth: '700px',
          height: { xs: '95vh', md: 'auto' },
          maxHeight: { xs: '95vh', md: '90vh' },
          overflowY: 'auto',
          p: 0,
          m: { xs: 'auto', md: 'auto' },
          borderRadius: { xs: 'lg', md: 'xl' },
          boxShadow: 'lg',
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        {/* Header - Elevated */}
        <Box
          sx={{
            px: { xs: 2, sm: 3, md: 4 },
            py: { xs: 2, md: 3 },
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.level1'
          }}
        >
          <DialogTitle level='h4' sx={{ m: 0, fontWeight: 700, fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
            {goal && goal._id ? t('annualPlanning.goal.edit') : t('annualPlanning.goal.add')}
          </DialogTitle>
          {goal && goal._id && (
            <Typography level='body-sm' sx={{ color: 'text.tertiary', mt: 0.5 }}>
              {t('annualPlanning.goal.editSubtitle')}
            </Typography>
          )}
        </Box>

        {/* Content - Generous padding */}
        <DialogContent sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, md: 3 } }}>
          <Stack spacing={3}>
            {/* Context Header - Premium Design */}
            {(goal && !goal._id && (goal.type || goal.quarter || goal.parent_id)) || (goal && goal._id) ? (
              <Stack
                direction='row'
                spacing={1}
                alignItems='center'
                sx={{
                  px: 2,
                  py: 1.5,
                  borderRadius: 'md',
                  bgcolor: goal.quarter ? 'primary.softBg' : 'neutral.softBg',
                  border: '1px solid',
                  borderColor: goal.quarter ? 'primary.outlinedBorder' : 'neutral.outlinedBorder'
                }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: goal.quarter ? 'primary.solidBg' : 'neutral.solidBg'
                  }}
                />
                <Typography level='body-sm' sx={{ fontWeight: 600, color: goal.quarter ? 'primary.plainColor' : 'text.primary' }}>
                  {goal.quarter ? `Q${goal.quarter} Goal` : 'Yearly Objective'}
                </Typography>
                {goal.parent_id && (
                  <>
                    <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
                      •
                    </Typography>
                    <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                      ↳ {yearlyObjectives.find((o) => o._id === goal.parent_id)?.title || 'Parent Objective'}
                    </Typography>
                  </>
                )}
              </Stack>
            ) : (
              /* Editable Timeframe Selector */
              <Box>
                <Typography level='title-md' sx={{ mb: 2, fontWeight: 700, color: 'text.primary' }}>
                  {t('annualPlanning.goal.timeframe')}
                </Typography>
                <Stack spacing={2}>
                  <FormControl>
                    <FormLabel sx={{ fontWeight: 600 }}>{t('annualPlanning.goal.timeframeQuestion')}</FormLabel>
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
                      size='lg'
                    >
                      <Option value='yearly'>📅 All Year (Objective)</Option>
                      <Option value={1}>Q1 (Jan - Mar)</Option>
                      <Option value={2}>Q2 (Apr - Jun)</Option>
                      <Option value={3}>Q3 (Jul - Sep)</Option>
                      <Option value={4}>Q4 (Oct - Dec)</Option>
                    </Select>
                  </FormControl>

                  {formData.type === 'quarterly' && yearlyObjectives.length > 0 && (
                    <FormControl>
                      <FormLabel sx={{ fontWeight: 600 }}>{t('annualPlanning.goal.linkToObjective')}</FormLabel>
                      <Select
                        value={formData.parent_id}
                        onChange={(e, val) => handleChange('parent_id', val)}
                        placeholder='Select parent objective...'
                        size='lg'
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
              </Box>
            )}

            {((goal && !goal._id && (goal.type || goal.quarter || goal.parent_id)) || (goal && goal._id)) && <Divider />}

            {/* Section: Basic Information */}
            <Box>
              <Typography level='title-md' sx={{ mb: 2, fontWeight: 700, color: 'text.primary' }}>
                {t('annualPlanning.goal.basicInfo')}
              </Typography>
              <Stack spacing={2}>
                <FormControl required>
                  <FormLabel sx={{ fontWeight: 600 }}>{t('annualPlanning.goal.title')}</FormLabel>
                  <Input
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder={t('annualPlanning.goal.titlePlaceholder')}
                    autoFocus
                    size='lg'
                    sx={{ fontSize: '1rem' }}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel sx={{ fontWeight: 600 }}>{t('annualPlanning.goal.description')}</FormLabel>
                  <Textarea
                    minRows={3}
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder={t('annualPlanning.goal.descriptionPlaceholder')}
                    sx={{ fontSize: '0.95rem' }}
                  />
                </FormControl>
              </Stack>
            </Box>

            <Divider />

            {/* Section: Key Results & Milestones */}
            <Box>
              <Stack direction='row' justifyContent='space-between' alignItems='flex-start' mb={2}>
                <Box>
                  <Typography level='title-md' sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {t('annualPlanning.goal.keyResultsTitle')}
                  </Typography>
                  <Typography level='body-xs' sx={{ color: 'text.tertiary', mt: 0.5 }}>
                    Break down your goal into measurable steps
                  </Typography>
                </Box>
                <Button size='sm' startDecorator={<AddIcon />} variant='soft' onClick={handleAddMilestone}>
                  Add
                </Button>
              </Stack>

              <Stack spacing={1.5}>
                {milestones.map((ms, index) => (
                  <Stack key={index} direction='row' spacing={1.5} alignItems='center'>
                    {/* Custom Checkbox - Per Design Guidelines */}
                    <Box
                      onClick={() => {
                        const newM = [...milestones]
                        newM[index] = { ...newM[index], completed: !ms.completed }
                        setMilestones(newM)
                      }}
                      sx={{
                        width: 20,
                        height: 20,
                        border: '2px solid',
                        borderColor: ms.completed ? 'success.outlinedColor' : 'neutral.outlinedBorder',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: ms.completed ? 'success.softBg' : 'transparent',
                        color: ms.completed ? 'success.plainColor' : undefined,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        flexShrink: 0,
                        '&:hover': {
                          borderColor: ms.completed ? 'success.outlinedBorder' : 'primary.outlinedBorder',
                          transform: 'scale(1.05)'
                        }
                      }}
                    >
                      {ms.completed && (
                        <Box
                          component='svg'
                          width='14'
                          height='14'
                          viewBox='0 0 24 24'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='3'
                          strokeLinecap='round'
                          strokeLinejoin='round'
                        >
                          <polyline points='20 6 9 17 4 12' />
                        </Box>
                      )}
                    </Box>

                    <Input
                      slotProps={{ input: { ref: (el) => (milestoneRefs.current[index] = el?.parentElement) } }}
                      fullWidth
                      value={ms.title}
                      onChange={(e) => handleMilestoneChange(index, 'title', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddMilestone()
                        }
                      }}
                      placeholder={t('annualPlanning.goal.milestonePlaceholder')}
                      sx={{
                        textDecoration: ms.completed ? 'line-through' : 'none',
                        color: ms.completed ? 'text.tertiary' : 'text.primary'
                      }}
                    />

                    {/* Optional due date chip */}
                    <Box sx={{ position: 'relative', flexShrink: 0 }}>
                      <Box
                        onClick={() => {
                          const inp = dateInputRefs.current[index]
                          if (inp) {
                            try {
                              inp.showPicker()
                            } catch {
                              inp.click()
                            }
                          }
                        }}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          px: 1,
                          py: 0.5,
                          borderRadius: 'sm',
                          border: '1px dashed',
                          borderColor: ms.due_date ? 'primary.outlinedBorder' : 'divider',
                          bgcolor: ms.due_date ? 'primary.softBg' : 'transparent',
                          cursor: 'pointer',
                          fontSize: '0.7rem',
                          color: ms.due_date ? 'primary.plainColor' : 'text.tertiary',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.15s',
                          '&:hover': { borderColor: 'primary.outlinedBorder', color: 'primary.plainColor' }
                        }}
                        title={ms.due_date ? 'Click to change · Right-click to clear' : 'Set target date'}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          handleMilestoneChange(index, 'due_date', '')
                        }}
                      >
                        🗓 {ms.due_date || 'date'}
                      </Box>
                      {/* Invisible but properly-sized date input for native picker */}
                      <Box
                        component='input'
                        ref={(el) => (dateInputRefs.current[index] = el)}
                        type='date'
                        value={ms.due_date || ''}
                        onChange={(e) => handleMilestoneChange(index, 'due_date', e.target.value)}
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          opacity: 0,
                          pointerEvents: 'none',
                          cursor: 'pointer'
                        }}
                      />
                    </Box>

                    <IconButton size='sm' variant='plain' color='danger' onClick={() => handleDeleteMilestone(index)}>
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                ))}

                {milestones.length === 0 && (
                  <Box
                    sx={{
                      py: 3,
                      textAlign: 'center',
                      bgcolor: 'background.level1',
                      borderRadius: 'md',
                      border: '1px dashed',
                      borderColor: 'divider'
                    }}
                  >
                    <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
                      {t('annualPlanning.goal.noMilestones')}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Box>

            <Divider />

            {/* Section: Timeline & Visual */}
            <Box>
              <Typography level='title-md' sx={{ mb: 2, fontWeight: 700, color: 'text.primary' }}>
                {t('annualPlanning.goal.timelineVisual')}
              </Typography>
              <Stack spacing={2}>
                <FormControl>
                  <FormLabel sx={{ fontWeight: 600 }}>{t('annualPlanning.goal.targetDate')}</FormLabel>
                  <Input type='date' value={formData.target_date} onChange={(e) => handleChange('target_date', e.target.value)} size='lg' />
                </FormControl>

                <FormControl>
                  <FormLabel sx={{ fontWeight: 600 }}>{t('annualPlanning.goal.imageUrl')}</FormLabel>
                  <Typography level='body-xs' sx={{ color: 'text.tertiary', mb: 1 }}>
                    Add a visual reminder for motivation (optional)
                  </Typography>

                  {formData.image_url && (
                    <AspectRatio
                      ratio='16/9'
                      objectFit='cover'
                      sx={{ mb: 2, borderRadius: 'md', overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}
                    >
                      <img src={formData.image_url} alt='Goal preview' loading='lazy' />
                    </AspectRatio>
                  )}

                  <Input
                    placeholder='https://example.com/image.jpg'
                    value={formData.image_url}
                    onChange={(e) => handleChange('image_url', e.target.value)}
                  />
                </FormControl>
              </Stack>
            </Box>

            <Divider />

            {/* Section: Recurring Activities */}
            <Box
              sx={{
                bgcolor: 'background.level1',
                borderRadius: 'lg',
                p: { xs: 2, md: 3 },
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Stack direction='row' justifyContent='space-between' alignItems='flex-start' mb={2}>
                <Box>
                  <Typography level='title-md' sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {t('annualPlanning.goal.habits')}
                  </Typography>
                  <Typography level='body-xs' sx={{ color: 'text.tertiary', mt: 0.5 }}>
                    What will you do regularly to stay on track?
                  </Typography>
                </Box>
                <Button size='sm' startDecorator={<AddIcon />} variant='soft' onClick={handleAddActivity}>
                  Add
                </Button>
              </Stack>

              <Stack spacing={1.5}>
                {activities.map((act, index) => (
                  <Card variant='outlined' key={index} sx={{ p: 2, bgcolor: 'background.surface' }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                      <Input
                        placeholder={t('annualPlanning.goal.habitPlaceholder')}
                        value={act.title}
                        onChange={(e) => handleActivityChange(index, 'title', e.target.value)}
                        sx={{ flex: 1 }}
                      />
                      <Select
                        value={act.frequency}
                        onChange={(e, val) => handleActivityChange(index, 'frequency', val)}
                        sx={{ width: { xs: '100%', sm: 130 } }}
                      >
                        <Option value='daily'>🔄 Daily</Option>
                        <Option value='weekly'>📅 Weekly</Option>
                        <Option value='monthly'>📆 Monthly</Option>
                      </Select>
                      {/* Streak badge for saved habits */}
                      {act.streak > 0 && (
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.25,
                            px: 1,
                            py: 0.5,
                            borderRadius: 'sm',
                            bgcolor: 'warning.softBg',
                            flexShrink: 0
                          }}
                        >
                          <Typography level='body-xs' sx={{ color: 'warning.plainColor', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            🔥 {act.streak}d
                          </Typography>
                        </Box>
                      )}
                      <IconButton size='sm' variant='plain' color='danger' onClick={() => handleActivityDelete(index)}>
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  </Card>
                ))}

                {activities.length === 0 && (
                  <Box
                    sx={{
                      py: 2,
                      textAlign: 'center',
                      bgcolor: 'background.surface',
                      borderRadius: 'md',
                      border: '1px dashed',
                      borderColor: 'divider'
                    }}
                  >
                    <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
                      No habits yet. Add recurring habits above.
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>

        {/* Footer - Sticky actions */}
        <Box
          sx={{
            px: { xs: 2, sm: 3, md: 4 },
            py: { xs: 2, md: 3 },
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.surface',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            gap: 2
          }}
        >
          <Button variant='plain' onClick={onClose} size='lg' sx={{ width: { xs: '100%', sm: 'auto' } }}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} loading={loading} disabled={loading} size='lg' sx={{ width: { xs: '100%', sm: 'auto' } }}>
            {goal && goal._id ? t('annualPlanning.goal.updateGoal') : t('annualPlanning.goal.saveGoal')}
          </Button>
        </Box>
      </ModalDialog>
    </Modal>
  )
}

export default GoalDialog

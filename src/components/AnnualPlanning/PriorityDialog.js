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
  Autocomplete,
  AutocompleteOption,
  Typography,
  Divider
} from '@mui/joy'
import { annualPlanningService } from '../../api/services'
import { tasksService } from '../../api/services/tasks.service' // Check import path if needed, usually index exports it

const PriorityDialog = ({ open, onClose, annualPlanId, focusAreas = [], existingPriorities = [], onSuccess }) => {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    focus_area_id: '',
    linked_entity_id: null,
    linked_entity_type: null, // 'goal', 'task', 'routine'
    deadline: ''
  })

  // Available Items for linking
  const [availableItems, setAvailableItems] = useState({
    goals: [],
    tasks: [],
    routine: []
  })

  // Reset form when opening
  useEffect(() => {
    if (open) {
      setFormData({
        title: '',
        description: '',
        focus_area_id: '',
        linked_entity_id: null,
        linked_entity_type: null,
        deadline: ''
      })
      setAvailableItems({ goals: [], tasks: [], routine: [] })
    }
  }, [open])

  // Fetch items when Focus Area is selected (Tasks/Routine are global, but Goals are per area)
  // Actually, Users probably want to link *any* task or routine regardless of focus area,
  // but Goals are strictly tied to focus area in this context?
  // Let's fetch Tasks/Routine once on open (or when focus area changes, doesn't matter much)
  // and Goals when focus area changes.
  // Fetch global items (Tasks & Routines) on open
  // Fetch global items (Tasks, Routines, and ALL Goals) on open
  useEffect(() => {
    if (open) {
      const fetchLinkables = async () => {
        try {
          // Fetch tasks & routine
          const [tasksResult, routineResult] = await Promise.allSettled([
            tasksService.getAll(false),
            annualPlanningService.getDailyRoutine()
          ])

          const tasks = tasksResult.status === 'fulfilled' ? tasksResult.value : []
          const routineData = routineResult.status === 'fulfilled' ? routineResult.value : {}

          // Fetch Goals from all available Focus Areas
          let allGoals = []
          if (focusAreas.length > 0) {
            const goalPromises = focusAreas.map((area) => annualPlanningService.getGoals(area._id))
            const goalResults = await Promise.allSettled(goalPromises)
            goalResults.forEach((res) => {
              if (res.status === 'fulfilled' && Array.isArray(res.value)) {
                allGoals.push(...res.value)
              }
            })
          }

          // Process routine items
          const routineItems = []
          ;['morning', 'afternoon', 'evening'].forEach((section) => {
            const list = routineData[`${section}_routine`] || []
            list.forEach((item, index) => {
              const itemId = item.id || `temp-${section}-${index}`
              if (item.title) {
                routineItems.push({
                  id: itemId,
                  title: item.title,
                  type: 'routine',
                  subtype: `routine_${section}`
                })
              }
            })
          })

          // Filter out already linked items
          const isLinked = (id, type) => {
            if (!existingPriorities) return false
            return existingPriorities.some((p) => p.linked_entity_id === id && p.linked_entity_type === type)
          }

          setAvailableItems({
            tasks: tasks.filter((t) => !isLinked(t._id, 'task')) || [],
            routine: routineItems.filter((r) => !isLinked(r.id, r.subtype)),
            goals: allGoals.filter((g) => !isLinked(g._id, 'goal'))
          })
        } catch (err) {
          console.error('Failed to fetch linkables', err)
        }
      }
      fetchLinkables()
    }
  }, [open, focusAreas])

  // Handle Linking Item
  // Handle Linking Item
  const handleLinkItem = (selectedItem) => {
    if (!selectedItem) {
      setFormData((prev) => ({
        ...prev,
        linked_entity_id: null,
        linked_entity_type: null,
        title: '',
        description: '',
        deadline: ''
      }))
      return
    }

    const { type, valueId: id } = selectedItem

    if (selectedItem) {
      const subtype = selectedItem.subtype || type // Use subtype for routine (routine_morning)

      // Auto-fill Description
      let autoDesc = selectedItem.description || ''
      if (type === 'task') autoDesc = 'Regular Task'
      if (type === 'routine') {
        const section = subtype.replace('routine_', '')
        autoDesc = `${section.charAt(0).toUpperCase() + section.slice(1)} Routine`
      }

      setFormData((prev) => ({
        ...prev,
        linked_entity_id: id,
        linked_entity_type: subtype,
        title: selectedItem.title,
        description: autoDesc,
        // For routine: clear deadline. For task/goal: use deadline if available
        deadline:
          type === 'routine'
            ? ''
            : selectedItem.deadline
              ? selectedItem.deadline.split('T')[0]
              : selectedItem.target_date
                ? selectedItem.target_date.split('T')[0]
                : ''
      }))
    }
  }

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (!formData.title) return

    setLoading(true)
    try {
      // Sanitize payload: replace empty strings with null for optional fields
      const payload = {
        ...formData,
        annual_plan_id: annualPlanId,
        focus_area_id: null,
        deadline: formData.deadline || null, // Ensure empty string becomes null
        linked_entity_id: formData.linked_entity_id || null,
        description: formData.description || ''
      }

      await annualPlanningService.createPriority(payload)
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Failed to create priority:', error)
    } finally {
      setLoading(false)
    }
  }

  const isRoutineLink = formData.linked_entity_type && formData.linked_entity_type.startsWith('routine')

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog sx={{ maxWidth: 500, width: '100%' }}>
        <DialogTitle>Add Annual Priority</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {/* Generic Link - Top */}
            <FormControl>
              <FormLabel>Link to Item (Optional)</FormLabel>
              <Autocomplete
                placeholder='Select goal, task, or routine...'
                options={[
                  ...availableItems.goals.map((g) => ({ ...g, type: 'goal', label: g.title, group: 'Goals', valueId: g._id })),
                  ...availableItems.tasks.map((t) => ({ ...t, type: 'task', label: t.title, group: 'Tasks', valueId: t._id })),
                  ...availableItems.routine.map((r) => ({
                    ...r,
                    type: 'routine',
                    label: r.title,
                    group: 'Daily Routine',
                    valueId: r.id,
                    displaySubtype: r.subtype.replace('routine_', '')
                  }))
                ]}
                groupBy={(option) => option.group}
                getOptionLabel={(option) => option.label}
                isOptionEqualToValue={(option, value) => option.valueId === value.valueId && option.type === value.type}
                onChange={(e, val) => handleLinkItem(val)}
                value={
                  formData.linked_entity_id
                    ? {
                        label: formData.title, // Fallback label usage, visually acceptable as title usually matches
                        valueId: formData.linked_entity_id,
                        type:
                          formData.linked_entity_type && formData.linked_entity_type.startsWith('routine')
                            ? 'routine'
                            : formData.linked_entity_type || 'goal'
                      }
                    : null
                }
                renderOption={(props, option) => (
                  <AutocompleteOption {...props}>
                    {option.label}
                    {option.type === 'routine' && (
                      <Typography level='body-xs' ml={1} textColor='text.tertiary'>
                        ({option.displaySubtype})
                      </Typography>
                    )}
                  </AutocompleteOption>
                )}
              />
            </FormControl>

            <Divider />

            <FormControl required>
              <FormLabel>Priority Title</FormLabel>
              <Input
                autoFocus
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                disabled={!!formData.linked_entity_id}
              />
              {formData.linked_entity_id && (
                <Typography level='body-xs'>Linked to {formData.linked_entity_type?.replace('_', ' ')}</Typography>
              )}
            </FormControl>

            <FormControl>
              <FormLabel>Description</FormLabel>
              <Textarea minRows={2} value={formData.description} onChange={(e) => handleChange('description', e.target.value)} />
            </FormControl>

            {!isRoutineLink && (
              <FormControl>
                <FormLabel>Target Deadline</FormLabel>
                <Input type='date' value={formData.deadline} onChange={(e) => handleChange('deadline', e.target.value)} />
              </FormControl>
            )}

            <Stack direction='row' justifyContent='flex-end' spacing={2} sx={{ mt: 2 }}>
              <Button variant='plain' onClick={onClose}>
                Cancel
              </Button>
              <Button loading={loading} onClick={handleSubmit}>
                Add Priority
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </ModalDialog>
    </Modal>
  )
}

export default PriorityDialog

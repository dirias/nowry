import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Stack,
  Input,
  IconButton,
  List,
  ListItem,
  ListItemContent,
  Chip,
  Divider,
  LinearProgress,
  Container
} from '@mui/joy'
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  WbSunny as MorningIcon,
  WbTwilight as AfternoonIcon,
  NightsStay as EveningIcon
} from '@mui/icons-material'

import { annualPlanningService } from '../../api/services'

const DailyRoutinePlanner = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [routine, setRoutine] = useState(null)
  const [activities, setActivities] = useState([])
  const [saving, setSaving] = useState(false)
  const [newItem, setNewItem] = useState({ morning: '', afternoon: '', evening: '' })

  /* State for editing */
  const [editingItem, setEditingItem] = useState(null) // { section, index }
  const [editValue, setEditValue] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const year = new Date().getFullYear()
      const plan = await annualPlanningService.getAnnualPlan(year)

      const [routineData, areasData] = await Promise.all([
        annualPlanningService.getDailyRoutine(),
        annualPlanningService.getFocusAreas(plan._id)
      ])

      // Lazy Migration: Assign IDs to routine items if missing
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
        setRoutine(migrationRoutine)
      } else {
        setRoutine(routineData)
      }

      // Fetch all goals -> activities
      let allActivities = []
      for (const area of areasData) {
        const goals = await annualPlanningService.getGoals(area._id)
        for (const goal of goals) {
          const acts = await annualPlanningService.getActivities(goal._id)
          // Attach goal info/color
          acts.forEach((a) => {
            a.goalTitle = goal.title
            a.areaColor = area.color
          })
          allActivities = [...allActivities, ...acts]
        }
      }
      setActivities(allActivities)
    } catch (error) {
      console.error('Failed to load routine data', error)
    } finally {
      setLoading(false)
    }
  }

  const persistRoutine = async (updatedRoutine) => {
    try {
      setSaving(true)
      await annualPlanningService.updateDailyRoutine(updatedRoutine)
    } catch (error) {
      console.error('Failed to save', error)
    } finally {
      setSaving(false)
    }
  }

  const handleAddItem = async (section) => {
    if (!newItem[section]) return

    const updatedRoutine = { ...routine }
    const list = updatedRoutine[`${section}_routine`] || []
    updatedRoutine[`${section}_routine`] = [
      ...list,
      {
        id: crypto.randomUUID(),
        title: newItem[section],
        type: 'custom'
      }
    ]

    setRoutine(updatedRoutine)
    setNewItem({ ...newItem, [section]: '' })

    // Auto-save
    await persistRoutine(updatedRoutine)
  }

  const handleDeleteItem = async (section, index) => {
    const updatedRoutine = { ...routine }
    const list = updatedRoutine[`${section}_routine`]
    updatedRoutine[`${section}_routine`] = list.filter((_, i) => i !== index)

    setRoutine(updatedRoutine)

    // Auto-save
    await persistRoutine(updatedRoutine)
  }

  const startEditing = (section, index, currentTitle) => {
    setEditingItem({ section, index })
    setEditValue(currentTitle)
  }

  const saveEdit = async () => {
    if (!editingItem) return
    const { section, index } = editingItem

    const updatedRoutine = { ...routine }
    const list = [...updatedRoutine[`${section}_routine`]]

    if (editValue.trim() === '') {
      // Remove if empty? Or just revert? Let's just do nothing if empty for safety or revert.
      // Let's assume user wants to save, if empty prevent or delete.
      // For now, let's just keep old value if empty to avoid accidental deletes.
    } else {
      list[index] = { ...list[index], title: editValue }
      updatedRoutine[`${section}_routine`] = list
      setRoutine(updatedRoutine)
      await persistRoutine(updatedRoutine)
    }

    setEditingItem(null)
    setEditValue('')
  }

  const cancelEdit = () => {
    setEditingItem(null)
    setEditValue('')
  }

  // Filter activities by time of day
  const getActivitiesForSection = (sectionKey) => {
    // 'morning', 'afternoon', 'evening'
    return activities.filter((a) => a.time_of_day === sectionKey)
  }

  const renderSection = (title, saveIcon, sectionKey, inputKey) => {
    // saveIcon arg name is legacy, it's just icon
    const icon = saveIcon
    const customItems = routine?.[`${sectionKey}_routine`] || []
    const linkedActivities = getActivitiesForSection(sectionKey)

    return (
      <Card variant='outlined' sx={{ height: '100%' }}>
        <CardContent>
          <Stack direction='row' alignItems='center' spacing={1} mb={2}>
            {icon}
            <Typography level='title-lg'>{title}</Typography>
          </Stack>
          <Divider sx={{ mb: 2 }} />

          {/* Goal Activities (Read-only here, managed in goals) */}
          {linkedActivities.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography level='body-xs' fontWeight='bold' sx={{ mb: 1 }}>
                GOAL ACTVITIES
              </Typography>
              <List>
                {linkedActivities.map((act) => (
                  <ListItem key={act._id}>
                    <ListItemContent>
                      <Typography level='body-sm'>{act.title}</Typography>
                      <Typography level='body-xs' textColor='text.tertiary'>
                        Goal: {act.goalTitle}
                      </Typography>
                    </ListItemContent>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: act.areaColor }} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* Custom Routine Items */}
          <Typography level='body-xs' fontWeight='bold' sx={{ mb: 1 }}>
            ROUTINE ITEMS
          </Typography>
          <List>
            {customItems.map((item, index) => {
              const isEditing = editingItem?.section === sectionKey && editingItem?.index === index

              return (
                <ListItem
                  key={index}
                  endAction={
                    !isEditing && (
                      <IconButton size='sm' color='danger' variant='plain' onClick={() => handleDeleteItem(sectionKey, index)}>
                        <DeleteIcon />
                      </IconButton>
                    )
                  }
                  sx={{
                    cursor: isEditing ? 'default' : 'pointer',
                    '&:hover': { bgcolor: isEditing ? 'transparent' : 'background.level1' }
                  }}
                >
                  {isEditing ? (
                    <Input
                      fullWidth
                      size='sm'
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={saveEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit()
                        if (e.key === 'Escape') cancelEdit()
                      }}
                      autoFocus
                    />
                  ) : (
                    <ListItemContent onClick={() => startEditing(sectionKey, index, item.title)}>
                      <Typography level='body-sm'>{item.title}</Typography>
                    </ListItemContent>
                  )}
                </ListItem>
              )
            })}
          </List>

          {/* Add Input */}
          <Stack direction='row' spacing={1} mt={2}>
            <Input
              placeholder='Add item...'
              value={newItem[inputKey]}
              onChange={(e) => setNewItem({ ...newItem, [inputKey]: e.target.value })}
              fullWidth
              size='sm'
              onKeyDown={(e) => e.key === 'Enter' && handleAddItem(sectionKey)}
            />
            <IconButton variant='solid' color='primary' onClick={() => handleAddItem(sectionKey)}>
              <AddIcon />
            </IconButton>
          </Stack>
        </CardContent>
      </Card>
    )
  }

  if (loading) return <LinearProgress />

  return (
    <Container maxWidth='xl' sx={{ py: 4, pb: 10 }}>
      <Stack direction='row' justifyContent='space-between' alignItems='center' mb={4}>
        <Box>
          <Button variant='plain' startDecorator={<ArrowBackIcon />} onClick={() => navigate('/annual-planning')} sx={{ mb: 1 }}>
            Back to Plan
          </Button>
          <Typography level='h2'>{t('annualPlanning.dailyRoutine.title')}</Typography>
          <Typography level='body-md'>{t('annualPlanning.dailyRoutine.subtitle')}</Typography>
        </Box>
        {/* Auto-save enabled, no button needed */}
        {saving && (
          <Typography level='body-sm' textColor='success.500'>
            Saving...
          </Typography>
        )}
      </Stack>

      <Grid container spacing={3} alignItems='flex-start'>
        <Grid xs={12} md={4}>
          {renderSection(t('annualPlanning.dailyRoutine.morning'), <MorningIcon color='warning' />, 'morning', 'morning')}
        </Grid>
        <Grid xs={12} md={4}>
          {renderSection(t('annualPlanning.dailyRoutine.afternoon'), <AfternoonIcon color='warning' />, 'afternoon', 'afternoon')}
        </Grid>
        <Grid xs={12} md={4}>
          {renderSection(t('annualPlanning.dailyRoutine.evening'), <EveningIcon color='primary' />, 'evening', 'evening')}
        </Grid>
      </Grid>
    </Container>
  )
}

export default DailyRoutinePlanner

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
  /* Mobile Swipe Logic */
  const [activeSectionIndex, setActiveSectionIndex] = useState(0) // 0: Morning, 1: Afternoon, 2: Evening
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)

  const minSwipeDistance = 50

  const onTouchStart = (e) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe && activeSectionIndex < 2) {
      setActiveSectionIndex((prev) => prev + 1)
    }
    if (isRightSwipe && activeSectionIndex > 0) {
      setActiveSectionIndex((prev) => prev - 1)
    }
  }
  /* Context Colors for Sections */
  const getSectionColor = (key) => {
    switch (key) {
      case 'morning':
      case 'afternoon':
        return 'warning'
      case 'evening':
        return 'primary'
      default:
        return 'neutral'
    }
  }

  const sections = [
    {
      key: 'morning',
      title: t('annualPlanning.dailyRoutine.morning'),
      icon: <MorningIcon />,
      color: 'warning'
    },
    {
      key: 'afternoon',
      title: t('annualPlanning.dailyRoutine.afternoon'),
      icon: <AfternoonIcon />,
      color: 'warning'
    },
    {
      key: 'evening',
      title: t('annualPlanning.dailyRoutine.evening'),
      icon: <EveningIcon />,
      color: 'primary'
    }
  ]

  const renderSectionContent = (sectionDef) => {
    return renderSection(sectionDef.title, React.cloneElement(sectionDef.icon, { color: sectionDef.color }), sectionDef.key, sectionDef.key)
  }

  if (loading) return <LinearProgress />

  return (
    <Container maxWidth='xl' sx={{ py: 4, pb: 10 }}>
      {/* Header */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent='space-between'
        alignItems={{ xs: 'flex-start', md: 'center' }}
        spacing={2}
        mb={4}
      >
        <Box>
          <Button variant='plain' color='neutral' startDecorator={<ArrowBackIcon />} onClick={() => navigate('/')} sx={{ mb: 1, pl: 0 }}>
            {t('annualPlanning.back')}
          </Button>
          <Typography level='h2'>{t('annualPlanning.dailyRoutine.title')}</Typography>
          <Typography level='body-md' textColor='text.tertiary'>
            {t('annualPlanning.dailyRoutine.subtitle')}
          </Typography>
        </Box>
        {/* Auto-save status */}
        {saving && (
          <Stack direction='row' spacing={1} alignItems='center'>
            <Typography level='body-sm' textColor='success.500' fontWeight={600}>
              Saving changes...
            </Typography>
          </Stack>
        )}
      </Stack>

      {/* Mobile Tabs / Navigation Indicator */}
      {/* Designed as a premium segmented control */}
      <Box
        sx={{
          display: { xs: 'flex', md: 'none' },
          p: 0.5,
          mb: 3,
          borderRadius: 'xl',
          bgcolor: 'background.level1',
          overflow: 'hidden'
        }}
      >
        {sections.map((section, index) => {
          const isActive = activeSectionIndex === index
          return (
            <Box
              key={section.key}
              onClick={() => setActiveSectionIndex(index)}
              sx={{
                flex: 1,
                py: 1,
                px: 1,
                textAlign: 'center',
                borderRadius: 'lg',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                bgcolor: isActive ? 'background.surface' : 'transparent',
                boxShadow: isActive ? 'sm' : 'none',
                color: isActive ? `${section.color}.main` : 'text.secondary',
                fontWeight: isActive ? 600 : 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                userSelect: 'none'
              }}
            >
              {/* Show icon only on active or larger mobile screens if space permits? sticking to text+icon for delight */}
              <Box component='span' sx={{ fontSize: '1.1rem', display: 'flex' }}>
                {React.cloneElement(section.icon, {
                  color: isActive ? 'inherit' : 'neutral',
                  fontSize: 'inherit'
                })}
              </Box>
              <Typography level='body-sm' textColor='inherit' fontWeight='inherit'>
                {section.title}
              </Typography>
            </Box>
          )
        })}
      </Box>

      {/* Content Grid (Responsive) */}
      <Grid
        container
        spacing={3}
        alignItems='flex-start'
        // Mobile Swipe Handlers
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        sx={{
          minHeight: '50vh', // Ensure swipe area has height
          display: { xs: 'flex', md: 'flex' },
          flexDirection: { xs: 'column', md: 'row' }
        }}
      >
        {/*
            On Desktop (md+): Show ALL sections.
        */}
        <Box sx={{ display: { xs: 'none', md: 'contents' } }}>
          {sections.map((s) => (
            <Grid xs={12} md={4} key={s.key}>
              {renderSectionContent(s)}
            </Grid>
          ))}
        </Box>

        {/* 
            On Mobile (xs): Show ONLY the active section using CSS transition if possible, 
            but for now strict conditional rendering is safer for layout. 
        */}
        <Box sx={{ display: { xs: 'block', md: 'none' }, width: '100%' }}>
          {renderSectionContent(sections[activeSectionIndex])}

          {/* Swipe Hint */}
          <Stack direction='row' alignItems='center' justifyContent='center' spacing={1} sx={{ mt: 3, opacity: 0.5 }}>
            <Typography level='body-xs'>Swipe to navigate</Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {[0, 1, 2].map((i) => (
                <Box
                  key={i}
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: i === activeSectionIndex ? 'text.primary' : 'neutral.300',
                    transition: 'all 0.3s'
                  }}
                />
              ))}
            </Box>
          </Stack>
        </Box>
      </Grid>
    </Container>
  )
}

export default DailyRoutinePlanner

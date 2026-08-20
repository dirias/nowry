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
  Skeleton,
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
import { queryClient } from '../../api/queryClient'
import { todayKey } from '../../api/utils/routineCache'
import { useAnnualPlan } from '../../hooks/useAnnualPlan'
import { useAuth } from '../../context/AuthContext'

const DailyRoutinePlanner = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [routine, setRoutine] = useState(null)
  // Keys: item.id -> true when checked for today (D-03: id-based, not index-based)
  const [routineCompletions, setRoutineCompletions] = useState({})
  const [activities, setActivities] = useState([])
  const [saving, setSaving] = useState(false)
  const [newItem, setNewItem] = useState({ morning: '', afternoon: '', evening: '' })

  /* State for editing */
  const [editingItem, setEditingItem] = useState(null) // { section, id }
  const [editValue, setEditValue] = useState('')

  const { plan, areas: cacheAreas, goals: cacheGoals, loading: hookLoading } = useAnnualPlan()
  const { user } = useAuth()
  const userId = user?.id ?? null
  // Kept in sync with SideMenu.js/AnnualPlanningLayout.js's useDailyRoutine() reads
  // (CACHE-007 / ADR-008) — this component still reads the routine directly (its
  // migration/persist logic below needs the raw fetched payload), so it invalidates
  // the shared ['dailyRoutine', userId] query key on every mutation instead of
  // reading through the hook itself.
  const invalidateRoutineCache = React.useCallback(() => {
    if (!userId) return
    queryClient.invalidateQueries({ queryKey: ['dailyRoutine', userId] })
  }, [userId])

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(false)
      if (!plan) return

      const routineData = await annualPlanningService.getDailyRoutine()

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

      // D-04: One-time migration of daily_completions keys (index-based -> id-based).
      // Mirrors the item.id migration above: detect -> rewrite in-memory -> conditional
      // persist. Uses migrationRoutine (post-id-migration) as the id lookup source, and
      // touches ONLY today's entry — every other date in daily_completions is left as-is.
      let completionsUpdated = false
      const today = todayKey()
      const migratedCompletions = { ...(migrationRoutine.daily_completions || {}) }
      const todayCompletions = migratedCompletions[today] || []
      migratedCompletions[today] = todayCompletions
        .map((key) => {
          if (key.length >= 36) return key // already id-based (UUID) — no rewrite needed
          const [period, indexStr] = key.split('_')
          const index = parseInt(indexStr, 10)
          const periodArray = migrationRoutine[`${period}_routine`] || []
          if (periodArray[index]?.id) {
            completionsUpdated = true
            return periodArray[index].id
          }
          completionsUpdated = true // stale key (item since deleted) — drop it
          return null
        })
        .filter(Boolean)
      migrationRoutine.daily_completions = migratedCompletions

      if (routineUpdated || completionsUpdated) {
        await annualPlanningService.updateDailyRoutine(migrationRoutine)
        invalidateRoutineCache() // keep SideMenu.js/AnnualPlanningLayout.js in sync
        setRoutine(migrationRoutine)
      } else {
        setRoutine(routineData)
      }

      // Seed today's checkbox state from the (possibly migrated) completions map
      setRoutineCompletions(Object.fromEntries((migrationRoutine.daily_completions?.[today] || []).map((id) => [id, true])))

      // Fetch all goals -> activities using cache
      let allActivities = []
      if (cacheAreas && cacheGoals) {
        for (const area of cacheAreas) {
          const areaGoals = cacheGoals.filter((g) => g.focus_area_id === area._id || g.focus_area_id?._id === area._id)
          for (const goal of areaGoals) {
            const acts = await annualPlanningService.getActivities(goal._id)
            // Attach goal info/color
            acts.forEach((a) => {
              a.goalTitle = goal.title
              a.areaColor = area.color
            })
            allActivities = [...allActivities, ...acts]
          }
        }
      }
      setActivities(allActivities)
    } catch (err) {
      console.error('Failed to load routine data', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [plan, cacheAreas, cacheGoals, invalidateRoutineCache])

  useEffect(() => {
    if (hookLoading) return
    fetchData()
  }, [hookLoading, fetchData])

  const persistRoutine = async (updatedRoutine) => {
    try {
      setSaving(true)
      await annualPlanningService.updateDailyRoutine(updatedRoutine)
      invalidateRoutineCache() // keep SideMenu.js/AnnualPlanningLayout.js in sync
    } catch (error) {
      console.error('Failed to save', error)
    } finally {
      setSaving(false)
    }
  }

  // Toggle a custom routine item's completion for today — optimistic UI,
  // persisted via the completions-only PATCH endpoint (NOT persistRoutine/PUT).
  // D-01: only called from the Routine Items block, never Goal Activities.
  const toggleRoutineItemCompletion = (itemId) => {
    const previous = routineCompletions
    const updated = { ...routineCompletions, [itemId]: !routineCompletions[itemId] }
    setRoutineCompletions(updated)
    const activeKeys = Object.entries(updated)
      .filter(([, v]) => v)
      .map(([k]) => k)
    annualPlanningService
      .updateRoutineCompletions(todayKey(), activeKeys)
      .then(() => invalidateRoutineCache())
      .catch((err) => {
        console.error('Failed to save routine completion:', err)
        setRoutineCompletions(previous) // revert optimistic update on failure
      })
  }

  const handleAddItem = async (section) => {
    const title = newItem[section].trim()
    if (!title) return

    const updatedRoutine = { ...routine }
    const list = updatedRoutine[`${section}_routine`] || []
    updatedRoutine[`${section}_routine`] = [
      ...list,
      {
        id: crypto.randomUUID(),
        title,
        type: 'custom'
      }
    ]

    setRoutine(updatedRoutine)
    setNewItem({ ...newItem, [section]: '' })

    // Auto-save
    await persistRoutine(updatedRoutine)
  }

  const handleDeleteItem = async (section, id) => {
    const updatedRoutine = { ...routine }
    const list = updatedRoutine[`${section}_routine`]
    updatedRoutine[`${section}_routine`] = list.filter((i) => i.id !== id)

    setRoutine(updatedRoutine)

    // Auto-save
    await persistRoutine(updatedRoutine)
  }

  const startEditing = (section, id, currentTitle) => {
    setEditingItem({ section, id })
    setEditValue(currentTitle)
  }

  const saveEdit = async () => {
    if (!editingItem) return
    const { section, id } = editingItem

    const updatedRoutine = { ...routine }
    const list = [...updatedRoutine[`${section}_routine`]]

    if (editValue.trim() === '') {
      // Remove if empty? Or just revert? Let's just do nothing if empty for safety or revert.
      // Let's assume user wants to save, if empty prevent or delete.
      // For now, let's just keep old value if empty to avoid accidental deletes.
    } else {
      updatedRoutine[`${section}_routine`] = list.map((i) => (i.id === id ? { ...i, title: editValue } : i))
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
                {t('annualPlanning.dailyRoutine.goalActivities')}
              </Typography>
              <List>
                {linkedActivities.map((act) => (
                  <ListItem key={act._id}>
                    <ListItemContent>
                      <Typography level='body-sm'>{act.title}</Typography>
                      <Typography level='body-xs' textColor='text.tertiary'>
                        {t('annualPlanning.dailyRoutine.goalPrefix', { title: act.goalTitle })}
                      </Typography>
                    </ListItemContent>
                    {/* act.areaColor is a user-defined hex from COLORS palette — intentional per DESIGN_GUIDELINES Section 5 */}
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: act.areaColor }} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* Custom Routine Items */}
          <Typography level='body-xs' fontWeight='bold' sx={{ mb: 1 }}>
            {t('annualPlanning.dailyRoutine.routineItems')}
          </Typography>
          {customItems.length === 0 && (
            <Box sx={{ py: 2, px: 1, textAlign: 'center' }}>
              <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
                {t('annualPlanning.dailyRoutine.noItems')}
              </Typography>
            </Box>
          )}
          <List>
            {customItems.map((item) => {
              const isEditing = editingItem?.section === sectionKey && editingItem?.id === item.id

              return (
                <ListItem
                  key={item.id}
                  endAction={
                    !isEditing && (
                      <IconButton
                        size='sm'
                        color='danger'
                        variant='plain'
                        onClick={() => handleDeleteItem(sectionKey, item.id)}
                        aria-label={t('annualPlanning.dailyRoutine.deleteItem')}
                      >
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
                    <Stack direction='row' alignItems='center' spacing={1.25} sx={{ flex: 1 }}>
                      {/* D-01: Checkbox only on custom routine items, never on Goal Activities above */}
                      <Box
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleRoutineItemCompletion(item.id)
                        }}
                        role='checkbox'
                        aria-checked={!!routineCompletions[item.id]}
                        aria-label={t('annualPlanning.dailyRoutine.toggleItem')}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            e.stopPropagation()
                            toggleRoutineItemCompletion(item.id)
                          }
                        }}
                        sx={{
                          width: 16,
                          height: 16,
                          border: '1.5px solid',
                          borderColor: routineCompletions[item.id] ? 'primary.outlinedBorder' : 'neutral.outlinedBorder',
                          borderRadius: '4px',
                          flexShrink: 0,
                          bgcolor: routineCompletions[item.id] ? 'primary.solidBg' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', borderRadius: 'sm' }
                        }}
                      >
                        {routineCompletions[item.id] && (
                          <Box
                            component='svg'
                            viewBox='0 0 24 24'
                            sx={{
                              width: 10,
                              height: 10,
                              fill: 'none',
                              stroke: 'var(--joy-palette-common-white)',
                              strokeWidth: 3,
                              strokeLinecap: 'round',
                              strokeLinejoin: 'round'
                            }}
                          >
                            <polyline points='20 6 9 17 4 12' />
                          </Box>
                        )}
                      </Box>
                      <ListItemContent onClick={() => startEditing(sectionKey, item.id, item.title)} sx={{ cursor: 'pointer' }}>
                        <Typography
                          level='body-sm'
                          sx={{
                            color: routineCompletions[item.id] ? 'text.tertiary' : 'text.primary',
                            textDecoration: routineCompletions[item.id] ? 'line-through' : 'none',
                            transition: 'all 0.2s'
                          }}
                        >
                          {item.title}
                        </Typography>
                      </ListItemContent>
                    </Stack>
                  )}
                </ListItem>
              )
            })}
          </List>

          {/* Add Input */}
          <Stack direction='row' spacing={1} mt={2}>
            <Input
              placeholder={t('annualPlanning.dailyRoutine.addItemPlaceholder')}
              value={newItem[inputKey]}
              onChange={(e) => setNewItem({ ...newItem, [inputKey]: e.target.value })}
              fullWidth
              size='sm'
              onKeyDown={(e) => e.key === 'Enter' && handleAddItem(sectionKey)}
            />
            <IconButton
              variant='solid'
              color='primary'
              onClick={() => handleAddItem(sectionKey)}
              aria-label={t('annualPlanning.dailyRoutine.addItem')}
            >
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

  if (error && !loading) {
    return (
      <Container maxWidth='xl' sx={{ py: { xs: 4, md: 8 }, textAlign: 'center' }}>
        <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
          <Typography level='title-md' sx={{ color: 'danger.plainColor' }}>
            {t('annualPlanning.tabs.errorLoading')}
          </Typography>
          <Button size='sm' variant='soft' onClick={fetchData}>
            {t('common.retry')}
          </Button>
        </Stack>
      </Container>
    )
  }

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
          <Button
            variant='plain'
            color='neutral'
            startDecorator={<ArrowBackIcon />}
            onClick={() => navigate('/annual-planning')}
            sx={{ mb: 1, pl: 0 }}
          >
            {t('annualPlanning.back')}
          </Button>
          <Typography level='h3'>{t('annualPlanning.dailyRoutine.title')}</Typography>
          <Typography level='body-md' textColor='text.tertiary'>
            {t('annualPlanning.dailyRoutine.subtitle')}
          </Typography>
        </Box>
        {/* Auto-save status */}
        {saving && (
          <Stack direction='row' spacing={1} alignItems='center'>
            <Typography level='body-sm' sx={{ color: 'success.plainColor' }} fontWeight={600}>
              {t('annualPlanning.dailyRoutine.saving')}
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
                color: isActive ? `${section.color}.plainColor` : 'text.secondary',
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
              {loading ? <Skeleton variant='rectangular' height={320} sx={{ borderRadius: 'sm' }} /> : renderSectionContent(s)}
            </Grid>
          ))}
        </Box>

        {/*
            On Mobile (xs): Show ONLY the active section using CSS transition if possible,
            but for now strict conditional rendering is safer for layout.
        */}
        <Box sx={{ display: { xs: 'block', md: 'none' }, width: '100%' }}>
          {loading ? (
            <Skeleton variant='rectangular' height={320} sx={{ borderRadius: 'sm' }} />
          ) : (
            renderSectionContent(sections[activeSectionIndex])
          )}

          {/* Swipe Hint */}
          <Stack direction='row' alignItems='center' justifyContent='center' spacing={1} sx={{ mt: 3, opacity: 0.5 }}>
            <Typography level='body-xs'>{t('annualPlanning.dailyRoutine.swipeHint')}</Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {[0, 1, 2].map((i) => (
                <Box
                  key={i}
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: i === activeSectionIndex ? 'text.primary' : 'neutral.outlinedBorder',
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

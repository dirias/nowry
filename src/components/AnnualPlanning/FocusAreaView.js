import React, { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Stack,
  IconButton,
  Skeleton,
  LinearProgress,
  Container,
  CardOverflow,
  AspectRatio,
  Modal,
  ModalDialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemDecorator,
  Divider,
  Input,
  Avatar,
  Tooltip
} from '@mui/joy'
import {
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  KeyboardArrowDown as ExpandIcon,
  KeyboardArrowUp as CollapseIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  GridView as GridViewIcon,
  ViewList as ListIcon,
  Flag as FlagIcon,
  Warning as WarningIcon
} from '@mui/icons-material'

import { annualPlanningService } from '../../api/services'
import { apiCache } from '../../api/utils/cache'
import { useAnnualPlan } from '../../hooks/useAnnualPlan'
import { useAuth } from '../../context/AuthContext'
import GoalDialog from './GoalDialog'
import PriorityList from './PriorityList'

const FocusAreaView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAuth()
  const {
    plan,
    goals: allGoals,
    priorities: allPriorities,
    areas: allAreas,
    loading: hookLoading,
    reload
  } = useAnnualPlan(new Date().getFullYear(), user)

  const [area, setArea] = useState(null)
  const [priorities, setPriorities] = useState([])
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState(null)

  // Expanded Activities State
  const [expandedGoals, setExpandedGoals] = useState(new Set())
  const [goalActivities, setGoalActivities] = useState({}) // Cache: { goalId: [activities] }

  // Expanded Milestones State
  const [expandedMilestones, setExpandedMilestones] = useState(new Set())

  // Error Modal State
  const [errorModal, setErrorModal] = useState({ open: false, message: '', milestones: [] })

  useEffect(() => {
    if (hookLoading) return

    setLoading(true)
    if (plan && allAreas && allGoals && allPriorities) {
      const foundArea = allAreas.find((a) => a._id === id)
      setArea(foundArea)

      if (foundArea) {
        // Filter goals for this area
        const areaGoals = allGoals.filter((g) => g.focus_area_id === foundArea._id || g.focus_area_id?._id === foundArea._id)
        setGoals(areaGoals)

        // Filter Priorities:
        // 1. Explicitly assigned to this Focus Area
        // 2. OR Linked to a Goal that belongs to this Focus Area
        const areaGoalIds = new Set(areaGoals.map((g) => g._id))
        const areaPriorities = allPriorities.filter((p) => {
          const isDirectlyAssigned = p.focus_area_id === id || p.focus_area_id?._id === id
          const isLinkedToAreaGoal = p.linked_entity_type === 'goal' && areaGoalIds.has(p.linked_entity_id)
          return isDirectlyAssigned || isLinkedToAreaGoal
        })

        setPriorities(areaPriorities)
      }
    }
    setLoading(false)
  }, [id, hookLoading, plan, allAreas, allGoals, allPriorities])

  // Invalidate cache for the current area's goals then force a fresh reload
  const fetchData = async () => {
    apiCache.invalidatePrefix('goals:')
    apiCache.invalidatePrefix('focusAreas:')
    apiCache.invalidatePrefix('annualPlan:')
    apiCache.invalidatePrefix('annualPlanFull:')
    reload()
  }

  const handleAddGoal = () => {
    setSelectedGoal(null)
    setDialogOpen(true)
  }

  const handleEditGoal = (goal) => {
    setSelectedGoal(goal)
    setDialogOpen(true)
  }

  const handleDeleteGoal = async (goalId) => {
    if (window.confirm('Delete this goal?')) {
      await annualPlanningService.deleteGoal(goalId)
      fetchData()
    }
  }

  const handleStatusChange = async (goal) => {
    const statusCycle = { not_started: 'in_progress', in_progress: 'completed', completed: 'not_started' }
    const newStatus = statusCycle[goal.status] || 'in_progress'

    // Validate: Cannot mark as completed if there are uncompleted milestones
    if (newStatus === 'completed' && goal.milestones && goal.milestones.length > 0) {
      const uncompletedMilestones = goal.milestones.filter((m) => !m.completed)
      if (uncompletedMilestones.length > 0) {
        setErrorModal({
          open: true,
          message: 'Cannot mark goal as completed',
          milestones: uncompletedMilestones
        })
        return
      }
    }

    // Snapshot original priority state for linked priorities BEFORE the optimistic update
    // so we can accurately revert to the real original values if the API call fails.
    const originalPriorityStates = new Map(
      priorities
        .filter((p) => p.linked_entity_type === 'goal' && p.linked_entity_id === goal._id)
        .map((p) => [p._id, { is_completed: p.is_completed, completed_at: p.completed_at }])
    )

    // Optimistic update — instant UI response, no hook reload needed
    setGoals((prev) => prev.map((g) => (g._id === goal._id ? { ...g, status: newStatus } : g)))

    // Cascade to linked priorities optimistically:
    // completing a goal archives its priorities; un-completing reactivates them.
    setPriorities((prev) =>
      prev.map((p) =>
        p.linked_entity_type === 'goal' && p.linked_entity_id === goal._id
          ? {
              ...p,
              is_completed: newStatus === 'completed',
              completed_at: newStatus === 'completed' ? new Date().toISOString() : null
            }
          : p
      )
    )

    try {
      await annualPlanningService.updateGoal(goal._id, { ...goal, status: newStatus })
      // Silent cache invalidation so next navigation gets fresh data
      apiCache.invalidatePrefix('goals:')
      apiCache.invalidatePrefix('focusAreas:')
      apiCache.invalidatePrefix('annualPlanFull:')
    } catch (error) {
      console.error('Failed to update status:', error)
      // Revert both optimistic updates to their exact original values
      setGoals((prev) => prev.map((g) => (g._id === goal._id ? { ...g, status: goal.status } : g)))
      setPriorities((prev) =>
        prev.map((p) => {
          const original = originalPriorityStates.get(p._id)
          return original ? { ...p, ...original } : p
        })
      )
    }
  }

  const getStatusConfig = (status) => {
    const configs = {
      not_started: {
        label: 'Not Started',
        color: 'neutral',
        icon: '⭕' // Hollow circle - nothing begun
      },
      in_progress: {
        label: 'In Progress',
        color: 'warning', // Changed from 'primary' to 'warning' for better visibility
        icon: '🔄' // Rotation arrow - actively working
      },
      completed: {
        label: 'Completed',
        color: 'success',
        icon: '✓' // Checkmark - done!
      }
    }
    return configs[status] || configs.not_started
  }

  const calculateProgress = (goal) => {
    // If goal has milestones, calculate based on completion
    if (goal.milestones && goal.milestones.length > 0) {
      const completedCount = goal.milestones.filter((m) => m.completed).length
      return Math.round((completedCount / goal.milestones.length) * 100)
    }
    // Otherwise use manual progress field
    return goal.progress || 0
  }

  const handleToggleExpand = async (goalId) => {
    const newExpanded = new Set(expandedGoals)

    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId)
    } else {
      newExpanded.add(goalId)
      // Fetch if not in cache or if we want to refresh on open (for now cache-first)
      if (!goalActivities[goalId]) {
        try {
          const activities = await annualPlanningService.getActivities(goalId)
          setGoalActivities((prev) => ({ ...prev, [goalId]: activities }))
        } catch (error) {
          console.error('Failed to load goal activities', error)
        }
      }
    }
    setExpandedGoals(newExpanded)
  }

  const handleToggleMilestones = (goalId) => {
    const newExpanded = new Set(expandedMilestones)
    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId)
    } else {
      newExpanded.add(goalId)
    }
    setExpandedMilestones(newExpanded)
  }

  const handleToggleMilestone = async (goal, milestoneIndex) => {
    // Milestones are locked once the goal is completed — unchecking would create
    // an inconsistency (completed goal with incomplete milestones).
    if (goal.status === 'completed') return

    const updatedMilestones = [...goal.milestones]
    updatedMilestones[milestoneIndex] = {
      ...updatedMilestones[milestoneIndex],
      completed: !updatedMilestones[milestoneIndex].completed
    }

    // Optimistic update — instant UI response, no hook reload needed
    setGoals((prev) => prev.map((g) => (g._id === goal._id ? { ...g, milestones: updatedMilestones } : g)))

    try {
      await annualPlanningService.updateGoal(goal._id, {
        ...goal,
        milestones: updatedMilestones
      })
      // Silent cache invalidation — next navigation gets fresh data,
      // but we skip the reload since the optimistic state is already correct.
      apiCache.invalidatePrefix('goals:')
      apiCache.invalidatePrefix('focusAreas:')
    } catch (error) {
      console.error('Failed to update milestone:', error)
      // Revert optimistic update on failure
      setGoals((prev) => prev.map((g) => (g._id === goal._id ? { ...g, milestones: goal.milestones } : g)))
    }
  }

  const handleGoalSuccess = async () => {
    await fetchData()
    // Refresh activities for any currently expanded goals to ensure consistency
    // We could just refresh the one that was edited, but simple iteration is fine for MVP
    const expandedIds = Array.from(expandedGoals)
    if (expandedIds.length > 0) {
      try {
        const promises = expandedIds.map((id) => annualPlanningService.getActivities(id))
        const results = await Promise.all(promises)
        const newCache = { ...goalActivities }
        results.forEach((activities, index) => {
          newCache[expandedIds[index]] = activities
        })
        setGoalActivities(newCache)
      } catch (error) {
        console.error('Failed to refresh expanded activities', error)
      }
    }
  }

  // Determine current quarter for authentic default
  const getCurrentQuarter = () => {
    const month = new Date().getMonth() + 1
    return Math.ceil(month / 3)
  }

  const handleDeletePriority = () => {
    // Refresh data after delete
    fetchData()
  }

  const handleEditPriority = () => {
    // Navigate to annual planning to edit
    navigate('/annual-planning')
  }

  // Quarter State
  const [quarterFilter, setQuarterFilter] = useState(getCurrentQuarter())
  const [activeTab, setActiveTab] = useState(0) // 0: Goals, 1: Priorities

  // View Mode & Search State (Section 6 Compliance)
  const [viewMode, setViewMode] = useState(localStorage.getItem('goals_view_mode') || 'grid')
  const [searchQuery, setSearchQuery] = useState('')

  // Handle view mode change with persistence
  const handleViewModeChange = (newMode) => {
    setViewMode(newMode)
    localStorage.setItem('goals_view_mode', newMode)
  }

  // Calculate days left in quarter
  const getDaysLeftInQuarter = (q) => {
    const year = new Date().getFullYear()
    const quarterEndMonth = q * 3 - 1 // 0-indexed (2, 5, 8, 11)
    // Get last day of that month
    const endDate = new Date(year, quarterEndMonth + 1, 0)
    const today = new Date()
    const diffTime = endDate - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  // Split Goals into Objectives and Quarterly Goals
  const yearlyObjectives = goals.filter((g) => g.type === 'yearly' || (!g.type && !g.quarter))
  const quarterlyGoals = goals.filter((g) => g.type === 'quarterly' || g.quarter)

  // Filter Children by Quarter
  const currentQuarterGoals = quarterlyGoals.filter((g) => g.quarter === quarterFilter)

  // Search Filtering (Section 6.4 Compliance)
  const filteredQuarterlyGoals = useMemo(() => {
    if (!searchQuery.trim()) return currentQuarterGoals
    const query = searchQuery.toLowerCase()
    return currentQuarterGoals.filter(
      (goal) => goal.title?.toLowerCase().includes(query) || goal.description?.toLowerCase().includes(query)
    )
  }, [currentQuarterGoals, searchQuery])

  // Map Children to Parents (use filtered goals)
  const goalsByParent = filteredQuarterlyGoals.reduce((acc, goal) => {
    const pid = goal.parent_id || 'orphan'
    if (!acc[pid]) acc[pid] = []
    acc[pid].push(goal)
    return acc
  }, {})

  const handleAddObjective = () => {
    // If we have a specific quarter selected, assume we want to add a goal to that quarter
    if (quarterFilter) {
      setSelectedGoal({ type: 'quarterly', quarter: quarterFilter })
    } else {
      setSelectedGoal({ type: 'yearly' })
    }
    setDialogOpen(true)
  }

  const handleAddChildGoal = (parentId) => {
    setSelectedGoal({ type: 'quarterly', quarter: quarterFilter, parent_id: parentId })
    setDialogOpen(true)
  }

  // Render Goal Card (Grid View) - Section 6.2 Compliance with Glass-morphism
  const renderGoalCardGrid = (goal) => {
    const hasMilestones = goal.milestones && goal.milestones.length > 0

    return (
      <Card
        variant='outlined'
        sx={{
          position: 'relative',
          height: { xs: 220, md: 280 },
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          p: 0,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.surface',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            borderColor: 'primary.outlinedBorder',
            boxShadow: 'md',
            transform: 'translateY(-4px)'
          }
        }}
      >
        {/* Visual Identifier - Image OR Color Accent */}
        {goal.image_url ? (
          <>
            {/* Background Image Layer - Visible but elegant */}
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                zIndex: 0,
                backgroundImage: `url(${goal.image_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: 0.25,
                filter: 'grayscale(0.2) brightness(1.1)'
              }}
            />
            {/* Theme-aware overlay for text contrast */}
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                zIndex: 1,
                bgcolor: 'background.surface',
                opacity: 0.75
              }}
            />
          </>
        ) : (
          /* Colored accent for cards without images */
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              zIndex: 0,
              bgcolor: area?.color || 'primary.solidBg',
              opacity: 0.8
            }}
          />
        )}

        {/* Content Layer */}
        <CardContent
          sx={{
            position: 'relative',
            zIndex: 2,
            flex: 1,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            p: 2,
            gap: 1
          }}
        >
          {/* Header: Status + Actions */}
          <Stack direction='row' justifyContent='space-between' alignItems='flex-start'>
            <Box
              onClick={(e) => {
                e.stopPropagation()
                handleStatusChange(goal)
              }}
              sx={{
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1,
                py: 0.5,
                borderRadius: 'sm',
                border: '1px solid',
                borderColor: `${getStatusConfig(goal.status).color}.outlinedBorder`,
                color: `${getStatusConfig(goal.status).color}.solidBg`,
                fontWeight: 600,
                fontSize: '0.65rem',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: `${getStatusConfig(goal.status).color}.solidBg`,
                  bgcolor: 'background.level1'
                }
              }}
            >
              <span>{getStatusConfig(goal.status).icon}</span>
              <span>{getStatusConfig(goal.status).label}</span>
            </Box>
            <Stack direction='row' spacing={0.5}>
              <IconButton
                size='sm'
                variant='plain'
                onClick={(e) => {
                  e.stopPropagation()
                  handleEditGoal(goal)
                }}
                sx={{
                  transition: 'all 0.2s',
                  '&:hover': { transform: 'scale(1.1)' }
                }}
              >
                <EditIcon fontSize='small' />
              </IconButton>
              <IconButton
                size='sm'
                variant='plain'
                color='danger'
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteGoal(goal._id)
                }}
                sx={{
                  transition: 'all 0.2s',
                  '&:hover': { transform: 'scale(1.1)' }
                }}
              >
                <DeleteIcon fontSize='small' />
              </IconButton>
            </Stack>
          </Stack>

          {/* Title */}
          <Typography
            level='title-md'
            sx={{
              fontWeight: 700,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              lineHeight: 1.4,
              color: 'text.primary',
              letterSpacing: '-0.01em'
            }}
          >
            {goal.title}
          </Typography>

          {/* Progress */}
          <Box sx={{ mt: 'auto' }}>
            <Box
              sx={{
                width: '100%',
                height: 6,
                bgcolor: 'background.level2',
                borderRadius: 'sm',
                overflow: 'hidden',
                mb: 0.5
              }}
            >
              <Box
                sx={{
                  width: `${calculateProgress(goal)}%`,
                  height: '100%',
                  bgcolor: area?.color || 'primary.solidBg',
                  transition: 'width 0.3s ease'
                }}
              />
            </Box>
            <Typography
              level='body-xs'
              sx={{
                fontSize: '0.7rem',
                fontWeight: 600,
                color: 'text.secondary'
              }}
            >
              {calculateProgress(goal)}% Complete
            </Typography>
          </Box>

          {/* Milestones */}
          {hasMilestones && (
            <Box
              sx={{
                pt: 1.5,
                mt: 0.5,
                borderTop: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Divider sx={{ mb: 0.5 }} />
              <Button
                variant='plain'
                size='sm'
                onClick={(e) => {
                  e.stopPropagation()
                  handleToggleMilestones(goal._id)
                }}
                endDecorator={expandedMilestones.has(goal._id) ? <CollapseIcon /> : <ExpandIcon />}
                sx={{
                  width: '100%',
                  justifyContent: 'space-between',
                  fontSize: '0.7rem',
                  py: 0.75,
                  px: 1,
                  minHeight: 'auto',
                  fontWeight: 600,
                  color: 'text.secondary',
                  borderRadius: 'sm',
                  '&:hover': { bgcolor: 'background.level1' }
                }}
              >
                Milestones ({goal.milestones.filter((m) => m.completed).length}/{goal.milestones.length})
              </Button>

              {expandedMilestones.has(goal._id) && (
                <Stack spacing={0.75} sx={{ mt: 1, maxHeight: 100, overflow: 'auto', px: 0.5 }}>
                  {goal.milestones.map((milestone, idx) => (
                    <Box
                      key={idx}
                      title={goal.status === 'completed' ? 'Milestones are locked while the goal is completed' : undefined}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        py: 0.75,
                        px: 1,
                        borderRadius: 'sm',
                        cursor: goal.status === 'completed' ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        opacity: goal.status === 'completed' ? 0.65 : 1,
                        '&:hover': goal.status === 'completed' ? {} : { bgcolor: 'background.level1' }
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleMilestone(goal, idx)
                      }}
                    >
                      {/* Checkbox — shows lock icon overlay when goal is completed */}
                      <Box sx={{ position: 'relative', flexShrink: 0 }}>
                        <Box
                          sx={{
                            width: 14,
                            height: 14,
                            border: `1.5px solid ${area?.color || 'var(--joy-palette-danger-solidBg)'}`,
                            borderRadius: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: milestone.completed ? area?.color || 'var(--joy-palette-danger-solidBg)' : 'transparent',
                            transition: 'all 0.2s'
                          }}
                        >
                          {milestone.completed && (
                            <Box
                              component='svg'
                              width='8'
                              height='8'
                              viewBox='0 0 24 24'
                              fill='none'
                              stroke='white'
                              strokeWidth='4'
                              strokeLinecap='round'
                              strokeLinejoin='round'
                            >
                              <polyline points='20 6 9 17 4 12' />
                            </Box>
                          )}
                        </Box>
                        {/* Lock badge — only visible when goal is completed */}
                        {goal.status === 'completed' && (
                          <Box
                            sx={{
                              position: 'absolute',
                              bottom: -3,
                              right: -4,
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: 'background.surface',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Box
                              component='svg'
                              width='6'
                              height='6'
                              viewBox='0 0 24 24'
                              fill='none'
                              stroke='currentColor'
                              strokeWidth='2.5'
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              sx={{ color: 'text.tertiary' }}
                            >
                              <rect x='3' y='11' width='18' height='11' rx='2' ry='2' />
                              <path d='M7 11V7a5 5 0 0 1 10 0v4' />
                            </Box>
                          </Box>
                        )}
                      </Box>
                      <Typography
                        level='body-xs'
                        sx={{
                          flex: 1,
                          textDecoration: milestone.completed ? 'line-through' : 'none',
                          color: milestone.completed ? 'text.tertiary' : 'text.primary',
                          fontSize: '0.7rem',
                          lineHeight: 1.4,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {milestone.title}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    )
  }

  // Render Goal Row (List View) - Section 6.2 Compliance
  const renderGoalRowList = (goal) => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        py: 1.5,
        px: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        minHeight: 56,
        '&:hover': {
          bgcolor: 'background.level1'
        }
      }}
    >
      {/* Status Indicator */}
      <Box
        onClick={() => handleStatusChange(goal)}
        sx={{
          cursor: 'pointer',
          flexShrink: 0
        }}
      >
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            px: 1,
            py: 0.5,
            borderRadius: 'sm',
            border: '1px solid',
            borderColor: `${getStatusConfig(goal.status).color}.outlinedBorder`,
            color: `${getStatusConfig(goal.status).color}.solidBg`,
            fontWeight: 600,
            fontSize: '0.7rem',
            minWidth: 90,
            justifyContent: 'center'
          }}
        >
          <span>{getStatusConfig(goal.status).icon}</span>
          <span>{getStatusConfig(goal.status).label}</span>
        </Box>
      </Box>

      {/* Title */}
      <Typography level='title-sm' sx={{ flex: 1, minWidth: 0 }}>
        {goal.title}
      </Typography>

      {/* Progress */}
      <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1, width: 120 }}>
        <Box
          sx={{
            flex: 1,
            height: 6,
            bgcolor: 'background.level2',
            borderRadius: 'sm',
            overflow: 'hidden'
          }}
        >
          <Box
            sx={{
              width: `${calculateProgress(goal)}%`,
              height: '100%',
              bgcolor: area?.color || 'primary.solidBg',
              transition: 'width 0.3s ease'
            }}
          />
        </Box>
        <Typography level='body-xs' sx={{ minWidth: 40, textAlign: 'right' }}>
          {calculateProgress(goal)}%
        </Typography>
      </Box>

      {/* Milestones Count */}
      {goal.milestones && goal.milestones.length > 0 && (
        <Typography level='body-xs' sx={{ display: { xs: 'none', sm: 'block' }, width: 80, color: 'text.secondary' }}>
          {goal.milestones.filter((m) => m.completed).length}/{goal.milestones.length} done
        </Typography>
      )}

      {/* Actions */}
      <Stack direction='row' spacing={0.5}>
        <IconButton size='sm' variant='plain' onClick={() => handleEditGoal(goal)}>
          <EditIcon fontSize='small' />
        </IconButton>
        <IconButton size='sm' variant='plain' color='danger' onClick={() => handleDeleteGoal(goal._id)}>
          <DeleteIcon fontSize='small' />
        </IconButton>
      </Stack>
    </Box>
  )

  if (loading) {
    return (
      <Container maxWidth='xl' sx={{ py: 4 }}>
        <Skeleton variant='rectangular' width={120} height={36} sx={{ mb: 2 }} />
        <Skeleton variant='rectangular' height={160} sx={{ mb: 4, borderRadius: 'md' }} />
        {/* ... Skeletons ... */}
      </Container>
    )
  }
  if (!area) return <Typography>Area not found</Typography>

  return (
    <Container maxWidth='xl' sx={{ py: 4, pb: 10 }}>
      {/* Header */}
      <Button
        variant='plain'
        color='neutral'
        startDecorator={<ArrowBackIcon />}
        onClick={() => navigate('/annual-planning')}
        sx={{ mb: 2, pl: 0 }}
      >
        Back to Plan
      </Button>

      <Box sx={{ mb: 4 }}>
        <Box
          sx={{
            p: { xs: 3, md: 4 },
            width: '100%',
            bgcolor: area.color ? `${area.color}15` : 'background.level1',
            borderRadius: 'lg',
            border: '1px solid',
            borderColor: area.color ? `${area.color}30` : 'divider',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            textAlign: 'left',
            gap: 2
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                fontSize: { xs: '2.5rem', md: '3rem' },
                lineHeight: 1,
                flexShrink: 0
              }}
            >
              {area.icon}
            </Box>
            <Typography level='h2' fontWeight={700}>
              {area.name}
            </Typography>
          </Box>

          <Typography level='body-md' textColor='text.tertiary' maxWidth='600px'>
            {area.description}
          </Typography>
        </Box>
      </Box>

      {/* Smart Banner: Days Left (Minimalist) */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
        <Typography level='title-sm' sx={{ color: 'primary.600' }}>
          🚀 <b>{getDaysLeftInQuarter(quarterFilter)} days left</b> to crush your Q{quarterFilter} goals!
        </Typography>
      </Box>

      {/* Mobile Tabs (View Switcher) */}
      <Box
        sx={{
          display: { xs: 'flex', md: 'none' },
          p: 0.5,
          mb: 4,
          borderRadius: 'xl',
          bgcolor: 'background.level1',
          overflow: 'hidden'
        }}
      >
        {['Goals', 'Priorities'].map((tabLabel, index) => {
          const isActive = activeTab === index
          return (
            <Box
              key={index}
              onClick={() => setActiveTab(index)}
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
                color: isActive ? 'primary.main' : 'text.secondary',
                fontWeight: isActive ? 600 : 500,
                userSelect: 'none'
              }}
            >
              <Typography level='body-sm' textColor='inherit' fontWeight='inherit'>
                {tabLabel}
              </Typography>
            </Box>
          )
        })}
      </Box>

      {/* Goals View (Tab 0) */}
      <Box sx={{ display: { xs: activeTab === 0 ? 'block' : 'none', md: 'block' } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent='space-between'
          alignItems={{ xs: 'stretch', sm: 'center' }}
          mb={3}
          spacing={2}
        >
          <Typography level='h3'>{t('annualPlanning.goal.title')}s</Typography>

          {/* Quarter Selector Tabs */}
          <Box
            sx={{
              display: 'flex',
              gap: 0.5,
              bgcolor: 'background.level1',
              p: 0.5,
              borderRadius: 'md',
              alignSelf: { xs: 'center', sm: 'auto' }
            }}
          >
            {[1, 2, 3, 4].map((q) => (
              <Box
                key={q}
                onClick={() => setQuarterFilter(q)}
                sx={{
                  px: 2,
                  py: 0.5,
                  borderRadius: 'sm',
                  cursor: 'pointer',
                  bgcolor: quarterFilter === q ? 'background.surface' : 'transparent',
                  boxShadow: quarterFilter === q ? 'xs' : 'none',
                  color: quarterFilter === q ? 'text.primary' : 'text.tertiary',
                  fontWeight: quarterFilter === q ? 600 : 500,
                  fontSize: '0.875rem',
                  transition: 'all 0.2s'
                }}
              >
                Q{q}
              </Box>
            ))}
          </Box>

          <Button startDecorator={<AddIcon />} onClick={handleAddObjective}>
            {/* Context-aware Button Text */}
            {quarterFilter ? `Add Q${quarterFilter} Goal` : 'Add Objective'}
          </Button>
        </Stack>

        {/* Search & View Toggle (Section 6 Compliance) */}
        <Stack direction='row' spacing={1.5} alignItems='center' sx={{ mb: 3 }}>
          <Input
            placeholder={t('annualPlanning.searchGoals', { defaultValue: 'Search goals...' })}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            startDecorator={<SearchIcon />}
            endDecorator={
              searchQuery && (
                <IconButton size='sm' onClick={() => setSearchQuery('')}>
                  <CloseIcon />
                </IconButton>
              )
            }
            size='md'
            sx={{ flex: 1, maxWidth: { sm: 320 } }}
          />

          {/* View Toggle */}
          <Stack direction='row' spacing={0.5} sx={{ ml: 'auto' }}>
            <IconButton
              size='sm'
              variant={viewMode === 'grid' ? 'solid' : 'plain'}
              onClick={() => handleViewModeChange('grid')}
              color={viewMode === 'grid' ? 'primary' : 'neutral'}
            >
              <GridViewIcon />
            </IconButton>
            <IconButton
              size='sm'
              variant={viewMode === 'list' ? 'solid' : 'plain'}
              onClick={() => handleViewModeChange('list')}
              color={viewMode === 'list' ? 'primary' : 'neutral'}
            >
              <ListIcon />
            </IconButton>
          </Stack>
        </Stack>

        <Stack spacing={4}>
          {yearlyObjectives.map((objective) => (
            <Box key={objective._id}>
              {/* Objective Header Card */}
              <Card variant='outlined' sx={{ mb: 2, borderColor: 'primary.200', bgcolor: 'primary.50' }}>
                <CardContent>
                  <Stack direction='row' justifyContent='space-between' alignItems='center'>
                    <Box>
                      <Typography level='body-xs' fontWeight={700} textColor='primary.600' letterSpacing='1px' mb={0.5}>
                        YEARLY OBJECTIVE
                      </Typography>
                      <Typography level='h4' fontWeight={600}>
                        {objective.title}
                      </Typography>
                      {objective.description && (
                        <Typography level='body-sm' textColor='text.secondary'>
                          {objective.description}
                        </Typography>
                      )}
                    </Box>
                    <Stack direction='row'>
                      <IconButton size='sm' onClick={() => handleEditGoal(objective)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size='sm' color='danger' onClick={() => handleDeleteGoal(objective._id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>

              {/* Children Goals (Quarterly) */}
              <Box sx={{ pl: { xs: 0, md: 4 }, pr: 0 }}>
                {viewMode === 'grid' ? (
                  /* Grid View */
                  <Grid container spacing={2}>
                    {(goalsByParent[objective._id] || []).map((goal) => (
                      <Grid key={goal._id} xs={12} md={6}>
                        {renderGoalCardGrid(goal)}
                      </Grid>
                    ))}

                    {/* Add Child Button */}
                    <Grid xs={12} md={6}>
                      <Button
                        variant='dashed'
                        fullWidth
                        sx={{ height: '100%', minHeight: 80, color: 'text.tertiary' }}
                        onClick={() => handleAddChildGoal(objective._id)}
                      >
                        + Add Goal to Q{quarterFilter}
                      </Button>
                    </Grid>
                  </Grid>
                ) : (
                  /* List View */
                  <Box>
                    <Stack spacing={0}>
                      {(goalsByParent[objective._id] || []).map((goal) => (
                        <Box key={goal._id}>{renderGoalRowList(goal)}</Box>
                      ))}
                    </Stack>
                    <Button
                      variant='plain'
                      fullWidth
                      sx={{ mt: 1, color: 'text.tertiary' }}
                      onClick={() => handleAddChildGoal(objective._id)}
                      startDecorator={<AddIcon />}
                    >
                      Add Goal to Q{quarterFilter}
                    </Button>
                  </Box>
                )}
              </Box>
            </Box>
          ))}

          {/* Orphan Goals Section (if any exist for this quarter) */}
          {goalsByParent['orphan'] && goalsByParent['orphan'].length > 0 && (
            <Box sx={{ mb: 6 }}>
              <Typography level='title-sm' sx={{ mb: 2, color: 'text.tertiary', textTransform: 'uppercase' }}>
                Other Q{quarterFilter} Goals
              </Typography>
              {viewMode === 'grid' ? (
                /* Grid View */
                <Grid container spacing={2}>
                  {goalsByParent['orphan'].map((goal) => (
                    <Grid key={goal._id} xs={12} md={6}>
                      {renderGoalCardGrid(goal)}
                    </Grid>
                  ))}
                </Grid>
              ) : (
                /* List View */
                <Stack spacing={0}>
                  {goalsByParent['orphan'].map((goal) => (
                    <Box key={goal._id}>{renderGoalRowList(goal)}</Box>
                  ))}
                </Stack>
              )}
            </Box>
          )}

          {yearlyObjectives.length === 0 && (!goalsByParent['orphan'] || goalsByParent['orphan'].length === 0) && (
            <Box sx={{ textAlign: 'center', py: 8, opacity: 0.6 }}>
              <Typography level='h4'>No objectives yet.</Typography>
              <Typography>Start by defining a Yearly Objective.</Typography>
            </Box>
          )}
        </Stack>
      </Box>

      {/* Priorities (Tab 1) */}
      <Box sx={{ mb: 4, mt: 8, display: { xs: activeTab === 1 ? 'block' : 'none', md: 'block' } }}>
        <Stack direction='row' justifyContent='space-between' alignItems='center' mb={2}>
          <Typography level='h3'>{t('annualPlanning.priority.title')}</Typography>
        </Stack>

        <PriorityList
          priorities={priorities}
          onEdit={handleEditPriority}
          onDelete={handleDeletePriority}
          emptyMessage='No priorities linked to this area yet.'
        />
      </Box>

      <GoalDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        focusAreaId={id}
        priorities={priorities}
        goal={selectedGoal}
        onSuccess={handleGoalSuccess}
        yearlyObjectives={yearlyObjectives} // Pass for parent selection
      />

      {/* Error Modal */}
      <Modal open={errorModal.open} onClose={() => setErrorModal({ open: false, message: '', milestones: [] })}>
        <ModalDialog
          variant='outlined'
          color='danger'
          sx={{
            maxWidth: 500,
            borderRadius: 'lg',
            p: 3,
            boxShadow: 'lg'
          }}
        >
          <DialogTitle sx={{ fontSize: '1.25rem', fontWeight: 700 }}>{errorModal.message}</DialogTitle>
          <DialogContent>
            <Typography level='body-sm' sx={{ mb: 2, color: 'text.secondary' }}>
              Please complete these milestones first:
            </Typography>
            <List marker='disc' size='sm'>
              {errorModal.milestones.map((milestone, idx) => (
                <ListItem key={idx}>
                  <Typography level='body-sm'>{milestone.title}</Typography>
                </ListItem>
              ))}
            </List>
            <Button
              variant='solid'
              color='danger'
              onClick={() => setErrorModal({ open: false, message: '', milestones: [] })}
              sx={{ mt: 2 }}
              fullWidth
            >
              Got it
            </Button>
          </DialogContent>
        </ModalDialog>
      </Modal>
    </Container>
  )
}

export default FocusAreaView

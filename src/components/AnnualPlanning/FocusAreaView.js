import React, { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom'
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
  Input,
  Avatar,
  Tooltip,
  Alert,
  Breadcrumbs,
  Link,
  Snackbar
} from '@mui/joy'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  GridView as GridViewIcon,
  ViewList as ListIcon,
  Flag as FlagIcon,
  Warning as WarningIcon
} from '@mui/icons-material'
import { alpha } from '@mui/system'

import { annualPlanningService } from '../../api/services'
import { useAnnualPlan } from '../../hooks/useAnnualPlan'
import { useAuth } from '../../context/AuthContext'
import GoalDialog from './GoalDialog'
import PriorityDialog from './PriorityDialog'
import PriorityList from './PriorityList'
import CloseQuarterModal from './CloseQuarterModal'
import GoalCard from './GoalCard'
import GoalRow from './GoalRow'
import GoalDetailDrawer from './goal/GoalDetailDrawer'
import DeleteConfirmationModal from '../Common/DeleteConfirmationModal'
import useGoalCardModel from '../../hooks/useGoalCardModel'
import { calculateProgress, calculateTimeElapsedPercentage, getCurrentQuarter } from './goalDerivation'

// --- GOAL-01 computation engine ---
// The implementations moved to ./goalDerivation.js (ADR-003 / UX-CONTRACT §5.1):
// a page component is the wrong home for the feature's pure math, and
// GoalsTabView.js was importing utilities from this sibling page. The original
// names are re-exported so every existing caller keeps resolving.
export { calculateProgress, calculateTimeElapsedPercentage, getCurrentQuarter }

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
    activities,
    loading: hookLoading,
    reload
  } = useAnnualPlan(new Date().getFullYear(), user)

  const [area, setArea] = useState(null)
  const [priorities, setPriorities] = useState([])
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState(null)
  const [dialogSection, setDialogSection] = useState(null)
  const [deletingGoal, setDeletingGoal] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showPriorityDialog, setShowPriorityDialog] = useState(false)
  const [editingPriority, setEditingPriority] = useState(null)

  // Detail drawer. Replaces the per-goal expansion Sets and the activity cache:
  // there is nothing to expand in place any more, and activities arrive with the
  // plan payload rather than one fetch per goal.
  const [detailGoalId, setDetailGoalId] = useState(null)

  // Failed writes used to reach console.error only — an unhandled Error state.
  const [toast, setToast] = useState(null)
  const [pendingGoalId, setPendingGoalId] = useState(null)

  // Error Modal State
  const [errorModal, setErrorModal] = useState({ open: false, message: '', milestones: [] })

  const [quarterReports, setQuarterReports] = useState([])
  const [showCloseModal, setShowCloseModal] = useState(false)

  useEffect(() => {
    if (plan?._id) {
      annualPlanningService.getQuarterReports(plan._id).then(setQuarterReports).catch(console.error)
    }
  }, [plan?._id])

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

  // Cache is busted by the service layer (_bustPlanCache) after every mutation.
  // This just triggers a fresh fetch from the hook.
  const fetchData = () => reload()

  const handleAddGoal = () => {
    setSelectedGoal(null)
    setDialogSection(null)
    setDialogOpen(true)
  }

  const handleEditGoal = (goal) => {
    setSelectedGoal(goal)
    setDialogSection(null)
    setDialogOpen(true)
  }

  const handleDeleteGoal = (goal) => {
    setDeletingGoal(goal)
  }

  const confirmDeleteGoal = async () => {
    if (!deletingGoal) return
    setDeleteLoading(true)
    try {
      await annualPlanningService.deleteGoal(deletingGoal._id)
      fetchData()
    } finally {
      setDeleteLoading(false)
      setDeletingGoal(null)
    }
  }

  /**
   * Explicit status write. The click-cycle this replaces let a completed goal be
   * silently reopened with one extra click, and was unreachable by keyboard.
   */
  const handleStatusChange = async (goal, newStatus) => {
    if (!newStatus || newStatus === goal.status) return

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
    setPendingGoalId(goal._id)

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
      // Cache is busted by the service. Optimistic state is already correct,
      // so no need to reload — just let the next navigation get fresh data.
    } catch (error) {
      // Revert both optimistic updates to their exact original values
      setGoals((prev) => prev.map((g) => (g._id === goal._id ? { ...g, status: goal.status } : g)))
      setPriorities((prev) =>
        prev.map((p) => {
          const original = originalPriorityStates.get(p._id)
          return original ? { ...p, ...original } : p
        })
      )
      setToast('annualPlanning.goal.statusUpdateError')
    } finally {
      setPendingGoalId(null)
    }
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
    setPendingGoalId(goal._id)

    try {
      await annualPlanningService.updateGoal(goal._id, {
        ...goal,
        milestones: updatedMilestones
      })
      // Cache is busted by the service. Optimistic state is already correct.
    } catch (error) {
      // Revert optimistic update on failure
      setGoals((prev) => prev.map((g) => (g._id === goal._id ? { ...g, milestones: goal.milestones } : g)))
      setToast('annualPlanning.goal.milestoneUpdateError')
    } finally {
      setPendingGoalId(null)
    }
  }

  // A plan reload brings activities back with it, so there is no per-goal
  // refresh loop to run any more.
  const handleGoalSuccess = async () => {
    await fetchData()
  }

  const handleDeletePriority = () => {
    // Refresh data after delete
    fetchData()
  }

  const handleEditPriority = (priority) => {
    setEditingPriority(priority)
    setShowPriorityDialog(true)
  }

  const handleToggleActive = async (priority) => {
    const originalIsActive = priority.is_active
    const newIsActive = !originalIsActive
    setPriorities((prev) => prev.map((p) => (p._id === priority._id ? { ...p, is_active: newIsActive } : p)))
    try {
      await annualPlanningService.updatePriority(priority._id, { is_active: newIsActive })
    } catch (error) {
      console.error('Failed to toggle active state:', error)
      setPriorities((prev) => prev.map((p) => (p._id === priority._id ? { ...p, is_active: originalIsActive } : p)))
    }
  }

  const handleClosePriorityDialog = () => {
    setShowPriorityDialog(false)
    setEditingPriority(null)
  }

  // Quarter State
  const [searchParams, setSearchParams] = useSearchParams()
  const qSuffix = searchParams.get('q') ? '?q=' + searchParams.get('q') : ''
  const initialQ = searchParams.get('q') ? Number(searchParams.get('q')) : getCurrentQuarter()
  const [quarterFilter, setQuarterFilter] = useState(initialQ)

  // Sync state to URL whenever it changes internally
  useEffect(() => {
    if (searchParams.get('q') !== String(quarterFilter)) {
      setSearchParams({ q: String(quarterFilter) }, { replace: true })
    }
  }, [quarterFilter, searchParams, setSearchParams])

  // Auto-forward to the next quarter if the current real calendar quarter is already closed
  useEffect(() => {
    const currentQ = getCurrentQuarter()
    if (quarterReports.length > 0 && plan?.year) {
      const isCurrentClosed = quarterReports.some((r) => r.quarter === currentQ && r.year === plan.year)
      if (isCurrentClosed && quarterFilter === currentQ) {
        setQuarterFilter(currentQ < 4 ? currentQ + 1 : 1)
      }
    }
  }, [quarterReports, plan?.year, quarterFilter])
  const isQuarterClosed = quarterReports.some((r) => r.quarter === quarterFilter && r.year === plan?.year)
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

  // --- Goal rendering (converged with GoalsTabView, ADR-003 §6) ---
  // Both surfaces render the same GoalCard/GoalRow over the same view model, so
  // a goal looks and behaves identically here and on the Goals tab.
  const detailGoal = goals.find((g) => g._id === detailGoalId) || null
  const detailModel = useGoalCardModel(detailGoal, { area, activities, quarterReports, planYear: plan?.year })

  // Ladder rung 5 — open the form already scrolled to Key Results.
  // Mirrors GoalsTabView.handleAddMilestone; without the section the prompt is
  // inert on this page (the defect FE-5 introduced).
  const handleAddMilestone = (goal) => {
    setSelectedGoal(goal)
    setDialogSection('milestones')
    setDialogOpen(true)
  }

  const goalProps = (goal) => ({
    goal,
    area,
    activities,
    quarterReports,
    planYear: plan?.year,
    busy: pendingGoalId === goal._id,
    onOpenDetail: (g) => setDetailGoalId(g._id),
    onEdit: handleEditGoal,
    onDelete: handleDeleteGoal,
    onStatusChange: handleStatusChange,
    onToggleMilestone: handleToggleMilestone,
    onAddMilestone: handleAddMilestone,
    onComplete: (g) => handleStatusChange(g, 'completed')
  })

  const renderGoalGrid = (list) =>
    list.map((goal) => (
      <Grid key={goal._id} xs={12} sm={6} md={6} lg={4}>
        <GoalCard {...goalProps(goal)} />
      </Grid>
    ))

  const renderGoalRows = (list) => list.map((goal) => <GoalRow key={goal._id} {...goalProps(goal)} />)

  // Split Goals into Objectives and Quarterly Goals
  const yearlyObjectives = goals.filter((g) => g.type === 'yearly' || (!g.type && !g.quarter))
  const quarterlyGoals = goals.filter((g) => g.type === 'quarterly' || g.quarter)

  // Filter Children by Quarter (support historical snapshot override)
  const currentQuarterGoals = useMemo(() => {
    if (isQuarterClosed) {
      const report = quarterReports.find((r) => r.quarter === quarterFilter && r.year === plan?.year)
      if (report && report.goals_summary) {
        return report.goals_summary.filter((g) => g.focus_area_id === id || g.focus_area_id?._id === id)
      }
    }
    return quarterlyGoals.filter((g) => g.quarter === quarterFilter)
  }, [quarterlyGoals, quarterFilter, isQuarterClosed, quarterReports, plan?.year, id])

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
    setDialogSection(null)
    setDialogOpen(true)
  }

  const handleAddChildGoal = (parentId) => {
    setSelectedGoal({ type: 'quarterly', quarter: quarterFilter, parent_id: parentId })
    setDialogSection(null)
    setDialogOpen(true)
  }

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
      {/* Breadcrumb Navigation */}
      <Breadcrumbs size='sm' separator='›' sx={{ mb: 2, px: 0 }}>
        <Link
          component={RouterLink}
          to={`/annual-planning${qSuffix}`}
          underline='hover'
          color='neutral'
          sx={{ fontSize: 'sm', color: 'text.tertiary', '&:hover': { color: 'text.secondary' } }}
        >
          {t('annualPlanning.breadcrumb.root')}
        </Link>
        <Typography level='body-sm' fontWeight={700} sx={{ color: 'text.primary' }}>
          {area.name}
        </Typography>
      </Breadcrumbs>

      {/* Header Area */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 2.5,
          mb: 4
        }}
      >
        {/* Glowing Icon Container */}
        <Box
          sx={{
            width: { xs: 56, md: 64 }, // Scaled down to match text block height exactly
            height: { xs: 56, md: 64 },
            borderRadius: 'xl',
            bgcolor: area.color ? alpha(area.color, 0.08) : 'background.level1',
            border: '1px solid',
            borderColor: area.color ? alpha(area.color, 0.18) : 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            // Matches the h1 title beside it (theme's xl4 token, 28->36px
            // fluid) — see the comment on the Text Area title below; kept in
            // lockstep on purpose, not a coincidence of two identical literals.
            fontSize: 'xl4',
            flexShrink: 0,
            boxShadow: area.color ? `0 4px 24px ${alpha(area.color, 0.12)}` : 'sm'
          }}
        >
          {area.icon}
        </Box>

        {/* Text Area */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Typography
            // Page/section heading (the focus area's name), not a hero stat —
            // h1 is the fit. Sized to match the icon container to its left
            // (see `fontSize: 'xl4'` there), which is why both were literal
            // duplicates before this token existed.
            level='h1'
            fontWeight={800}
            sx={{ letterSpacing: '-0.02em', mb: 0, lineHeight: 1.1 }}
          >
            {area.name}
          </Typography>
          <Typography level='body-md' textColor='text.tertiary' maxWidth='600px'>
            {area.description}
          </Typography>
        </Box>

        {/* Lateral Area Switcher */}
        {allAreas && allAreas.length > 1 && (
          <Box
            sx={{
              display: 'flex',
              gap: 0.5,
              bgcolor: 'background.level1',
              p: 0.5,
              borderRadius: 'lg',
              alignSelf: { xs: 'flex-start', md: 'flex-end' },
              mt: { xs: 1, md: 0 }
            }}
          >
            {allAreas.map((a) => {
              const isActive = a._id === id
              return (
                <Box
                  key={a._id}
                  onClick={() => !isActive && navigate(`/annual-planning/area/${a._id}`)}
                  sx={{
                    px: 1.5,
                    py: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    borderRadius: 'md',
                    cursor: isActive ? 'default' : 'pointer',
                    bgcolor: isActive ? 'background.surface' : 'transparent',
                    boxShadow: isActive ? 'sm' : 'none',
                    transition: 'all 0.2s',
                    '&:hover': isActive ? {} : { bgcolor: 'background.level2' }
                  }}
                >
                  <Typography level='body-sm' sx={{ fontSize: '1.25rem', lineHeight: 1 }}>
                    {a.icon}
                  </Typography>
                  <Typography
                    level='title-sm'
                    sx={{
                      color: isActive ? 'text.primary' : 'text.tertiary',
                      fontWeight: isActive ? 600 : 500,
                      display: { xs: 'none', lg: 'block' } // Hide text on small screens, just show icon
                    }}
                  >
                    {a.name}
                  </Typography>
                </Box>
              )
            })}
          </Box>
        )}
      </Box>

      {/* Smart Banner: Days Left / Overdue Banner */}
      <Box sx={{ mb: 2 }}>
        {getDaysLeftInQuarter(quarterFilter) === 0 && !isQuarterClosed ? (
          <Alert variant='soft' color='danger' startDecorator={<WarningIcon />} sx={{ alignItems: 'center' }}>
            <Box sx={{ flex: 1 }}>
              <Typography level='title-sm' color='danger'>
                Quarter {quarterFilter} has ended!
              </Typography>
              <Typography level='body-sm'>Please review and close the quarter to continue planning accurately.</Typography>
            </Box>
            <Button variant='solid' color='danger' size='sm' onClick={() => setShowCloseModal(true)}>
              Review Now
            </Button>
          </Alert>
        ) : !isQuarterClosed ? (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography level='title-sm' sx={{ color: 'primary.plainColor' }}>
              🚀 <b>{getDaysLeftInQuarter(quarterFilter)} days left</b> to crush your Q{quarterFilter} goals!
            </Typography>
          </Box>
        ) : null}
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
          {!isQuarterClosed && (
            <Button startDecorator={<AddIcon />} onClick={handleAddObjective}>
              {/* Context-aware Button Text */}
              {quarterFilter ? `Add Q${quarterFilter} Goal` : 'Add Objective'}
            </Button>
          )}
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
              <Card variant='outlined' sx={{ mb: 2, borderColor: 'primary.outlinedBorder', bgcolor: 'primary.softBg' }}>
                <CardContent>
                  <Stack direction='row' justifyContent='space-between' alignItems='center'>
                    <Box>
                      <Typography level='body-xs' fontWeight={700} textColor='primary.plainColor' letterSpacing='1px' mb={0.5}>
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
                      <IconButton size='sm' color='danger' onClick={() => handleDeleteGoal(objective)}>
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
                    {renderGoalGrid(goalsByParent[objective._id] || [])}

                    {/* Add Child Button */}
                    {!isQuarterClosed && (
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
                    )}
                  </Grid>
                ) : (
                  /* List View */
                  <Box>
                    <Stack spacing={0}>{renderGoalRows(goalsByParent[objective._id] || [])}</Stack>
                    {!isQuarterClosed && (
                      <Button
                        variant='plain'
                        fullWidth
                        sx={{ mt: 1, color: 'text.tertiary' }}
                        onClick={() => handleAddChildGoal(objective._id)}
                        startDecorator={<AddIcon />}
                      >
                        Add Goal to Q{quarterFilter}
                      </Button>
                    )}
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
                  {renderGoalGrid(goalsByParent['orphan'])}
                </Grid>
              ) : (
                /* List View */
                <Stack spacing={0}>{renderGoalRows(goalsByParent['orphan'])}</Stack>
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
          filterable
          onEdit={handleEditPriority}
          onDelete={handleDeletePriority}
          onToggleActive={handleToggleActive}
          emptyMessage={t('annualPlanning.priority.noGoals')}
        />
      </Box>

      <PriorityDialog
        open={showPriorityDialog}
        onClose={handleClosePriorityDialog}
        annualPlanId={plan?._id}
        focusAreas={allAreas}
        existingPriorities={allPriorities}
        editingPriority={editingPriority}
        onSuccess={() => {
          fetchData()
          handleClosePriorityDialog()
        }}
      />

      <GoalDetailDrawer
        open={Boolean(detailGoal)}
        goal={detailGoal}
        model={detailModel}
        onClose={() => setDetailGoalId(null)}
        onEdit={handleEditGoal}
        onDelete={handleDeleteGoal}
        onStatusChange={handleStatusChange}
        onToggleMilestone={handleToggleMilestone}
      />

      <GoalDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        focusAreaId={id}
        priorities={priorities}
        goal={selectedGoal}
        onSuccess={handleGoalSuccess}
        yearlyObjectives={yearlyObjectives} // Pass for parent selection
        initialSection={dialogSection}
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

      <DeleteConfirmationModal
        open={!!deletingGoal}
        onClose={() => setDeletingGoal(null)}
        onConfirm={confirmDeleteGoal}
        loading={deleteLoading}
        title={t('annualPlanning.goal.deleteConfirm.title')}
        description={t('annualPlanning.goal.deleteConfirm.description')}
      />

      {showCloseModal && (
        <CloseQuarterModal
          open={showCloseModal}
          onClose={() => setShowCloseModal(false)}
          onSuccess={() => {
            setShowCloseModal(false)
            fetchData()
            setQuarterFilter((prev) => (prev < 4 ? prev + 1 : 1))
          }}
          targetQuarter={quarterFilter}
          targetYear={plan?.year}
          planId={plan?._id}
          focusAreas={allAreas}
          goals={allGoals}
        />
      )}

      <Snackbar
        open={Boolean(toast)}
        onClose={() => setToast(null)}
        autoHideDuration={4000}
        color='danger'
        variant='soft'
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? t(toast) : ''}
      </Snackbar>
    </Container>
  )
}

export default FocusAreaView

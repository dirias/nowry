import React, { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Typography,
  Stack,
  Skeleton,
  Button,
  Grid,
  IconButton,
  Tooltip,
  Modal,
  ModalDialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem
} from '@mui/joy'
import { GridView as GridViewIcon, ViewList as ListIcon, FilterAltOff as FilterAltOffIcon } from '@mui/icons-material'
import { annualPlanningService } from '../../api/services'
import GoalCardGrid from './GoalCardGrid'
import GoalRowList from './GoalRowList'
import GoalDialog from './GoalDialog'
import DeleteConfirmationModal from '../Common/DeleteConfirmationModal'
import EmptyState from './EmptyState'
import { calculateProgress, getHealthStatus } from './FocusAreaView'

/**
 * GoalsTabView — flat, cross-area list of all goals (Phase 23 D-02).
 * Deliberately does NOT group goals under per-focus-area headers/cards — that
 * grouping is FocusAreaView.js's job. The per-goal rendering (lifecycle chip,
 * health-status chip, progress bar, milestones Stepper, Activities accordion)
 * is shared with FocusAreaView.js via GoalCardGrid/GoalRowList so both surfaces
 * stay visually consistent.
 *
 * Quarter scope: this view renders `quarterGoals` (the layout's ?q=-scoped,
 * snapshot-aware goal set), never the raw year-wide list. Rendering every goal
 * under a header that claims "Q3" was a live data-correctness bug, not polish.
 */
const GoalsTabView = () => {
  const { t } = useTranslation()
  const {
    goals: allYearGoals,
    quarterGoals,
    areas: allAreas,
    plan,
    quarterReports,
    quarter,
    setQuarter,
    loading,
    error,
    reload
  } = useOutletContext()

  // Local mirror of the scoped goals so status/milestone toggles can update
  // optimistically without waiting on a full reload (same pattern as FocusAreaView).
  const [goals, setGoals] = useState([])
  useEffect(() => {
    setGoals(quarterGoals)
  }, [quarterGoals])

  // View Mode (grid/list), persisted like FocusAreaView's toggle
  const [viewMode, setViewMode] = useState(localStorage.getItem('goals_view_mode') || 'grid')
  const handleViewModeChange = (newMode) => {
    setViewMode(newMode)
    localStorage.setItem('goals_view_mode', newMode)
  }

  // Expanded Activities State
  const [expandedGoals, setExpandedGoals] = useState(new Set())
  const [goalActivities, setGoalActivities] = useState({})

  // Expanded Milestones State
  const [expandedMilestones, setExpandedMilestones] = useState(new Set())

  // Edit/Delete Goal State
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState(null)
  const [deletingGoal, setDeletingGoal] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Error Modal State (blocked completion — unfinished milestones)
  const [errorModal, setErrorModal] = useState({ open: false, milestones: [] })

  // Resolve each goal's parent focus area — GoalCardGrid/GoalRowList use it for
  // the accent color, but this view never groups by it.
  const getGoalArea = (goal) => allAreas.find((a) => a._id === goal.focus_area_id || a._id === goal.focus_area_id?._id)

  // A goal's quarter can be closed independently of any other goal's — there is
  // no single active quarter here (unlike FocusAreaView, which is scoped to one
  // quarter at a time). Yearly objectives are never quarter-locked.
  const isGoalQuarterClosed = (goal) => {
    if (!goal.quarter) return false
    return quarterReports.some((r) => r.quarter === goal.quarter && r.year === plan?.year)
  }

  const getStatusConfig = (status) => {
    const configs = {
      not_started: { label: t('annualPlanning.goal.status.notStarted'), color: 'neutral', icon: '⭕' },
      in_progress: { label: t('annualPlanning.goal.status.inProgress'), color: 'warning', icon: '🔄' },
      completed: { label: t('annualPlanning.goal.status.completed'), color: 'success', icon: '✓' }
    }
    return configs[status] || configs.not_started
  }

  const handleEditGoal = (goal) => {
    setSelectedGoal(goal)
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
      reload()
    } finally {
      setDeleteLoading(false)
      setDeletingGoal(null)
    }
  }

  const handleStatusChange = async (goal) => {
    const statusCycle = { not_started: 'in_progress', in_progress: 'completed', completed: 'not_started' }
    const newStatus = statusCycle[goal.status] || 'in_progress'

    // Validate: cannot mark as completed if there are uncompleted milestones
    if (newStatus === 'completed' && goal.milestones && goal.milestones.length > 0) {
      const uncompletedMilestones = goal.milestones.filter((m) => !m.completed)
      if (uncompletedMilestones.length > 0) {
        setErrorModal({ open: true, milestones: uncompletedMilestones })
        return
      }
    }

    // Optimistic update — instant UI response, no reload needed
    setGoals((prev) => prev.map((g) => (g._id === goal._id ? { ...g, status: newStatus } : g)))

    try {
      await annualPlanningService.updateGoal(goal._id, { ...goal, status: newStatus })
    } catch (err) {
      console.error('Failed to update status:', err)
      setGoals((prev) => prev.map((g) => (g._id === goal._id ? { ...g, status: goal.status } : g)))
    }
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
    if (goal.status === 'completed') return

    const updatedMilestones = [...goal.milestones]
    updatedMilestones[milestoneIndex] = {
      ...updatedMilestones[milestoneIndex],
      completed: !updatedMilestones[milestoneIndex].completed
    }

    setGoals((prev) => prev.map((g) => (g._id === goal._id ? { ...g, milestones: updatedMilestones } : g)))

    try {
      await annualPlanningService.updateGoal(goal._id, { ...goal, milestones: updatedMilestones })
    } catch (err) {
      console.error('Failed to update milestone:', err)
      setGoals((prev) => prev.map((g) => (g._id === goal._id ? { ...g, milestones: goal.milestones } : g)))
    }
  }

  const handleToggleExpand = async (goalId) => {
    const newExpanded = new Set(expandedGoals)

    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId)
    } else {
      newExpanded.add(goalId)
      if (!goalActivities[goalId]) {
        try {
          const activities = await annualPlanningService.getActivities(goalId)
          setGoalActivities((prev) => ({ ...prev, [goalId]: activities }))
        } catch (err) {
          console.error('Failed to load goal activities', err)
          // null sentinel = fetch failed (distinct from undefined = not yet
          // fetched, [] = fetched empty) so the Activities accordion renders
          // its error state instead of an infinite Skeleton.
          setGoalActivities((prev) => ({ ...prev, [goalId]: null }))
        }
      }
    }
    setExpandedGoals(newExpanded)
  }

  const handleGoalSuccess = async () => {
    await reload()
    // Refresh activities for any currently expanded goals to stay consistent
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
      } catch (err) {
        console.error('Failed to refresh expanded activities', err)
      }
    }
  }

  // Yearly objectives across all areas — used by GoalDialog's "Link to Yearly
  // Objective" selector when editing a quarterly goal from this flat view.
  // Sourced from the full-year list on purpose: a yearly objective must stay
  // selectable even when the view is scoped down to a single quarter.
  const yearlyObjectives = allYearGoals.filter((g) => g.type === 'yearly' || (!g.type && !g.quarter))

  const renderGoal = (goal) => {
    const area = getGoalArea(goal)
    const isQuarterClosed = isGoalQuarterClosed(goal)
    const sharedProps = {
      goal,
      area,
      isQuarterClosed,
      expandedMilestones,
      expandedGoals,
      goalActivities,
      handleStatusChange,
      handleEditGoal,
      handleDeleteGoal,
      handleToggleMilestones,
      handleToggleMilestone,
      handleToggleExpand,
      calculateProgress,
      getStatusConfig,
      getHealthStatus
    }

    return viewMode === 'grid' ? (
      <Grid key={goal._id} xs={12} md={6}>
        <GoalCardGrid {...sharedProps} />
      </Grid>
    ) : (
      <Box key={goal._id}>
        <GoalRowList {...sharedProps} />
      </Box>
    )
  }

  // The layout renders the shared error + retry block above the outlet.
  if (error && !loading) return null

  const isQuarterScoped = quarter !== 'All'
  const isFilteredEmpty = !loading && isQuarterScoped && goals.length === 0 && allYearGoals.length > 0

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent='space-between'
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={1.5}
        sx={{ mb: 3 }}
      >
        <Box>
          {/* Scope line — states in words what the quarter Select is doing to this list.
              No view-identity heading here: the tab itself already says "Goals". */}
          <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
            <Skeleton loading={loading} variant='text' width='14ch'>
              {isQuarterScoped
                ? t('annualPlanning.goals.scopeQuarter', { quarter, count: goals.length })
                : t('annualPlanning.goals.scopeAll', { count: goals.length })}
            </Skeleton>
          </Typography>
        </Box>

        <Stack direction='row' spacing={0.5}>
          <Tooltip title={t('annualPlanning.tabs.gridView')}>
            <IconButton
              size='sm'
              variant={viewMode === 'grid' ? 'solid' : 'plain'}
              color={viewMode === 'grid' ? 'primary' : 'neutral'}
              aria-label={t('annualPlanning.tabs.gridView')}
              onClick={() => handleViewModeChange('grid')}
              sx={{ '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' } }}
            >
              <GridViewIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('annualPlanning.tabs.listView')}>
            <IconButton
              size='sm'
              variant={viewMode === 'list' ? 'solid' : 'plain'}
              color={viewMode === 'list' ? 'primary' : 'neutral'}
              aria-label={t('annualPlanning.tabs.listView')}
              onClick={() => handleViewModeChange('list')}
              sx={{ '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' } }}
            >
              <ListIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {!error && (
        <Skeleton loading={loading}>
          {/* Filtered-empty is deliberately distinct from true-empty: the user has
              goals, just not in this quarter, so the exit is a scope change — not
              the "go create your first goal" copy, which would be a lie here. */}
          {isFilteredEmpty ? (
            <EmptyState
              icon={<FilterAltOffIcon sx={{ fontSize: 48, color: 'text.tertiary', opacity: 0.5, mb: 2 }} />}
              title={t('annualPlanning.goals.quarterEmptyTitle', { quarter })}
              body={t('annualPlanning.goals.quarterEmptyBody')}
              action={
                <Button
                  size='sm'
                  variant='soft'
                  onClick={() => setQuarter('All')}
                  sx={{ mt: 2, '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' } }}
                >
                  {t('annualPlanning.goals.quarterEmptyCta')}
                </Button>
              }
            />
          ) : !loading && goals.length === 0 ? (
            <EmptyState title={t('annualPlanning.tabs.goalsEmptyTitle')} body={t('annualPlanning.tabs.goalsEmptyBody')} />
          ) : viewMode === 'grid' ? (
            <Grid container spacing={2}>
              {goals.map(renderGoal)}
            </Grid>
          ) : (
            <Stack spacing={0}>{goals.map(renderGoal)}</Stack>
          )}
        </Skeleton>
      )}

      <GoalDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        goal={selectedGoal}
        onSuccess={handleGoalSuccess}
        yearlyObjectives={yearlyObjectives}
      />

      <DeleteConfirmationModal
        open={!!deletingGoal}
        onClose={() => setDeletingGoal(null)}
        onConfirm={confirmDeleteGoal}
        loading={deleteLoading}
        title={t('annualPlanning.goal.deleteConfirm.title')}
        description={t('annualPlanning.goal.deleteConfirm.description')}
      />

      <Modal open={errorModal.open} onClose={() => setErrorModal({ open: false, milestones: [] })}>
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
          <DialogTitle sx={{ fontSize: '1.25rem', fontWeight: 700 }}>{t('annualPlanning.goal.completionBlockedTitle')}</DialogTitle>
          <DialogContent>
            <Typography level='body-sm' sx={{ mb: 2, color: 'text.secondary' }}>
              {t('annualPlanning.goal.completionBlockedBody')}
            </Typography>
            <List marker='disc' size='sm'>
              {errorModal.milestones.map((milestone, idx) => (
                <ListItem key={idx}>
                  <Typography level='body-sm'>{milestone.title}</Typography>
                </ListItem>
              ))}
            </List>
            <Button variant='solid' color='danger' onClick={() => setErrorModal({ open: false, milestones: [] })} sx={{ mt: 2 }} fullWidth>
              {t('common.close')}
            </Button>
          </DialogContent>
        </ModalDialog>
      </Modal>
    </Box>
  )
}

export default GoalsTabView

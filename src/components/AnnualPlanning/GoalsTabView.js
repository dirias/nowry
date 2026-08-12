import React, { useState, useEffect, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Typography,
  Stack,
  Button,
  Grid,
  IconButton,
  Tooltip,
  Modal,
  ModalDialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  Skeleton,
  Snackbar
} from '@mui/joy'
import { GridView as GridViewIcon, ViewList as ListIcon, FilterAltOff as FilterAltOffIcon } from '@mui/icons-material'
import { annualPlanningService } from '../../api/services'
import useGoalCardModel from '../../hooks/useGoalCardModel'
import GoalCard from './GoalCard'
import GoalRow from './GoalRow'
import GoalDialog from './GoalDialog'
import DeleteConfirmationModal from '../Common/DeleteConfirmationModal'
import EmptyState from './EmptyState'
import GoalCardSkeleton from './goal/GoalCardSkeleton'
import GoalRowSkeleton from './goal/GoalRowSkeleton'
import GoalDetailDrawer from './goal/GoalDetailDrawer'

const focusRing = {
  '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' }
}

const SKELETON_COUNT = { grid: 6, list: 8 }

/**
 * GoalsTabView — flat, cross-area list of all goals.
 *
 * Deliberately does NOT group goals under per-focus-area headers — that is
 * FocusAreaView.js's job. Per-goal rendering is shared with FocusAreaView via
 * GoalCard/GoalRow so both surfaces stay identical.
 *
 * Quarter scope: renders `quarterGoals` (the layout's ?q=-scoped, snapshot-aware
 * goal set), never the raw year-wide list.
 *
 * Post-ADR-003 this container fetches nothing per goal. Activities arrive with
 * the plan payload through the outlet context, so no card interaction can fire
 * a request.
 */
const GoalsTabView = () => {
  const { t } = useTranslation()
  const {
    goals: allYearGoals,
    quarterGoals,
    areas: allAreas,
    activities,
    plan,
    quarterReports,
    quarter,
    setQuarter,
    loading,
    error,
    reload
  } = useOutletContext()

  // Local mirror of the scoped goals so status/milestone toggles can update
  // optimistically without waiting on a full reload.
  const [goals, setGoals] = useState([])
  useEffect(() => {
    setGoals(quarterGoals)
  }, [quarterGoals])

  const [viewMode, setViewMode] = useState(localStorage.getItem('goals_view_mode') || 'grid')
  const handleViewModeChange = (newMode) => {
    setViewMode(newMode)
    localStorage.setItem('goals_view_mode', newMode)
  }

  // Detail drawer
  const [detailGoalId, setDetailGoalId] = useState(null)
  // Resolved from the live list, not captured at open time, so the drawer
  // reflects optimistic milestone toggles made from inside itself.
  const detailGoal = goals.find((g) => g._id === detailGoalId) || null

  // Edit/Delete
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState(null)
  const [dialogSection, setDialogSection] = useState(null)
  const [deletingGoal, setDeletingGoal] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Blocked completion (unfinished milestones)
  const [errorModal, setErrorModal] = useState({ open: false, milestones: [] })

  // Failed writes used to reach console.error only — an unhandled Error state.
  const [toast, setToast] = useState(null)
  const [pendingGoalId, setPendingGoalId] = useState(null)

  const getGoalArea = useCallback(
    (goal) => allAreas.find((a) => a._id === goal.focus_area_id || a._id === goal.focus_area_id?._id),
    [allAreas]
  )

  const detailModel = useGoalCardModel(detailGoal, {
    area: detailGoal ? getGoalArea(detailGoal) : null,
    activities,
    quarterReports,
    planYear: plan?.year
  })

  const handleEditGoal = (goal) => {
    setSelectedGoal(goal)
    setDialogSection(null)
    setDialogOpen(true)
  }

  // Ladder rung 5 — open the form already scrolled to Key Results.
  const handleAddMilestone = (goal) => {
    setSelectedGoal(goal)
    setDialogSection('milestones')
    setDialogOpen(true)
  }

  const handleDeleteGoal = (goal) => setDeletingGoal(goal)

  const confirmDeleteGoal = async () => {
    if (!deletingGoal) return
    setDeleteLoading(true)
    try {
      await annualPlanningService.deleteGoal(deletingGoal._id)
      setDetailGoalId(null)
      reload()
    } finally {
      setDeleteLoading(false)
      setDeletingGoal(null)
    }
  }

  /**
   * Explicit status write. Replaces the click-cycle: the caller always names the
   * target status, so a completed goal can no longer be silently reopened by one
   * extra click.
   */
  const handleStatusChange = async (goal, newStatus) => {
    if (!newStatus || newStatus === goal.status) return

    // Completion guard — preserved exactly, now covering both the drawer's
    // Select and the overflow menu's "Mark complete".
    if (newStatus === 'completed' && goal.milestones && goal.milestones.length > 0) {
      const uncompletedMilestones = goal.milestones.filter((m) => !m.completed)
      if (uncompletedMilestones.length > 0) {
        setErrorModal({ open: true, milestones: uncompletedMilestones })
        return
      }
    }

    setGoals((prev) => prev.map((g) => (g._id === goal._id ? { ...g, status: newStatus } : g)))
    setPendingGoalId(goal._id)

    try {
      await annualPlanningService.updateGoal(goal._id, { ...goal, status: newStatus })
    } catch (err) {
      setGoals((prev) => prev.map((g) => (g._id === goal._id ? { ...g, status: goal.status } : g)))
      setToast('annualPlanning.goal.statusUpdateError')
    } finally {
      setPendingGoalId(null)
    }
  }

  const handleToggleMilestone = async (goal, milestoneIndex) => {
    if (goal.status === 'completed') return

    const updatedMilestones = [...goal.milestones]
    updatedMilestones[milestoneIndex] = {
      ...updatedMilestones[milestoneIndex],
      completed: !updatedMilestones[milestoneIndex].completed
    }

    setGoals((prev) => prev.map((g) => (g._id === goal._id ? { ...g, milestones: updatedMilestones } : g)))
    setPendingGoalId(goal._id)

    try {
      await annualPlanningService.updateGoal(goal._id, { ...goal, milestones: updatedMilestones })
    } catch (err) {
      setGoals((prev) => prev.map((g) => (g._id === goal._id ? { ...g, milestones: goal.milestones } : g)))
      setToast('annualPlanning.goal.milestoneUpdateError')
    } finally {
      setPendingGoalId(null)
    }
  }

  // Yearly objectives across all areas — sourced from the full-year list on
  // purpose: a yearly objective must stay selectable even when the view is
  // scoped to a single quarter.
  const yearlyObjectives = allYearGoals.filter((g) => g.type === 'yearly' || (!g.type && !g.quarter))

  const goalProps = (goal) => ({
    goal,
    area: getGoalArea(goal),
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

  // The layout renders the shared error + retry block above the outlet.
  if (error && !loading) return null

  const isQuarterScoped = quarter !== 'All'
  const isFilteredEmpty = !loading && isQuarterScoped && goals.length === 0 && allYearGoals.length > 0

  const renderSkeletons = () =>
    viewMode === 'grid' ? (
      <Grid container spacing={2}>
        {Array.from({ length: SKELETON_COUNT.grid }).map((_, i) => (
          <Grid key={i} xs={12} sm={6} md={6} lg={4}>
            <GoalCardSkeleton />
          </Grid>
        ))}
      </Grid>
    ) : (
      <Stack spacing={0}>
        {Array.from({ length: SKELETON_COUNT.list }).map((_, i) => (
          <GoalRowSkeleton key={i} />
        ))}
      </Stack>
    )

  const renderGoals = () =>
    viewMode === 'grid' ? (
      <Grid container spacing={2}>
        {goals.map((goal) => (
          // 3 columns at lg: 5 goals lay out 3+2 instead of 2+2+1, which is what
          // removes the orphan card without a filler hack.
          <Grid key={goal._id} xs={12} sm={6} md={6} lg={4}>
            <GoalCard {...goalProps(goal)} />
          </Grid>
        ))}
      </Grid>
    ) : (
      <Stack spacing={0}>
        {goals.map((goal) => (
          <GoalRow key={goal._id} {...goalProps(goal)} />
        ))}
      </Stack>
    )

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
          {/* Scope line — states in words what the quarter Select is doing to this list. */}
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
              sx={focusRing}
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
              sx={focusRing}
            >
              <ListIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Loading renders placeholders inside the real grid rather than gating the
          whole region, so the layout the user is waiting for stays visible. */}
      {!error &&
        (loading ? (
          renderSkeletons()
        ) : isFilteredEmpty ? (
          // Filtered-empty is deliberately distinct from true-empty: the user has
          // goals, just not in this quarter, so the exit is a scope change — not
          // the "go create your first goal" copy, which would be a lie here.
          <EmptyState
            icon={<FilterAltOffIcon sx={{ fontSize: 48, color: 'text.tertiary', opacity: 0.5, mb: 2 }} />}
            title={t('annualPlanning.goals.quarterEmptyTitle', { quarter })}
            body={t('annualPlanning.goals.quarterEmptyBody')}
            action={
              <Button size='sm' variant='soft' onClick={() => setQuarter('All')} sx={{ mt: 2, ...focusRing }}>
                {t('annualPlanning.goals.quarterEmptyCta')}
              </Button>
            }
          />
        ) : goals.length === 0 ? (
          <EmptyState title={t('annualPlanning.tabs.goalsEmptyTitle')} body={t('annualPlanning.tabs.goalsEmptyBody')} />
        ) : (
          renderGoals()
        ))}

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
        goal={selectedGoal}
        onSuccess={reload}
        yearlyObjectives={yearlyObjectives}
        initialSection={dialogSection}
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
        <ModalDialog variant='outlined' color='danger' sx={{ maxWidth: 500, borderRadius: 'lg', p: 3, boxShadow: 'lg' }}>
          <DialogTitle>{t('annualPlanning.goal.completionBlockedTitle')}</DialogTitle>
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
            <Button
              variant='solid'
              color='danger'
              onClick={() => setErrorModal({ open: false, milestones: [] })}
              sx={{ mt: 2, ...focusRing }}
              fullWidth
            >
              {t('common.close')}
            </Button>
          </DialogContent>
        </ModalDialog>
      </Modal>

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
    </Box>
  )
}

export default GoalsTabView

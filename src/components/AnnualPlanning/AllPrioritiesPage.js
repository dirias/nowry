import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Typography, Container, Stack, Skeleton, Button, Box } from '@mui/joy'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useAnnualPlan } from '../../hooks/useAnnualPlan'
import { useAuth } from '../../context/AuthContext'
import { annualPlanningService } from '../../api/services'
import PriorityList from './PriorityList'
import PriorityDialog from './PriorityDialog'
import AnnualPlanningTabBar from './AnnualPlanningTabBar'

const AllPrioritiesPage = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { plan, areas, priorities: hookPriorities, loading, error, reload } = useAnnualPlan(new Date().getFullYear(), user)
  const [priorities, setPriorities] = useState([])
  const [showInactive, setShowInactive] = useState(false)
  const [showPriorityDialog, setShowPriorityDialog] = useState(false)
  const [editingPriority, setEditingPriority] = useState(null)
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor))

  useEffect(() => {
    if (!loading) setPriorities(hookPriorities)
  }, [loading, hookPriorities])

  const { activePriorities, inactivePriorities, completedPriorities } = useMemo(
    () => ({
      activePriorities: priorities.filter((p) => !p.is_completed && p.is_active),
      inactivePriorities: priorities.filter((p) => !p.is_completed && !p.is_active),
      completedPriorities: priorities.filter((p) => p.is_completed)
    }),
    [priorities]
  )

  const handleToggleActive = async (priority) => {
    const originalIsActive = priority.is_active
    const newIsActive = !originalIsActive
    setPriorities((prev) => prev.map((p) => (p._id === priority._id ? { ...p, is_active: newIsActive } : p)))
    try {
      await annualPlanningService.updatePriority(priority._id, { is_active: newIsActive })
    } catch (updateError) {
      console.error('Failed to toggle active state:', updateError)
      setPriorities((prev) => prev.map((p) => (p._id === priority._id ? { ...p, is_active: originalIsActive } : p)))
    }
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = activePriorities.findIndex((p) => p._id === active.id)
    const newIndex = activePriorities.findIndex((p) => p._id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(activePriorities, oldIndex, newIndex)
    const newOrderIds = reordered.map((p) => p._id)
    // Optimistic: splice the reordered active ids back in front of inactive+completed for instant UI feedback
    setPriorities((prev) => {
      const others = prev.filter((p) => p.is_completed || !p.is_active)
      return [...reordered, ...others]
    })
    try {
      await annualPlanningService.reorderPriorities(plan?._id, newOrderIds)
    } catch (reorderError) {
      console.error('Failed to reorder priorities:', reorderError)
      reload()
    }
  }

  // Fix: this previously just navigated back to /annual-planning without ever
  // opening an edit affordance, so the Edit button on this "full view" page
  // appeared to do nothing (Rule 1 bug fix — matches AnnualPlanningHome.js's
  // existing handleEditPriority pattern, which correctly opens PriorityDialog).
  const handleEditPriority = (priority) => {
    setEditingPriority(priority)
    setShowPriorityDialog(true)
  }

  const handleDeletePriority = () => {
    reload()
  }

  const handleClosePriorityDialog = () => {
    setShowPriorityDialog(false)
    setEditingPriority(null)
  }

  return (
    <Container maxWidth='xl' sx={{ py: { xs: 1, md: 1.5 } }}>
      <AnnualPlanningTabBar />

      <Stack spacing={3}>
        {/* Page Title */}
        <Skeleton loading={loading}>
          <Typography level='h2'>{t('annualPlanning.priority.title')}</Typography>
        </Skeleton>

        {/* Error state */}
        {error && !loading && (
          <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
            <Typography level='body-sm' color='danger'>
              {t('annualPlanning.tabs.errorLoading')}
            </Typography>
            <Button size='sm' variant='soft' onClick={reload}>
              {t('common.retry')}
            </Button>
          </Stack>
        )}

        {/* Active / inactive / completed split (D-06) */}
        {!error && (
          <Skeleton loading={loading}>
            <Stack spacing={3}>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={activePriorities.map((p) => p._id)} strategy={verticalListSortingStrategy}>
                  <PriorityList
                    priorities={activePriorities}
                    draggable
                    onEdit={handleEditPriority}
                    onDelete={handleDeletePriority}
                    onToggleActive={handleToggleActive}
                    emptyMessage={t('annualPlanning.priority.noActivePriorities')}
                  />
                </SortableContext>
              </DndContext>

              {inactivePriorities.length > 0 && (
                <Box>
                  <Button variant='plain' color='neutral' size='sm' onClick={() => setShowInactive(!showInactive)} sx={{ mb: 2 }}>
                    {showInactive
                      ? t('annualPlanning.priority.hideInactive')
                      : t('annualPlanning.priority.showInactive', { count: inactivePriorities.length })}
                  </Button>
                  {showInactive && (
                    <PriorityList
                      priorities={inactivePriorities}
                      onEdit={handleEditPriority}
                      onDelete={handleDeletePriority}
                      onToggleActive={handleToggleActive}
                      emptyMessage={t('annualPlanning.priority.noGoals')}
                    />
                  )}
                </Box>
              )}

              {completedPriorities.length > 0 && (
                <Box>
                  {/* Section header — without this, completed rows read as an
                      unexplained third group: not in the active list, not inside
                      the collapsed inactive toggle either (UAT gap-01). */}
                  <Typography level='title-sm' sx={{ mb: 1, color: 'text.secondary' }}>
                    {t('annualPlanning.priority.completedSection')}
                  </Typography>
                  <PriorityList
                    priorities={completedPriorities}
                    onEdit={handleEditPriority}
                    onDelete={handleDeletePriority}
                    emptyMessage={t('annualPlanning.priority.noGoals')}
                  />
                </Box>
              )}
            </Stack>
          </Skeleton>
        )}
      </Stack>

      <PriorityDialog
        open={showPriorityDialog}
        onClose={handleClosePriorityDialog}
        annualPlanId={plan?._id}
        focusAreas={areas}
        existingPriorities={priorities}
        editingPriority={editingPriority}
        onSuccess={() => {
          reload()
          handleClosePriorityDialog()
        }}
      />
    </Container>
  )
}

export default AllPrioritiesPage

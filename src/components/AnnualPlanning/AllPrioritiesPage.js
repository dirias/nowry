import React, { useState, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Typography, Stack, Skeleton, Button, Box } from '@mui/joy'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Add as AddIcon, Flag as FlagIcon } from '@mui/icons-material'
import { annualPlanningService } from '../../api/services'
import PriorityList from './PriorityList'
import PriorityDialog from './PriorityDialog'
import EmptyState from './EmptyState'

const focusRing = {
  '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' }
}

/**
 * AllPrioritiesPage — the Priorities tab.
 *
 * This is the management surface for yearly commitments: add, edit, delete,
 * activate/deactivate and drag to reorder. Overview only shows a read-only recall
 * preview of the same data.
 *
 * It renders as a child of AnnualPlanningLayout, so it inherits the persistent
 * header and reads plan data from outlet context. It must not call useAnnualPlan:
 * that would reintroduce the duplicate fetch and the second unshared loading state
 * the layout exists to remove. It also carries no title of its own — the tab names
 * the view.
 */
const AllPrioritiesPage = () => {
  const { t } = useTranslation()
  const { plan, areas, priorities, setPriorities, loading, error, reload } = useOutletContext()

  const [showInactive, setShowInactive] = useState(false)
  const [showPriorityDialog, setShowPriorityDialog] = useState(false)
  const [editingPriority, setEditingPriority] = useState(null)
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor))

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
    // Optimistic: splice the reordered active ids back in front of inactive+completed
    // for instant UI feedback. Writes through outlet context so the Overview preview
    // reflects the new order too.
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

  const handleEditPriority = (priority) => {
    setEditingPriority(priority)
    setShowPriorityDialog(true)
  }

  const handleDeletePriority = () => reload()

  const handleClosePriorityDialog = () => {
    setShowPriorityDialog(false)
    setEditingPriority(null)
  }

  const openAddDialog = () => {
    setEditingPriority(null)
    setShowPriorityDialog(true)
  }

  // The layout renders the shared error + retry block above the outlet.
  if (error && !loading) return null

  const isEmpty = !loading && priorities.length === 0

  return (
    <Box>
      {!loading && !isEmpty && (
        <Stack direction='row' sx={{ mb: 2 }}>
          <Button size='sm' startDecorator={<AddIcon />} onClick={openAddDialog} sx={focusRing}>
            {t('annualPlanning.priority.addPriority')}
          </Button>
        </Stack>
      )}

      {loading ? (
        <Stack spacing={1}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant='rectangular' height={40} sx={{ borderRadius: 'sm' }} />
          ))}
        </Stack>
      ) : isEmpty ? (
        <EmptyState
          icon={<FlagIcon sx={{ fontSize: 48, color: 'text.tertiary', opacity: 0.5, mb: 2 }} />}
          title={t('annualPlanning.priority.emptyTitle')}
          body={t('annualPlanning.priority.emptyBody')}
          bodyMaxWidth={420}
          action={
            <Button size='sm' startDecorator={<AddIcon />} onClick={openAddDialog} sx={{ mt: 2, ...focusRing }}>
              {t('annualPlanning.priority.emptyCta')}
            </Button>
          }
        />
      ) : (
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
              <Button variant='plain' color='neutral' size='sm' onClick={() => setShowInactive(!showInactive)} sx={{ mb: 2, ...focusRing }}>
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
              <PriorityList priorities={completedPriorities} onEdit={handleEditPriority} onDelete={handleDeletePriority} />
            </Box>
          )}
        </Stack>
      )}

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
    </Box>
  )
}

export default AllPrioritiesPage

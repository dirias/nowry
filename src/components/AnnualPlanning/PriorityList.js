import React, { useState, useMemo } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { Box, Typography, Stack, IconButton, Tooltip, Button, Modal, ModalDialog, DialogTitle, DialogContent, Chip } from '@mui/joy'
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Flag as FlagIcon,
  FlagOutlined as FlagOutlinedIcon,
  Warning as WarningIcon,
  DragHandle as DragHandleIcon
} from '@mui/icons-material'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { annualPlanningService } from '../../api/services'

/**
 * SortablePriorityRow
 * Wraps a priority row's content in dnd-kit's useSortable, exposing a
 * drag-handle icon on non-completed rows only (D-08).
 */
const SortablePriorityRow = ({ priorityId, isCompleted, children }) => {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: priorityId })
  // isDragging (not transform) identifies the row actually being grabbed —
  // transform is non-null for every sibling shifting out of the way too, which
  // would otherwise dim the whole list during a drag (WR-04).
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  return (
    <Box ref={setNodeRef} style={style} sx={{ display: 'flex', alignItems: 'center' }} {...attributes}>
      {!isCompleted && (
        <IconButton
          {...listeners}
          size='sm'
          variant='plain'
          color='neutral'
          aria-label={t('annualPlanning.priority.dragHandle')}
          sx={{ cursor: 'grab', color: 'text.tertiary', '&:active': { cursor: 'grabbing' }, flexShrink: 0 }}
        >
          <DragHandleIcon sx={{ fontSize: 18 }} />
        </IconButton>
      )}
      <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
    </Box>
  )
}

/**
 * PriorityList Component
 * Reusable component for displaying and managing priorities
 * Ensures consistent UI/UX across Annual Planning and Focus Area views
 *
 * Following DESIGN_GUIDELINES.md:
 * - Minimalistic design
 * - Consistent spacing and colors
 * - Clear visual hierarchy
 *
 * `filterable` opts a surface into the "active by default" behaviour: completed
 * and inactive priorities are noise on overview surfaces, so they are hidden on
 * first render behind an Active/All segmented toggle (client-side only — the
 * parent still fetches and owns the full list). AllPrioritiesPage deliberately
 * does NOT use it: that page is the dedicated full view with explicit
 * active / inactive / completed sections.
 */
const PriorityList = ({
  priorities = [],
  onEdit,
  onDelete,
  onToggleActive = null,
  draggable = false,
  showEditButton = true,
  showDeleteButton = true,
  emptyMessage = null,
  filterable = false,
  maxVisible = null
}) => {
  const { t } = useTranslation()
  const [deletingPriority, setDeletingPriority] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const resolvedEmptyMessage = emptyMessage || t('annualPlanning.priority.noGoals')

  // "Active" mirrors AllPrioritiesPage's split exactly (is_active && !is_completed)
  // so both surfaces agree on what counts as active — including legacy documents
  // where is_active is absent, which already render as Inactive below.
  const activePriorities = useMemo(() => priorities.filter((p) => !p.is_completed && p.is_active), [priorities])
  const hiddenCount = priorities.length - activePriorities.length
  // Only surface the toggle when it would actually change something (§11 progressive disclosure).
  const showFilterToggle = filterable && hiddenCount > 0
  const filteredPriorities = filterable && !showAll ? activePriorities : priorities
  const visiblePriorities = maxVisible ? filteredPriorities.slice(0, maxVisible) : filteredPriorities
  const entityType = deletingPriority?.linked_entity_type || 'routine'
  const entityTypeCapitalized = entityType.charAt(0).toUpperCase() + entityType.slice(1)

  const handleDeleteClick = (priority) => {
    setDeletingPriority(priority)
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    if (!deletingPriority) return
    try {
      await annualPlanningService.deletePriority(deletingPriority._id || deletingPriority.id)
      setShowDeleteConfirm(false)
      setDeletingPriority(null)
      if (onDelete) {
        onDelete(deletingPriority)
      }
    } catch (error) {
      console.error('Failed to delete priority:', error)
    }
  }

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false)
    setDeletingPriority(null)
  }

  // Segmented Active/All control — sits above the list, right-aligned, so it
  // never competes with the section heading owned by the parent surface.
  const filterToggle = showFilterToggle && (
    <Box
      role='group'
      aria-label={t('annualPlanning.priority.filterLabel')}
      sx={{
        display: 'inline-flex',
        gap: 0.5,
        p: 0.5,
        borderRadius: 'xl',
        bgcolor: 'background.level1',
        alignSelf: 'flex-end'
      }}
    >
      {[
        { value: false, label: t('annualPlanning.priority.filterActive') },
        { value: true, label: t('annualPlanning.priority.filterAll', { count: priorities.length }) }
      ].map((option) => {
        const isSelected = showAll === option.value
        return (
          <Button
            key={String(option.value)}
            size='sm'
            variant='plain'
            color='neutral'
            aria-pressed={isSelected}
            onClick={() => setShowAll(option.value)}
            sx={{
              minHeight: 28,
              px: 1.5,
              borderRadius: 'xl',
              fontWeight: isSelected ? 600 : 500,
              color: isSelected ? 'text.primary' : 'text.secondary',
              bgcolor: isSelected ? 'background.surface' : 'transparent',
              boxShadow: isSelected ? 'sm' : 'none',
              '&:hover': { bgcolor: isSelected ? 'background.surface' : 'background.level2' },
              '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' }
            }}
          >
            {option.label}
          </Button>
        )
      })}
    </Box>
  )

  // True empty — the parent surface has no priorities at all.
  if (priorities.length === 0) {
    return (
      <Typography level='body-sm' textColor='text.tertiary' sx={{ fontStyle: 'italic' }}>
        {resolvedEmptyMessage}
      </Typography>
    )
  }

  // Filtered empty — priorities exist but every one of them is done or inactive.
  // Distinct copy from the true-empty case (§13.2) and points at the toggle.
  if (visiblePriorities.length === 0) {
    return (
      <Stack spacing={1} sx={{ alignItems: 'stretch' }}>
        {filterToggle}
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <FlagOutlinedIcon sx={{ fontSize: 48, color: 'text.tertiary', opacity: 0.5, mb: 2 }} />
          <Typography level='title-md' sx={{ mb: 0.5, color: 'text.secondary' }}>
            {t('annualPlanning.priority.noActivePriorities')}
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
            {t('annualPlanning.priority.activeEmptyBody')}
          </Typography>
          <Button
            size='sm'
            variant='soft'
            color='neutral'
            onClick={() => setShowAll(true)}
            sx={{ mt: 2, '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' } }}
          >
            {t('annualPlanning.priority.showAll', { count: priorities.length })}
          </Button>
        </Box>
      </Stack>
    )
  }

  return (
    <>
      <Stack spacing={1} sx={{ alignItems: 'stretch' }}>
        {filterToggle}
        {visiblePriorities.map((priority) => {
          const isCompleted = !!priority.is_completed
          const isInactive = !priority.is_active

          const rowContent = (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                py: 1.5,
                px: 1.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: 'transparent',
                opacity: isCompleted ? 0.6 : 1,
                transition: 'background-color 0.2s ease',
                '&:hover': {
                  bgcolor: 'background.level1',
                  opacity: 1
                },
                '&:last-child': {
                  borderBottom: 'none'
                }
              }}
            >
              {/* Flag / Check Icon */}
              {isCompleted ? (
                <Box
                  sx={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    bgcolor: 'success.softBg',
                    color: 'success.plainColor',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Box
                    component='svg'
                    width='10'
                    height='10'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='3.5'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  >
                    <polyline points='20 6 9 17 4 12' />
                  </Box>
                </Box>
              ) : (
                <Tooltip title={isInactive ? t('annualPlanning.priority.activate') : t('annualPlanning.priority.markInactive')} size='sm'>
                  <IconButton
                    size='sm'
                    variant='plain'
                    color='neutral'
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onToggleActive?.(priority)
                    }}
                    aria-label={isInactive ? t('annualPlanning.priority.activate') : t('annualPlanning.priority.markInactive')}
                    sx={{ minWidth: 44, minHeight: 44, borderRadius: 'sm', flexShrink: 0 }}
                  >
                    {isInactive ? (
                      <FlagOutlinedIcon sx={{ fontSize: 18, color: 'text.tertiary' }} />
                    ) : (
                      <FlagIcon sx={{ fontSize: 18, color: 'warning.plainColor' }} />
                    )}
                  </IconButton>
                </Tooltip>
              )}

              {/* Content */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  level='body-md'
                  fontWeight={600}
                  sx={{
                    textDecoration: isCompleted ? 'line-through' : 'none',
                    color: isCompleted ? 'text.tertiary' : 'text.primary'
                  }}
                >
                  {priority.title}
                </Typography>
                {priority.description && (
                  <Typography
                    level='body-sm'
                    textColor='text.tertiary'
                    sx={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      textDecoration: isCompleted ? 'line-through' : 'none'
                    }}
                  >
                    {priority.description}
                  </Typography>
                )}
              </Box>

              {/* Completed chip — visible on all breakpoints (UAT gap-01): on the
                  flat Overview/FocusArea lists this chip plus the icon shape are
                  the only state cues, and it was previously hidden on mobile. */}
              {isCompleted && (
                <Chip size='sm' variant='soft' color='success' sx={{ flexShrink: 0 }}>
                  {t('annualPlanning.priority.done')}
                </Chip>
              )}

              {/* Inactive chip — visible on all breakpoints, same rationale */}
              {isInactive && !isCompleted && (
                <Chip size='sm' variant='soft' color='neutral' sx={{ flexShrink: 0 }}>
                  {t('annualPlanning.priority.inactive')}
                </Chip>
              )}

              {/* Deadline Badge */}
              {priority.deadline && (
                <Box
                  sx={{
                    py: 0.5,
                    px: 1,
                    borderRadius: 'md',
                    bgcolor: isCompleted ? 'transparent' : 'background.level1',
                    border: 'none',
                    flexShrink: 0
                  }}
                >
                  <Typography
                    level='body-sm'
                    sx={{
                      fontWeight: 600,
                      color: isCompleted ? 'text.tertiary' : 'text.secondary',
                      textDecoration: isCompleted ? 'line-through' : 'none'
                    }}
                  >
                    {new Date(priority.deadline).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </Typography>
                </Box>
              )}

              {/* Edit Button */}
              {showEditButton && (
                <Tooltip title={t('annualPlanning.priority.edit')} size='sm'>
                  <IconButton
                    size='sm'
                    variant='plain'
                    color='neutral'
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (onEdit) {
                        onEdit(priority)
                      }
                    }}
                    sx={{
                      minWidth: 24,
                      width: 24,
                      height: 24,
                      borderRadius: 'sm',
                      flexShrink: 0,
                      opacity: isCompleted ? 0.3 : 0.6,
                      '&:hover': {
                        opacity: 1,
                        bgcolor: 'background.level2'
                      }
                    }}
                  >
                    <EditIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              )}

              {/* Delete Button */}
              {showDeleteButton && (
                <Tooltip title={t('annualPlanning.priority.delete')} size='sm'>
                  <IconButton
                    size='sm'
                    variant='plain'
                    color='danger'
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleDeleteClick(priority)
                    }}
                    sx={{
                      minWidth: 24,
                      width: 24,
                      height: 24,
                      borderRadius: 'sm',
                      flexShrink: 0,
                      opacity: isCompleted ? 0.3 : 0.6,
                      '&:hover': {
                        opacity: 1,
                        bgcolor: 'danger.softBg'
                      }
                    }}
                  >
                    <DeleteIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          )

          if (draggable && !isCompleted) {
            return (
              <SortablePriorityRow key={priority._id} priorityId={priority._id} isCompleted={isCompleted}>
                {rowContent}
              </SortablePriorityRow>
            )
          }
          return <Box key={priority._id}>{rowContent}</Box>
        })}
      </Stack>

      {/* Delete Confirmation Modal */}
      <Modal open={showDeleteConfirm} onClose={handleCancelDelete}>
        <ModalDialog
          variant='outlined'
          role='alertdialog'
          sx={{
            maxWidth: 450,
            borderColor: 'danger.outlinedBorder'
          }}
        >
          {/* Header - Icon + Title in Horizontal Row */}
          <Box
            sx={{
              px: { xs: 2.5, md: 3 },
              py: 2.5,
              borderBottom: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Stack direction='row' spacing={1.5} alignItems='center'>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  bgcolor: 'danger.softBg',
                  color: 'danger.plainColor',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <WarningIcon sx={{ fontSize: 22 }} />
              </Box>
              <Typography
                level='title-lg'
                sx={{
                  m: 0,
                  fontWeight: 700,
                  color: 'text.primary',
                  lineHeight: 1
                }}
              >
                {t('annualPlanning.priority.delete')}
              </Typography>
            </Stack>
          </Box>
          <DialogContent>
            <Stack spacing={2}>
              <Typography level='body-md'>
                <Trans
                  i18nKey='annualPlanning.priority.deleteConfirmMessage'
                  values={{ title: deletingPriority?.title }}
                  components={{ bold: <strong /> }}
                />
              </Typography>

              {deletingPriority?.linked_entity_id && (
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 'sm',
                    bgcolor: 'warning.softBg',
                    border: '1px solid',
                    borderColor: 'warning.outlinedBorder'
                  }}
                >
                  <Typography level='body-sm' sx={{ fontWeight: 600, mb: 0.5 }}>
                    {t('annualPlanning.priority.linkedToEntity', { entityType: entityTypeCapitalized })}
                  </Typography>
                  <Typography level='body-sm'>{t('annualPlanning.priority.linkedEntityRemains', { entityType })}</Typography>
                </Box>
              )}
            </Stack>
          </DialogContent>
          <Box
            sx={{
              px: 3,
              py: 2.5,
              borderTop: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.surface'
            }}
          >
            <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={2} justifyContent='flex-end'>
              <Button
                variant='outlined'
                color='neutral'
                onClick={handleCancelDelete}
                size='lg'
                sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 100 } }}
              >
                {t('annualPlanning.priorityDialog.cancel')}
              </Button>
              <Button
                variant='solid'
                color='danger'
                onClick={handleConfirmDelete}
                size='lg'
                sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 100 } }}
              >
                {t('annualPlanning.priority.delete')}
              </Button>
            </Stack>
          </Box>
        </ModalDialog>
      </Modal>
    </>
  )
}

export default PriorityList

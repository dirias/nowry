import React, { useState } from 'react'
import { Box, Typography, Stack, IconButton, Tooltip, Button, Modal, ModalDialog, DialogTitle, DialogContent } from '@mui/joy'
import { Edit as EditIcon, Delete as DeleteIcon, Flag as FlagIcon, Warning as WarningIcon } from '@mui/icons-material'
import { annualPlanningService } from '../../api/services'

/**
 * PriorityList Component
 * Reusable component for displaying and managing priorities
 * Ensures consistent UI/UX across Annual Planning and Focus Area views
 *
 * Following DESIGN_GUIDELINES.md:
 * - Minimalistic design
 * - Consistent spacing and colors
 * - Clear visual hierarchy
 */
const PriorityList = ({
  priorities = [],
  onEdit,
  onDelete,
  showEditButton = true,
  showDeleteButton = true,
  emptyMessage = 'No priorities yet.'
}) => {
  const [deletingPriority, setDeletingPriority] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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

  if (priorities.length === 0) {
    return (
      <Typography level='body-sm' textColor='text.tertiary' sx={{ fontStyle: 'italic' }}>
        {emptyMessage}
      </Typography>
    )
  }

  return (
    <>
      <Stack spacing={1}>
        {priorities.map((priority) => (
          <Box
            key={priority._id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              py: 1,
              px: 1.5,
              borderRadius: 'sm',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.surface',
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: 'warning.outlinedBorder',
                bgcolor: 'background.level1'
              }
            }}
          >
            {/* Flag Icon */}
            <FlagIcon sx={{ fontSize: 18, color: 'warning.plainColor', flexShrink: 0 }} />

            {/* Content */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography level='body-sm' fontWeight={600} sx={{ fontSize: { xs: '0.875rem', md: '0.9375rem' } }}>
                {priority.title}
              </Typography>
              {priority.description && (
                <Typography
                  level='body-xs'
                  textColor='text.tertiary'
                  sx={{
                    fontSize: { xs: '0.7rem', md: '0.75rem' },
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {priority.description}
                </Typography>
              )}
            </Box>

            {/* Deadline Badge */}
            {priority.deadline && (
              <Box
                sx={{
                  py: 0.5,
                  px: 1,
                  borderRadius: 'sm',
                  bgcolor: 'background.level2',
                  flexShrink: 0
                }}
              >
                <Typography level='body-xs' sx={{ fontSize: '0.7rem', fontWeight: 600 }}>
                  {new Date(priority.deadline).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric'
                  })}
                </Typography>
              </Box>
            )}

            {/* Edit Button */}
            {showEditButton && (
              <Tooltip title='Edit priority' size='sm'>
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
                    opacity: 0.6,
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
              <Tooltip title='Delete priority' size='sm'>
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
                    opacity: 0.6,
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
        ))}
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
                  color: 'danger.solidBg',
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
                  fontSize: '1.125rem',
                  color: 'text.primary',
                  lineHeight: 1
                }}
              >
                Delete Priority
              </Typography>
            </Stack>
          </Box>
          <DialogContent>
            <Stack spacing={2}>
              <Typography level='body-md'>
                Are you sure you want to delete &quot;<strong>{deletingPriority?.title}</strong>&quot;?
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
                    This priority is linked to a{' '}
                    {deletingPriority.linked_entity_type === 'goal'
                      ? 'Goal'
                      : deletingPriority.linked_entity_type === 'task'
                        ? 'Task'
                        : 'Routine'}
                  </Typography>
                  <Typography level='body-sm'>
                    The priority will be permanently deleted, but the linked{' '}
                    {deletingPriority.linked_entity_type === 'goal'
                      ? 'goal'
                      : deletingPriority.linked_entity_type === 'task'
                        ? 'task'
                        : 'routine'}{' '}
                    will remain unchanged and accessible from its original location.
                  </Typography>
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
                fullWidth={{ xs: true, sm: false }}
                sx={{ minWidth: { sm: 100 } }}
              >
                Cancel
              </Button>
              <Button
                variant='solid'
                color='danger'
                onClick={handleConfirmDelete}
                size='lg'
                fullWidth={{ xs: true, sm: false }}
                sx={{ minWidth: { sm: 100 } }}
              >
                Delete Priority
              </Button>
            </Stack>
          </Box>
        </ModalDialog>
      </Modal>
    </>
  )
}

export default PriorityList

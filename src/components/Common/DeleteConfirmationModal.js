import React from 'react'
import { Modal, ModalDialog, ModalClose, Typography, Box, Button, Stack, Divider, List, ListItem, ListItemDecorator, Alert } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import WarningRoundedIcon from '@mui/icons-material/WarningRounded'
import DeleteForeverRoundedIcon from '@mui/icons-material/DeleteForeverRounded'
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded'

/**
 * Reusable Delete Confirmation Modal
 *
 * Shows clear consequences of deletion with visual hierarchy
 *
 * @param {boolean} open - Modal open state
 * @param {function} onClose - Close handler
 * @param {function} onConfirm - Confirm deletion handler
 * @param {string} title - Modal title (translation key or text)
 * @param {string} description - Warning description (translation key or text)
 * @param {array} consequences - Array of consequence objects: [{ text: string, icon: ReactNode }]
 * @param {string} confirmText - Confirm button text (translation key or text)
 * @param {boolean} loading - Loading state for confirm button
 * @param {string} variant - 'danger' | 'warning' (default: 'danger')
 */
const DeleteConfirmationModal = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  consequences = [],
  confirmText,
  loading = false,
  variant = 'danger'
}) => {
  const { t } = useTranslation()

  const isDanger = variant === 'danger'

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        variant='outlined'
        role='alertdialog'
        sx={{
          maxWidth: 500,
          borderRadius: 'md',
          p: 3,
          boxShadow: 'lg'
        }}
      >
        <ModalClose />

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 'md',
              bgcolor: isDanger ? 'danger.softBg' : 'warning.softBg',
              color: isDanger ? 'danger.solidColor' : 'warning.solidColor',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isDanger ? <DeleteForeverRoundedIcon sx={{ fontSize: 28 }} /> : <WarningRoundedIcon sx={{ fontSize: 28 }} />}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography level='h4' sx={{ mb: 0.5 }}>
              {title}
            </Typography>
            <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
              {description}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Consequences List */}
        {consequences.length > 0 && (
          <>
            <Alert variant='soft' color={isDanger ? 'danger' : 'warning'} sx={{ mb: 2 }}>
              <Box>
                <Typography level='title-sm' sx={{ mb: 1 }}>
                  {t('common.deleteModal.whatWillHappen')}
                </Typography>
                <List
                  size='sm'
                  sx={{
                    '--ListItem-paddingY': '0.25rem',
                    '--ListItem-paddingX': '0'
                  }}
                >
                  {consequences.map((consequence, index) => (
                    <ListItem key={index}>
                      <ListItemDecorator sx={{ minInlineSize: 28 }}>
                        {consequence.icon || <CheckCircleOutlineRoundedIcon fontSize='small' />}
                      </ListItemDecorator>
                      <Typography level='body-sm'>{consequence.text}</Typography>
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Alert>

            {/* Recovery Notice */}
            {isDanger && (
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 'sm',
                  bgcolor: 'neutral.softBg',
                  mb: 2
                }}
              >
                <Typography level='body-xs' sx={{ color: 'text.secondary', textAlign: 'center' }}>
                  {t('common.deleteModal.recoveryNotice')}
                </Typography>
              </Box>
            )}
          </>
        )}

        {/* Actions */}
        <Stack direction='row' spacing={1.5} sx={{ mt: 2 }}>
          <Button variant='outlined' color='neutral' onClick={onClose} disabled={loading} fullWidth size='lg'>
            {t('common.cancel')}
          </Button>
          <Button
            variant='solid'
            color={isDanger ? 'danger' : 'warning'}
            onClick={onConfirm}
            loading={loading}
            fullWidth
            size='lg'
            startDecorator={!loading && <DeleteForeverRoundedIcon />}
          >
            {confirmText || t('common.delete')}
          </Button>
        </Stack>
      </ModalDialog>
    </Modal>
  )
}

export default DeleteConfirmationModal

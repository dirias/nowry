import React from 'react'
import { Modal, ModalDialog, DialogTitle, DialogContent, Typography, Stack, Button, Box } from '@mui/joy'
import WarningIcon from '@mui/icons-material/Warning'

const WarningWindow = ({ title, error_msg, onClose, onConfirm }) => {
  return (
    <Modal open={true} onClose={onClose}>
      <ModalDialog
        variant='outlined'
        sx={{
          width: { xs: '90%', sm: 440 },
          maxWidth: 440,
          borderRadius: 'xl',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          p: 0,
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        {/* Header - Icon + Title in Row */}
        <Box
          sx={{
            px: 3,
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
              {title}
            </Typography>
          </Stack>
        </Box>

        {/* Content - Minimal & Clear */}
        <DialogContent sx={{ px: 3, py: 3 }}>
          <Typography level='body-md' sx={{ mb: 1.5, color: 'text.primary', lineHeight: 1.6 }}>
            {error_msg}
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.tertiary', fontStyle: 'italic' }}>
            This action cannot be undone
          </Typography>
        </DialogContent>

        {/* Footer - Clean Actions */}
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
              onClick={onClose}
              size='lg'
              fullWidth={{ xs: true, sm: false }}
              sx={{ minWidth: { sm: 100 } }}
            >
              Cancel
            </Button>
            <Button
              variant='solid'
              color='danger'
              onClick={onConfirm}
              size='lg'
              fullWidth={{ xs: true, sm: false }}
              sx={{ minWidth: { sm: 100 } }}
            >
              Delete
            </Button>
          </Stack>
        </Box>
      </ModalDialog>
    </Modal>
  )
}

export default WarningWindow

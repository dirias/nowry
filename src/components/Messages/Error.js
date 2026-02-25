import React from 'react'
import { Modal, ModalDialog, DialogContent, Typography, Stack, Button, Box } from '@mui/joy'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'

const ErrorWindow = ({ title, error_msg, onClose }) => {
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
                bgcolor: 'warning.softBg',
                color: 'warning.solidBg',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <ErrorOutlineIcon sx={{ fontSize: 22 }} />
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

        {/* Content */}
        <DialogContent sx={{ px: 3, py: 3 }}>
          <Typography level='body-md' sx={{ color: 'text.primary', lineHeight: 1.6 }}>
            {error_msg}
          </Typography>
        </DialogContent>

        {/* Footer */}
        <Box
          sx={{
            px: 3,
            py: 2.5,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.surface',
            display: 'flex',
            justifyContent: 'flex-end'
          }}
        >
          <Button variant='solid' color='primary' onClick={onClose} size='lg' sx={{ minWidth: 100 }}>
            OK
          </Button>
        </Box>
      </ModalDialog>
    </Modal>
  )
}

export default ErrorWindow

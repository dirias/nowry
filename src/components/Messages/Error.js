import React from 'react'
import { Modal, ModalDialog, DialogContent, Typography, Stack, Button, Box } from '@mui/joy'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import { useTranslation } from 'react-i18next'

/**
 * The window a failure is said in.
 *
 * It interrupts, so it is an `alertdialog`: a screen reader announces its title
 * and its message when it opens, focus lands on its one key, and when it closes
 * focus goes back to `returnFocusRef` — the control the reader was using — when
 * the element that had it is gone, as the import sheet is by then (IMPORT-051).
 */
const ErrorWindow = ({ title, error_msg, onClose, returnFocusRef }) => {
  const { t } = useTranslation()
  const titleId = React.useId()
  const messageId = React.useId()
  const close = (...args) => {
    onClose?.(...args)
    // After the modal has let go of focus, or its own restore would win.
    if (returnFocusRef?.current) setTimeout(() => returnFocusRef.current?.focus(), 0)
  }
  return (
    <Modal open={true} onClose={close}>
      <ModalDialog
        role='alertdialog'
        aria-labelledby={titleId}
        aria-describedby={messageId}
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
                color: 'warning.softColor',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <ErrorOutlineIcon sx={{ fontSize: 22 }} />
            </Box>
            <Typography
              id={titleId}
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
          <Typography id={messageId} level='body-md' sx={{ color: 'text.primary', lineHeight: 1.6 }}>
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
          <Button autoFocus variant='solid' color='primary' onClick={close} size='lg' sx={{ minWidth: 100 }}>
            {t('common.close')}
          </Button>
        </Box>
      </ModalDialog>
    </Modal>
  )
}

export default ErrorWindow

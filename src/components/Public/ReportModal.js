import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Modal,
  ModalDialog,
  ModalClose,
  Typography,
  Stack,
  FormControl,
  FormLabel,
  Select,
  Option,
  Textarea,
  Button,
  Box,
  Divider
} from '@mui/joy'

const REPORT_REASONS = ['copyright', 'inappropriate', 'spam', 'misinformation', 'other']

const ReportModal = ({ open, onClose, onSubmit, contentType = 'book', contentTitle }) => {
  const { t } = useTranslation()

  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    if (!reason) {
      setError(t('public.reportModal.reason') + ' is required')
      return
    }

    onSubmit({ reason, description })

    // Reset form
    setReason('')
    setDescription('')
    setError('')
  }

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        sx={{
          maxWidth: { xs: '90vw', sm: 500 }
        }}
      >
        <ModalClose />

        <Typography level='h4' sx={{ mb: 1 }}>
          {t('public.reportModal.title')}
        </Typography>

        <Typography level='body-sm' sx={{ mb: 2, color: 'text.secondary' }}>
          {t('public.reportModal.description')}
        </Typography>

        {contentTitle && (
          <Box
            sx={{
              p: 1.5,
              bgcolor: 'background.level1',
              borderRadius: 'sm',
              mb: 2
            }}
          >
            <Typography level='body-xs' sx={{ color: 'text.tertiary', mb: 0.5 }}>
              Reporting:
            </Typography>
            <Typography level='body-sm' sx={{ fontWeight: 600 }}>
              {contentTitle}
            </Typography>
          </Box>
        )}

        <Stack spacing={2}>
          {/* Reason */}
          <FormControl error={!!error}>
            <FormLabel required>{t('public.reportModal.reason')}</FormLabel>
            <Select
              value={reason}
              onChange={(e, value) => {
                setReason(value)
                setError('')
              }}
              placeholder={t('common.select')}
            >
              {REPORT_REASONS.map((r) => (
                <Option key={r} value={r}>
                  {t(`public.reportReasons.${r}`)}
                </Option>
              ))}
            </Select>
            {error && (
              <Typography level='body-xs' sx={{ color: 'danger.solidBg', mt: 0.5 }}>
                {error}
              </Typography>
            )}
          </FormControl>

          {/* Description */}
          <FormControl>
            <FormLabel>{t('public.reportModal.details')}</FormLabel>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('reports.modal.contextPlaceholder')}
              minRows={3}
              maxRows={6}
            />
          </FormControl>

          <Divider sx={{ my: 1 }} />

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button variant='plain' onClick={onClose} size='sm'>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSubmit} size='sm' color='danger'>
              {t('public.reportModal.submit')}
            </Button>
          </Box>
        </Stack>
      </ModalDialog>
    </Modal>
  )
}

export default ReportModal

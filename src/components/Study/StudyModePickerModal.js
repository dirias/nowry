import React from 'react'
import { Modal, ModalDialog, ModalClose, DialogTitle, Stack, Typography, Button } from '@mui/joy'
import { useTranslation } from 'react-i18next'

export default function StudyModePickerModal({ open, onClose, deck, onSelectMode }) {
  const { t } = useTranslation()
  const studyDisabled = deck.due_cards === 0 && deck.new_cards === 0

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        sx={{
          width: { xs: '90%', sm: '80%', md: '520px' },
          maxWidth: '520px',
          borderRadius: { xs: 'lg', md: 'xl' }
        }}
      >
        <ModalClose aria-label={t('common.close')} />
        <DialogTitle level='title-lg'>{t('study.modePicker.title')}</DialogTitle>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <Button size='lg' variant='solid' color='primary' fullWidth disabled={studyDisabled} onClick={() => onSelectMode('study')}>
            {t('study.modePicker.study.label')}
          </Button>
          {studyDisabled && (
            <Typography level='body-xs' sx={{ color: 'text.tertiary', textAlign: 'center', mt: -1 }}>
              {t('study.modePicker.study.disabledHint')}
            </Typography>
          )}
          <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
            {t('study.modePicker.study.description')}
          </Typography>

          <Button
            size='md'
            variant='outlined'
            color='neutral'
            fullWidth
            aria-label={t('study.modePicker.browse.label')}
            onClick={() => onSelectMode('browse')}
          >
            {t('study.modePicker.browse.label')}
          </Button>
          <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
            {t('study.modePicker.browse.description')}
          </Typography>
        </Stack>
      </ModalDialog>
    </Modal>
  )
}

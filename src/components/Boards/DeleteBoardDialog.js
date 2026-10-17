import React from 'react'
import { useTranslation } from 'react-i18next'
import DeleteForeverRounded from '@mui/icons-material/DeleteForeverRounded'
import StyleRounded from '@mui/icons-material/StyleRounded'
import DeleteConfirmationModal from '../Common/DeleteConfirmationModal'

/** Deleting a board, confirmed: what goes with it, and that its cards stay. */
export default function DeleteBoardDialog({ name, open, onClose, onConfirm, loading = false }) {
  const { t } = useTranslation()
  return (
    <DeleteConfirmationModal
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      loading={loading}
      title={t('boards.delete.title')}
      description={t('boards.delete.description', { name: name || t('boards.untitled') })}
      consequences={[
        { text: t('boards.delete.consequenceContent'), icon: <DeleteForeverRounded /> },
        { text: t('boards.delete.consequenceCards'), icon: <StyleRounded /> }
      ]}
      confirmText={t('boards.delete.confirm')}
    />
  )
}

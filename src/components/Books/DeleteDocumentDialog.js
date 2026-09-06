import React from 'react'
import { useTranslation } from 'react-i18next'
import StyleRoundedIcon from '@mui/icons-material/StyleRounded'
import DeleteConfirmationModal from '../Common/DeleteConfirmationModal'

/**
 * Deleting a document (docs/prd-books-library.md D11; prd-book-cards.md D12):
 * the confirmation says what goes — the document and its sections — and what
 * stays — its cards, with their review history. Cards outlive their document.
 */
export default function DeleteDocumentDialog({ book, open, onClose, onConfirm, loading = false }) {
  const { t } = useTranslation()
  if (!book) return null
  const goes = book.section_count ? t('books.lib.deleteGoes', { count: book.section_count }) : t('books.lib.deleteGoesPlain')
  const consequences =
    book.cards > 0
      ? [
          {
            text: `${t('books.deleteKeepsCards', { count: book.cards })} ${t('books.lib.deleteKeepsHistory')}`,
            icon: <StyleRoundedIcon fontSize='small' />
          }
        ]
      : []
  return (
    <DeleteConfirmationModal
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      title={t('books.lib.deleteTitle', { title: book.title })}
      description={goes}
      consequences={consequences}
      confirmText={t('books.lib.deleteConfirm')}
      loading={loading}
    />
  )
}

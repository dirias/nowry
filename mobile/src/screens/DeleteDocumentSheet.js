/**
 * Deleting a document, on a phone (MOB-102).
 *
 * The web's `DeleteDocumentDialog`, in its words and in its order: what GOES —
 * the document, and its sections when it has any — and what STAYS — its cards,
 * with their review history (docs/prd-books-library.md D11,
 * prd-book-cards.md D12). "Ask what happens to children when a parent is
 * deleted" is a standing rule on this project, and a confirmation that only
 * said "Delete?" would be answering it with silence.
 *
 * **A 404 is a success.** The document is already gone — deleted on the web a
 * moment ago, or by this very request succeeding before a retry — and the
 * person asked for it to be gone. The web treats it the same way. Anything else
 * keeps the sheet open with a line saying so.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { booksService } from '@nowry/core/api/services'
import { isOfflineError } from '@nowry/core/utils/formUtils'
import { BottomSheet, Button, Stack, Typography } from '../ui'

export function DeleteDocumentSheet({ book, open, onDeleted, onClose }) {
  const { t } = useTranslation()
  const [deleting, setDeleting] = useState(false)
  const [failure, setFailure] = useState(null)

  if (!book) return null

  const title = book.title || t('books.untitled')
  const goes = book.section_count ? t('books.lib.deleteGoes', { count: book.section_count }) : t('books.lib.deleteGoesPlain')
  const cards = book.cards ?? 0

  const confirm = async () => {
    if (deleting) return
    setDeleting(true)
    setFailure(null)
    try {
      await booksService.delete(book._id ?? book.id)
      onDeleted?.(book)
    } catch (error) {
      if (error?.response?.status === 404) {
        onDeleted?.(book)
      } else {
        setFailure(isOfflineError(error) ? t('errors.offline') : t('books.lib.deleteError'))
      }
    } finally {
      setDeleting(false)
    }
  }

  const close = () => {
    if (deleting) return
    setFailure(null)
    onClose?.()
  }

  return (
    <BottomSheet visible={open} onClose={close} title={t('books.lib.deleteTitle', { title })}>
      <Stack spacing={2}>
        <Typography level='body-md' color='text.secondary'>
          {goes}
        </Typography>

        {/* What stays, and only when there is something that would. Cards
            outlive their document, and that is the fact most likely to be
            assumed the other way. */}
        {cards > 0 ? (
          <Typography level='body-md' color='text.secondary'>
            {`${t('books.deleteKeepsCards', { count: cards })} ${t('books.lib.deleteKeepsHistory')}`}
          </Typography>
        ) : null}

        {failure ? (
          <Typography level='body-sm' color='danger.plainColor' accessibilityLiveRegion='polite'>
            {failure}
          </Typography>
        ) : null}

        <Stack spacing={1}>
          <Button variant='danger' loading={deleting} onPress={confirm}>
            {t('books.lib.deleteConfirm')}
          </Button>
          <Button variant='tertiary' onPress={close} disabled={deleting}>
            {t('common.cancel')}
          </Button>
        </Stack>
      </Stack>
    </BottomSheet>
  )
}

export default DeleteDocumentSheet

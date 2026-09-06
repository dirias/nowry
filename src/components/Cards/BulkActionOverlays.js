import React from 'react'
import { Snackbar } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import DeleteConfirmationModal from '../Common/DeleteConfirmationModal'
import MoveToDeckSheet from './MoveToDeckSheet'

/**
 * The surfaces a bulk verb opens (PRD D16): the move sheet, the one delete
 * confirm, and the error Snackbar. Driven entirely by `useBulkCardActions`,
 * so the Cards view and an open group render the same three and own none of
 * their state. The sheet mounts only while it is asked for, so its deck
 * choice never outlives the ask.
 */
export default function BulkActionOverlays({ actions, decks = [] }) {
  const { t } = useTranslation()
  const moveCount = actions.moveIds?.length ?? 0
  const deleteCount = actions.deleteIds?.length ?? 0

  return (
    <>
      {actions.moveIds && (
        <MoveToDeckSheet
          open
          count={moveCount}
          decks={decks}
          pending={actions.pending}
          onClose={actions.cancelMove}
          onMove={actions.confirmMove}
        />
      )}
      {actions.deleteIds && (
        <DeleteConfirmationModal
          open
          onClose={actions.cancelDelete}
          onConfirm={actions.confirmDelete}
          loading={actions.pending}
          title={t('cards.select.deleteTitle', { count: deleteCount })}
          description={t('cards.select.deleteDescription', { count: deleteCount })}
          confirmText={t('cards.select.deleteConfirm', { count: deleteCount })}
        />
      )}
      <Snackbar
        open={Boolean(actions.error)}
        autoHideDuration={4000}
        onClose={actions.clearError}
        color='danger'
        variant='soft'
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {actions.error}
      </Snackbar>
    </>
  )
}

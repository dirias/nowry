import React from 'react'
import { Snackbar } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import DeleteConfirmationModal from '../Common/DeleteConfirmationModal'
import MergeTagSheet from './MergeTagSheet'

/**
 * The surfaces a tag verb opens (PRD D17): the merge sheet, the one remove
 * confirm — a warning, not a delete: the cards stay — and the error
 * Snackbar. Driven entirely by `useTagActions`, the way `BulkActionOverlays`
 * is driven by the bulk hook. The sheet mounts only while it is asked for,
 * so its pick and its search never outlive the ask.
 */
export default function TagActionOverlays({ actions, tag, count = 0, tags = [] }) {
  const { t } = useTranslation()
  return (
    <>
      {actions.mergeOpen && (
        <MergeTagSheet
          open
          tag={tag}
          count={count}
          tags={tags}
          initialTarget={actions.mergeTarget}
          pending={actions.pending}
          onClose={actions.cancelMerge}
          onMerge={actions.confirmMerge}
        />
      )}
      {actions.removeAsked && (
        <DeleteConfirmationModal
          open
          variant='warning'
          onClose={actions.cancelRemove}
          onConfirm={actions.confirmRemove}
          loading={actions.pending}
          title={t('groups.remove.title', { tag })}
          description={t('groups.remove.description', { count })}
          confirmText={t('groups.remove.confirm', { count })}
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

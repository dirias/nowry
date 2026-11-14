/**
 * What the phone's publish step says when the library refuses (MOB-103, ADR-037,
 * ADMIN-003): the refusal's own sentence — an imported file, or an item an
 * admin removed from Browse (FR-005) — offline, or the failure with its detail.
 */
import { publishBlockKey, publishBlockReason } from '@nowry/core/domain/publishListing'
import { describeApiError, isOfflineError } from '@nowry/core/utils/formUtils'

export function publishFailureText(t, error) {
  const blockReason = publishBlockReason(error)
  if (blockReason) return t(publishBlockKey(blockReason))
  if (isOfflineError(error)) return t('errors.offline')
  const detail = describeApiError(error)
  return detail ? `${t('books.publishFailed')} · ${detail}` : t('books.publishFailed')
}

import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cardsService } from '../api/services'
import { invalidateCardCaches } from '../api/cardCache'

/**
 * The one place a bulk verb runs (PRD D16, FR-010): `run(action, ids, extra)`
 * calls `cardsService.bulk`, then invalidates the cards, decks, groups, tags
 * and statistics together and reports done — the owner clears its selection
 * there. Move and Delete want a surface first, so the hook also holds which
 * ids are waiting on the move sheet or the delete confirm; the overlays read
 * that and the bar and the row kebab only ever ask.
 *
 * Errors land in `error` for the consumer's Snackbar; nothing here renders —
 * which is why it lives here rather than beside the web's components. The
 * phone runs the same four verbs against the same endpoint, and a second copy
 * would be a second answer to "what does Move do".
 */
export function useBulkCardActions({ onDone } = {}) {
  const { t } = useTranslation()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  const [moveIds, setMoveIds] = useState(null)
  /*
   * Tag wants a surface too. The web reaches its tag list through a menu that
   * is already open, so it never needed pending state; a phone has no menu to
   * hang it on, so the ask is held here beside the other two rather than in
   * one client's screen.
   */
  const [tagIds, setTagIds] = useState(null)
  const [deleteIds, setDeleteIds] = useState(null)

  const run = useCallback(
    async (action, ids, extra = {}) => {
      if (!ids || ids.length === 0) return false
      setPending(true)
      try {
        await cardsService.bulk({ ids, action, ...extra })
        await invalidateCardCaches()
        onDone?.(action, ids)
        return true
      } catch (err) {
        setError(err?.response?.data?.detail || t('cards.select.error'))
        return false
      } finally {
        setPending(false)
      }
    },
    [onDone, t]
  )

  const requestMove = useCallback((ids) => setMoveIds(ids), [])
  const cancelMove = useCallback(() => setMoveIds(null), [])
  const confirmMove = useCallback(
    async (deckId) => {
      const ok = await run('move', moveIds, { deckId })
      if (ok) setMoveIds(null)
    },
    [run, moveIds]
  )

  const requestTag = useCallback((ids) => setTagIds(ids), [])
  const cancelTag = useCallback(() => setTagIds(null), [])
  const confirmTag = useCallback(
    async (tag) => {
      const ok = await run('tag', tagIds, { tags: [tag] })
      if (ok) setTagIds(null)
    },
    [run, tagIds]
  )

  const requestDelete = useCallback((ids) => setDeleteIds(ids), [])
  const cancelDelete = useCallback(() => setDeleteIds(null), [])
  const confirmDelete = useCallback(async () => {
    const ok = await run('delete', deleteIds)
    if (ok) setDeleteIds(null)
  }, [run, deleteIds])

  const clearError = useCallback(() => setError(null), [])

  return {
    run,
    pending,
    error,
    clearError,
    moveIds,
    requestMove,
    cancelMove,
    confirmMove,
    tagIds,
    tagging: Boolean(tagIds && tagIds.length > 0),
    requestTag,
    cancelTag,
    confirmTag,
    deleteIds,
    requestDelete,
    cancelDelete,
    confirmDelete
  }
}

export default useBulkCardActions

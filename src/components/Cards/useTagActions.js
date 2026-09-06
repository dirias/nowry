import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cardsService } from '../../api/services'
import { invalidateCardCaches } from '../../api/cardCache'

// What a tag verb can change: the card list under any filter, the groups
// index and the tag menus. Deck counters and statistics are untouched.
const TAG_RESOURCES = ['cards', 'groups', 'tags']

/**
 * A tag's verbs on its open group (PRD D17, FR-011, ADR-023 point 3):
 * rename inline, merge into another tag, remove from every card.
 *
 * A merge is a rename onto an existing tag — one operation, one endpoint —
 * so `submitRename` routes a name that already exists through the merge
 * sheet instead of saving silently: the sheet says the number before it runs.
 * The hook holds which surface is asked for (`mergeOpen` with its preselected
 * `mergeTarget`, `removeAsked`) and reports done through `onRenamed(to)` /
 * `onRemoved()`, where the owner moves the URL. Errors land in `error` for
 * the consumer's Snackbar; nothing here renders.
 */
export function useTagActions({ tag, existingTags = [], onRenamed, onRemoved } = {}) {
  const { t } = useTranslation()
  const [renaming, setRenaming] = useState(false)
  const [mergeOpen, setMergeOpen] = useState(false)
  const [mergeTarget, setMergeTarget] = useState(null)
  const [removeAsked, setRemoveAsked] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)

  const exists = useCallback((name) => existingTags.some((row) => row.tag === name), [existingTags])

  const run = useCallback(
    async (call) => {
      setPending(true)
      try {
        await call()
        await invalidateCardCaches(TAG_RESOURCES)
        return true
      } catch (err) {
        setError(err?.response?.data?.detail || t('groups.tagError'))
        return false
      } finally {
        setPending(false)
      }
    },
    [t]
  )

  const renameTo = useCallback(
    async (to) => {
      const ok = await run(() => cardsService.renameTag(tag, to))
      if (ok) onRenamed?.(to)
      return ok
    },
    [run, tag, onRenamed]
  )

  const startRename = useCallback(() => setRenaming(true), [])
  const cancelRename = useCallback(() => setRenaming(false), [])
  const submitRename = useCallback(
    async (raw) => {
      const to = (raw || '').trim()
      setRenaming(false)
      if (!to || to === tag) return
      if (exists(to)) {
        setMergeTarget(to)
        setMergeOpen(true)
        return
      }
      await renameTo(to)
    },
    [tag, exists, renameTo]
  )

  const requestMerge = useCallback(() => {
    setMergeTarget(null)
    setMergeOpen(true)
  }, [])
  const cancelMerge = useCallback(() => setMergeOpen(false), [])
  const confirmMerge = useCallback(
    async (target) => {
      const ok = await renameTo(target)
      if (ok) setMergeOpen(false)
    },
    [renameTo]
  )

  const requestRemove = useCallback(() => setRemoveAsked(true), [])
  const cancelRemove = useCallback(() => setRemoveAsked(false), [])
  const confirmRemove = useCallback(async () => {
    const ok = await run(() => cardsService.removeTag(tag))
    if (ok) {
      setRemoveAsked(false)
      onRemoved?.()
    }
  }, [run, tag, onRemoved])

  const clearError = useCallback(() => setError(null), [])

  return {
    renaming,
    startRename,
    cancelRename,
    submitRename,
    mergeOpen,
    mergeTarget,
    requestMerge,
    cancelMerge,
    confirmMerge,
    removeAsked,
    requestRemove,
    cancelRemove,
    confirmRemove,
    pending,
    error,
    clearError
  }
}

export default useTagActions

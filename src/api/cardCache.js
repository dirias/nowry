import { queryClient } from './queryClient'

/**
 * Apply `changes` to one card everywhere it is cached, without a refetch.
 *
 * Lives here because the shape being patched is this hook's shape: an infinite
 * query whose data is `{ pages: [{ cards: [...] }] }`. A caller that had to
 * know that would be reaching through the hook rather than using it.
 *
 * `setQueriesData` with the partial key hits every tag/search/marked variant at
 * once, which is what a mutation needs — a card edited under one filter is the
 * same card under the others, and React Query re-renders every subscriber.
 *
 * This is what a component with no write access to its own list should use.
 * Before it existed, `ManageContent` kept a private id-keyed overlay of pending
 * changes and merged it during render (DEBT-005) — a second source of truth for
 * one field, which every future per-card mutation would have had to duplicate.
 *
 * No "did anything actually change?" bookkeeping: React Query applies
 * structural sharing to whatever an updater returns, so a new-but-deeply-equal
 * object is collapsed back to the original reference and subscribers are not
 * notified. An explicit guard here was tried and removed — it could not be made
 * to fail a test, because the library already provides the guarantee.
 *
 * @param {string} cardId
 * @param {object} changes - Partial card fields to merge, e.g. `{ marked_at }`
 */
export function patchCardInCache(cardId, changes) {
  queryClient.setQueriesData({ queryKey: ['cards'] }, (data) => {
    if (!data?.pages) return data

    return {
      ...data,
      pages: data.pages.map((page) =>
        page?.cards?.some((card) => (card._id || card.id) === cardId)
          ? {
              ...page,
              cards: page.cards.map((card) => ((card._id || card.id) === cardId ? { ...card, ...changes } : card))
            }
          : page
      )
    }
  })
}

/**
 * A card's mark, toggled optimistically, for both clients.
 *
 * The mark is the INTENT axis, not the difficulty one: it records that the user
 * wants to come back to this card, which is the only thing SM-2 cannot infer
 * for itself. It never grades, never moves `next_review`, and the scheduler
 * never reads it (ADR-010).
 *
 * Three behaviours travel together and all three are easy to lose in a second
 * copy, which is why this is here rather than inside a component:
 *
 *   - **Optimistic, with rollback.** The request is small and the affordance
 *     has to feel instant, so the state flips first and flips back on failure.
 *     The toast is left to the API client's interceptor, which already reports
 *     failures globally.
 *   - **It follows the CARD, not the mount.** A session swaps a different card
 *     in underneath the same control, so the server's answer has to win
 *     whenever either the identity or the stored value changes — otherwise
 *     stepping back to an already-marked card shows it empty.
 *   - **A request in flight blocks the next one**, so a double tap cannot leave
 *     the mark disagreeing with the server.
 *
 * No JSX and no browser globals (ADR-031, ADR-026): each client draws its own
 * control. The web's is a bookmark glyph or a labelled key; the phone's is the
 * labelled key, because the session header there has room for exactly one.
 */
import { useCallback, useEffect, useState } from 'react'
import { cardsService } from '../api/services'

/**
 * @param {object} card - the card, as the API sends it (`marked_at` is the mark)
 * @param {(cardId: string, markedAt: string|null) => void} [onMarkChange]
 * @returns {{ cardId: string|null, marked: boolean, pending: boolean, toggle: () => Promise<void> }}
 */
export const useCardMark = (card, onMarkChange) => {
  const cardId = card?._id || card?.id || null
  const serverMarked = Boolean(card?.marked_at)

  const [marked, setMarked] = useState(serverMarked)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    setMarked(serverMarked)
  }, [cardId, serverMarked])

  const toggle = useCallback(async () => {
    if (!cardId || pending) return

    const next = !marked
    setMarked(next)
    setPending(true)

    try {
      const updated = next ? await cardsService.mark(cardId) : await cardsService.unmark(cardId)
      onMarkChange?.(cardId, updated?.marked_at ?? null)
    } catch {
      setMarked(!next)
    } finally {
      setPending(false)
    }
  }, [cardId, marked, pending, onMarkChange])

  return { cardId, marked, pending, toggle }
}

export default useCardMark

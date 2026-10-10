/**
 * Resting and waking one card, with the optimism the mark has (SR-003).
 *
 * The card's own hold only: a tag's or a deck's hold on the same card is not
 * this hook's to lift, and the reader says so through `sources`. After a
 * write every cache that counts cards is invalidated — the session queue, the
 * decks, the groups, the forecast — because rest is membership and membership
 * is what those count.
 */
import { useCallback, useEffect, useState } from 'react'
import { cardsService } from '../api/services'
import { CARD_WRITE_RESOURCES, invalidateCardCaches } from '../api/cardCache'
import { cardRest } from '../domain/cardRest'

export const REST_WRITE_RESOURCES = [...CARD_WRITE_RESOURCES, 'forecast']

export const useCardRest = (card, onRestChange) => {
  const cardId = card?._id || card?.id || null
  const server = cardRest(card)

  const [resting, setResting] = useState(server.resting)
  const [until, setUntil] = useState(server.until)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    setResting(server.resting)
    setUntil(server.until)
    // The server's word changes when the card does, not on every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId, card?.rest_until])

  const write = useCallback(
    async (next, untilDate) => {
      if (!cardId || pending) return null
      const before = { resting, until }
      setResting(next)
      setUntil(next ? (untilDate ?? null) : null)
      setPending(true)
      try {
        const updated = next ? await cardsService.rest(cardId, untilDate) : await cardsService.wake(cardId)
        await invalidateCardCaches(REST_WRITE_RESOURCES)
        onRestChange?.(cardId, updated)
        return updated
      } catch (error) {
        setResting(before.resting)
        setUntil(before.until)
        throw error
      } finally {
        setPending(false)
      }
    },
    [cardId, pending, resting, until, onRestChange]
  )

  const rest = useCallback((untilDate = null) => write(true, untilDate), [write])
  const wake = useCallback(() => write(false), [write])

  return { cardId, resting, until, indefinite: resting && !until, pending, sources: server.sources, rest, wake }
}

export default useCardRest

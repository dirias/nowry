/**
 * What the outbox knows how to send (MOB-026).
 *
 * `syncQueue` stores entries and orders them; this names the two kinds the
 * study loop produces and how each one reaches the server. Kept apart so the
 * queue has no opinion about the API and the API has none about storage.
 */
import { cardsService, studySessionsService } from '@nowry/core/api/services'
import { drain, enqueue } from './syncQueue'

export const OUTBOX = {
  // `attempt` is the row behind the grade (ADR-059); an entry queued before it
  // existed has none, and the server records what it knows.
  review: ({ cardId, grade, mode, attempt = null }) => cardsService.review(cardId, grade, mode, attempt),
  // `startedAt` survives JSON as a string, which `log` already accepts.
  session: (payload) => studySessionsService.log(payload)
}

export const queueReview = (cardId, grade, mode = 'study', attempt = null) => enqueue('review', { cardId, grade, mode, attempt })

export const queueSession = (payload) => enqueue('session', payload)

export const flushOutbox = () => drain(OUTBOX)

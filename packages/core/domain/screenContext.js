/**
 * What the user is looking at, as the companion is told it (MOB-086).
 *
 * This is the payload `POST /agent/chat` takes as `context`, and it is the one
 * place its shape is decided. It exists because the shape has already been
 * wrong once in a way nothing caught: the web built it in camelCase, the server
 * declared it in snake_case with no alias, and Pydantic dropped every
 * study-session field on arrival. The prompt then said "the user is studying a
 * card in a study deck" — no deck, no position, no side — so the chat history
 * was the only thing identifying which card, which is exactly why correcting
 * the companion worked (PEND-003, fixed in PET-017).
 *
 * **The wire is camelCase.** The server's model now carries an alias generator,
 * so both spellings are accepted; this builder emits the one the web has always
 * sent, and both clients emit it from here rather than each building their own.
 *
 * **The answer is withheld while the question is showing.** The server strips
 * it too — that guard is the second half of the same bug — but a client that
 * sends it is asking the model to keep a secret, which is not a thing a model
 * can be relied on to do.
 */
import { backText, frontText } from './cardSpeech'

/** The deck's id, from either shape the card carries it in. */
const deckIdOf = (card, deckId) => {
  if (deckId && deckId !== 'daily-review') return deckId
  const own = card?.deck_id
  return (typeof own === 'object' ? (own?._id ?? own?.id) : own) ?? null
}

/** And its name, which only the populated shape has. */
const deckNameOf = (card) => {
  const own = card?.deck_id
  return (typeof own === 'object' ? (own?.name ?? own?.title) : null) ?? null
}

/**
 * The context for a card in a study session.
 *
 * @param {object} card
 * @param {{deckId?: string, index?: number, total?: number, flipped?: boolean, mode?: string}} where
 *   `index` is ZERO-based, as a list is; the payload's `cardIndex` is
 *   one-based, as a person counts. The web's own builder adds the one and a
 *   phone that forgot would tell the model "card 0 of 25".
 */
export function studyCardContext(card, { deckId = null, index = 0, total = 0, flipped = false, mode = 'study' } = {}) {
  if (!card) return null

  const dailyReview = deckId === 'daily-review'

  return {
    page: 'study_session',
    deckId: deckIdOf(card, deckId),
    deckName: deckNameOf(card),
    cardIndex: index + 1,
    totalCards: total,
    cardType: card.card_type || 'basic',
    isFlipped: Boolean(flipped),
    front: frontText(card),
    // Withheld until the card is turned.
    back: flipped ? backText(card) : null,
    isDailyReview: dailyReview,
    mode
  }
}

export default studyCardContext

/**
 * The leech, offered a way out (SR-004, `docs/prd-rest.md` D6, FR-008).
 *
 * SM-2 has no leech rule: a card that is missed goes to interval 1 and comes
 * back tomorrow, and nothing counts how many tomorrows that has been. The
 * fourth Again inside the Struggling window is where this stops being a hard
 * card and starts being a card the learner is stuck on. The session then
 * OFFERS three exits — rest it a week, ask the companion to re-explain it,
 * split it — and forces none; grading continues if the offer is ignored.
 *
 * The count is the card's own `lapses` (the API records one per Again, see
 * `review_card`) inside the window, plus the Agains of this session, which
 * the server has not yet been told about or which the served card predates.
 * Read here and nowhere else: the mobile `apiFields` rule forbids a screen
 * spelling an API field, and two clients counting differently would offer on
 * different presses.
 */
import { untilFromPreset } from './cardRest'

/** The Again that makes a card a leech. The fourth, within the window. */
export const LEECH_THRESHOLD = 4

/** The Struggling window the API uses (`STRUGGLING_WINDOW_DAYS`). */
export const STRUGGLING_WINDOW_DAYS = 14

const DAY_MS = 86400000

const asTime = (value) => {
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime()
  return Number.isNaN(time) ? null : time
}

/**
 * How many Agains the card has recorded inside the Struggling window.
 *
 * @param {{ lapses?: Array<string | Date> } | null} card
 * @param {Date} [now]
 */
export const lapsesOf = (card, now = new Date()) => {
  const end = now.getTime()
  const since = end - STRUGGLING_WINDOW_DAYS * DAY_MS
  const lapses = Array.isArray(card?.lapses) ? card.lapses : []
  return lapses.filter((at) => {
    const time = asTime(at)
    return time !== null && time >= since && time <= end
  }).length
}

/**
 * Whether the card is a leech once this session's Agains are added.
 *
 * @param {object | null} card
 * @param {{ sessionAgains?: number, now?: Date }} [where]
 */
export const isLeech = (card, { sessionAgains = 0, now = new Date() } = {}) => lapsesOf(card, now) + sessionAgains >= LEECH_THRESHOLD

/**
 * The offer for a grade just given, or null.
 *
 * Once per card per session: `offered` is the set of ids already offered and
 * the caller adds to it, because the caller owns the session.
 *
 * @param {object | null} card - the card that was graded
 * @param {{ grade: string, sessionAgains?: number, offered?: Set<string>, now?: Date }} where
 * @returns {{ cardId: string, title: string, lapses: number } | null}
 */
export const leechOffer = (card, { grade, sessionAgains = 1, offered = null, now = new Date() } = {}) => {
  if (!card || grade !== 'again') return null
  const cardId = card._id ?? card.id ?? null
  if (!cardId || offered?.has(cardId)) return null
  if (!isLeech(card, { sessionAgains, now })) return null
  return { cardId, title: card.title || card.front || '', lapses: lapsesOf(card, now) + sessionAgains }
}

/** The first exit: a week's rest, dated, from the rest presets. */
export const leechRestUntil = (now = new Date()) => untilFromPreset('week', now)

/**
 * The third exit: the card as a draft for the editor, without its identity,
 * so that saving creates a second card beside the first. The learner cuts it
 * down to the half they can hold; the original keeps its schedule.
 *
 * @param {object | null} card
 */
export const splitDraft = (card) => {
  if (!card) return null
  return {
    deck_id: card.deck_id ?? null,
    card_type: card.card_type === 'quiz' ? 'quiz' : 'flashcard',
    title: card.title || card.front || '',
    content: card.content || card.back || '',
    explanation: card.explanation || '',
    options: Array.isArray(card.options) ? [...card.options] : [],
    correct_answer: card.correct_answer ?? null,
    tags: Array.isArray(card.tags) ? [...card.tags] : []
  }
}

export default leechOffer

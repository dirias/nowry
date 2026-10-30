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
import { backText, frontText, subjectLanguage } from './cardSpeech'

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
 * @param {{deckId?: string, index?: number, total?: number, flipped?: boolean, mode?: string,
 *   voiceSettings?: object, lastGrade?: 'again'|'hard'|'good'|'easy'}} where
 *   `index` is ZERO-based, as a list is; the payload's `cardIndex` is
 *   one-based, as a person counts. The web's own builder adds the one and a
 *   phone that forgot would tell the model "card 0 of 25".
 *   `voiceSettings` (the deck's two sides) gives the card's language, and
 *   `lastGrade` is sent only when the opener knows it (CHAT-003).
 */
export function studyCardContext(
  card,
  { deckId = null, index = 0, total = 0, flipped = false, mode = 'study', voiceSettings = null, lastGrade = null } = {}
) {
  if (!card) return null

  const dailyReview = deckId === 'daily-review'
  const lapses = Array.isArray(card.lapses) ? card.lapses.length : 0

  return {
    page: 'study_session',
    deckId: deckIdOf(card, deckId),
    deckName: deckNameOf(card),
    // The key of the card's own memory thread (CHAT-001).
    cardId: String(card._id ?? card.id ?? '') || null,
    cardIndex: index + 1,
    totalCards: total,
    cardType: card.card_type || 'basic',
    isFlipped: Boolean(flipped),
    front: frontText(card),
    // Withheld until the card is turned.
    back: flipped ? backText(card) : null,
    isDailyReview: dailyReview,
    mode,
    language: subjectLanguage(card, voiceSettings),
    ...(lapses > 0 ? { lapses } : {}),
    ...(lastGrade ? { lastGrade } : {})
  }
}

export default studyCardContext

/*
 * Subjects beyond a card (CHAT-010, ADR-055 §1). Each screen declares what is
 * in front of the learner with one of these; the server keys a thread on it
 * and names it last in the prompt. None means General.
 */

/** A deck screen: its name and today's counts. */
export function deckContext({ id = null, name = null, due = null, fresh = null } = {}) {
  if (!id) return null
  return { page: 'deck', deckId: String(id), deckName: name, dueCards: due, newCards: fresh }
}

/** A book being read: its title and, when known, the section on screen. */
export function bookContext({ id = null, title = null, chapter = null, visibleText = null } = {}) {
  if (!id) return null
  return { page: 'book', bookId: String(id), bookTitle: title, chapterTitle: chapter, visibleText }
}

/** A board, and the note selected on it if any. */
export function boardContext({ id = null, title = null, note = null } = {}) {
  if (!id) return null
  return { page: 'board', boardId: String(id), boardTitle: title, noteText: note ? String(note).slice(0, 1500) : null }
}

/** The day: reviews due and tasks left. */
export function todayContext({ reviewsDue = null, tasksLeft = null } = {}) {
  return { page: 'today', reviewsDue, tasksLeft }
}

/** The annual plan, and the goal on screen if any. */
export function planContext({ goalTitle = null } = {}) {
  return { page: 'plans', goalTitle }
}

/** Which kind of subject a context is, for its label: card, deck, book, board, today, plan or general. */
export function subjectKind(context) {
  switch (context?.page) {
    case 'study_session':
      return 'card'
    case 'deck':
    case 'book':
    case 'board':
    case 'today':
      return context.page
    case 'plans':
    case 'annual_planning':
      return 'plan'
    default:
      return 'general'
  }
}

/**
 * A subject back from a saved thread, for the General chat's Continue list
 * (CHAT-010). Enough to key the same thread on the server and name it here: a
 * card comes back front-side, so a continued chat cannot reveal its answer.
 */
export function contextFromThread(thread) {
  const subject = String(thread?.subject ?? '')
  const at = subject.indexOf(':')
  const kind = at === -1 ? subject : subject.slice(0, at)
  const id = at === -1 ? null : subject.slice(at + 1)
  const title = thread?.title || null
  switch (kind) {
    case 'card':
      return id ? { page: 'study_session', cardId: id, front: title, isFlipped: false } : null
    case 'deck':
      return deckContext({ id, name: title })
    case 'book':
      return bookContext({ id, title })
    case 'board':
      return boardContext({ id, title })
    case 'today':
      return todayContext()
    case 'plan':
      return planContext({ goalTitle: title })
    default:
      return null
  }
}

/**
 * The order a study session runs in, on top of the queue the server sends
 * (STUDY-009, ADR-057).
 *
 * The server already serves reviews before new cards. Two things only the
 * client can do are here: a card graded Again comes back a few cards later as
 * practice, and a reopened session lands on the first card not yet graded.
 *
 * A practice showing is a copy of the card with `practice` (1 or 2) and its
 * own `practiceKey`, so it can sit in the same list as the card it repeats
 * without being mistaken for it. Its grade is the client's business: the
 * schedule was set by the first answer, and sending a second would run SM-2
 * twice in minutes and count the miss twice toward the leech.
 */

/** Cards between a miss and its practice showing. */
export const PRACTICE_GAP = 5

/** Practice showings a card may earn in one session. */
export const MAX_PRACTICE = 2

const idOf = (card) => card?._id ?? card?.id ?? null

/** A card's key in the session: a practice showing's own, else the card's id. */
export const sessionKeyOf = (card) => card?.practiceKey ?? idOf(card)

/**
 * The practice showing a card graded Again earns, placed after the next
 * `PRACTICE_GAP` cards of the visible queue, or after the last one.
 *
 * @param {Array<object>} visible - the queue as the session shows it
 * @param {number} index - where the missed card sits in it
 * @param {object} card - the card just graded Again (itself a practice showing or not)
 * @returns {{ card: object, after: string } | null} null once the card has had its showings
 */
export function practiceFor(visible, index, card) {
  const round = (card?.practice ?? 0) + 1
  if (!card || round > MAX_PRACTICE || !Array.isArray(visible) || visible.length === 0) return null
  const anchor = visible[Math.min(visible.length - 1, index + PRACTICE_GAP)]
  return {
    card: { ...card, practice: round, practiceKey: `${idOf(card)}#${round}` },
    after: sessionKeyOf(anchor)
  }
}

/**
 * The queue with its practice showings in place. Each goes after the card it
 * was anchored to, or at the end when that card has left the queue. A showing
 * whose own card has left (rested, deleted) goes with it.
 *
 * @param {Array<object> | null} cards
 * @param {Array<{ card: object, after: string }>} practice
 * @returns {Array<object> | null} the same array when there is nothing to add
 */
export function withPractice(cards, practice) {
  if (!Array.isArray(cards) || !Array.isArray(practice) || practice.length === 0) return cards
  const present = new Set(cards.map(idOf))
  const placed = new Set()
  const out = [...cards]
  for (const entry of practice) {
    // A card re-graded Again after stepping back earns no second copy of the same showing.
    if (!present.has(idOf(entry.card)) || placed.has(entry.card.practiceKey)) continue
    placed.add(entry.card.practiceKey)
    const at = out.findIndex((card) => sessionKeyOf(card) === entry.after)
    out.splice(at >= 0 ? at + 1 : out.length, 0, entry.card)
  }
  return out
}

/** The local calendar day, `YYYY-MM-DD`: a saved place is good for one day. */
export function localDay(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Where a reopened session lands: the first card not graded in it.
 *
 * Not a saved index. The server drops graded cards from the due list, so the
 * same number points further into a shorter queue and skipped the cards before
 * it (seen at 12/162, 2026-11-01).
 *
 * @param {Array<object>} queue - the full queue as it arrived
 * @param {{ day?: string, graded?: object } | null} record - what was saved
 * @param {string} today - `localDay()`
 * @returns {number | null} null when there is nothing to resume; the queue's
 *   length when every card in it was graded
 */
export function resumeIndex(queue, record, today) {
  if (!Array.isArray(queue) || !record || record.day !== today) return null
  const graded = record.graded && typeof record.graded === 'object' ? record.graded : null
  if (!graded || Object.keys(graded).length === 0) return null
  const at = queue.findIndex((card) => !Object.prototype.hasOwnProperty.call(graded, String(idOf(card))))
  return at >= 0 ? at : queue.length
}

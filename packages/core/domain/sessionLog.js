/**
 * A finished session, and a card's next review, read once.
 *
 * Both are shapes a screen wants to print and neither is a shape a screen
 * should have to name. `session_type`, `duration_seconds` and
 * `score_percentage` are the API's words; "Flashcard Review · 18 cards · 6 min"
 * is the reader's.
 */

/** The three kinds a session can be, each with the key that names it. */
const KIND_KEYS = {
  ai_quiz: 'sessions.aiQuiz',
  srs_review: 'sessions.srsReview',
  deck_quiz: 'sessions.deckQuiz'
}

/** A minute is the smallest unit worth showing; nothing takes zero minutes. */
const minutesOf = (seconds) => Math.max(1, Math.round((seconds || 0) / 60))

/**
 * @param {Object} session
 * @returns {{ id: string|null, title: string|null, kindKey: string, cards: number, minutes: number, score: number|null, completedAt: string|null }}
 */
export const sessionLine = (session) => ({
  id: session?.id ?? session?._id ?? null,
  // A deck quiz names its deck; an AI quiz names its topic. Neither is
  // guaranteed, so the caller still has a fallback to reach for.
  title: session?.deck_name || session?.topic || null,
  kindKey: KIND_KEYS[session?.session_type] ?? KIND_KEYS.deck_quiz,
  cards: session?.total_cards ?? 0,
  minutes: minutesOf(session?.duration_seconds),
  score: session?.score_percentage ?? null,
  completedAt: session?.completed_at ?? null
})

/**
 * Whole days until a card is asked again.
 *
 * `null` means it has never been seen, which is a different thing from due
 * today and reads as "New" rather than as "0 days". Anything in the past is
 * zero — a card three days overdue is due now, not due minus three.
 */
export const daysUntilReview = (card, now = Date.now()) => {
  if (!card?.next_review) return null
  const days = Math.ceil((new Date(card.next_review).getTime() - now) / 86400000)
  return Math.max(0, days)
}

/**
 * A tag or system group's numbers, in the shape every row wants.
 *
 * `system` arrives from the API as a LIST of rows rather than an object keyed
 * by name; indexing it as an object showed Marked and Struggling as zero on
 * every account. `systemGroup` is that lookup, written once.
 */
export const groupSummary = (row) => ({
  cards: row?.cards ?? 0,
  decks: row?.decks ?? 0,
  deckIds: row?.deck_ids ?? [],
  due: row?.due ?? 0,
  fresh: row?.new ?? 0,
  asked: (row?.due ?? 0) + (row?.new ?? 0),
  /** How far back "struggling" looks. The server decides; the label says so. */
  windowDays: row?.window_days ?? 14
})

export const systemGroup = (groups, key) => groupSummary((groups?.system ?? []).find((row) => row?.key === key))

export const tagGroups = (groups) => (groups?.tags ?? []).map((row) => ({ tag: row?.tag, ...groupSummary(row) }))

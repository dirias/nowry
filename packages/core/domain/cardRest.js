/**
 * Rest, read once for both clients (SR-003, ADR-043).
 *
 * The API materializes a card's rest as one field, `rest_until`: null when
 * awake, a far date when resting until woken, otherwise the latest of its
 * sources (a card's own hold, a tag's, a deck's). A deck carries its own
 * `rest_until` and a `resting_cards` count; a group row carries `resting` and,
 * for a tag, its `rest_until`. The names live here, behind readers, so no
 * screen spells an API field (the mobile `apiFields` rule).
 */

/** The API's "until woken": a date in the year 9999. */
export const INDEFINITE_YEAR = 9999

const asDate = (value) => {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Whether an until means "until woken" rather than a day. */
export const isIndefinite = (until) => {
  const date = asDate(until)
  return Boolean(date && date.getUTCFullYear() >= INDEFINITE_YEAR)
}

/**
 * One shape for anything that can rest — a card, a deck, a tag row.
 *
 * @param {{ rest_until?: string | Date | null } | null} thing
 * @param {Date} [now]
 * @returns {{ resting: boolean, until: Date | null, indefinite: boolean }}
 */
export const restOf = (thing, now = new Date()) => {
  const until = asDate(thing?.rest_until)
  const resting = Boolean(until && until > now)
  return { resting, until: resting ? until : null, indefinite: resting && isIndefinite(until) }
}

/** A card: its rest, plus which grains hold it and when it first rested. */
export const cardRest = (card, now = new Date()) => ({
  ...restOf(card, now),
  sources: Array.isArray(card?.rests) ? card.rests.map((entry) => entry?.source).filter(Boolean) : [],
  restedAt: asDate(card?.rested_at)
})

export const isResting = (card, now = new Date()) => restOf(card, now).resting

/** A deck: its own rest, and how many of its cards rest for any reason. */
export const deckRest = (deck, now = new Date()) => ({
  ...restOf(deck, now),
  restingCards: deck?.resting_cards ?? 0
})

/** A group summary (from `groupSummary`): a tag's own rest, read like a card's. */
export const groupRest = (summary, now = new Date()) => restOf({ rest_until: summary?.restUntil ?? null }, now)

/** The groups response: how many cards rest across every active deck. */
export const restingTotal = (groups) => groups?.resting?.cards ?? 0

/** What the daily review did on arrival, when it spread a pile (SR-002). */
export const spreadOf = (response) => {
  const spread = response?.spread
  if (!spread || !spread.cards) return null
  return { cards: spread.cards, days: spread.days ?? 0, decks: spread.decks ?? 0 }
}

/** The three lengths a learner picks from, in days; `null` is "until woken". */
export const REST_PRESETS = Object.freeze([
  { key: 'untilWoken', days: null },
  { key: 'week', days: 7 },
  { key: 'twoWeeks', days: 14 },
  { key: 'month', days: 30 }
])

/** The until a preset means, from `now`; null for "until woken". */
export const untilFromPreset = (key, now = new Date()) => {
  const preset = REST_PRESETS.find((row) => row.key === key)
  if (!preset || preset.days === null) return null
  const until = new Date(now)
  until.setUTCDate(until.getUTCDate() + preset.days)
  return until
}

export default restOf

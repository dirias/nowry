/**
 * What a deck's type means, declared once for both clients.
 *
 * This table used to live in `src/components/Study/deckTypes.js`, which made it
 * the web's. The mobile client then drew decks without it, and the two ended up
 * disagreeing about the one thing a reader uses to tell a flashcard deck from a
 * quiz deck at a glance. Colour and label belong to the domain; only the glyph
 * belongs to a client.
 *
 * A KEY, not a component (ADR-031, MOB-003B): the web draws Material icons and
 * mobile draws lucide, so each maps `iconKey` in its own registry.
 *
 * `color` is the identity tile's colour (§15.8, §15.11) — full strength on a
 * 16px area, never on a card or a chip.
 */
export const DECK_TYPES = {
  flashcard: { labelKey: 'study.types.flashcards', color: 'primary.solidBg', iconKey: 'cards' },
  quiz: { labelKey: 'study.types.quizzes', color: 'warning.solidBg', iconKey: 'quiz' },
  visual: { labelKey: 'study.types.visual', color: 'success.solidBg', iconKey: 'image' }
}

/** An unknown or absent type reads as a flashcard, which is the default deck. */
export const deckType = (type) => DECK_TYPES[type] || DECK_TYPES.flashcard

/**
 * The five numbers every deck surface derives, in one place.
 *
 * The field names are the API's — `due_cards`, `new_cards`, `total_cards` — and
 * writing them out at each call site is how the mobile client came to read
 * `due_count` and `card_count`, which do not exist, and drew every deck as
 * empty. One reader, one set of names.
 */
export const deckCounts = (deck) => {
  const due = deck?.due_cards || 0
  const fresh = deck?.new_cards || 0
  const total = deck?.total_cards || 0
  const mastery = deck?.mastery || 0
  return {
    due,
    fresh,
    total,
    mastery,
    /** How much this deck is asking for today. Zero means up to date. */
    asked: due + fresh,
    /** A deck nobody has studied yet draws an empty measure, never a full grey bar. */
    allNew: total > 0 && total === fresh
  }
}

/**
 * The counts, taken from whichever payload actually carries them.
 *
 * `GET /decks` computes `due_cards`, `new_cards` and `mastery` per deck;
 * `GET /decks/{id}` returns the stored document and computes none of them. So a
 * detail screen reading the single-deck payload gets the card total and two
 * permanent zeroes — which is exactly what the phone's deck screen showed, a
 * detail view saying less about a deck than the row that opened it (MOB-065).
 *
 * The list entry is the one that knows, and a client that reached the detail
 * screen from the list already has it cached. This prefers it and falls back to
 * the detail payload, so the screen is right whichever arrives first.
 *
 * @param {object} deck - the single-deck payload
 * @param {object} [listEntry] - the same deck as the list route describes it
 */
export const deckCountsFrom = (deck, listEntry) => {
  const counted = listEntry ?? deck
  return deckCounts({
    ...deck,
    due_cards: counted?.due_cards ?? deck?.due_cards,
    new_cards: counted?.new_cards ?? deck?.new_cards,
    mastery: counted?.mastery ?? deck?.mastery,
    // The stored total is the detail payload's own and is authoritative there.
    total_cards: deck?.total_cards ?? counted?.total_cards
  })
}

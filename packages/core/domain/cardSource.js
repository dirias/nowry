/**
 * Where a card came from, read once for both clients (MOB-111).
 *
 * The web's `SourceReadout` and the phone's source line read the same four
 * fields. The names live here, behind a reader, so a screen never spells an
 * API field itself — a misspelt one is `undefined`, and `undefined` renders as
 * nothing rather than failing (see the mobile `apiFields` rule).
 *
 * @param {object | null} card
 * @returns {{ bookId: string, title: string, section: string | null, deleted: boolean } | null}
 *   null when the card was not made from a document.
 */
export function cardSource(card) {
  if (!card?.source_book_id) return null
  return {
    bookId: card.source_book_id,
    title: card.source_book_title || '',
    section: card.source_section?.heading || null,
    deleted: Boolean(card.source_book_deleted)
  }
}

export default cardSource

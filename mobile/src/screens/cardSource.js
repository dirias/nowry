/**
 * What a card says about where it came from (MOB-111).
 *
 * The web's `SourceReadout` renders one line from three keys; the phone draws
 * the same line under the card's text, quietly, and does not link it: the
 * reader is a tab away and a link on a tap-to-flip surface is a trap
 * (MOB-042). The fields are read by `cardSource` in the shared package, so
 * this file spells no API field of its own.
 *
 * @param {(key: string, options?: object) => string} t
 * @param {object | null} card
 * @returns {string | null} the line, or null when the card has no source
 */
import { cardSource } from '@nowry/core/domain/cardSource'

export function sourceLineFor(t, card) {
  const source = cardSource(card)
  if (!source) return null
  if (source.deleted) return t('cards.session.source.deleted')
  const { title: document, section } = source
  return section ? t('cards.session.source.from', { document, section }) : t('cards.session.source.fromDocument', { document })
}

export default sourceLineFor

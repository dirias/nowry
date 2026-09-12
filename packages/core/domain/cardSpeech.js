/**
 * What a card sounds like.
 *
 * The web computed this inline, in the middle of a 1945-line render: a quiz
 * reads its question and then its options, and everything else reads the face
 * that is showing. Three field names deep, in a ternary, inside a prop.
 *
 * It moves here because the phone needs the same rule and the two clients
 * disagree about field names. The web's session holds `title`/`content`; the
 * phone's holds whatever the list endpoint sent, which for older cards is
 * `question`/`answer` and for imported ones `front`/`back`. A reader that
 * knows all three is the only way one rule can serve both.
 *
 * **A quiz reads the same on both faces.** Its back is a verdict, not a text —
 * "correct, because…" is the explanation, and reading the options again after
 * the answer is what makes an audio quiz usable at all.
 */

/** The three spellings the question has worn, newest first. */
export const frontText = (card) => card?.title || card?.question || card?.front || ''

/** And the answer's. */
export const backText = (card) => card?.content || card?.answer || card?.back || ''

/**
 * The text to speak for a card, or `''` when there is nothing to say.
 *
 * @param {object} card
 * @param {{flipped?: boolean}} [options] — whether the answer is showing.
 */
export function speechTextFor(card, { flipped = false } = {}) {
  if (!card) return ''

  if (card.card_type === 'quiz') {
    const options = Array.isArray(card.options) ? card.options.filter(Boolean) : []
    const question = frontText(card)
    if (!question) return ''
    return options.length > 0 ? `${question}. ${options.join(', ')}` : question
  }

  return flipped ? backText(card) : frontText(card)
}

export default speechTextFor

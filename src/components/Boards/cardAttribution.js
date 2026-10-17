/**
 * Which note a generated card came from (BOARD-006, PRD D7). The generate
 * route answers with pairs and no source, so each pair is given to the
 * selected note whose words it shares most; a tie, or no shared word at all,
 * goes to the first note. Pure, so the rule is tested without a sheet.
 */

/** Words of three letters or more, lower-cased, accents folded. */
export const wordsOf = (text) => {
  const folded = String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
  return new Set((folded.match(/[\p{L}\p{N}]+/gu) ?? []).filter((word) => word.length >= 3))
}

/**
 * @param {string} text  the card's front and back together
 * @param {Array<{id: string, text: string}>} notes  the selected notes, in order
 * @returns {string|null} the id of the note the card came from
 */
export const attributeCard = (text, notes) => {
  if (!notes?.length) return null
  const words = wordsOf(text)
  let best = notes[0].id
  let bestScore = 0
  notes.forEach((note) => {
    const own = wordsOf(note.text)
    let score = 0
    words.forEach((word) => {
      if (own.has(word)) score += 1
    })
    if (score > bestScore) {
      best = note.id
      bestScore = score
    }
  })
  return best
}

/**
 * Pure, React-free tag helpers shared by the Browse-mode inline tag filter.
 *
 * Kept out of the hook (and out of StudySession) on purpose: the no-filter
 * identity guarantee below is the load-bearing part of the whole feature, and
 * it is far easier to lock with a plain unit test than through a rendered tree.
 */

/**
 * Tally every tag across `cards`.
 *
 * Returns `[{ tag, count }]` — deliberately the SAME shape as ManageContent's
 * `availableTags`, so the two surfaces can converge on one source later without
 * a shape migration.
 *
 * Sort is fully deterministic: count descending, then tag ascending by code
 * point (NOT localeCompare, whose result depends on the host ICU data — a
 * filter list that reorders itself between environments is a bug, not a nicety).
 *
 * Tolerates cards whose `tags` is undefined, null, or not an array — real decks
 * predate the tags field, and a browse session must never crash on one.
 *
 * @param {Array<object>} cards
 * @returns {Array<{ tag: string, count: number }>}
 */
export function countTags(cards) {
  if (!Array.isArray(cards)) return []

  const counts = new Map()
  for (const card of cards) {
    const tags = card?.tags
    if (!Array.isArray(tags)) continue
    for (const raw of tags) {
      if (typeof raw !== 'string') continue
      const tag = raw.trim()
      if (!tag) continue
      counts.set(tag, (counts.get(tag) || 0) + 1)
    }
  }

  return Array.from(counts, ([tag, count]) => ({ tag, count })).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    if (a.tag === b.tag) return 0
    return a.tag < b.tag ? -1 : 1
  })
}

/**
 * Narrow `cards` to those carrying at least one of `selectedTags` (OR
 * semantics — a card tagged `verbs` shows under a `verbs`+`nouns` selection).
 *
 * HARD REQUIREMENT: with an empty selection this returns the SAME ARRAY
 * REFERENCE it was given, never a copy. StudySession memoizes over the card
 * array's identity, so a defensive `[...cards]` here would invalidate every
 * downstream memo on every render and — worse — would silently break the
 * "study mode is byte-for-byte unchanged" invariant.
 *
 * @param {Array<object>} cards
 * @param {Array<string>} selectedTags
 * @returns {Array<object>}
 */
export function filterCardsByTags(cards, selectedTags) {
  if (!Array.isArray(cards)) return cards
  if (!Array.isArray(selectedTags) || selectedTags.length === 0) return cards

  return cards.filter((card) => Array.isArray(card?.tags) && card.tags.some((tag) => selectedTags.includes(tag)))
}

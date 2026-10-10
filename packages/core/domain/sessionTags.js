/**
 * The Tags list of a session, read once for both clients (TAG-002, ADR-044).
 *
 * In a study session the list is the POOL's: every tag of the deck (or of
 * every active deck, for the daily review) with at least one new or due card,
 * as the server counted it beside the session's cards. In Browse (All) it is
 * the served cards' tags, counted here. The two never mix: a tag with nothing
 * waiting is not offered in study, and nothing in Browse is hidden.
 *
 * The server's row is `{tag, new, due}`; the clients' row has been `{tag,
 * count}` since the tag filter existed. The field names live here so no screen
 * spells them (the mobile `apiFields` rule).
 */
import { countTags } from '../utils/tagFilter'

/**
 * The pool's tags as filter rows: `count` is what is waiting, new and due.
 *
 * @param {Array<{tag?: string, new?: number, due?: number}> | null | undefined} poolTags
 * @returns {Array<{tag: string, count: number, fresh: number, due: number}>}
 */
export const poolTagRows = (poolTags) => {
  if (!Array.isArray(poolTags)) return []
  const rows = []
  for (const row of poolTags) {
    const tag = typeof row?.tag === 'string' ? row.tag.trim() : ''
    if (!tag) continue
    const fresh = Number(row.new) > 0 ? Number(row.new) : 0
    const due = Number(row.due) > 0 ? Number(row.due) : 0
    if (fresh + due === 0) continue
    rows.push({ tag, count: fresh + due, fresh, due })
  }
  return rows.sort((a, b) => a.tag.localeCompare(b.tag))
}

/**
 * The rows a session's Tags control lists, by scope.
 *
 * @param {'due' | 'all'} scope
 * @param {Array<object> | null | undefined} poolTags - the server's, for the due scope
 * @param {Array<object> | null} cards - the served cards, for Browse
 */
export const sessionTagRows = (scope, poolTags, cards) => (scope === 'all' ? countTags(cards) : poolTagRows(poolTags))

export default sessionTagRows

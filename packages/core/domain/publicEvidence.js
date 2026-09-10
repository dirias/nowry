/**
 * What a public item is allowed to claim about itself (ADR-012).
 *
 * The rule: **a metric renders only above zero.** A zero is not a small number,
 * it is the absence of evidence, and the shipped design rendered all three
 * unconditionally — so on a young catalogue every row led with `0 likes,
 * 0 forks`, in the row's heaviest slot, as an argument against the thing it was
 * selling. Silence is the honest report for an item nobody has reacted to yet.
 *
 * It lived in the web's browse page. Both clients browse the same catalogue
 * now, and a second copy of this would be a second answer to what a young item
 * is allowed to say about itself.
 */

/**
 * How long a thing gets to be new. Long enough that a weekend publish is still
 * marked on Monday; short enough that the chip keeps meaning something.
 */
export const NEW_WINDOW_DAYS = 30

/** Whole days since an ISO timestamp; Infinity when there isn't one. */
export const daysSince = (iso) => {
  if (!iso) return Infinity
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return Infinity
  return (Date.now() - then) / 86400000
}

/**
 * What a public item is allowed to claim about itself.
 *
 * The rule this exists to enforce (ADR-012): **a metric renders only above
 * zero.** A zero is not a small number, it is the absence of evidence, and the
 * shipped design rendered all three unconditionally — so on a young catalogue
 * every row led with `0 likes, 0 forks`, in the row's heaviest slot, as an
 * argument against the thing it was selling.
 *
 * Silence is the honest report for an item nobody has reacted to yet. An item
 * that is ALSO recent gets `isNew` instead, which is a reason to look rather
 * than a verdict — but only for a while, or the chip would be on everything and
 * would mean nothing.
 *
 * `"Other"` is treated as no category at all, because that is what it is: the
 * option people pick when none of the seventeen real ones fit. It does not earn
 * the row's second-strongest position.
 */
export const evidenceFor = (item) => {
  const meta = item?.public_metadata || {}
  const views = Number(meta.views) || 0
  const likes = Number(meta.likes) || 0
  const forks = Number(meta.forks) || 0
  const raw = typeof meta.category === 'string' ? meta.category.trim() : ''
  const uncategorised = !raw || raw.toLowerCase() === 'other'

  return {
    views,
    likes,
    forks,
    showViews: views > 0,
    showLikes: likes > 0,
    showForks: forks > 0,
    category: raw,
    showCategory: !uncategorised,
    isNew: views === 0 && likes === 0 && forks === 0 && daysSince(item?.published_at || item?.created_at) <= NEW_WINDOW_DAYS
  }
}

/**
 * At or below this many visible results, a list stops being a list.
 *
 * A table with one row in it reads as a dead product rather than a young one: a
 * search bar, a sort menu, two tabs, a header and a footer count wrapped around
 * a single item is chrome outnumbering content roughly six to one. The
 * threshold is the VISIBLE count, not the catalogue size, so a filter that
 * narrows to two gets the same treatment as a library that only has two.
 */
export const SPARSE_THRESHOLD = 3

/**
 * The two fields a public row reads off an item, named here and nowhere else.
 *
 * The phone's first browse row read `item.author?.username`, which is not a
 * field this API has ever had: every row would have shown no author and nothing
 * would have failed. The API-field guard could not catch it either — it flags
 * snake_case names the shared package never uses, and an invented camelCase
 * path is invisible to it. So the names live here, where the guard can see
 * them and where both clients read the same ones.
 */
export const publicAuthor = (item) => item?.author_name || null

/** A public deck says how many cards it has; a book does not. */
export const publicCardCount = (item) => Number(item?.total_cards) || 0

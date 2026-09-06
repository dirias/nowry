/**
 * The daily-review session's server-side options, read from the session URL
 * (STUDY-002, PRD D6 / D9):
 *
 *   /study/daily-review?limit=10            Quick 10 — cap, due first
 *   /study/daily-review?tags=verbs          a tag group — narrows the pool
 *   /study/daily-review?group=struggling    the struggling group
 *
 * `tags` is read the same way useSessionFilters reads it (comma-separated,
 * repeated params tolerated), so the server narrows the pool to exactly the
 * set the client-side filter will then show. `group=marked` is never sent:
 * the mark may not narrow a study queue (ADR-014), and the API would refuse it.
 *
 * @param {URLSearchParams} searchParams
 * @returns {{ limit?: number, tags?: string[], group?: string }}
 */
export const STUDY_GROUPS = ['struggling']

export function dailyReviewParams(searchParams) {
  const out = {}
  const limit = Number.parseInt(searchParams.get('limit') ?? '', 10)
  if (Number.isFinite(limit) && limit > 0) out.limit = limit
  const tags = searchParams
    .getAll('tags')
    .flatMap((value) => value.split(','))
    .map((tag) => tag.trim())
    .filter(Boolean)
  if (tags.length) out.tags = [...new Set(tags)]
  const group = searchParams.get('group')
  if (group && STUDY_GROUPS.includes(group)) out.group = group
  return out
}

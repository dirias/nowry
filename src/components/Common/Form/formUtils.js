/**
 * Pure helpers shared by every form surface. No JSX, no Joy, no t() — this
 * module returns values and translation *keys*, never rendered strings.
 *
 * Each of these was duplicated across the surfaces before the form system
 * existed: the deck-id extraction three times, the tag split four times, and
 * `describeApiError` not at all on five of seven, which is why a failed save
 * currently renders as a bare "AxiosError" or, on the visual card, as nothing.
 */

// The native date input and the timeframe Select both use '' as their "empty"
// value. The API's Goal model types these as Optional[datetime] / Optional[int]
// and Pydantic v2 does not coerce '' to null — it rejects the request with 422.
// Anything the user left blank must therefore travel as an explicit null.
export const emptyToNull = (value) => (value === '' || value === undefined ? null : value)

// FastAPI returns `detail` as an array of {loc, msg} objects for a 422 and as a
// plain string for handled HTTPExceptions. Flatten both into one readable line
// so the user sees which field was rejected instead of a bare "AxiosError".
export const describeApiError = (error) => {
  const detail = error?.response?.data?.detail
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        const field = (item?.loc || []).filter((part) => part !== 'body').join('.')
        return field ? `${field}: ${item?.msg}` : item?.msg
      })
      .filter(Boolean)
      .join(' · ')
  }
  if (typeof detail === 'string') return detail
  return error?.message || ''
}

/**
 * A card's `deck_id` comes back populated as an object on some responses and as
 * a bare id string on others, so every card form hand-rolled the same ten-line
 * unwrap. One rule, one place.
 */
export const extractDeckId = (deckId) => {
  if (!deckId) return ''
  if (typeof deckId === 'object') return deckId._id || deckId.id || ''
  return String(deckId)
}

/**
 * Comma-separated input → the `string[]` the API already expects.
 *
 * Duplicates are dropped: the chip input (§5.7) renders each tag once, so
 * letting two identical chips through would produce a list with no way to tell
 * which delete control removes which.
 */
export const parseTagInput = (value) => {
  if (Array.isArray(value)) return [...new Set(value.map((tag) => String(tag).trim()).filter(Boolean))]
  if (!value) return []
  return [
    ...new Set(
      String(value)
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  ]
}

/** Respect prefers-reduced-motion; motion is an accessibility setting, not a taste. */
export const scrollBehavior = () => (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 'auto' : 'smooth')

/**
 * `block: 'nearest'` is the default on purpose: a field already on screen must
 * not be re-scrolled under an open keyboard. Callers landing on a freshly
 * revealed section pass 'start' (§8.7).
 */
export const scrollIntoViewSafely = (element, block = 'nearest') => {
  element?.scrollIntoView?.({ behavior: scrollBehavior(), block })
}

/**
 * Focus whatever a container points at: the node itself if it is already a
 * control, its first control otherwise, or the container as a last resort.
 *
 * A disclosure chip unmounts the moment it is used, so a reveal that does not
 * move focus drops a keyboard user onto <body> in the middle of the form they
 * were filling in (§8.6). Which control a revealed group opens with depends on
 * whichever primitive the surface rendered, so the target is found rather than
 * named by every call site.
 */
export const focusFirstControl = (node) => {
  if (!node) return
  const selector = 'input, textarea, select, button, [tabindex]'
  const target = node.matches?.(selector) ? node : node.querySelector?.(selector) || node
  target?.focus?.()
  scrollIntoViewSafely(target)
}

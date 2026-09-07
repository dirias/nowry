/**
 * The form system's DOM helpers. These operate on real nodes — scrolling one
 * into view, moving focus into a revealed group — so they are the web client's
 * and cannot move to @nowry/core.
 *
 * The pure helpers they used to sit beside now live in
 * `@nowry/core/utils/formUtils` (MOB-003B): emptyToNull, describeApiError,
 * extractDeckId and parseTagInput.
 */

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

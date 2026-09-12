/**
 * Which heading the reader is under, and where to scroll to resume.
 *
 * The web learns this from the DOM — the active heading is whichever one the
 * scroll container has under its top edge. A phone's reader draws flat blocks
 * in a `ScrollView`, so it learns the same thing from two numbers it already
 * has: where each heading was laid out, and how far the view has scrolled.
 *
 * Pure, and beside its screen rather than inside it, which is this client's
 * pattern for a rule worth testing without a device (`buttonSpec`,
 * `typeLevels`, `formMessage`). The write path itself — coalescing to one
 * request per five seconds and flushing on leave — is `createPointerSaver` in
 * the shared package, because both clients must write the pointer the same way.
 */

/**
 * How far below the top edge the line is that decides "you are under this one".
 *
 * Not zero: a heading sitting exactly at the top edge is the one being read,
 * and so is one a few points above it — the eye is below the heading, not on
 * it. A quarter of a phone's height is roughly where the reading line sits.
 */
export const FOLD_FRACTION = 0.25

/**
 * The heading the reader is under, or null above the first one.
 *
 * @param {Array<{y: number, text: string}>} headings - in document order
 * @param {number} scrollY - the scroll offset
 * @param {number} viewportHeight - the visible height, for the fold line
 * @returns {string|null} the heading's text
 */
export const activeHeading = (headings, scrollY, viewportHeight = 0) => {
  const line = (Number(scrollY) || 0) + (Number(viewportHeight) || 0) * FOLD_FRACTION
  let active = null
  for (const heading of headings ?? []) {
    /*
     * A heading whose layout has not arrived yet stops the scan rather than
     * being skipped. `onLayout` fires per block and out of order, so skipping
     * one would let a LATER heading be named active while the pending one is
     * the real answer — and the first scroll is exactly when a wrong pointer
     * would be written. The last heading we are sure about is the honest one.
     */
    if (!heading || typeof heading.y !== 'number' || !heading.text) break
    if (heading.y > line) break
    active = heading.text
  }
  return active
}

/**
 * Where to scroll so a named section sits just under the top edge.
 *
 * A little above it, not exactly on it: landing with the heading flush against
 * the edge reads as having overshot, and the heading is the thing you want to
 * see first. `null` when the section is not in this document — a resume link
 * to a heading that has since been renamed scrolls nowhere rather than to the
 * top, which would look like the position was lost.
 *
 * @returns {number|null}
 */
export const offsetForSection = (headings, text, margin = 16) => {
  const found = (headings ?? []).find((heading) => heading?.text === text)
  if (!found || typeof found.y !== 'number') return null
  return Math.max(0, found.y - margin)
}

/** Headings in document order, whatever order their layouts arrived in. */
export const inDocumentOrder = (byIndex) =>
  Object.keys(byIndex ?? {})
    .map(Number)
    .sort((a, b) => a - b)
    .map((index) => byIndex[index])
    .filter(Boolean)

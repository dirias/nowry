/**
 * What a document's cover looks like, as data both clients draw (BOOK-010).
 *
 * `docs/prd-books-library.md` D5 retired the old 3D book card and left a
 * 48×68 colour rectangle in its place. The rules it wrote still hold — no
 * gradient, no text on the colour, no tilt or glare, no hero, the colour is the
 * user's — and the rectangle obeyed all of them while saying nothing about what
 * it was. "They are just square boxes; it is not intuitive that they are books
 * or notes." The fix is a silhouette, not decoration.
 *
 * **Kind carries shape (§15.2).** The Books PRD was corrected once already: a
 * Nowry book is a document you WRITE, and only an import is a book you read. So
 * a written document is drawn as a page — paper, a folded corner, the colour as
 * a tab, ruled lines — and an import as a bound book with a spine and a page
 * edge. The Written/Imported segment becomes something the grid shows rather
 * than a filter you have to open.
 *
 * **The decision is shared; the drawing is not.** ADR-031: this module returns
 * the shape and its proportions and never a component. The web draws it with
 * Joy and CSS, the phone with Views, and neither can invent a proportion the
 * other does not have — which is the drift this exists to prevent.
 */
import { coverage, kindOf } from './libraryQuery'

/** A cover is always taller than wide, in a book's own proportion. */
export const COVER_RATIO = 1.42

/**
 * The page's anatomy, as fractions of the cover's own width and height, so the
 * same cover can be drawn at 28 points in a row and 62 on a phone tile.
 */
export const PAGE = {
  /** The colour tab across the top, and how much of the width it spans. */
  tabHeight: 0.18,
  tabWidth: 0.74,
  /** The folded corner occupies what the tab leaves. */
  foldWidth: 0.26,
  /** Where the ruled lines start, how far apart they sit, and their inset. */
  firstLine: 0.36,
  lineGap: 0.13,
  lineInset: 0.12
}

/** The book's anatomy. The spine is a SOLID strip, never a ramp (D5). */
export const BOOK = {
  spineWidth: 0.17,
  /** Black laid over the user's colour to darken the spine by a fixed amount. */
  spineShade: 0.24,
  /** The page edge beside the cover, in points, independent of size. */
  edgeWidth: 4,
  edgeInset: 3
}

/** How many ruled lines a page with something written on it carries. */
export const RULED_LINES = 4

/**
 * Which silhouette a document wears.
 *
 * @param {object} book
 * @returns {'page' | 'book'}
 */
export const coverShape = (book) => (kindOf(book) === 'imported' ? 'book' : 'page')

/**
 * Whether a written document has anything in it yet.
 *
 * A page with lines on it is a page with writing on it. An empty document
 * drawn with ruled lines would claim content it does not have, so it is drawn
 * blank — the one honest way for a cover to say "nothing written yet".
 */
const hasContent = (book) => (book?.word_count ?? 0) > 0 || (book?.section_count ?? 0) > 0

/**
 * The page's ruled lines, and how many of them are FILLED (hook 3).
 *
 * A filled line is coverage made visible: the share of sections that already
 * have cards, drawn on the cover itself. Zero filled when nothing is covered —
 * never a line coloured for nothing, because "the coverage bar is worth it only
 * when true" (D8, ADR-012). An import has no ruled lines at all; its progress is
 * its reading position, which the tile already says in words.
 *
 * @param {object} book
 * @param {{public?: boolean}} [options] - a public document's coverage is its
 *   OWNER's cards, which say nothing to the person browsing it
 * @returns {{lines: number, filled: number}}
 */
export function coverLines(book, { public: isPublic = false } = {}) {
  if (coverShape(book) !== 'page' || !hasContent(book)) return { lines: 0, filled: 0 }
  if (isPublic) return { lines: RULED_LINES, filled: 0 }
  const covered = coverage(book)
  const filled = covered ? Math.round((covered.pct / 100) * RULED_LINES) : 0
  return { lines: RULED_LINES, filled: Math.min(RULED_LINES, filled) }
}

/**
 * Everything a client needs to draw one cover.
 *
 * @param {object} book
 * @param {{ribbon?: boolean, public?: boolean}} [options]
 *   `ribbon` marks the one document the Continue object points at (hook 1). It
 *   is the caller's to decide, because only the caller knows the whole list.
 */
export function coverOf(book, { ribbon = false, public: isPublic = false } = {}) {
  const { lines, filled } = coverLines(book, { public: isPublic })
  return {
    shape: coverShape(book),
    color: book?.cover_color || null,
    image: book?.cover_image || null,
    lines,
    filled,
    // A public document is someone else's: nothing of yours is left open in it.
    ribbon: Boolean(ribbon) && !isPublic
  }
}

export default coverOf

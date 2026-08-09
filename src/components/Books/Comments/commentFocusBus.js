/**
 * commentFocusBus — the two-way link between a comment's highlight in the
 * document and its card in the margin rail (the core of the Google Docs feel:
 * click the text, the card lights up; click the card, the text lights up).
 *
 * These two live in different subtrees — CommentAnchorPlugin is inside the
 * Lexical composer, CommentMarginRail is a flex sibling of the whole editor
 * column — so linking them through props would mean threading focus state
 * through EditorHome purely as a relay. This module is the narrower seam: two
 * channels, no shared mutable state, and nothing to keep in sync.
 *
 * It replaces the previous coupling, which reached across with
 * `document.getElementById('comment-bubble-…').click()`.
 *
 *   ACTIVE  — rail → plugin. "This comment is the focused one; paint its
 *             highlight in the intensified amber." `null` clears it.
 *   FOCUS   — plugin → rail. "The reader clicked/keyed this highlight; make
 *             its card active." The rail decides what that means.
 */

const activeListeners = new Set()
const focusRequestListeners = new Set()

/** rail → plugin: the comment whose highlight should render active (or null). */
export function setActiveComment(commentId) {
  activeListeners.forEach((listener) => listener(commentId))
}

export function subscribeActiveComment(listener) {
  activeListeners.add(listener)
  return () => activeListeners.delete(listener)
}

/** plugin → rail: the reader targeted this comment's highlight in the document. */
export function requestCommentFocus(commentId) {
  focusRequestListeners.forEach((listener) => listener(commentId))
}

export function subscribeCommentFocusRequests(listener) {
  focusRequestListeners.add(listener)
  return () => focusRequestListeners.delete(listener)
}

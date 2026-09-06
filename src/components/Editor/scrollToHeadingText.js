/**
 * Scroll the editor to the heading whose text matches (BOOK-004, D7/D13).
 *
 * Headings are addressed by text, the same way the navigator addresses them,
 * because a Lexical node key does not survive a reload and a section's ordinal
 * does not survive an edit. Returns whether a heading was found.
 */
const HEADING_OFFSET = 100

export default function scrollToHeadingText(text) {
  const wanted = (text || '').trim()
  if (!wanted) return false
  const container = document.querySelector('.editor-scroll-container')
  if (!container) return false
  const headings = document.querySelectorAll('.editor-content h1, .editor-content h2, .editor-content h3')
  const target = Array.from(headings).find((node) => node.textContent.trim() === wanted)
  if (!target) return false
  const top = target.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - HEADING_OFFSET
  if (typeof container.scrollTo === 'function') container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  else container.scrollTop = Math.max(0, top)
  return true
}

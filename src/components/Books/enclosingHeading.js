import { $getRoot, $getSelection, $isRangeSelection } from 'lexical'

/**
 * Which section a selection sits in (docs/prd-book-cards.md D1–D3, BOOK-002).
 *
 * A section is an H1 or H2 and the text down to the next one. The client only
 * needs the heading's text: the server's sections endpoint owns the ordinal and
 * the hash (a short section is not a section there, so counting headings here
 * would drift), and `resolveCardSource` matches by text against it.
 */
export const SECTION_TAGS = ['h1', 'h2']

/** All text under a serialised Lexical node, joined with spaces. */
export function nodeText(node) {
  const parts = []
  const walk = (n) => {
    if (Array.isArray(n)) n.forEach(walk)
    else if (n && typeof n === 'object') {
      if (n.type === 'text' && typeof n.text === 'string') parts.push(n.text)
      if (n.children) walk(n.children)
      if (n.root) walk(n.root)
    }
  }
  walk(node)
  return parts.join(' ')
}

/**
 * The nearest H1/H2 at or before the top-level block at `blockIndex` in a
 * serialised editor state, or null when the block is above the first heading.
 */
export function enclosingHeading(lexicalJson, blockIndex) {
  const blocks = lexicalJson?.root?.children ?? []
  if (blockIndex < 0) return null
  let heading = null
  for (let i = 0; i <= blockIndex && i < blocks.length; i += 1) {
    const block = blocks[i]
    if (block?.type === 'heading' && SECTION_TAGS.includes(String(block.tag || '').toLowerCase())) {
      heading = nodeText(block).trim() || null
    }
  }
  return heading
}

/** The index of the top-level block the selection's anchor sits in, or -1. Read synchronously. */
export function selectionBlockIndex(editor) {
  let index = -1
  editor.getEditorState().read(() => {
    const selection = $getSelection()
    if (!$isRangeSelection(selection)) return
    const root = $getRoot()
    let block = selection.anchor.getNode()
    while (block.getParent() !== root && block.getParent() !== null) block = block.getParent()
    index = block.getIndexWithinParent()
  })
  return index
}

/**
 * Build the stamp for cards generated from the current selection.
 *
 * Reads the selection NOW (a dialog will steal focus and clear it), then asks the
 * server for the document's sections and matches the heading by text, which yields
 * the ordinal and the hash. A selection above the first heading, or under a heading
 * too short to be a section, is stamped with the document only (D2, D3).
 *
 * @returns {Promise<{source_book_id: string, source_book_title: string, source_section: object|null}|null>}
 */
export async function resolveCardSource({ book, editor, getSections }) {
  const bookId = book?._id || book?.id
  if (!bookId) return null
  const base = { source_book_id: String(bookId), source_book_title: book?.title || '', source_section: null }
  if (!editor) return base
  let heading = null
  try {
    heading = enclosingHeading(editor.getEditorState().toJSON(), selectionBlockIndex(editor))
  } catch {
    return base
  }
  if (!heading) return base
  try {
    const { sections = [] } = (await getSections(bookId)) || {}
    const match = sections.find((section) => section.heading === heading)
    if (!match) return base
    return { ...base, source_section: { heading: match.heading, index: match.index, hash: match.hash } }
  } catch {
    return base
  }
}

/**
 * Make a stored document one the editor can parse whole (IMPORT-005).
 *
 * Until IMPORT-001 the importer wrote bare nodes: a list item with no `indent`,
 * a nested list sitting directly inside its parent list, nothing carrying a
 * `version`. Lexical's `ListItemNode.setIndent` throws on the first of those,
 * `parseEditorState` swallows the throw and returns what it had built so far,
 * and the next save writes that fragment over the document. Every document
 * imported before the fix is stored that way, so the shape is repaired here,
 * on the way into the editor, as well as at the source.
 *
 * Only what is missing is filled in. A document the editor wrote itself comes
 * back equal to what went in.
 */

const isList = (node) => node?.type === 'list'
const isNumber = (value) => typeof value === 'number' && Number.isFinite(value)
const wrapsAList = (item) => isList(item.children?.[0])

const TEXT_DEFAULTS = { detail: 0, mode: 'normal', style: '', version: 1 }

/** Lexical's text format bits, by the names the old importer stored instead (IMPORT-009). */
const FORMAT_BITS = { bold: 1, italic: 2, strikethrough: 4, underline: 8, code: 16, subscript: 32, superscript: 64 }

/** A text node whose format is a list of names reads as unformatted: make it the bitmask it meant. */
const repairText = (node) => {
  const text = withDefaults(node, TEXT_DEFAULTS)
  if (Array.isArray(node.format)) text.format = node.format.reduce((mask, name) => mask | (FORMAT_BITS[name] || 0), 0)
  return text
}
const ELEMENT_DEFAULTS = { direction: null, format: '', indent: 0, version: 1 }

const withDefaults = (node, defaults) => {
  const filled = { ...node }
  for (const [key, value] of Object.entries(defaults)) {
    if (filled[key] === undefined) filled[key] = value
  }
  return filled
}

/** A list's rows: every child a list item, a nested list inside an item of its own. */
const repairRows = (children, depth) => {
  let number = 0
  return children.map((child) => {
    let row = child
    if (isList(child)) row = { type: 'listitem', children: [child] }
    else if (child?.type !== 'listitem') row = { type: 'listitem', children: Array.isArray(child?.children) ? child.children : [child] }
    const repaired = repairNode(row, depth)
    if (!wrapsAList(repaired)) number += 1
    if (!isNumber(row.value)) repaired.value = wrapsAList(repaired) ? number + 1 : number
    if (!isNumber(row.indent)) repaired.indent = depth
    return repaired
  })
}

const repairList = (node, depth) => {
  const listType = node.listType || (node.tag === 'ol' ? 'number' : 'bullet')
  const list = withDefaults({ ...node, listType }, { ...ELEMENT_DEFAULTS, start: 1, tag: listType === 'number' ? 'ol' : 'ul' })
  list.children = repairRows(Array.isArray(node.children) ? node.children : [], depth)
  return list
}

function repairNode(node, depth) {
  if (!node || typeof node !== 'object') return node
  if (node.type === 'text') return repairText(node)
  if (isList(node)) return repairList(node, depth)
  if (!Array.isArray(node.children)) return node.version === undefined ? { ...node, version: 1 } : node
  const element = withDefaults(node, ELEMENT_DEFAULTS)
  // A list inside a list item is one level deeper than the item.
  const childDepth = node.type === 'listitem' ? depth + 1 : 0
  element.children = node.children.map((child) => repairNode(child, childDepth))
  return element
}

/**
 * @param {{root: object}} state - a parsed Lexical editor state
 * @returns {{root: object}} the same state with every field the editor reads
 */
export function repairLexicalState(state) {
  if (!state || typeof state !== 'object' || !state.root || typeof state.root !== 'object') return state
  return { ...state, root: repairNode({ ...state.root, type: 'root' }, 0) }
}

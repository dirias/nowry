/**
 * What a board holds (PRD D2, D10; ADR-047): four kinds of node, five note
 * colours, three text sizes, and the limits the API enforces.
 */

export const NODE_KINDS = ['note', 'text', 'frame', 'item']
export const NOTE_COLORS = ['yellow', 'green', 'blue', 'pink', 'grey']
export const DEFAULT_NOTE_COLOR = 'yellow'
export const TEXT_SIZES = ['md', 'lg', 'xl']
export const ITEM_REF_KINDS = ['task', 'milestone', 'goal']

/** The size a node has when its `w`/`h` are null. */
export const DEFAULT_SIZES = {
  note: { w: 220, h: 100 },
  text: { w: 240, h: 40 },
  frame: { w: 300, h: 300 },
  item: { w: 256, h: 56 }
}

export const MAX_NODES = 500
export const MAX_LINKS = 1000
export const MAX_CHANGES = 300
export const HISTORY_LIMIT = 50

/** A frame wraps what it holds with this much room, and its title sits in a band above. */
export const FRAME_PADDING = 32
export const FRAME_TITLE_BAND = 28

/** The room between a note and the next one made beside it (Tab, ⌘ Enter, the "+"). */
export const NODE_GAP = 24
export const CHILD_GAP_X = 80
export const CHILD_GAP_Y = 48

/** A node's drawn size: its own `w`/`h`, else its kind's default. */
export const nodeSize = (node) => {
  const fallback = DEFAULT_SIZES[node?.kind] ?? DEFAULT_SIZES.note
  return { w: node?.w ?? fallback.w, h: node?.h ?? fallback.h }
}

const CHARS_PER_LINE = 26
const LINE_HEIGHT = 20
const NOTE_PADDING_Y = 32

/**
 * A size to lay a node out by. A note with no stored height grows with its
 * text when drawn, so layout estimates that growth rather than trusting the
 * 100 px default and stacking long notes on top of each other.
 */
export const layoutSize = (node) => {
  const size = nodeSize(node)
  if (node?.kind !== 'note' || node.h != null) return size
  const lines = String(node.text ?? '')
    .split('\n')
    .reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / CHARS_PER_LINE)), 0)
  return { w: size.w, h: Math.max(size.h, NOTE_PADDING_Y + lines * LINE_HEIGHT) }
}

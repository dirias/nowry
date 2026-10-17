/**
 * The board, as the library draws it (BOARD-004). A board node becomes an
 * xyflow node and a link an edge; selection, measurement and editing are the
 * canvas's own state and travel in alongside, never into the saved board.
 */
import { MarkerType } from '@xyflow/react'
import { DEFAULT_SIZES } from '@nowry/core/domain/board'

/** Frames always sit behind everything else (PRD D3). */
export const FRAME_LAYER = -1000

/** A note can be made smaller than its default, never smaller than this. */
export const NOTE_MIN = { w: 140, h: 60 }

/**
 * Frames by area, largest first: a smaller frame drawn inside a larger one
 * stays on top of it whatever order they were made in.
 */
export const frameRanks = (nodes) => {
  const frames = nodes.filter((n) => n.kind === 'frame')
  const area = (n) => (n.w ?? DEFAULT_SIZES.frame.w) * (n.h ?? DEFAULT_SIZES.frame.h)
  return new Map([...frames].sort((a, b) => area(b) - area(a)).map((n, i) => [n.id, i]))
}

/** The width the library gets: notes and frames always have one; a text grows with its words unless sized. */
const widthOf = (node) => {
  if (node.kind === 'text') return node.w ?? undefined
  return node.w ?? DEFAULT_SIZES[node.kind]?.w ?? DEFAULT_SIZES.note.w
}

/** Only frames and resized notes have a fixed height; everything else grows with what it holds. */
const heightOf = (node) => {
  if (node.kind === 'frame') return node.h ?? DEFAULT_SIZES.frame.h
  if (node.kind === 'note') return node.h ?? undefined
  return undefined
}

/**
 * @param {object} node a board node
 * @param {object} view `{ selected, editing, plus, fresh, measured, rank }`
 */
export const toFlowNode = (node, { selected = false, editing = false, plus = false, fresh = false, measured, rank = 0 } = {}) => {
  const out = {
    id: node.id,
    type: node.kind,
    position: { x: node.x, y: node.y },
    zIndex: node.kind === 'frame' ? FRAME_LAYER + rank : (node.z ?? 0),
    selected,
    data: { node, editing, plus, fresh }
  }
  const width = widthOf(node)
  const height = heightOf(node)
  if (width !== undefined) out.width = width
  if (height !== undefined) out.height = height
  if (measured) out.measured = measured
  if (node.kind === 'frame') out.dragHandle = '.board-frame-title'
  return out
}

/** One quiet weight, an arrow at the end (canvas board 2). */
export const LINK_MARKER = { type: MarkerType.ArrowClosed, width: 16, height: 16, color: 'var(--joy-palette-text-tertiary)' }

export const toFlowEdge = (link, { selected = false, editing = false } = {}) => ({
  id: link.id,
  source: link.from,
  target: link.to,
  type: 'link',
  selected,
  markerEnd: LINK_MARKER,
  data: { label: link.label ?? '', editing }
})

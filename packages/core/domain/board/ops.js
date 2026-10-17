/**
 * Pure board edits the canvas calls (PRD D3). Each takes a board `{ nodes,
 * links, … }` and returns a new one; nothing is mutated. A node made by an
 * edit is the LAST node of the returned board, and its id can be chosen by
 * the caller (`{ id }`) when it must be known before the edit, to select it
 * or start typing in it. Positions are top-left corners.
 */
import { CHILD_GAP_X, CHILD_GAP_Y, DEFAULT_NOTE_COLOR, DEFAULT_SIZES, FRAME_PADDING, FRAME_TITLE_BAND, NODE_GAP, layoutSize } from './kinds'

let counter = 0

/** A fresh id: a counter, the time and a little randomness; no crypto global needed. */
export const nextId = (prefix = 'n') => {
  counter = (counter + 1) % 1679616
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/** The box around some nodes, or null for none. */
export const bounds = (nodes) => {
  if (!nodes?.length) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  nodes.forEach((node) => {
    const { w, h } = layoutSize(node)
    minX = Math.min(minX, node.x)
    minY = Math.min(minY, node.y)
    maxX = Math.max(maxX, node.x + w)
    maxY = Math.max(maxY, node.y + h)
  })
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY, minX, minY, maxX, maxY }
}

const rectOf = (node) => ({ x: node.x, y: node.y, ...layoutSize(node) })

export const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

const topZ = (board) => board.nodes.filter((n) => n.kind !== 'frame').reduce((z, n) => Math.max(z, n.z ?? 0), 0)

const findNode = (board, id) => board.nodes.find((n) => n.id === id) ?? null

export const makeNote = ({ id, x = 0, y = 0, color = DEFAULT_NOTE_COLOR, text = '', z = 0 } = {}) => ({
  id: id ?? nextId('n'),
  kind: 'note',
  x,
  y,
  w: null,
  h: null,
  z,
  text,
  color,
  size: null,
  title: null,
  ref: null,
  cardIds: []
})

export const makeLink = ({ id, from, to, label = '' }) => ({ id: id ?? nextId('l'), from, to, label })

/** Adds nodes and links made elsewhere (an import, a paste). */
export const insert = (board, { nodes = [], links = [] }) => ({
  ...board,
  nodes: [...board.nodes, ...nodes],
  links: [...board.links, ...links]
})

export const addNote = (board, { id, x = 0, y = 0, color = DEFAULT_NOTE_COLOR, text = '' } = {}) =>
  insert(board, { nodes: [makeNote({ id, x, y, color, text, z: topZ(board) + 1 })] })

/**
 * Steps a rectangle along `step` until it overlaps no node other than a frame
 * (frames sit behind) or one of `ignore`.
 */
const freeSpot = (board, rect, step, ignore = []) => {
  const others = board.nodes.filter((n) => n.kind !== 'frame' && !ignore.includes(n.id)).map(rectOf)
  const spot = { ...rect }
  for (let i = 0; i < 500 && others.some((o) => overlaps(spot, o)); i += 1) {
    spot.x += step.x
    spot.y += step.y
  }
  return spot
}

const noteSize = DEFAULT_SIZES.note

const besideParent = (parent, side) => {
  const p = rectOf(parent)
  const { w, h } = noteSize
  switch (side) {
    case 'left':
      return { x: p.x - CHILD_GAP_X - w, y: p.y, w, h }
    case 'top':
      return { x: p.x, y: p.y - CHILD_GAP_Y - h, w, h }
    case 'bottom':
      return { x: p.x, y: p.y + p.h + CHILD_GAP_Y, w, h }
    default:
      return { x: p.x + p.w + CHILD_GAP_X, y: p.y, w, h }
  }
}

const colorFrom = (node, color) => color ?? (node?.kind === 'note' && node.color ? node.color : DEFAULT_NOTE_COLOR)

/**
 * A new note linked from `parentId`, on that side of it (Tab, the "+").
 * Siblings already there push it down (left, right) or along (top, bottom)
 * by a note and a gap.
 */
export const addChild = (board, parentId, { side = 'right', id, text = '', color, linkId } = {}) => {
  const parent = findNode(board, parentId)
  if (!parent) return board
  const vertical = side === 'top' || side === 'bottom'
  const step = vertical ? { x: noteSize.w + NODE_GAP, y: 0 } : { x: 0, y: noteSize.h + NODE_GAP }
  const spot = freeSpot(board, besideParent(parent, side), step)
  const withNote = addNote(board, { id, x: spot.x, y: spot.y, color: colorFrom(parent, color), text })
  const child = withNote.nodes[withNote.nodes.length - 1]
  return { ...withNote, links: [...withNote.links, makeLink({ id: linkId, from: parentId, to: child.id })] }
}

/**
 * A new note below `nodeId` (⌘ Enter), linked from the node's parent when it
 * has exactly one incoming link, else standing alone.
 */
export const addSibling = (board, nodeId, { id, text = '', color, linkId } = {}) => {
  const node = findNode(board, nodeId)
  if (!node) return board
  const r = rectOf(node)
  const spot = freeSpot(board, { x: r.x, y: r.y + r.h + NODE_GAP, ...noteSize }, { x: 0, y: noteSize.h + NODE_GAP })
  const next = addNote(board, { id, x: spot.x, y: spot.y, color: colorFrom(node, color), text })
  const incoming = board.links.filter((l) => l.to === nodeId)
  if (incoming.length !== 1) return next
  const sibling = next.nodes[next.nodes.length - 1]
  return { ...next, links: [...next.links, makeLink({ id: linkId, from: incoming[0].from, to: sibling.id })] }
}

/** Links two nodes; a self-link, a missing end or a link already there leaves the board as it is. */
export const connect = (board, from, to, { id, label = '' } = {}) => {
  if (from === to || !findNode(board, from) || !findNode(board, to)) return board
  if (board.links.some((l) => l.from === from && l.to === to)) return board
  return { ...board, links: [...board.links, makeLink({ id, from, to, label })] }
}

/** Removes nodes and every link that touches one of them. */
export const removeNodes = (board, ids) => {
  const gone = new Set(ids)
  return {
    ...board,
    nodes: board.nodes.filter((n) => !gone.has(n.id)),
    links: board.links.filter((l) => !gone.has(l.from) && !gone.has(l.to))
  }
}

export const removeLinks = (board, ids) => {
  const gone = new Set(ids)
  return { ...board, links: board.links.filter((l) => !gone.has(l.id)) }
}

/** Changes the fields of one node (text, colour, size, position…). */
export const updateNode = (board, id, patch) => ({
  ...board,
  nodes: board.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n))
})

export const updateLink = (board, id, patch) => ({
  ...board,
  links: board.links.map((l) => (l.id === id ? { ...l, ...patch } : l))
})

const centreOf = (node) => {
  const { w, h } = layoutSize(node)
  return { x: node.x + w / 2, y: node.y + h / 2 }
}

/** The nodes whose centre lies inside the frame. */
export const nodesInFrame = (board, frameId) => {
  const frame = findNode(board, frameId)
  if (!frame) return []
  const f = rectOf(frame)
  return board.nodes.filter((n) => {
    if (n.id === frameId) return false
    const c = centreOf(n)
    return c.x >= f.x && c.x <= f.x + f.w && c.y >= f.y && c.y <= f.y + f.h
  })
}

/**
 * Moves nodes by `{ dx, dy }`; a frame carries what it holds (PRD D3, "frames
 * move what they hold").
 */
export const moveNodes = (board, ids, { dx = 0, dy = 0 }) => {
  const moving = new Set(ids)
  ids.forEach((id) => {
    if (findNode(board, id)?.kind === 'frame') nodesInFrame(board, id).forEach((n) => moving.add(n.id))
  })
  return { ...board, nodes: board.nodes.map((n) => (moving.has(n.id) ? { ...n, x: n.x + dx, y: n.y + dy } : n)) }
}

/**
 * Copies nodes (⌘ D), offset by `{ dx, dy }`, with the links among them. The
 * copies are the last nodes of the returned board; cards stay with the
 * originals.
 */
export const duplicateNodes = (board, ids, { dx = 24, dy = 24, idPrefix = 'n' } = {}) => {
  const chosen = new Set(ids)
  const map = new Map()
  const z = topZ(board)
  const copies = board.nodes
    .filter((n) => chosen.has(n.id))
    .map((n, i) => {
      const id = nextId(idPrefix)
      map.set(n.id, id)
      return { ...n, id, x: n.x + dx, y: n.y + dy, z: n.kind === 'frame' ? n.z : z + 1 + i, cardIds: [] }
    })
  const links = board.links
    .filter((l) => map.has(l.from) && map.has(l.to))
    .map((l) => makeLink({ from: map.get(l.from), to: map.get(l.to), label: l.label }))
  return insert(board, { nodes: copies, links })
}

/**
 * A frame around the selected nodes (⌘ G): their box with 32 px of room on
 * every side and the title band above, drawn behind the lowest of them.
 */
export const frameSelection = (board, ids, title = '', { id } = {}) => {
  const chosen = board.nodes.filter((n) => ids.includes(n.id))
  const box = bounds(chosen)
  if (!box) return board
  const lowest = chosen.reduce((z, n) => Math.min(z, n.z ?? 0), Infinity)
  const frame = {
    id: id ?? nextId('f'),
    kind: 'frame',
    x: box.x - FRAME_PADDING,
    y: box.y - FRAME_PADDING - FRAME_TITLE_BAND,
    w: box.w + FRAME_PADDING * 2,
    h: box.h + FRAME_PADDING * 2 + FRAME_TITLE_BAND,
    z: lowest - 1,
    text: null,
    color: null,
    size: null,
    title,
    ref: null,
    cardIds: []
  }
  return insert(board, { nodes: [frame] })
}

/**
 * The canvas's own edits on top of the board domain (`@nowry/core/domain/board`):
 * the kinds core does not make (a text, a drawn frame), and the two edits the
 * pointer makes many times a second (a drag, a resize). Pure: each takes a board
 * and returns a new one.
 */
import { DEFAULT_SIZES, insert, nextId } from '@nowry/core/domain/board'

const BLANK = { w: null, h: null, text: null, color: null, size: null, title: null, ref: null, cardIds: [] }

/** The z one above every node but the frames (frames sit behind, PRD D3). */
export const nextZ = (board) => board.nodes.filter((n) => n.kind !== 'frame').reduce((z, n) => Math.max(z, n.z ?? 0), 0) + 1

/** A text block (T): a heading with no box. */
export const addText = (board, { id = nextId('t'), x = 0, y = 0, size = 'lg', text = '' } = {}) =>
  insert(board, { nodes: [{ ...BLANK, id, kind: 'text', x, y, z: nextZ(board), text, size }] })

/** A frame drawn with F, or dropped at its default size by a click. */
export const addFrame = (
  board,
  { id = nextId('f'), x = 0, y = 0, w = DEFAULT_SIZES.frame.w, h = DEFAULT_SIZES.frame.h, title = '' } = {}
) => {
  const lowest = board.nodes.filter((n) => n.kind === 'frame').reduce((z, n) => Math.min(z, n.z ?? 0), 0)
  return insert(board, { nodes: [{ ...BLANK, id, kind: 'frame', x, y, w, h, z: lowest - 1, title }] })
}

const round = (value) => Math.round(value)

/**
 * Places nodes during a drag. `moves` is `{ id: {x, y} }` from the library;
 * `drag` is what the drag started from: every node's position then, and for
 * each dragged frame the ids it carries. A carried node follows its frame by
 * the frame's delta unless the library moved it itself (it was selected too).
 */
export const placeNodes = (board, moves, drag = null) => {
  const next = new Map(Object.entries(moves).map(([id, p]) => [id, { x: round(p.x), y: round(p.y) }]))
  if (drag) {
    Object.entries(drag.carried ?? {}).forEach(([frameId, ids]) => {
      const to = next.get(frameId)
      const from = drag.starts?.[frameId]
      if (!to || !from) return
      const dx = to.x - from.x
      const dy = to.y - from.y
      ids.forEach((id) => {
        const start = drag.starts[id]
        if (!next.has(id) && start) next.set(id, { x: start.x + dx, y: start.y + dy })
      })
    })
  }
  if (!next.size) return board
  return {
    ...board,
    nodes: board.nodes.map((n) => {
      const p = next.get(n.id)
      return p && (p.x !== n.x || p.y !== n.y) ? { ...n, x: p.x, y: p.y } : n
    })
  }
}

/** Sets the sizes a resize handle reported, `{ id: {width, height} }`. */
export const resizeNodes = (board, sizes) => {
  const ids = Object.keys(sizes)
  if (!ids.length) return board
  return {
    ...board,
    nodes: board.nodes.map((n) => {
      const s = sizes[n.id]
      if (!s) return n
      const w = s.width == null ? n.w : round(s.width)
      const h = s.height == null ? n.h : round(s.height)
      return w === n.w && h === n.h ? n : { ...n, w, h }
    })
  }
}

/** The ids of the nodes (and links) that would be copied, framed or removed — only those still on the board. */
export const presentIds = (items, ids) => {
  const have = new Set(items.map((x) => x.id))
  return ids.filter((id) => have.has(id))
}

/** The first line of a note is its title (PRD D2). */
export const splitText = (text) => {
  const value = text ?? ''
  const at = value.indexOf('\n')
  return at === -1 ? { title: value, body: '' } : { title: value.slice(0, at), body: value.slice(at + 1) }
}

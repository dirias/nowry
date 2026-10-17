import { layoutSize } from './kinds'
import { bounds } from './ops'

/** The space kept between a pasted group and what is already there. */
export const CLEAR_GAP = 32
/** How far apart the candidate spots are, and how many rings are searched. */
const STEP = 40
const MAX_RINGS = 40

const rectOf = (node) => ({ x: node.x, y: node.y, ...layoutSize(node) })

const hits = (box, obstacles, gap) =>
  obstacles.some((o) => box.x < o.x + o.w + gap && o.x < box.x + box.w + gap && box.y < o.y + o.h + gap && o.y < box.y + box.h + gap)

/** The candidate offsets on ring `r`, nearest first. */
const ring = (r) => {
  if (r === 0) return [{ dx: 0, dy: 0 }]
  const spots = []
  for (let i = -r; i <= r; i += 1) {
    spots.push({ dx: i * STEP, dy: -r * STEP }, { dx: i * STEP, dy: r * STEP })
    if (i !== -r && i !== r) spots.push({ dx: -r * STEP, dy: i * STEP }, { dx: r * STEP, dy: i * STEP })
  }
  return spots.sort((a, b) => Math.hypot(a.dx, a.dy) - Math.hypot(b.dx, b.dy))
}

/**
 * Where a pasted or imported group can go without covering anything
 * (BOARD-010). The group arrives laid out around the view's centre; this
 * finds the smallest move, searched outward on a 40 px grid, that leaves a
 * clear gap to every node already on the board, frames included. When
 * nothing near is free, the group goes just right of the board, top-aligned.
 *
 * @returns {{dx: number, dy: number, moved: boolean}}
 */
export const findClearOffset = (board, incoming, { gap = CLEAR_GAP } = {}) => {
  const box = bounds(incoming.nodes)
  const obstacles = (board.nodes ?? []).map(rectOf)
  if (!box || !obstacles.length) return { dx: 0, dy: 0, moved: false }
  for (let r = 0; r <= MAX_RINGS; r += 1) {
    const free = ring(r).find(({ dx, dy }) => !hits({ x: box.x + dx, y: box.y + dy, w: box.w, h: box.h }, obstacles, gap))
    if (free) return { ...free, moved: r > 0 }
  }
  const all = bounds(board.nodes)
  return { dx: all.maxX + gap * 2 - box.x, dy: all.minY - box.y, moved: true }
}

/** The group moved by an offset. */
export const shiftGroup = (incoming, { dx, dy }) =>
  dx || dy ? { ...incoming, nodes: incoming.nodes.map((n) => ({ ...n, x: n.x + dx, y: n.y + dy })) } : incoming

/** The group placed clear of the board: `findClearOffset` then `shiftGroup`. */
export const placeClear = (board, incoming, options) => {
  const offset = findClearOffset(board, incoming, options)
  return { incoming: shiftGroup(incoming, offset), offset }
}

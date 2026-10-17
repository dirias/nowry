import { CLEAR_GAP, bounds, findClearOffset, layoutSize, makeNote, placeClear } from '../index'

const note = (id, x, y, w = 220, h = 100) => ({ ...makeNote({ id, x, y }), w, h })
const box = (n) => ({ x: n.x, y: n.y, ...layoutSize(n) })
const apart = (a, b, gap) => a.x + a.w + gap <= b.x || b.x + b.w + gap <= a.x || a.y + a.h + gap <= b.y || b.y + b.h + gap <= a.y

describe('placeClear (BOARD-010): a paste never lands on what is there', () => {
  it('stays put on empty space', () => {
    const board = { nodes: [note('a', 2000, 2000)], links: [] }
    const incoming = { nodes: [note('p', 0, 0)], links: [] }
    expect(findClearOffset(board, incoming)).toEqual({ dx: 0, dy: 0, moved: false })
  })

  it('moves the least it can to leave a clear gap to every node, frames included', () => {
    const frame = { ...note('f', -200, -200, 600, 500), kind: 'frame', z: -1 }
    const board = { nodes: [frame, note('a', 0, 0)], links: [] }
    const incoming = { nodes: [note('p', 0, 0), note('q', 260, 0)], links: [] }
    const { incoming: placed, offset } = placeClear(board, incoming)
    expect(offset.moved).toBe(true)
    const group = bounds(placed.nodes)
    board.nodes.forEach((n) => expect(apart({ x: group.x, y: group.y, w: group.w, h: group.h }, box(n), CLEAR_GAP)).toBe(true))
    // The group keeps its own shape.
    expect(placed.nodes[1].x - placed.nodes[0].x).toBe(260)
  })

  it('goes just right of the board when nothing near is free', () => {
    const wall = Array.from({ length: 900 }, (_, i) => note(`w${i}`, (i % 30) * 120 - 1800, Math.floor(i / 30) * 120 - 1800, 120, 120))
    const board = { nodes: wall, links: [] }
    const incoming = { nodes: [note('p', 0, 0)], links: [] }
    const { incoming: placed } = placeClear(board, incoming)
    const all = bounds(wall)
    expect(placed.nodes[0].x).toBeGreaterThan(all.maxX)
    expect(placed.nodes[0].y).toBe(all.minY)
  })
})

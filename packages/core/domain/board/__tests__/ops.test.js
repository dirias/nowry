/**
 * BOARD-002 — the pure edits the canvas calls. No DOM.
 */
import {
  addNote,
  addChild,
  addSibling,
  connect,
  removeNodes,
  frameSelection,
  nodesInFrame,
  moveNodes,
  duplicateNodes,
  nextId,
  bounds,
  overlaps,
  layoutSize,
  FRAME_PADDING,
  FRAME_TITLE_BAND
} from '../index'

const empty = () => ({ nodes: [], links: [] })
const last = (board) => board.nodes[board.nodes.length - 1]
const rect = (n) => ({ x: n.x, y: n.y, ...layoutSize(n) })

describe('nextId', () => {
  it('never repeats', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => nextId('n')))
    expect(ids.size).toBe(1000)
    expect([...ids][0]).toMatch(/^n-/)
  })
})

describe('addNote', () => {
  it('adds a note where asked, above what is there, without touching the input', () => {
    const board = empty()
    const one = addNote(board, { x: 10, y: 20, id: 'a' })
    const two = addNote(one, { x: 0, y: 0, color: 'blue', text: 'Hi' })
    expect(board.nodes).toHaveLength(0)
    expect(last(one)).toMatchObject({ id: 'a', kind: 'note', x: 10, y: 20, color: 'yellow', text: '', z: 1, cardIds: [] })
    expect(last(two)).toMatchObject({ color: 'blue', text: 'Hi', z: 2 })
  })
})

describe('addChild', () => {
  it('places a linked note to the right, and the next one below it, never overlapping', () => {
    let board = addNote(empty(), { id: 'p', x: 0, y: 0 })
    board = addChild(board, 'p', { id: 'c1' })
    board = addChild(board, 'p', { id: 'c2' })
    board = addChild(board, 'p', { id: 'c3' })
    const [p, c1, c2, c3] = board.nodes
    expect(c1.x).toBeGreaterThan(p.x + layoutSize(p).w)
    expect(c1.y).toBe(p.y)
    expect(c2.y).toBeGreaterThan(c1.y)
    expect(c3.y).toBeGreaterThan(c2.y)
    const rects = board.nodes.map(rect)
    rects.forEach((a, i) => rects.slice(i + 1).forEach((b) => expect(overlaps(a, b)).toBe(false)))
    expect(board.links.map((l) => [l.from, l.to])).toEqual([
      ['p', 'c1'],
      ['p', 'c2'],
      ['p', 'c3']
    ])
  })

  it('steps along when placing above or below', () => {
    let board = addNote(empty(), { id: 'p', x: 0, y: 0 })
    board = addChild(board, 'p', { side: 'bottom', id: 'b1' })
    board = addChild(board, 'p', { side: 'bottom', id: 'b2' })
    const [, b1, b2] = board.nodes
    expect(b1.y).toBeGreaterThan(0)
    expect(b2.y).toBe(b1.y)
    expect(b2.x).toBeGreaterThan(b1.x)
    board = addChild(board, 'p', { side: 'left', id: 'l' })
    expect(last(board).x).toBeLessThan(0)
    board = addChild(board, 'p', { side: 'top', id: 't' })
    expect(last(board).y).toBeLessThan(0)
  })

  it('takes the parent note colour and leaves an unknown parent alone', () => {
    const board = addNote(empty(), { id: 'p', color: 'pink' })
    expect(last(addChild(board, 'p')).color).toBe('pink')
    expect(addChild(board, 'nope')).toBe(board)
  })
})

describe('addSibling', () => {
  it('goes below and links from the one parent', () => {
    let board = addNote(empty(), { id: 'p' })
    board = addChild(board, 'p', { id: 'c' })
    board = addSibling(board, 'c', { id: 's' })
    const c = board.nodes.find((n) => n.id === 'c')
    const s = last(board)
    expect(s.x).toBe(c.x)
    expect(s.y).toBeGreaterThan(c.y)
    expect(board.links.some((l) => l.from === 'p' && l.to === 's')).toBe(true)
  })

  it('stands alone when the node has no single parent', () => {
    let board = addNote(empty(), { id: 'a' })
    board = addSibling(board, 'a', { id: 'b' })
    expect(board.links).toHaveLength(0)
    expect(last(board).y).toBeGreaterThan(0)
  })
})

describe('connect and removeNodes', () => {
  it('links once, never to itself, and removing a node takes its links', () => {
    let board = addNote(addNote(addNote(empty(), { id: 'a' }), { id: 'b', x: 400 }), { id: 'c', x: 800 })
    board = connect(board, 'a', 'b')
    expect(connect(board, 'a', 'b')).toBe(board)
    expect(connect(board, 'a', 'a')).toBe(board)
    expect(connect(board, 'a', 'zz')).toBe(board)
    board = connect(board, 'b', 'c', { label: 'then' })
    expect(board.links).toHaveLength(2)
    const after = removeNodes(board, ['b'])
    expect(after.nodes.map((n) => n.id)).toEqual(['a', 'c'])
    expect(after.links).toHaveLength(0)
  })
})

describe('frames', () => {
  const board = () => {
    let b = addNote(empty(), { id: 'a', x: 0, y: 0 })
    b = addNote(b, { id: 'b', x: 300, y: 200 })
    b = addNote(b, { id: 'out', x: 2000, y: 2000 })
    return b
  }

  it('frames the selection with room around it, behind the lowest note', () => {
    const framed = frameSelection(board(), ['a', 'b'], 'Inputs', { id: 'f' })
    const frame = last(framed)
    const box = bounds(framed.nodes.filter((n) => ['a', 'b'].includes(n.id)))
    expect(frame).toMatchObject({ id: 'f', kind: 'frame', title: 'Inputs' })
    expect(frame.x).toBe(box.x - FRAME_PADDING)
    expect(frame.y).toBe(box.y - FRAME_PADDING - FRAME_TITLE_BAND)
    expect(frame.x + frame.w).toBe(box.maxX + FRAME_PADDING)
    expect(frame.y + frame.h).toBe(box.maxY + FRAME_PADDING)
    expect(frame.z).toBe(0)
    expect(frameSelection(board(), [], 'x').nodes).toHaveLength(3)
  })

  it('knows what a frame holds, and moving the frame moves it', () => {
    const framed = frameSelection(board(), ['a', 'b'], 'Inputs', { id: 'f' })
    expect(nodesInFrame(framed, 'f').map((n) => n.id)).toEqual(['a', 'b'])
    const moved = moveNodes(framed, ['f'], { dx: 10, dy: -5 })
    expect(moved.nodes.find((n) => n.id === 'a')).toMatchObject({ x: 10, y: -5 })
    expect(moved.nodes.find((n) => n.id === 'out')).toMatchObject({ x: 2000, y: 2000 })
  })

  it('duplicates nodes with the links among them', () => {
    let b = connect(board(), 'a', 'b')
    b = connect(b, 'b', 'out')
    const copy = duplicateNodes(b, ['a', 'b'])
    expect(copy.nodes).toHaveLength(5)
    expect(copy.links).toHaveLength(3)
    const [na, nb] = copy.nodes.slice(3)
    expect(na).toMatchObject({ x: 24, y: 24 })
    expect(copy.links[2]).toMatchObject({ from: na.id, to: nb.id })
  })
})

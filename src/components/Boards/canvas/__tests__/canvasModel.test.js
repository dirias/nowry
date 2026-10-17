/**
 * BOARD-004 — the canvas's pure parts: what a key means (PRD D3), how the
 * board is handed to the library, and the drag and resize edits.
 */
import { boardKeyAction, isOwnedTarget } from '../useBoardKeys'
import { FRAME_LAYER, frameRanks, toFlowEdge, toFlowNode } from '../toFlow'
import { addFrame, addText, placeNodes, resizeNodes, splitText } from '../boardEdits'

jest.mock('@xyflow/react', () => ({ MarkerType: { ArrowClosed: 'arrowclosed' } }))

const key = (k, extra = {}) => ({ key: k, code: '', metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, ...extra })
const NOTE = { id: 'a', kind: 'note' }

describe('boardKeyAction', () => {
  it.each([
    [key('z', { metaKey: true }), {}, { type: 'undo' }],
    [key('z', { metaKey: true, shiftKey: true }), {}, { type: 'redo' }],
    [key('y', { ctrlKey: true }), {}, { type: 'redo' }],
    [key('a', { metaKey: true }), {}, { type: 'selectAll' }],
    [key('d', { metaKey: true }), { count: 1 }, { type: 'duplicate' }],
    [key('g', { ctrlKey: true }), { count: 2 }, { type: 'frameSelection' }],
    [key('=', { metaKey: true }), {}, { type: 'zoomIn' }],
    [key('-', { metaKey: true }), {}, { type: 'zoomOut' }],
    [key('Enter', { metaKey: true }), { single: NOTE }, { type: 'sibling' }],
    [key('!', { code: 'Digit1', shiftKey: true }), {}, { type: 'fitBoard' }],
    [key('@', { code: 'Digit2', shiftKey: true }), {}, { type: 'fitSelection' }],
    [key('Escape'), {}, { type: 'escape' }],
    [key('Delete'), { count: 1 }, { type: 'remove' }],
    [key('Backspace'), { count: 1 }, { type: 'remove' }],
    [key('ArrowLeft'), { count: 1 }, { type: 'nudge', dx: -10, dy: 0 }],
    [key('ArrowDown', { shiftKey: true }), { count: 1 }, { type: 'nudge', dx: 0, dy: 50 }],
    [key('Tab'), { single: NOTE }, { type: 'child' }],
    [key('Enter'), { single: NOTE }, { type: 'edit' }],
    [key('q'), { single: NOTE }, { type: 'type', char: 'q' }],
    [key('n'), { single: NOTE }, { type: 'type', char: 'n' }],
    [key('n'), {}, { type: 'tool', tool: 'note' }],
    [key('V'), {}, { type: 'tool', tool: 'select' }],
    [key('h'), {}, { type: 'tool', tool: 'hand' }],
    [key('t'), {}, { type: 'tool', tool: 'text' }],
    [key('f'), {}, { type: 'tool', tool: 'frame' }],
    [key('i'), {}, { type: 'tool', tool: 'item' }],
    [key('?'), {}, { type: 'keys' }]
  ])('%o with %o → %o', (event, state, expected) => {
    expect(boardKeyAction(event, state)).toEqual(expected)
  })

  it.each([
    [key('Delete'), {}],
    [key('ArrowUp'), {}],
    [key('Tab'), {}],
    [key('Tab', { shiftKey: true }), { single: NOTE }],
    [key('Enter', { metaKey: true }), { single: { id: 'f', kind: 'frame' } }],
    [key(' '), { single: NOTE }],
    [key('d', { metaKey: true }), {}],
    [key('x', { altKey: true }), {}]
  ])('%o with %o means nothing', (event, state) => {
    expect(boardKeyAction(event, state)).toBeNull()
  })

  it('leaves keys to fields, buttons, menus and dialogs', () => {
    const input = document.createElement('input')
    const button = document.createElement('button')
    const menu = document.createElement('div')
    menu.setAttribute('role', 'menu')
    const inMenu = document.createElement('span')
    menu.appendChild(inMenu)
    expect([input, button, inMenu].map(isOwnedTarget)).toEqual([true, true, true])
    expect(isOwnedTarget(document.createElement('div'))).toBe(false)
  })
})

describe('toFlowNode / toFlowEdge', () => {
  const note = { id: 'n', kind: 'note', x: 10, y: 20, w: null, h: null, z: 4, text: 'Hi', color: 'blue' }

  it('a note keeps its width and grows in height until resized', () => {
    const out = toFlowNode(note, { selected: true })
    expect(out).toMatchObject({ id: 'n', type: 'note', position: { x: 10, y: 20 }, width: 220, zIndex: note.z, selected: true })
    expect(out.height).toBeUndefined()
    expect(toFlowNode({ ...note, w: 300, h: 160 })).toMatchObject({ width: 300, height: 160 })
  })

  it('frames sit below everything, the largest lowest, and are dragged by their title', () => {
    const big = { id: 'big', kind: 'frame', x: 0, y: 0, w: 800, h: 600, z: 9 }
    const small = { id: 'small', kind: 'frame', x: 0, y: 0, w: 200, h: 200, z: -9 }
    const ranks = frameRanks([small, note, big])
    const a = toFlowNode(big, { rank: ranks.get('big') })
    const b = toFlowNode(small, { rank: ranks.get('small') })
    expect(a.zIndex).toBe(FRAME_LAYER)
    expect(b.zIndex).toBe(FRAME_LAYER + 1)
    expect(b.zIndex).toBeLessThan(0)
    expect(a).toMatchObject({ width: 800, height: 600, dragHandle: '.board-frame-title' })
  })

  it('a text block takes its width from its words unless sized', () => {
    expect(toFlowNode({ id: 't', kind: 'text', x: 0, y: 0, w: null, h: null }).width).toBeUndefined()
  })

  it('a link is an edge with its label and an arrow', () => {
    expect(toFlowEdge({ id: 'l', from: 'a', to: 'b', label: 'feeds' })).toMatchObject({
      id: 'l',
      source: 'a',
      target: 'b',
      type: 'link',
      data: { label: 'feeds', editing: false },
      markerEnd: { type: 'arrowclosed' }
    })
  })
})

describe('boardEdits', () => {
  const board = {
    nodes: [
      { id: 'f', kind: 'frame', x: 0, y: 0, z: -1 },
      { id: 'a', kind: 'note', x: 50, y: 50, z: 3 }
    ],
    links: []
  }

  it('a text sits above every note; a drawn frame below every frame', () => {
    const withText = addText(board, { id: 't', x: 1, y: 2 })
    expect(withText.nodes[2]).toMatchObject({ id: 't', kind: 'text', size: 'lg', z: 4 })
    const withFrame = addFrame(board, { id: 'g', x: 5, y: 6, w: 120, h: 80 })
    expect(withFrame.nodes[2]).toMatchObject({ id: 'g', kind: 'frame', w: 120, h: 80, z: -2 })
  })

  it('placeNodes rounds positions and moves a dragged frame’s contents by its delta', () => {
    const drag = { starts: { f: { x: 0, y: 0 }, a: { x: 50, y: 50 } }, carried: { f: ['a'] } }
    const next = placeNodes(board, { f: { x: 10.4, y: -5.6 } }, drag)
    expect(next.nodes).toEqual([expect.objectContaining({ id: 'f', x: 10, y: -6 }), expect.objectContaining({ id: 'a', x: 60, y: 44 })])
    expect(placeNodes(board, {})).toBe(board)
  })

  it('resizeNodes keeps the side a one-way resize did not touch', () => {
    const next = resizeNodes(board, { a: { width: 260, height: null } })
    expect(next.nodes[1]).toMatchObject({ w: 260 })
    expect(next.nodes[1].h).toBeUndefined()
  })

  it('splitText: the first line is the title', () => {
    expect(splitText('Title\nbody\nmore')).toEqual({ title: 'Title', body: 'body\nmore' })
    expect(splitText(null)).toEqual({ title: '', body: '' })
  })
})

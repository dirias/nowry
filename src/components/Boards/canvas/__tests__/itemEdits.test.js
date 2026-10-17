/**
 * BOARD-005/006 — the board edits behind items and cards.
 */
import { addCardIds, addItem, notesToItems } from '../itemEdits'

const note = (id, extra = {}) => ({
  id,
  kind: 'note',
  x: 10,
  y: 20,
  w: null,
  h: 140,
  z: 2,
  text: `${id}\nbody`,
  color: 'green',
  size: null,
  title: null,
  ref: null,
  cardIds: [],
  ...extra
})

const BOARD = { nodes: [note('a'), note('b', { w: 300 }), note('c')], links: [{ id: 'l1', from: 'a', to: 'b', label: 'then' }] }

describe('addItem', () => {
  it('centres an item tile on the point, on top, keeping its title', () => {
    const next = addItem(BOARD, { id: 'i1', x: 500, y: 300, ref: { kind: 'goal', id: 'g1', goalId: null }, title: 'Run a marathon' })
    expect(next.nodes.at(-1)).toMatchObject({ id: 'i1', kind: 'item', x: 500 - 128, y: 300 - 28, z: 3, title: 'Run a marathon' })
    expect(next.nodes.at(-1).ref).toEqual({ kind: 'goal', id: 'g1', goalId: null })
  })
})

describe('notesToItems', () => {
  it('turns notes into task tiles in place, keeping their ids, place, width and links', () => {
    const next = notesToItems(BOARD, [
      { nodeId: 'a', taskId: 't1', title: 'a' },
      { nodeId: 'b', taskId: 't2', title: 'b' }
    ])
    const [a, b, c] = next.nodes
    expect(a).toMatchObject({ id: 'a', kind: 'item', x: 10, y: 20, w: 220, h: null, text: null, color: null, title: 'a' })
    expect(a.ref).toEqual({ kind: 'task', id: 't1', goalId: null })
    expect(b).toMatchObject({ id: 'b', kind: 'item', w: 300 })
    expect(c).toBe(BOARD.nodes[2])
    expect(next.links).toBe(BOARD.links)
  })

  it('changes nothing when no note matches', () => {
    expect(notesToItems(BOARD, [{ nodeId: 'gone', taskId: 't', title: 'x' }])).toBeNull()
  })
})

describe('addCardIds', () => {
  it('adds each card to its note, once', () => {
    const start = { ...BOARD, nodes: [note('a', { cardIds: ['c0'] }), note('b')] }
    const next = addCardIds(start, [
      { nodeId: 'a', cardId: 'c1' },
      { nodeId: 'a', cardId: 'c0' },
      { nodeId: 'b', cardId: 'c2' },
      { nodeId: null, cardId: 'c3' }
    ])
    expect(next.nodes[0].cardIds).toEqual(['c0', 'c1'])
    expect(next.nodes[1].cardIds).toEqual(['c2'])
  })
})

/**
 * BOARD-002 — the board read from the API and written back, saved by change,
 * and undone. No DOM.
 */
import {
  readBoard,
  readBoardSummary,
  readNode,
  toApiNode,
  toApiLink,
  readLink,
  diffBoard,
  mergeChanges,
  isEmptyChange,
  countChanges,
  splitChanges,
  toApiChanges,
  emptyChange,
  createHistory,
  push,
  undo,
  redo,
  canUndo,
  canRedo
} from '../index'

const apiNote = {
  id: 'n1',
  kind: 'note',
  x: 10,
  y: 20,
  w: null,
  h: null,
  z: 2,
  text: 'Photosynthesis\nin chloroplasts',
  color: 'yellow',
  size: null,
  title: null,
  ref: null,
  card_ids: ['c1']
}
const apiItem = {
  id: 'n2',
  kind: 'item',
  x: 300,
  y: 20,
  w: 256,
  h: 56,
  z: 3,
  text: null,
  color: null,
  size: null,
  title: null,
  ref: { kind: 'milestone', id: 'm1', goal_id: 'g1' },
  card_ids: []
}
const apiLink = { id: 'l1', from: 'n1', to: 'n2', label: 'leads to' }

const apiBoard = {
  id: 'b1',
  name: 'Biology',
  owner_user_id: 'u1',
  collaborators: ['u2'],
  schema: 2,
  rev: 7,
  nodes: [apiNote, apiItem],
  links: [apiLink],
  viewport: { x: -40, y: 12, zoom: 1.5 },
  created_at: '2026-10-17T08:00:00Z',
  updated_at: '2026-10-17T09:00:00Z'
}

describe('readers', () => {
  it('reads a board into camelCase', () => {
    const board = readBoard(apiBoard)
    expect(board).toMatchObject({
      id: 'b1',
      name: 'Biology',
      ownerId: 'u1',
      collaborators: ['u2'],
      rev: 7,
      viewport: { x: -40, y: 12, zoom: 1.5 },
      updatedAt: '2026-10-17T09:00:00Z'
    })
    expect(board.nodes[0]).toEqual({
      id: 'n1',
      kind: 'note',
      x: 10,
      y: 20,
      w: null,
      h: null,
      z: 2,
      text: 'Photosynthesis\nin chloroplasts',
      color: 'yellow',
      size: null,
      title: null,
      ref: null,
      cardIds: ['c1']
    })
    expect(board.nodes[1].ref).toEqual({ kind: 'milestone', id: 'm1', goalId: 'g1' })
    expect(board.links[0]).toEqual({ id: 'l1', from: 'n1', to: 'n2', label: 'leads to' })
  })

  it('round-trips nodes and links to the API names', () => {
    expect(toApiNode(readNode(apiNote))).toEqual(apiNote)
    expect(toApiNode(readNode(apiItem))).toEqual(apiItem)
    expect(toApiLink(readLink(apiLink))).toEqual(apiLink)
  })

  it('fills what a sparse document leaves out', () => {
    const board = readBoard({ id: 'b2', nodes: [{ id: 'x', x: '4', y: 5 }] })
    expect(board.rev).toBe(0)
    expect(board.viewport).toEqual({ x: 0, y: 0, zoom: 1 })
    expect(board.nodes[0]).toMatchObject({ kind: 'note', x: 4, y: 5, z: 0, cardIds: [], ref: null })
    expect(readBoard(null)).toBeNull()
  })

  it('reads a list row with its counts and outline', () => {
    const row = readBoardSummary({
      id: 'b1',
      name: 'Biology',
      owner_user_id: 'u1',
      owner_name: 'Didier',
      collaborators: [],
      is_owner: true,
      updated_at: '2026-10-17T09:00:00Z',
      counts: { notes: 4, links: 3, items: 1, cards: 12 },
      outline: [{ x: 0, y: 0, w: 220, h: 100, kind: 'note', color: 'green' }]
    })
    expect(row).toEqual({
      id: 'b1',
      name: 'Biology',
      ownerId: 'u1',
      ownerName: 'Didier',
      collaborators: [],
      isOwner: true,
      updatedAt: '2026-10-17T09:00:00Z',
      counts: { notes: 4, links: 3, items: 1, cards: 12 },
      outline: [{ x: 0, y: 0, w: 220, h: 100, kind: 'note', color: 'green' }]
    })
  })
})

describe('changes', () => {
  const prev = readBoard(apiBoard)

  it('finds nothing between equal boards', () => {
    expect(isEmptyChange(diffBoard(prev, { nodes: prev.nodes.map((n) => ({ ...n })), links: [...prev.links] }))).toBe(true)
  })

  it('finds what was added, changed and removed, by id', () => {
    const next = {
      nodes: [
        { ...prev.nodes[0], x: 99 },
        { ...prev.nodes[0], id: 'n3' }
      ],
      links: [{ ...prev.links[0], label: 'then' }]
    }
    const change = diffBoard(prev, next)
    expect(change.upsertNodes.map((n) => n.id)).toEqual(['n1', 'n3'])
    expect(change.deleteNodes).toEqual(['n2'])
    expect(change.upsertLinks).toEqual([{ id: 'l1', from: 'n1', to: 'n2', label: 'then' }])
    expect(change.deleteLinks).toEqual([])
    expect(countChanges(change)).toBe(4)
  })

  it('merges with the later operation winning per id', () => {
    const a = {
      ...emptyChange(),
      upsertNodes: [
        { id: 'n1', x: 1 },
        { id: 'n2', x: 1 }
      ],
      deleteNodes: ['n3']
    }
    const b = {
      ...emptyChange(),
      upsertNodes: [
        { id: 'n1', x: 2 },
        { id: 'n3', x: 5 }
      ],
      deleteNodes: ['n2']
    }
    const merged = mergeChanges(a, b)
    expect(merged.upsertNodes).toEqual([
      { id: 'n1', x: 2 },
      { id: 'n3', x: 5 }
    ])
    expect(merged.deleteNodes).toEqual(['n2'])
  })

  it('splits a large change, nodes before the links that need them', () => {
    const change = {
      upsertNodes: Array.from({ length: 5 }, (_, i) => ({ id: `n${i}` })),
      deleteNodes: ['d1'],
      upsertLinks: [{ id: 'l1' }, { id: 'l2' }],
      deleteLinks: ['dl1']
    }
    const { batch, rest } = splitChanges(change, 4)
    expect(batch).toEqual({ deleteLinks: ['dl1'], deleteNodes: ['d1'], upsertNodes: [{ id: 'n0' }, { id: 'n1' }], upsertLinks: [] })
    expect(countChanges(rest)).toBe(5)
    expect(rest.upsertNodes.map((n) => n.id)).toEqual(['n2', 'n3', 'n4'])
  })

  it('builds the PATCH body with only what is present', () => {
    const change = diffBoard(prev, { nodes: [prev.nodes[0]], links: [] })
    expect(toApiChanges(change, { rev: 7 })).toEqual({ rev: 7, delete_nodes: ['n2'], delete_links: ['l1'] })
    const body = toApiChanges(
      { ...emptyChange(), upsertNodes: [prev.nodes[1]] },
      { rev: 8, name: 'Bio', viewport: { x: 1, y: 2, zoom: 1 } }
    )
    expect(body).toEqual({ rev: 8, name: 'Bio', viewport: { x: 1, y: 2, zoom: 1 }, upsert_nodes: [apiItem] })
  })
})

describe('history', () => {
  const s = (n) => ({ nodes: [{ id: `n${n}` }], links: [] })

  it('undoes and redoes, and a new change clears redo', () => {
    let h = createHistory()
    expect(canUndo(h)).toBe(false)
    h = push(h, s(1))
    h = push(h, s(2))
    const u = undo(h, s(3))
    expect(u.snapshot).toEqual(s(2))
    expect(canRedo(u.history)).toBe(true)
    const r = redo(u.history, s(2))
    expect(r.snapshot).toEqual(s(3))
    expect(r.history.past).toEqual([s(1), s(2)])
    expect(canRedo(push(u.history, s(9)))).toBe(false)
    expect(undo(createHistory(), s(1))).toBeNull()
    expect(redo(createHistory(), s(1))).toBeNull()
  })

  it('keeps at most `limit` steps', () => {
    let h = createHistory(3)
    for (let i = 0; i < 10; i += 1) h = push(h, s(i))
    expect(h.past).toEqual([s(7), s(8), s(9)])
    expect(createHistory().limit).toBe(50)
  })
})

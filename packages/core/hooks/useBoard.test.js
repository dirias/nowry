/**
 * BOARD-002 — useBoard: the board loads, every change saves once by change,
 * quick changes share a request, a change made during a flight goes next, a
 * failure retries with backoff, undo and redo save, leaving flushes.
 */
import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useBoard } from './useBoard'
import { addNote, addChild, connect, removeNodes, updateNode, frameSelection } from '../domain/board'

jest.mock('../api/services/blackboard.service', () => ({
  blackboardService: { getBoard: jest.fn(), patchBoard: jest.fn() }
}))
jest.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }))

const { blackboardService } = require('../api/services/blackboard.service')

const BOARD = {
  id: 'b1',
  name: 'Biology',
  owner_user_id: 'user-1',
  collaborators: [],
  schema: 2,
  rev: 3,
  nodes: [
    {
      id: 'a',
      kind: 'note',
      x: 0,
      y: 0,
      w: null,
      h: null,
      z: 1,
      text: 'Leaf',
      color: 'yellow',
      size: null,
      title: null,
      ref: null,
      card_ids: []
    }
  ],
  links: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  created_at: '2026-10-17T08:00:00Z',
  updated_at: '2026-10-17T08:00:00Z'
}

const makeWrapper = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, wrapper }
}

/** Lets promises settle and timers run, inside act. */
const advance = async (ms = 0) => {
  await act(async () => {
    jest.advanceTimersByTime(ms)
    await Promise.resolve()
  })
  await act(async () => {
    await Promise.resolve()
  })
}

const deferred = () => {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const bodies = () => blackboardService.patchBoard.mock.calls.map(([, body]) => body)

const mount = async () => {
  const { wrapper, client } = makeWrapper()
  const view = renderHook(() => useBoard('b1'), { wrapper })
  for (let i = 0; i < 5 && !view.result.current.board; i += 1) await advance(0)
  expect(view.result.current.board).not.toBeNull()
  return { ...view, client }
}

let rev = 3
beforeEach(() => {
  jest.useFakeTimers()
  rev = 3
  blackboardService.getBoard.mockResolvedValue(BOARD)
  blackboardService.patchBoard.mockImplementation(async () => {
    rev += 1
    return { rev, updated_at: '2026-10-17T09:00:00Z' }
  })
})
afterEach(() => {
  jest.useRealTimers()
})

it('loads the board, read into camelCase, with nothing to save', async () => {
  const { result } = await mount()
  expect(blackboardService.getBoard).toHaveBeenCalledWith('b1')
  expect(result.current.board).toMatchObject({ id: 'b1', name: 'Biology', rev: 3, viewport: { x: 0, y: 0, zoom: 1 } })
  expect(result.current.board.nodes[0]).toMatchObject({ id: 'a', text: 'Leaf', cardIds: [] })
  expect(result.current.status).toBe('idle')
  expect(result.current.hasPending).toBe(false)
  expect(result.current.canUndo).toBe(false)
})

it('saves every kind of change exactly once, 800 ms after it', async () => {
  const { result } = await mount()
  const steps = [
    ['add', (b) => addNote(b, { id: 'n', x: 300, y: 0, text: 'Root' }), { upsert_nodes: ['n'] }],
    ['edit', (b) => updateNode(b, 'n', { text: 'Roots' }), { upsert_nodes: ['n'] }],
    ['move', (b) => updateNode(b, 'n', { x: 320, y: 40 }), { upsert_nodes: ['n'] }],
    ['resize', (b) => updateNode(b, 'n', { w: 260, h: 140 }), { upsert_nodes: ['n'] }],
    ['link', (b) => connect(b, 'a', 'n', { id: 'l' }), { upsert_links: ['l'] }],
    ['frame', (b) => frameSelection(b, ['a', 'n'], 'Plant', { id: 'f' }), { upsert_nodes: ['f'] }],
    ['delete', (b) => removeNodes(b, ['n']), { delete_nodes: ['n'], delete_links: ['l'] }]
  ]
  for (const [, edit, expected] of steps) {
    act(() => result.current.apply(edit))
    expect(result.current.hasPending).toBe(true)
    await advance(799)
    const before = blackboardService.patchBoard.mock.calls.length
    await advance(1)
    expect(blackboardService.patchBoard.mock.calls.length).toBe(before + 1)
    const body = bodies()[before]
    Object.entries(expected).forEach(([key, ids]) => {
      expect((body[key] ?? []).map((x) => (typeof x === 'string' ? x : x.id))).toEqual(ids)
    })
  }
  expect(blackboardService.patchBoard).toHaveBeenCalledTimes(steps.length)
  expect(bodies().map((b) => b.rev)).toEqual([3, 4, 5, 6, 7, 8, 9])
  expect(bodies()[3].upsert_nodes[0]).toMatchObject({ id: 'n', w: 260, h: 140, card_ids: [] })
  expect(result.current.status).toBe('saved')
  expect(result.current.hasPending).toBe(false)
  await advance(5000)
  expect(blackboardService.patchBoard).toHaveBeenCalledTimes(steps.length)
})

it('sends two quick changes as one PATCH', async () => {
  const { result } = await mount()
  act(() => result.current.apply((b) => addNote(b, { id: 'x', text: 'One' })))
  await advance(400)
  act(() => result.current.apply((b) => updateNode(b, 'x', { text: 'One more' })))
  await advance(799)
  expect(blackboardService.patchBoard).not.toHaveBeenCalled()
  await advance(1)
  expect(blackboardService.patchBoard).toHaveBeenCalledTimes(1)
  expect(bodies()[0].upsert_nodes).toHaveLength(1)
  expect(bodies()[0].upsert_nodes[0]).toMatchObject({ id: 'x', text: 'One more' })
})

it('sends a change made during a flight in the next PATCH, with the new revision', async () => {
  const first = deferred()
  blackboardService.patchBoard.mockImplementationOnce(() => first.promise)
  const { result } = await mount()
  act(() => result.current.apply((b) => addNote(b, { id: 'x' })))
  await advance(800)
  expect(result.current.status).toBe('saving')
  act(() => result.current.apply((b) => addNote(b, { id: 'y' })))
  await advance(800)
  expect(blackboardService.patchBoard).toHaveBeenCalledTimes(1)
  await act(async () => first.resolve({ rev: 10 }))
  await advance(0)
  expect(blackboardService.patchBoard).toHaveBeenCalledTimes(2)
  expect(bodies()[0].upsert_nodes.map((n) => n.id)).toEqual(['x'])
  expect(bodies()[1].upsert_nodes.map((n) => n.id)).toEqual(['y'])
  expect(bodies()[1].rev).toBe(10)
  await advance(0)
  expect(result.current.status).toBe('saved')
})

it('reports a failure, keeps the change, and retries with backoff until it lands', async () => {
  const busy = { message: 'conflict', response: { status: 409, data: { detail: 'board_busy' } } }
  blackboardService.patchBoard.mockRejectedValueOnce(busy).mockRejectedValueOnce(busy).mockRejectedValueOnce(busy)
  const { result } = await mount()
  act(() => result.current.apply((b) => addNote(b, { id: 'x' })))
  await advance(800)
  expect(result.current.status).toBe('error')
  expect(result.current.error).toMatchObject({ status: 409, detail: 'board_busy' })
  expect(result.current.hasPending).toBe(true)

  // A change while waiting joins the retry rather than shortening it.
  act(() => result.current.apply((b) => updateNode(b, 'x', { text: 'kept' })))
  await advance(1999)
  expect(blackboardService.patchBoard).toHaveBeenCalledTimes(1)
  await advance(1)
  expect(blackboardService.patchBoard).toHaveBeenCalledTimes(2)
  await advance(3999)
  expect(blackboardService.patchBoard).toHaveBeenCalledTimes(2)
  await advance(1)
  expect(blackboardService.patchBoard).toHaveBeenCalledTimes(3)
  await advance(8000)
  expect(blackboardService.patchBoard).toHaveBeenCalledTimes(4)
  expect(result.current.status).toBe('saved')
  expect(result.current.error).toBeNull()
  expect(result.current.hasPending).toBe(false)
  bodies().forEach((body) => expect(body.upsert_nodes).toHaveLength(1))
  expect(bodies()[3].upsert_nodes[0]).toMatchObject({ id: 'x', text: 'kept' })
})

it('falls back to every 30 s after the fourth retry', async () => {
  blackboardService.patchBoard.mockRejectedValue(new Error('offline'))
  const { result } = await mount()
  act(() => result.current.apply((b) => addNote(b, { id: 'x' })))
  await advance(800)
  for (const wait of [2000, 4000, 8000, 16000, 30000, 30000]) await advance(wait)
  expect(blackboardService.patchBoard).toHaveBeenCalledTimes(7)
  await advance(29999)
  expect(blackboardService.patchBoard).toHaveBeenCalledTimes(7)
  expect(result.current.error).toMatchObject({ status: null, message: 'offline' })
})

it('undoes and redoes, and saves each', async () => {
  const { result } = await mount()
  act(() => result.current.apply((b) => addChild(b, 'a', { id: 'c', linkId: 'l' })))
  await advance(800)
  expect(result.current.canUndo).toBe(true)
  act(() => result.current.undo())
  expect(result.current.board.nodes.map((n) => n.id)).toEqual(['a'])
  expect(result.current.canRedo).toBe(true)
  await advance(800)
  expect(bodies()[1]).toMatchObject({ delete_nodes: ['c'], delete_links: ['l'] })
  act(() => result.current.redo())
  expect(result.current.board.nodes.map((n) => n.id)).toEqual(['a', 'c'])
  await advance(800)
  expect(bodies()[2].upsert_nodes.map((n) => n.id)).toEqual(['c'])
  expect(bodies()[2].upsert_links.map((l) => l.id)).toEqual(['l'])
  expect(blackboardService.patchBoard).toHaveBeenCalledTimes(3)
})

it('keeps an edit out of history when asked, and a checkpoint makes it one step', async () => {
  const { result } = await mount()
  act(() => result.current.checkpoint())
  act(() => result.current.apply((b) => updateNode(b, 'a', { x: 10 }), { history: false }))
  act(() => result.current.apply((b) => updateNode(b, 'a', { x: 20 }), { history: false }))
  act(() => result.current.undo())
  expect(result.current.board.nodes[0].x).toBe(0)
  expect(result.current.canUndo).toBe(false)
})

it('saves the viewport alone after 2 s, never in history', async () => {
  const { result } = await mount()
  act(() => result.current.setViewport({ x: 5, y: 6, zoom: 2 }))
  expect(result.current.hasPending).toBe(false)
  await advance(1999)
  expect(blackboardService.patchBoard).not.toHaveBeenCalled()
  await advance(1)
  expect(bodies()[0]).toEqual({ rev: 3, viewport: { x: 5, y: 6, zoom: 2 } })
  expect(result.current.canUndo).toBe(false)
})

it('carries the viewport and a rename with the next change', async () => {
  const { result } = await mount()
  act(() => result.current.setViewport({ x: 1, y: 1, zoom: 1 }))
  act(() => result.current.rename('Plants'))
  act(() => result.current.apply((b) => addNote(b, { id: 'x' })))
  expect(result.current.board.name).toBe('Plants')
  await advance(800)
  expect(blackboardService.patchBoard).toHaveBeenCalledTimes(1)
  expect(bodies()[0]).toMatchObject({ name: 'Plants', viewport: { x: 1, y: 1, zoom: 1 } })
  expect(bodies()[0].upsert_nodes).toHaveLength(1)
})

it('flush sends at once', async () => {
  const { result } = await mount()
  act(() => result.current.apply((b) => addNote(b, { id: 'x' })))
  let ok
  await act(async () => {
    ok = await result.current.flush()
  })
  expect(ok).toBe(true)
  expect(blackboardService.patchBoard).toHaveBeenCalledTimes(1)
  await advance(800)
  expect(blackboardService.patchBoard).toHaveBeenCalledTimes(1)
})

it('flushes on unmount', async () => {
  const { result, unmount } = await mount()
  act(() => result.current.apply((b) => addNote(b, { id: 'x' })))
  unmount()
  await advance(0)
  expect(blackboardService.patchBoard).toHaveBeenCalledTimes(1)
  expect(bodies()[0].upsert_nodes[0].id).toBe('x')
  await advance(60000)
  expect(blackboardService.patchBoard).toHaveBeenCalledTimes(1)
})

it('the cache follows a save, so the board reopens as it was left', async () => {
  const { result, client } = await mount()
  act(() => result.current.apply((b) => addNote(b, { id: 'x' })))
  await advance(800)
  const cached = client.getQueryData(['board', 'b1'])
  expect(cached.nodes.map((n) => n.id)).toEqual(['a', 'x'])
  expect(cached.rev).toBe(4)
  expect(result.current.board.nodes.map((n) => n.id)).toEqual(['a', 'x'])
})

it('splits a change over 300 operations into several requests', async () => {
  const { result } = await mount()
  act(() =>
    result.current.apply((b) => {
      let next = b
      for (let i = 0; i < 350; i += 1) next = addNote(next, { id: `m${i}` })
      return next
    })
  )
  await advance(800)
  await advance(0)
  expect(blackboardService.patchBoard).toHaveBeenCalledTimes(2)
  expect(bodies()[0].upsert_nodes).toHaveLength(300)
  expect(bodies()[1].upsert_nodes).toHaveLength(50)
  expect(bodies()[1].rev).toBe(4)
})

it('still saves under StrictMode, whose effects mount twice', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }) => (
    <React.StrictMode>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </React.StrictMode>
  )
  const { result } = renderHook(() => useBoard('b1'), { wrapper })
  for (let i = 0; i < 5 && !result.current.board; i += 1) await advance(0)
  act(() => result.current.apply((b) => addNote(b, { id: 'x' })))
  await advance(800)
  expect(blackboardService.patchBoard).toHaveBeenCalledTimes(1)
  expect(result.current.status).toBe('saved')
})
